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
const adicionarAlunoAoGrupo = async (id_evento, id_grupo, id_aluno) => {
  const eventoId = parseInt(id_evento);
  const grupoId = parseInt(id_grupo);
  const alunoId = parseInt(id_aluno);

  // 1. Verificar se o grupo existe e se pertence ao evento indicado
  const grupo = await prisma.grupo.findUnique({
    where: { id_grupo: grupoId }
  });

  if (!grupo || grupo.id_evento !== eventoId) {
    throw new Error("Este grupo não pertence ao evento especificado.");
  }

  // 2. Verificar se o aluno está inscrito no evento (Segurança Crítica)
  const inscritoNoEvento = await prisma.evento_aluno.findUnique({
    where: {
      id_evento_id_utilizador: {
        id_evento: eventoId,
        id_utilizador: alunoId
      }
    }
  });

  if (!inscritoNoEvento) {
    throw new Error("O aluno deve estar inscrito no evento antes de ser adicionado a um grupo.");
  }

  // 3. Verificar se o aluno já está no grupo (Evitar duplicados)
  const jaNoGrupo = await prisma.aluno_grupo.findUnique({
    where: {
      id_grupo_id_aluno: {
        id_grupo: grupoId,
        id_aluno: alunoId
      }
    }
  });

  if (jaNoGrupo) throw new Error("O aluno já faz parte deste grupo.");

  // 4. Se tudo estiver OK, adicionar
  return await prisma.aluno_grupo.create({
    data: {
      id_grupo: grupoId,
      id_aluno: alunoId
    }
  });
};

// Adicionar docente a um grupo
const adicionarDocenteAoGrupo = async (id_evento, id_grupo, id_docente) => {
  const eventoId = parseInt(id_evento);
  const grupoId = parseInt(id_grupo);
  const docenteId = parseInt(id_docente);

  // 1. Validar se o grupo existe e se pertence ao evento do URL
  const grupo = await prisma.grupo.findUnique({ 
    where: { id_grupo: grupoId } 
  });
  
  if (!grupo) throw new Error("Grupo não encontrado.");
  
  // Segurança extra: verificar se o grupo é do evento 1 (conforme o URL)
  if (grupo.id_evento !== eventoId) {
    throw new Error("Este grupo não pertence ao evento especificado.");
  }

  // 2. Verificar se o docente existe
  const docente = await prisma.docente.findUnique({ 
    where: { id_utilizador: docenteId } 
  });
  if (!docente) throw new Error("Docente não encontrado.");

  // 3. Verificar se o docente está associado ao evento pai
  const inscrito = await prisma.evento_docente.findUnique({
    where: {
      id_evento_id_docente: {
        id_evento: eventoId,
        id_docente: docenteId,
      },
    },
  });
  if (!inscrito) throw new Error("O docente não está associado a este evento.");

  // 4. Verificar se já está no grupo
  const jaExiste = await prisma.docente_grupo.findUnique({
    where: { 
      id_docente_id_grupo: { 
        id_docente: docenteId, 
        id_grupo: grupoId 
      } 
    },
  });
  if (jaExiste) throw new Error("O docente já está neste grupo.");

  // 5. Criar associação
  return await prisma.docente_grupo.create({
    data: { 
      id_grupo: grupoId, 
      id_docente: docenteId 
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
  console.log(id_grupo);
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