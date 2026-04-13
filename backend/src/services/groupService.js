const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Criar grupo associado a um evento
const criarGrupo = async (id_evento, dados) => {
  const { nome, descricao, hora_atuacao } = dados;

  if (!nome || nome.trim() === "") {
    throw new Error("O nome do grupo é obrigatório.");
  }

  // Verificar que o evento existe
  const evento = await prisma.evento.findUnique({
    where: { id_evento: parseInt(id_evento) },
  });
  if (!evento) throw new Error("Evento não encontrado.");

  return await prisma.grupo.create({
    data: {
      id_evento: parseInt(id_evento),
      nome: nome.trim(),
      descricao: descricao ?? null,
      // Normalização para o tipo TIME do NeonDB usando a base 1970
      hora_atuacao: hora_atuacao ? new Date(`1970-01-01T${hora_atuacao}Z`) : null,
    },
  });
};

// Listar grupos de um evento
const listarGruposDoEvento = async (id_evento) => {
  const evento = await prisma.evento.findUnique({
    where: { id_evento: parseInt(id_evento) },
  });
  if (!evento) throw new Error("Evento não encontrado.");

  return await prisma.grupo.findMany({
    where: { id_evento: parseInt(id_evento) },
    include: {
      aluno_grupo: {
        include: {
          aluno: {
            include: {
              utilizador: { select: { nome: true, apelido: true, email: true } },
            },
          },
        },
      },
      docente_grupo: {
        include: {
          docente: {
            include: {
              utilizador: { select: { nome: true, apelido: true, email: true } },
            },
          },
        },
      },
    },
    orderBy: { hora_atuacao: "asc" },
  });
};

// Adicionar aluno a um grupo
const adicionarAlunoAoGrupo = async (id_grupo, id_aluno) => {
  const grupo = await prisma.grupo.findUnique({ 
    where: { id_grupo: parseInt(id_grupo) } 
  });
  if (!grupo) throw new Error("Grupo não encontrado.");

  const aluno = await prisma.aluno.findUnique({ 
    where: { id_utilizador: parseInt(id_aluno) } 
  });
  if (!aluno) throw new Error("Aluno não encontrado.");

  // Se o grupo está ligado a um evento, verificar que o aluno está inscrito nesse evento
  if (grupo.id_evento) {
    const inscrito = await prisma.evento_aluno.findUnique({
      where: {
        id_evento_id_utilizador: {
          id_evento: grupo.id_evento,
          id_utilizador: parseInt(id_aluno),
        },
      },
    });
    if (!inscrito) throw new Error("O aluno não está inscrito neste evento.");
  }

  const jaExiste = await prisma.aluno_grupo.findUnique({
    where: { 
      id_grupo_id_aluno: { 
        id_grupo: parseInt(id_grupo), 
        id_aluno: parseInt(id_aluno) 
      } 
    },
  });
  if (jaExiste) throw new Error("O aluno já está neste grupo.");

  return await prisma.aluno_grupo.create({
    data: { 
      id_grupo: parseInt(id_grupo), 
      id_aluno: parseInt(id_aluno) 
    },
  });
};

// Adicionar docente a um grupo
const adicionarDocenteAoGrupo = async (id_grupo, id_docente) => {
  const grupo = await prisma.grupo.findUnique({ 
    where: { id_grupo: parseInt(id_grupo) } 
  });
  if (!grupo) throw new Error("Grupo não encontrado.");

  const docente = await prisma.docente.findUnique({ 
    where: { id_utilizador: parseInt(id_docente) } 
  });
  if (!docente) throw new Error("Docente não encontrado.");

  if (grupo.id_evento) {
    const inscrito = await prisma.evento_docente.findUnique({
      where: {
        id_evento_id_docente: {
          id_evento: grupo.id_evento,
          id_docente: parseInt(id_docente),
        },
      },
    });
    if (!inscrito) throw new Error("O docente não está associado a este evento.");
  }

  const jaExiste = await prisma.docente_grupo.findUnique({
    where: { 
      id_docente_id_grupo: { 
        id_docente: parseInt(id_docente), 
        id_grupo: parseInt(id_grupo) 
      } 
    },
  });
  if (jaExiste) throw new Error("O docente já está neste grupo.");

  return await prisma.docente_grupo.create({
    data: { 
      id_grupo: parseInt(id_grupo), 
      id_docente: parseInt(id_docente) 
    },
  });
};

// Remover aluno de um grupo
const removerAlunoDoGrupo = async (id_grupo, id_aluno) => {
  const registro = await prisma.aluno_grupo.findUnique({
    where: { 
      id_grupo_id_aluno: { 
        id_grupo: parseInt(id_grupo), 
        id_aluno: parseInt(id_aluno) 
      } 
    },
  });
  if (!registro) throw new Error("O aluno não está neste grupo.");

  await prisma.aluno_grupo.delete({
    where: { 
      id_grupo_id_aluno: { 
        id_grupo: parseInt(id_grupo), 
        id_aluno: parseInt(id_aluno) 
      } 
    },
  });

  return { mensagem: "Aluno removido do grupo com sucesso." };
};

// Remover docente de um grupo
const removerDocenteDoGrupo = async (id_grupo, id_docente) => {
  const registro = await prisma.docente_grupo.findUnique({
    where: { 
      id_docente_id_grupo: { 
        id_docente: parseInt(id_docente), 
        id_grupo: parseInt(id_grupo) 
      } 
    },
  });
  if (!registro) throw new Error("O docente não está neste grupo.");

  await prisma.docente_grupo.delete({
    where: { 
      id_docente_id_grupo: { 
        id_docente: parseInt(id_docente), 
        id_grupo: parseInt(id_grupo) 
      } 
    },
  });

  return { mensagem: "Docente removido do grupo com sucesso." };
};

// Editar grupo
const editarGrupo = async (id_grupo, dados) => {
  const { nome, descricao, hora_atuacao } = dados;

  const grupo = await prisma.grupo.findUnique({ 
    where: { id_grupo: parseInt(id_grupo) } 
  });
  if (!grupo) throw new Error("Grupo não encontrado.");

  return await prisma.grupo.update({
    where: { id_grupo: parseInt(id_grupo) },
    data: {
      nome: nome ? nome.trim() : grupo.nome,
      descricao: descricao !== undefined ? descricao : grupo.descricao,
      hora_atuacao: hora_atuacao ? new Date(`1970-01-01T${hora_atuacao}Z`) : grupo.hora_atuacao,
    },
  });
};

// Eliminar grupo
const eliminarGrupo = async (id_grupo) => {
  const grupo = await prisma.grupo.findUnique({ 
    where: { id_grupo: parseInt(id_grupo) } 
  });
  if (!grupo) throw new Error("Grupo não encontrado.");

  // Nota: O Prisma lidará com a deleção das relações se onDelete: Cascade estiver no schema
  await prisma.grupo.delete({ 
    where: { id_grupo: parseInt(id_grupo) } 
  });

  return { mensagem: "Grupo eliminado com sucesso." };
};

module.exports = {
  criarGrupo,
  listarGruposDoEvento,
  adicionarAlunoAoGrupo,
  adicionarDocenteAoGrupo,
  removerAlunoDoGrupo,
  removerDocenteDoGrupo,
  editarGrupo,
  eliminarGrupo,
};