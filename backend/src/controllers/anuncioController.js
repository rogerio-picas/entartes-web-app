// src/controllers/anuncio.controller.js
// Módulo de Anúncios — Controller
// Responsabilidade única: ler o req, chamar o service, devolver o res.
// Nenhuma lógica de negócio ou acesso directo ao Prisma aqui.

const anuncioService = require('../services/anuncioService');

// ─────────────────────────────────────────────────────────────
// AUXILIAR — converte erros de negócio em respostas HTTP
// ─────────────────────────────────────────────────────────────
/**
 * Centraliza o tratamento de erros dos handlers.
 * Erros conhecidos (ex: "não encontrado", "sem permissão") devolvem
 * o código HTTP apropriado; erros inesperados devolvem 500.
 *
 * @param {Error} error
 * @param {object} res - objecto Response do Express
 */
function _tratarErro(error, res) {
  const mensagem = error.message ?? 'Erro interno do servidor.';

  if (mensagem.includes('não encontrado') || mensagem.includes('não encontrada')) {
    return res.status(404).json({ error: mensagem });
  }
  if (mensagem.includes('Sem permissão') || mensagem.includes('obrigatórios')) {
    return res.status(403).json({ error: mensagem });
  }
  if (mensagem.includes('obrigatório') || mensagem.includes('obrigatórios')) {
    return res.status(400).json({ error: mensagem });
  }

  console.error('[anuncio.controller]', error);
  res.status(500).json({ error: 'Erro interno do servidor.' });
}

// ─────────────────────────────────────────────────────────────
// CRUD BÁSICO
// ─────────────────────────────────────────────────────────────

// POST /api/anuncios
const createAnuncio = async (req, res) => {
  try {
    const { titulo, mensagem, id_evento, id_grupo } = req.body;
    const novo = await anuncioService.criarAnuncio(req.user.id, { titulo, mensagem, id_evento, id_grupo });
    res.status(201).json(novo);
  } catch (error) {
    _tratarErro(error, res);
  }
};

// GET /api/anuncios
const getAllAnuncios = async (req, res) => {
  try {
    const anuncios = await anuncioService.listarTodosAnuncios();
    res.status(200).json(anuncios);
  } catch (error) {
    _tratarErro(error, res);
  }
};

// GET /api/anuncios/:id_anuncio
const getAnuncioById = async (req, res) => {
  try {
    const anuncio = await anuncioService.obterAnuncioPorId(req.params.id_anuncio);
    res.status(200).json(anuncio);
  } catch (error) {
    _tratarErro(error, res);
  }
};

// PUT /api/anuncios/:id_anuncio
const updateAnuncio = async (req, res) => {
  try {
    const { titulo, mensagem } = req.body;
    const atualizado = await anuncioService.actualizarAnuncio(
      req.params.id_anuncio,
      req.user.id,
      { titulo, mensagem }
    );
    res.status(200).json(atualizado);
  } catch (error) {
    _tratarErro(error, res);
  }
};

// DELETE /api/anuncios/:id_anuncio
const removeAnuncio = async (req, res) => {
  try {
    const resultado = await anuncioService.eliminarAnuncio(req.params.id_anuncio, req.user.id);
    res.status(200).json(resultado);
  } catch (error) {
    _tratarErro(error, res);
  }
};

// ─────────────────────────────────────────────────────────────
// PUBLICAÇÃO COM NOTIFICAÇÕES
// ─────────────────────────────────────────────────────────────

// POST /api/anuncios/evento/:id_evento
const publicarNoEvento = async (req, res) => {
  try {
    const { titulo, mensagem } = req.body;
    const novo = await anuncioService.publicarAnuncioNoEvento(
      req.params.id_evento,
      req.user.id,
      { titulo, mensagem }
    );
    res.status(201).json(novo);
  } catch (error) {
    _tratarErro(error, res);
  }
};

// POST /api/anuncios/grupo/:id_grupo
const publicarNoGrupo = async (req, res) => {
  try {
    const { titulo, mensagem } = req.body;
    const novo = await anuncioService.publicarAnuncioNoGrupo(
      req.params.id_grupo,
      req.user.id,
      { titulo, mensagem }
    );
    res.status(201).json(novo);
  } catch (error) {
    _tratarErro(error, res);
  }
};

// ─────────────────────────────────────────────────────────────
// LISTAGENS FILTRADAS
// ─────────────────────────────────────────────────────────────

// GET /api/anuncios/evento/:id_evento
const getAnunciosByEvento = async (req, res) => {
  try {
    const anuncios = await anuncioService.listarAnunciosDoEvento(req.params.id_evento);
    res.status(200).json(anuncios);
  } catch (error) {
    _tratarErro(error, res);
  }
};

// GET /api/anuncios/grupo/:id_grupo
const getAnunciosByGrupo = async (req, res) => {
  try {
    const anuncios = await anuncioService.listarAnunciosDoGrupo(req.params.id_grupo);
    res.status(200).json(anuncios);
  } catch (error) {
    _tratarErro(error, res);
  }
};

// ─────────────────────────────────────────────────────────────
// EXPORTAÇÕES
// ─────────────────────────────────────────────────────────────
module.exports = {
  createAnuncio,
  getAllAnuncios,
  getAnuncioById,
  updateAnuncio,
  removeAnuncio,
  publicarNoEvento,
  publicarNoGrupo,
  getAnunciosByEvento,
  getAnunciosByGrupo,
};