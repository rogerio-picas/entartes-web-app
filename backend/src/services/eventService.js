const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const groupService = require('./groupService');

const EVENT_STATE = {
  PLANEADO: 1,
  ABERTO: 2,
  EM_REALIZACAO: 3,
  CONCLUIDO: 4,
  CANCELADO: 5,
};

const criarEvento = async (dados, id_coordenadora) => {
  const { nome, descricao, data_de_realizacao } = dados;

  if (!nome || nome.trim() === "") {
    throw new Error("O nome do evento é obrigatório.");
  }

  const coordenadora = await prisma.coordenadora.findUnique({
    where: { id_utilizador: id_coordenadora },
  });

  if (!coordenadora) {
    throw new Error("Coordenadora não encontrada.");
  }

  // Transação atómica usando 'tx'
  return await prisma.$transaction(async (tx) => {
    const evento = await tx.evento.create({
      data: {
        nome: nome.trim(),
        descricao: descricao ?? null,
        data_de_realizacao: data_de_realizacao ? new Date(data_de_realizacao) : null,
        id_evento_estado: EVENT_STATE.PLANEADO,
      },
    });

    await tx.coordenadora_evento.create({
      data: {
        id_utilizador: id_coordenadora,
        id_evento: evento.id_evento,
      },
    });

    return evento;
  });
};

const listarEventos = async () => {
  return await prisma.evento.findMany({
    include: {
      coordenadora_evento: {
        include: {
          coordenadora: {
            include: {
              utilizador: {
                select: { nome: true, apelido: true, email: true },
              },
            },
          },
        },
      },
    },
    orderBy: { data_de_realizacao: "asc" },
  });
};

const listarMeusEventos = async (id_utilizador, role) => {
  if (role === 2) { // Docente
    return await prisma.evento.findMany({
      where: { evento_docente: { some: { id_docente: id_utilizador } } },
      include: {
        coordenadora_evento: { include: { coordenadora: { include: { utilizador: { select: { nome: true, apelido: true, email: true } } } } } },
      },
      orderBy: { data_de_realizacao: "asc" },
    });
  } else if (role === 3) { // Aluno
    return await prisma.evento.findMany({
      where: { evento_aluno: { some: { id_utilizador: id_utilizador } } },
      include: {
        coordenadora_evento: { include: { coordenadora: { include: { utilizador: { select: { nome: true, apelido: true, email: true } } } } } },
      },
      orderBy: { data_de_realizacao: "asc" },
    });
  }
  return [];
};

const buscarEventoPorId = async (id_evento) => {
  const evento = await prisma.evento.findUnique({
    where: { id_evento: parseInt(id_evento) },
    include: {
      coordenadora_evento: {
        include: {
          coordenadora: {
            include: {
              utilizador: { select: { nome: true, apelido: true } },
            },
          },
        },
      },
      grupo: {
        include: {
          aluno_grupo: { include: { aluno: { include: { utilizador: { select: { nome: true, apelido: true } } } } } },
          docente_grupo: { include: { docente: { include: { utilizador: { select: { nome: true, apelido: true } } } } } },
        },
      },
      evento_aluno: {
        include: {
          aluno: {
            include: { utilizador: { select: { nome: true, apelido: true } } },
          },
        },
      },
    },
  });

  if (!evento) throw new Error("Evento não encontrado.");
  return evento;
};

const adicionarParticipante = async (id_evento, codigo_username) => {
  // 1. Validar se o evento existe
  const evento = await prisma.evento.findUnique({
    where: { id_evento: parseInt(id_evento) },
  });

  if (!evento) throw new Error("Evento não encontrado.");

  if ([EVENT_STATE.CONCLUIDO, EVENT_STATE.CANCELADO].includes(evento.id_evento_estado)) {
    throw new Error("Não é possível adicionar participantes a um evento concluído ou cancelado.");
  }

  if (evento.id_evento_estado === EVENT_STATE.EM_REALIZACAO) {
    throw new Error("Não é possível adicionar participantes a um evento em realização.");
  }

  // 2. Procurar o utilizador pelo codigo_username
  // Incluímos o 'aluno' e 'docente' para garantir que eles existem nas tabelas específicas
  const user = await prisma.utilizador.findUnique({
    where: { codigo_username: codigo_username },
    include: {
      aluno: true,
      docente: true,
    },
  });

  if (!user) throw new Error(`Utilizador com o código ${codigo_username} não encontrado.`);

  const id_utilizador = user.id_utilizador;
  const deveAbrirEvento = !evento.id_evento_estado || evento.id_evento_estado === EVENT_STATE.PLANEADO;

  // 3. Decidir o destino com base no id_tipo (1: Admin, 2: Docente, 3: Aluno)
  switch (user.id_tipo) {
    case 3: // ALUNO
      if (!user.aluno) throw new Error("Utilizador marcado como Aluno mas sem registo na tabela Aluno.");

      const alunoNoEvento = await prisma.evento_aluno.findUnique({
        where: {
          id_evento_id_utilizador: {
            id_evento: parseInt(id_evento),
            id_utilizador: id_utilizador,
          },
        },
      });

      if (alunoNoEvento) throw new Error("Este aluno já está inscrito no evento.");

      return await prisma.$transaction(async (tx) => {
        const ea = await tx.evento_aluno.create({
          data: {
            id_evento: parseInt(id_evento),
            id_utilizador: id_utilizador,
          },
        });

        if (deveAbrirEvento) {
          await tx.evento.update({
            where: { id_evento: evento.id_evento },
            data: { id_evento_estado: EVENT_STATE.ABERTO },
          });
        }

        await tx.notificacao.create({
          data: {
            id_user: id_utilizador,
            titulo: "Novo Evento",
            mensagem: `Foste adicionado ao evento "${evento.nome}".`,
          },
        });
        return ea;
      });

    case 2: // DOCENTE
      if (!user.docente) throw new Error("Utilizador marcado como Docente mas sem registo na tabela Docente.");

      const docenteNoEvento = await prisma.evento_docente.findUnique({
        where: {
          id_evento_id_docente: {
            id_evento: parseInt(id_evento),
            id_docente: id_utilizador,
          },
        },
      });

      if (docenteNoEvento) throw new Error("Este docente já está inscrito no evento.");

      return await prisma.$transaction(async (tx) => {
        const ed = await tx.evento_docente.create({
          data: {
            id_evento: parseInt(id_evento),
            id_docente: id_utilizador,
          },
        });

        if (deveAbrirEvento) {
          await tx.evento.update({
            where: { id_evento: evento.id_evento },
            data: { id_evento_estado: EVENT_STATE.ABERTO },
          });
        }

        await tx.notificacao.create({
          data: {
            id_user: id_utilizador,
            titulo: "Novo Evento",
            mensagem: `Foste adicionado ao evento "${evento.nome}" como docente.`,
          },
        });
        return ed;
      });

    case 1: // COORDENADORA / ADMIN
      throw new Error("Administradores/Coordenadores gerem o evento, não participam como inscritos.");

    default:
      throw new Error("Tipo de utilizador inválido para participação em eventos.");
  }
};


const listarParticipantes = async (id_evento) => {
  const evento = await prisma.evento.findUnique({
    where: { id_evento: parseInt(id_evento) },
  });

  if (!evento) throw new Error("Evento não encontrado.");

  const [alunosEvento, docentesEvento] = await Promise.all([
    prisma.evento_aluno.findMany({
      where: { id_evento: parseInt(id_evento) },
      include: { aluno: { include: { utilizador: { select: { nome: true, apelido: true, email: true } } } } },
    }),
    prisma.evento_docente.findMany({
      where: { id_evento: parseInt(id_evento) },
      include: { docente: { include: { utilizador: { select: { nome: true, apelido: true, email: true } } } } },
    })
  ]);

  return {
    total: alunosEvento.length + docentesEvento.length,
    alunos: alunosEvento.map(ea => ({
      id_utilizador: ea.aluno.id_utilizador,
      nome: ea.aluno.utilizador.nome,
      apelido: ea.aluno.utilizador.apelido,
      email: ea.aluno.utilizador.email,
      tipo: "Aluno"
    })),
    docentes: docentesEvento.map(ed => ({
      id_utilizador: ed.docente.id_utilizador,
      nome: ed.docente.utilizador.nome,
      apelido: ed.docente.utilizador.apelido,
      email: ed.docente.utilizador.email,
      tipo: "Docente"
    }))
  };
};

const removerAlunoDoEvento = async (id_evento, id_aluno) => {
  const eventoId = parseInt(id_evento);
  const alunoId = parseInt(id_aluno);

  const evento = await prisma.evento.findUnique({
    where: { id_evento: eventoId },
  });
  if (!evento) throw new Error("Evento não encontrado.");

  const registro = await prisma.evento_aluno.findUnique({
    where: {
      id_evento_id_utilizador: {
        id_evento: eventoId,
        id_utilizador: alunoId,
      },
    },
  });

  if (!registro) throw new Error("O aluno não está inscrito neste evento.");

  const grupos = await prisma.aluno_grupo.findMany({
    where: {
      id_aluno: alunoId,
      grupo: {
        id_evento: eventoId,
      },
    },
    select: { id_grupo: true },
  });

  if (grupos.length > 0) {
    for (const grupo of grupos) {
      await groupService.removerAlunoDoGrupo(grupo.id_grupo, alunoId);
    }
  }

  await prisma.evento_aluno.delete({
    where: {
      id_evento_id_utilizador: {
        id_evento: eventoId,
        id_utilizador: alunoId,
      },
    },
  });

  return { mensagem: "Aluno removido do evento com sucesso." };
};

const removerDocenteDoEvento = async (id_evento, id_docente) => {
  const eventoId = parseInt(id_evento);
  const docenteId = parseInt(id_docente);

  const evento = await prisma.evento.findUnique({
    where: { id_evento: eventoId },
  });
  if (!evento) throw new Error("Evento não encontrado.");

  const registro = await prisma.evento_docente.findUnique({
    where: {
      id_evento_id_docente: {
        id_evento: eventoId,
        id_docente: docenteId,
      },
    },
  });

  if (!registro) throw new Error("O docente não está inscrito neste evento.");

  const grupos = await prisma.docente_grupo.findMany({
    where: {
      id_docente: docenteId,
      grupo: {
        id_evento: eventoId,
      },
    },
    select: { id_grupo: true },
  });

  if (grupos.length > 0) {
    for (const grupo of grupos) {
      await groupService.removerDocenteDoGrupo(grupo.id_grupo, docenteId);
    }
  }

  await prisma.evento_docente.delete({
    where: {
      id_evento_id_docente: {
        id_evento: eventoId,
        id_docente: docenteId,
      },
    },
  });

  return { mensagem: "Docente removido do evento com sucesso." };
};

const cancelarEvento = async (id_evento, id_coordenadora) => {
  const eventoId = parseInt(id_evento);

  // 1. Verificar se o evento existe
  const evento = await prisma.evento.findUnique({
    where: { id_evento: eventoId },
    include: {
      evento_aluno: true,
      evento_docente: true,
      coordenadora_evento: true,
    },
  });

  if (!evento) throw new Error("Evento não encontrado.");

  // 2. Validar se a coordenadora tem permissão para cancelar o evento
  const temPermissao = evento.coordenadora_evento.some(
    (ce) => ce.id_utilizador === id_coordenadora
  );

  if (!temPermissao) {
    throw new Error("Sem permissão para cancelar este evento. Apenas coordenadoras do evento podem cancelá-lo.");
  }

  // 3. Procurar o ID do estado "Cancelado"
  const estadoCancelado = await prisma.evento_estado.findFirst({
    where: { id_evento_estado: 5 },
  });

  if (!estadoCancelado) throw new Error("Estado 'Cancelado' não encontrado na Base de Dados.");

  // 4. Verificar se já está cancelado
  if (evento.id_evento_estado === estadoCancelado.id_evento_estado) {
    throw new Error("O evento já está cancelado.");
  }

  // 5. Recolher IDs dos participantes antes da transação para as notificações
  const idsAlunos = evento.evento_aluno.map((ea) => ea.id_utilizador);
  const idsDocentes = evento.evento_docente.map((ed) => ed.id_docente);

  // 6. Tudo numa transação atómica
  await prisma.$transaction(async (tx) => {
    
    // Atualizar estado do evento para Cancelado
    await tx.evento.update({
      where: { id_evento: eventoId },
      data: { id_evento_estado: estadoCancelado.id_evento_estado },
    });

    // Criar notificações para todos os participantes
    const mensagem = `O evento "${evento.nome}" foi cancelado.`;

    const notificacoes = [...idsAlunos, ...idsDocentes].map((id_user) => ({
      id_user,
      titulo: "Evento Cancelado",
      mensagem,
    }));

    if (notificacoes.length > 0) {
      await tx.notificacao.createMany({ data: notificacoes });
    }
  });

  // 7. Devolver sucesso com relatório do que aconteceu
  return {
    mensagem: "Evento cancelado com sucesso.",
    evento_id: eventoId,
    evento_nome: evento.nome,
    participantes_notificados: idsAlunos.length + idsDocentes.length,
  };
};

const concluirEvento = async (id_evento, id_coordenadora) => {
  const eventoId = parseInt(id_evento);

  const evento = await prisma.evento.findUnique({
    where: { id_evento: eventoId },
    include: {
      coordenadora_evento: true,
      evento_aluno: true,
      evento_docente: true,
    },
  });

  if (!evento) throw new Error("Evento não encontrado.");

  const temPermissao = evento.coordenadora_evento.some(
    (ce) => ce.id_utilizador === id_coordenadora
  );

  if (!temPermissao) {
    throw new Error("Sem permissão para concluir este evento. Apenas coordenadoras do evento podem fazê-lo.");
  }

  if (evento.id_evento_estado === EVENT_STATE.CANCELADO) {
    throw new Error("Não é possível concluir um evento cancelado.");
  }

  if (evento.id_evento_estado === EVENT_STATE.CONCLUIDO) {
    throw new Error("O evento já está concluído.");
  }

  if (![EVENT_STATE.ABERTO, EVENT_STATE.EM_REALIZACAO].includes(evento.id_evento_estado)) {
    throw new Error("O evento não está em estado válido para conclusão.");
  }

  const idsAlunos = evento.evento_aluno.map((ea) => ea.id_utilizador);
  const idsDocentes = evento.evento_docente.map((ed) => ed.id_docente);

  await prisma.$transaction(async (tx) => {
    await tx.evento.update({
      where: { id_evento: eventoId },
      data: { id_evento_estado: EVENT_STATE.CONCLUIDO },
    });

    const mensagem = `O evento "${evento.nome}" foi concluído.`;
    const notificacoes = [...idsAlunos, ...idsDocentes].map((id_user) => ({
      id_user,
      titulo: "Evento Concluído",
      mensagem,
    }));

    if (notificacoes.length > 0) {
      await tx.notificacao.createMany({ data: notificacoes });
    }
  });

  return {
    mensagem: "Evento concluído com sucesso.",
    evento_id: eventoId,
    evento_nome: evento.nome,
    participantes_notificados: idsAlunos.length + idsDocentes.length,
  };
};

/**
 * EDITAR - Atualiza informações de um evento
 */
const editarEvento = async (id_evento, dados) => {
  const eventoId = parseInt(id_evento);
  const { nome, descricao, data_de_realizacao } = dados;

  // 1. Verificar se o evento existe
  const evento = await prisma.evento.findUnique({
    where: { id_evento: eventoId },
  });

  if (!evento) throw new Error("Evento não encontrado.");

  // 2. Preparar dados para atualização (apenas campos fornecidos)
  const dataAtualizar = {};
  
  if (nome !== undefined && nome.trim() !== "") {
    dataAtualizar.nome = nome.trim();
  }
  if (descricao !== undefined) {
    dataAtualizar.descricao = descricao;
  }
  if (data_de_realizacao !== undefined) {
    dataAtualizar.data_de_realizacao = data_de_realizacao ? new Date(data_de_realizacao) : null;
  }

  if (
    dataAtualizar.data_de_realizacao !== undefined &&
    dataAtualizar.data_de_realizacao !== null &&
    evento.id_evento_estado === EVENT_STATE.ABERTO
  ) {
    dataAtualizar.id_evento_estado = EVENT_STATE.EM_REALIZACAO;
  }

  // 3. Se nenhum campo foi fornecido, não fazer nada
  if (Object.keys(dataAtualizar).length === 0) {
    throw new Error("Nenhum campo válido foi fornecido para atualização.");
  }

  // 4. Atualizar evento
  const eventoAtualizado = await prisma.evento.update({
    where: { id_evento: eventoId },
    data: dataAtualizar,
  });

  return eventoAtualizado;
};





module.exports = {
  criarEvento,
  listarEventos,
  listarMeusEventos,
  buscarEventoPorId,
  adicionarParticipante,
  listarParticipantes,
  removerAlunoDoEvento,
  removerDocenteDoEvento,
  editarEvento,
  cancelarEvento,
  concluirEvento,
};