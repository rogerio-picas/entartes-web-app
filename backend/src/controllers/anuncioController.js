// src/controllers/anuncio.controller.js
const anuncioService = require('../services/anuncioService');

// POST /api/anuncios
const createAnuncio = async (req, res) => {
  try {
    const { titulo, mensagem, id_evento, id_grupo } = req.body;
    const novo = await anuncioService.criarAnuncio(req.user.id, { titulo, mensagem, id_evento, id_grupo });
    res.status(201).json(novo);
  } catch (error) {
    console.error('createAnuncio:', error);
    res.status(500).json({ error: 'Erro interno do servidor.' });
  }
};

// GET /api/anuncios
const getAllAnuncios = async (req, res) => {
  try {
    const anuncios = await anuncioService.listarTodosAnuncios();
    res.status(200).json(anuncios);
  } catch (error) {
    console.error('getAllAnuncios:', error);
    res.status(500).json({ error: 'Erro interno do servidor.' });
  }
};

// GET /api/anuncios/:id_anuncio
const getAnuncioById = async (req, res) => {
  try {
    const anuncio = await anuncioService.obterAnuncioPorId(req.params.id_anuncio);
    res.status(200).json(anuncio);
  } catch (error) {
    console.error('getAnuncioById:', error);
    res.status(500).json({ error: 'Erro interno do servidor.' });
  }
};

// PUT /api/anuncios/:id_anuncio
const updateAnuncio = async (req, res) => {
  try {
    const { titulo, mensagem } = req.body;
    const atualizado = await anuncioService.actualizarAnuncio(req.params.id_anuncio, req.user.id, { titulo, mensagem });
    res.status(200).json(atualizado);
  } catch (error) {
    console.error('updateAnuncio:', error);
    res.status(500).json({ error: 'Erro interno do servidor.' });
  }
};

// DELETE /api/anuncios/:id_anuncio
const removeAnuncio = async (req, res) => {
  try {
    const resultado = await anuncioService.eliminarAnuncio(req.params.id_anuncio, req.user.id);
    res.status(200).json(resultado);
  } catch (error) {
    console.error('removeAnuncio:', error);
    res.status(500).json({ error: 'Erro interno do servidor.' });
  }
};

// POST /api/anuncios/evento/:id_evento
const publicarNoEvento = async (req, res) => {
  try {
    const { titulo, mensagem } = req.body;
    const novo = await anuncioService.publicarAnuncioNoEvento(req.params.id_evento, req.user.id, { titulo, mensagem });
    res.status(201).json(novo);
  } catch (error) {
    console.error('publicarNoEvento:', error);
    res.status(500).json({ error: 'Erro interno do servidor.' });
  }
};

// POST /api/anuncios/grupo/:id_grupo
const publicarNoGrupo = async (req, res) => {
  try {
    const { titulo, mensagem } = req.body;
    const novo = await anuncioService.publicarAnuncioNoGrupo(req.params.id_grupo, req.user.id, { titulo, mensagem });
    res.status(201).json(novo);
  } catch (error) {
    console.error('publicarNoGrupo:', error);
    res.status(500).json({ error: 'Erro interno do servidor.' });
  }
};

// GET /api/anuncios/evento/:id_evento
const getAnunciosByEvento = async (req, res) => {
  try {
    const anuncios = await anuncioService.listarAnunciosDoEvento(req.params.id_evento);
    res.status(200).json(anuncios);
  } catch (error) {
    console.error('getAnunciosByEvento:', error);
    res.status(500).json({ error: 'Erro interno do servidor.' });
  }
};

// GET /api/anuncios/grupo/:id_grupo
const getAnunciosByGrupo = async (req, res) => {
  try {
    const anuncios = await anuncioService.listarAnunciosDoGrupo(req.params.id_grupo);
    res.status(200).json(anuncios);
  } catch (error) {
    console.error('getAnunciosByGrupo:', error);
    res.status(500).json({ error: 'Erro interno do servidor.' });
  }
};

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