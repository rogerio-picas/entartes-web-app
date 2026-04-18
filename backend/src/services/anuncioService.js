const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// 1. Publicar anúncio para TODO O EVENTO
const publicarAnuncioNoEvento = async (id_evento, id_coordenadora, dados) => {
  const { titulo, mensagem } = dados;

  if (!titulo || !mensagem) {
    throw new Error("O título e a mensagem do anúncio são obrigatórios.");
  }

  // Validar se evento existe
  const evento = await prisma.evento.findUnique({ where: { id_evento: parseInt(id_evento) } });
  if (!evento) throw new Error("Evento não encontrado.");

  // Executar tudo numa transação: Cria Anúncio + Cria Notificações
  return await prisma.$transaction(async (tx) => {
    // 1. Gravar o anúncio na base de dados
    const novoAnuncio = await tx.anuncio.create({
      data: {
        id_evento: parseInt(id_evento),
        id_coordenadora: parseInt(id_coordenadora),
        titulo,
        mensagem
      }
    });

    // 2. Obter todos os utilizadores (alunos e docentes) inscritos no evento
    const alunos = await tx.evento_aluno.findMany({ where: { id_evento: parseInt(id_evento) } });
    const docentes = await tx.evento_docente.findMany({ where: { id_evento: parseInt(id_evento) } });

    // 3. Preparar a lista de notificações
    const notificacoesData = [];
    const tituloNotificacao = `${evento.nome}: ${titulo}`;

    alunos.forEach(a => {
      notificacoesData.push({ id_user: a.id_utilizador, titulo: tituloNotificacao, mensagem });
    });

    docentes.forEach(d => {
      notificacoesData.push({ id_user: d.id_docente, titulo: tituloNotificacao, mensagem });
    });

    // 4. Inserir todas as notificações de uma vez (Performance / createMany)
    if (notificacoesData.length > 0) {
      await tx.notificacao.createMany({
        data: notificacoesData
      });
    }

    return novoAnuncio;
  });
};

// 2. Publicar anúncio RESTRITO A UM GRUPO (ex: "Grupo de Ballet Avançado, venham mais cedo")
const publicarAnuncioNoGrupo = async (id_grupo, id_coordenadora, dados) => {
  const { titulo, mensagem } = dados;

  if (!titulo || !mensagem) {
    throw new Error("O título e a mensagem do anúncio são obrigatórios.");
  }

  const grupo = await prisma.grupo.findUnique({ 
    where: { id_grupo: parseInt(id_grupo) },
    include: { evento: true } // Trazer o nome do evento para contexto
  });
  if (!grupo) throw new Error("Grupo não encontrado.");

  return await prisma.$transaction(async (tx) => {
    // 1. Criar anúncio ligado apenas ao grupo
    const novoAnuncio = await tx.anuncio.create({
      data: {
        id_grupo: parseInt(id_grupo),
        id_coordenadora: parseInt(id_coordenadora),
        titulo,
        mensagem
      }
    });

    // 2. Buscar apenas os membros do grupo
    const alunos = await tx.aluno_grupo.findMany({ where: { id_grupo: parseInt(id_grupo) } });
    const docentes = await tx.docente_grupo.findMany({ where: { id_grupo: parseInt(id_grupo) } });

    // 3. Preparar notificações
    const notificacoesData = [];
    const tituloNotificacao = `Grupo ${grupo.nome}: ${titulo}`;

    alunos.forEach(a => {
      notificacoesData.push({ id_user: a.id_aluno, titulo: tituloNotificacao, mensagem });
    });

    docentes.forEach(d => {
      notificacoesData.push({ id_user: d.id_docente, titulo: tituloNotificacao, mensagem });
    });

    if (notificacoesData.length > 0) {
      await tx.notificacao.createMany({ data: notificacoesData });
    }

    return novoAnuncio;
  });
};

// 3. Listar Anúncios de um Evento (Para o Feed do Evento na App)
const listarAnunciosDoEvento = async (id_evento) => {
  return await prisma.anuncio.findMany({
    where: { 
      id_evento: parseInt(id_evento),
      id_grupo: null // Traz apenas os anúncios globais do evento, não os de grupos específicos
    },
    include: {
      coordenadora: {
        include: {
          utilizador: { select: { nome: true, apelido: true } }
        }
      }
    },
    orderBy: { data_envio: "desc" } // Mais recentes primeiro
  });
};

// 4. Listar Anúncios de um Grupo Específico
const listarAnunciosDoGrupo = async (id_grupo) => {
  return await prisma.anuncio.findMany({
    where: { id_grupo: parseInt(id_grupo) },
    include: {
      coordenadora: {
        include: {
          utilizador: { select: { nome: true, apelido: true } }
        }
      }
    },
    orderBy: { data_envio: "desc" }
  });
};

// 5. Apagar um anúncio (caso a coordenadora se tenha enganado)
const eliminarAnuncio = async (id_anuncio) => {
  const anuncio = await prisma.anuncio.findUnique({ where: { id_anuncio: parseInt(id_anuncio) } });
  if (!anuncio) throw new Error("Anúncio não encontrado.");

  await prisma.anuncio.delete({ where: { id_anuncio: parseInt(id_anuncio) } });
  
  return { mensagem: "Anúncio removido com sucesso." };
};

module.exports = {
  publicarAnuncioNoEvento,
  publicarAnuncioNoGrupo,
  listarAnunciosDoEvento,
  listarAnunciosDoGrupo,
  eliminarAnuncio
};