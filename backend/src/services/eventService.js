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

const adicionarParticipante = async (id_evento, id_utilizador, tipo) => {
  const evento = await prisma.evento.findUnique({
    where: { id_evento: parseInt(id_evento) },
  });

  if (!evento) throw new Error("Evento não encontrado.");

  if (tipo === "aluno") {
    const aluno = await prisma.aluno.findUnique({
      where: { id_utilizador: parseInt(id_utilizador) },
    });

    if (!aluno) throw new Error("Aluno não encontrado.");

    const jaExiste = await prisma.evento_aluno.findUnique({
      where: {
        id_evento_id_utilizador: {
          id_evento: parseInt(id_evento),
          id_utilizador: parseInt(id_utilizador),
        },
      },
    });

    if (jaExiste) throw new Error("Este aluno já está no evento.");

    await prisma.evento_aluno.create({
      data: {
        id_evento: parseInt(id_evento),
        id_utilizador: parseInt(id_utilizador),
      },
    });

  } else if (tipo === "docente") {
    const docente = await prisma.docente.findUnique({
      where: { id_utilizador: parseInt(id_utilizador) },
    });

    if (!docente) throw new Error("Docente não encontrado.");

    const jaExiste = await prisma.evento_docente.findUnique({
      where: {
        id_evento_id_docente: {
          id_evento: parseInt(id_evento),
          id_docente: parseInt(id_utilizador),
        },
      },
    });

    if (jaExiste) throw new Error("Este docente já está no evento.");

    await prisma.evento_docente.create({
      data: {
        id_evento: parseInt(id_evento),
        id_docente: parseInt(id_utilizador),
      },
    });
  } else {
    throw new Error("Tipo inválido. Use 'aluno' ou 'docente'.");
  }

  return { mensagem: "Participante adicionado com sucesso." };
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

module.exports = {
  criarEvento,
  listarEventos,
  buscarEventoPorId,
  adicionarParticipante,
  listarParticipantes,
};