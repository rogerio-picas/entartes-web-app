// src/services/anuncio.service.js
// Módulo de Anúncios — Lógica de negócio
// Unifica o anuncioController.js (antigo) e o anuncio.service.js (parcial)
// Segue as convenções do projecto Ent'artes: todo o acesso ao Prisma fica aqui.

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// ─────────────────────────────────────────────────────────────
// AUXILIAR — include reutilizável para queries de anúncios
// Evita repetir o mesmo bloco include em todas as funções.
// ─────────────────────────────────────────────────────────────
const INCLUDE_ANUNCIO_COMPLETO = {
  coordenadora: {
    include: {
      utilizador: { select: { nome: true, apelido: true } },
    },
  },
  evento: { select: { nome: true } },
  grupo:  { select: { nome: true } },
};

// ─────────────────────────────────────────────────────────────
// 1. criarAnuncio  (genérico — para o CRUD simples da coordenadora)
// ─────────────────────────────────────────────────────────────
/**
 * Cria um anúncio simples, opcionalmente associado a um evento ou grupo.
 * Não envia notificações — use publicarAnuncioNoEvento / publicarAnuncioNoGrupo
 * para o fluxo completo com notificações.
 *
 * @param {number} id_coordenadora  - ID da coordenadora autenticada
 * @param {object} dados
 * @param {string}      dados.titulo
 * @param {string}      dados.mensagem
 * @param {number|null} dados.id_evento  - opcional
 * @param {number|null} dados.id_grupo   - opcional
 * @returns {Promise<object>} Anúncio criado
 */
async function criarAnuncio(id_coordenadora, { titulo, mensagem, id_evento, id_grupo }) {
  if (!titulo || !mensagem) {
    throw new Error('O título e a mensagem são obrigatórios.');
  }

  return prisma.anuncio.create({
    data: {
      id_coordenadora,
      titulo,
      mensagem,
      id_evento: id_evento ? parseInt(id_evento) : null,
      id_grupo:  id_grupo  ? parseInt(id_grupo)  : null,
      data_envio: new Date(),
    },
  });
}

// ─────────────────────────────────────────────────────────────
// 2. listarTodosAnuncios
// ─────────────────────────────────────────────────────────────
/**
 * Devolve todos os anúncios, ordenados do mais recente para o mais antigo.
 *
 * @returns {Promise<Array>}
 */
async function listarTodosAnuncios() {
  return prisma.anuncio.findMany({
    include: INCLUDE_ANUNCIO_COMPLETO,
    orderBy: { data_envio: 'desc' },
  });
}

// ─────────────────────────────────────────────────────────────
// 3. obterAnuncioPorId
// ─────────────────────────────────────────────────────────────
/**
 * Devolve um anúncio pelo seu ID. Lança erro se não existir.
 *
 * @param {number} id_anuncio
 * @returns {Promise<object>}
 */
async function obterAnuncioPorId(id_anuncio) {
  const anuncio = await prisma.anuncio.findUnique({
    where: { id_anuncio: parseInt(id_anuncio) },
    include: INCLUDE_ANUNCIO_COMPLETO,
  });

  if (!anuncio) throw new Error('Anúncio não encontrado.');
  return anuncio;
}

// ─────────────────────────────────────────────────────────────
// 4. actualizarAnuncio
// ─────────────────────────────────────────────────────────────
/**
 * Actualiza o título e/ou a mensagem de um anúncio.
 * Verifica que a coordenadora autenticada é a autora do anúncio.
 *
 * @param {number} id_anuncio
 * @param {number} id_coordenadora  - Deve coincidir com o criador
 * @param {object} dados
 * @param {string|undefined} dados.titulo
 * @param {string|undefined} dados.mensagem
 * @returns {Promise<object>} Anúncio actualizado
 */
async function actualizarAnuncio(id_anuncio, id_coordenadora, { titulo, mensagem }) {
  const anuncio = await prisma.anuncio.findUnique({
    where: { id_anuncio: parseInt(id_anuncio) },
  });

  if (!anuncio) throw new Error('Anúncio não encontrado.');

  if (anuncio.id_coordenadora !== id_coordenadora) {
    throw new Error('Sem permissão para actualizar este anúncio.');
  }

  return prisma.anuncio.update({
    where: { id_anuncio: parseInt(id_anuncio) },
    data: {
      // Mantém o valor anterior se o novo não for fornecido
      titulo:   titulo   || anuncio.titulo,
      mensagem: mensagem || anuncio.mensagem,
    },
  });
}

// ─────────────────────────────────────────────────────────────
// 5. eliminarAnuncio
// ─────────────────────────────────────────────────────────────
/**
 * Elimina um anúncio. Verifica que a coordenadora autenticada é a autora.
 *
 * @param {number} id_anuncio
 * @param {number} id_coordenadora  - Deve coincidir com o criador
 * @returns {Promise<object>} Mensagem de confirmação
 */
async function eliminarAnuncio(id_anuncio, id_coordenadora) {
  const anuncio = await prisma.anuncio.findUnique({
    where: { id_anuncio: parseInt(id_anuncio) },
  });

  if (!anuncio) throw new Error('Anúncio não encontrado.');

  if (anuncio.id_coordenadora !== id_coordenadora) {
    throw new Error('Sem permissão para eliminar este anúncio.');
  }

  await prisma.anuncio.delete({
    where: { id_anuncio: parseInt(id_anuncio) },
  });

  return { mensagem: 'Anúncio eliminado com sucesso.' };
}

// ─────────────────────────────────────────────────────────────
// 6. publicarAnuncioNoEvento  (fluxo completo com notificações)
// ─────────────────────────────────────────────────────────────
/**
 * Cria um anúncio para TODOS os participantes de um evento
 * e envia notificações a alunos e docentes inscritos.
 * Tudo numa única transacção — se alguma notificação falhar,
 * o anúncio também é revertido.
 *
 * @param {number} id_evento
 * @param {number} id_coordenadora
 * @param {object} dados
 * @param {string} dados.titulo
 * @param {string} dados.mensagem
 * @returns {Promise<object>} Anúncio criado
 */
async function publicarAnuncioNoEvento(id_evento, id_coordenadora, { titulo, mensagem }) {
  if (!titulo || !mensagem) {
    throw new Error('O título e a mensagem do anúncio são obrigatórios.');
  }

  const evento = await prisma.evento.findUnique({
    where: { id_evento: parseInt(id_evento) },
  });
  if (!evento) throw new Error('Evento não encontrado.');

  return prisma.$transaction(async (tx) => {
    // 1. Cria o anúncio
    const novoAnuncio = await tx.anuncio.create({
      data: {
        id_evento:       parseInt(id_evento),
        id_coordenadora: parseInt(id_coordenadora),
        titulo,
        mensagem,
        data_envio: new Date(),
      },
    });

    // 2. Recolhe todos os participantes do evento
    const [alunos, docentes] = await Promise.all([
      tx.evento_aluno.findMany({ where: { id_evento: parseInt(id_evento) } }),
      tx.evento_docente.findMany({ where: { id_evento: parseInt(id_evento) } }),
    ]);

    // 3. Constrói a lista de notificações
    const tituloNotificacao = `${evento.nome_evento}: ${titulo}`;
    const notificacoesData = [
      ...alunos.map((a) => ({ id_user: a.id_utilizador, titulo: tituloNotificacao, mensagem })),
      ...docentes.map((d) => ({ id_user: d.id_docente,    titulo: tituloNotificacao, mensagem })),
    ];

    // 4. Insere todas as notificações de uma só vez (mais eficiente que um ciclo)
    if (notificacoesData.length > 0) {
      await tx.notificacao.createMany({ data: notificacoesData });
    }

    return novoAnuncio;
  });
}

// ─────────────────────────────────────────────────────────────
// 7. publicarAnuncioNoGrupo  (fluxo completo com notificações)
// ─────────────────────────────────────────────────────────────
/**
 * Cria um anúncio restrito aos membros de um grupo (ex: "Grupo Ballet Avançado")
 * e envia notificações apenas a esses membros.
 *
 * @param {number} id_grupo
 * @param {number} id_coordenadora
 * @param {object} dados
 * @param {string} dados.titulo
 * @param {string} dados.mensagem
 * @returns {Promise<object>} Anúncio criado
 */
async function publicarAnuncioNoGrupo(id_grupo, id_coordenadora, { titulo, mensagem }) {
  if (!titulo || !mensagem) {
    throw new Error('O título e a mensagem do anúncio são obrigatórios.');
  }

  const grupo = await prisma.grupo.findUnique({
    where: { id_grupo: parseInt(id_grupo) },
  });
  if (!grupo) throw new Error('Grupo não encontrado.');

  return prisma.$transaction(async (tx) => {
    // 1. Cria o anúncio ligado ao grupo
    const novoAnuncio = await tx.anuncio.create({
      data: {
        id_grupo:        parseInt(id_grupo),
        id_coordenadora: parseInt(id_coordenadora),
        titulo,
        mensagem,
        data_envio: new Date(),
      },
    });

    // 2. Recolhe apenas os membros do grupo
    const [alunos, docentes] = await Promise.all([
      tx.aluno_grupo.findMany({ where: { id_grupo: parseInt(id_grupo) } }),
      tx.docente_grupo.findMany({ where: { id_grupo: parseInt(id_grupo) } }),
    ]);

    // 3. Constrói as notificações
    const tituloNotificacao = `Grupo ${grupo.nome_grupo}: ${titulo}`;
    const notificacoesData = [
      ...alunos.map((a) => ({ id_user: a.id_aluno,   titulo: tituloNotificacao, mensagem })),
      ...docentes.map((d) => ({ id_user: d.id_docente, titulo: tituloNotificacao, mensagem })),
    ];

    if (notificacoesData.length > 0) {
      await tx.notificacao.createMany({ data: notificacoesData });
    }

    return novoAnuncio;
  });
}

// ─────────────────────────────────────────────────────────────
// 8. listarAnunciosDoEvento
// ─────────────────────────────────────────────────────────────
/**
 * Devolve os anúncios GLOBAIS de um evento (exclui os de grupos específicos).
 *
 * @param {number} id_evento
 * @returns {Promise<Array>}
 */
async function listarAnunciosDoEvento(id_evento) {
  return prisma.anuncio.findMany({
    where: {
      id_evento: parseInt(id_evento),
      id_grupo:  null, // apenas anúncios globais do evento, não de sub-grupos
    },
    include: {
      coordenadora: {
        include: { utilizador: { select: { nome: true, apelido: true } } },
      },
    },
    orderBy: { data_envio: 'desc' },
  });
}

// ─────────────────────────────────────────────────────────────
// 9. listarAnunciosDoGrupo
// ─────────────────────────────────────────────────────────────
/**
 * Devolve os anúncios de um grupo específico.
 *
 * @param {number} id_grupo
 * @returns {Promise<Array>}
 */
async function listarAnunciosDoGrupo(id_grupo) {
  return prisma.anuncio.findMany({
    where: { id_grupo: parseInt(id_grupo) },
    include: {
      coordenadora: {
        include: { utilizador: { select: { nome: true, apelido: true } } },
      },
    },
    orderBy: { data_envio: 'desc' },
  });
}

// ─────────────────────────────────────────────────────────────
// EXPORTAÇÕES
// ─────────────────────────────────────────────────────────────
module.exports = {
  criarAnuncio,
  listarTodosAnuncios,
  obterAnuncioPorId,
  actualizarAnuncio,
  eliminarAnuncio,
  publicarAnuncioNoEvento,
  publicarAnuncioNoGrupo,
  listarAnunciosDoEvento,
  listarAnunciosDoGrupo,
};