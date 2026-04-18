const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

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

  // 2. Procurar o utilizador pelo codigo_username
  // Incluímos o 'aluno' e 'docente' para garantir que eles existem nas tabelas específicas
  const user = await prisma.utilizador.findUnique({
    where: { codigo_username: codigo_username },
    include: {
      aluno: true,
      docente: true
    }
  });

  if (!user) throw new Error(`Utilizador com o código ${codigo_username} não encontrado.`);

  const id_utilizador = user.id_utilizador;

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

      return await prisma.evento_aluno.create({
        data: {
          id_evento: parseInt(id_evento),
          id_utilizador: id_utilizador,
        },
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

      return await prisma.evento_docente.create({
        data: {
          id_evento: parseInt(id_evento),
          id_docente: id_utilizador,
        },
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

const cancelarEvento = async (id_evento) => {
  const eventoId = parseInt(id_evento);

  // 1. Verificar se o evento existe
  const evento = await prisma.evento.findUnique({
    where: { id_evento: eventoId },
    include: {
      evento_aluno: true,
      evento_docente: true,
    },
  });

  if (!evento) throw new Error("Evento não encontrado.");

  // 2. Procurar o ID do estado "Cancelado"
  const estadoCancelado = await prisma.evento_estado.findFirst({
    where: { nome: "Cancelado" },
  });

  if (!estadoCancelado) throw new Error("Estado 'Cancelado' não encontrado na Base de Dados.");

  // CORREÇÃO BUGS: Usar 'id_evento_estado' em vez de 'id_estado'
  if (evento.id_evento_estado === estadoCancelado.id_evento_estado) {
    throw new Error("O evento já está cancelado.");
  }

  // Recolher IDs dos participantes antes da transação para as notificações
  const idsAlunos = evento.evento_aluno.map((ea) => ea.id_utilizador);
  const idsDocentes = evento.evento_docente.map((ed) => ed.id_docente);

  // 3. Tudo numa transação atómica
  await prisma.$transaction(async (tx) => {
    
    // --- DECISÃO DE NEGÓCIO ---
    // A melhor prática é NÃO apagar as inscrições para manter o histórico.
    // Como o evento mudou para 'Cancelado', o Frontend já sabe que não vai acontecer.
    // Se quiseres MESMO apagar, retira os comentários abaixo:
    // await tx.evento_aluno.deleteMany({ where: { id_evento: eventoId } });
    // await tx.evento_docente.deleteMany({ where: { id_evento: eventoId } });

    // 4. Atualizar estado do evento para Cancelado
    await tx.evento.update({
      where: { id_evento: eventoId },
      data: { id_evento_estado: estadoCancelado.id_evento_estado }, // Correção aqui!
    });

    // 5. Criar notificações para todos os participantes
    const mensagem = `O evento "${evento.nome}" foi cancelado.`;

    const notificacoes = [...idsAlunos, ...idsDocentes].map((id_user) => ({
      id_user,
      titulo: "Evento Cancelado",
      mensagem,
    }));

    // createMany é muito mais eficiente do que criar um a um
    if (notificacoes.length > 0) {
      await tx.notificacao.createMany({ data: notificacoes });
    }
  });

  // 6. Devolver sucesso com relatório do que aconteceu
  return {
    mensagem: "Evento cancelado com sucesso.",
    participantes_notificados: idsAlunos.length + idsDocentes.length,
  };
};





module.exports = {
  criarEvento,
  listarEventos,
  buscarEventoPorId,
  adicionarParticipante,
  listarParticipantes,
  cancelarEvento,

};