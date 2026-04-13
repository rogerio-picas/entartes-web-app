// src/controllers/eventoController.js
const eventService = require("../services/eventService");

const criarEvento = async (req, res) => {
  try {
    console.log("Conteúdo do req.user:", req.user);

    const id_coordenadora = req.user.id;
    const evento = await eventService.criarEvento(req.body, id_coordenadora);

    return res.status(201).json({
      mensagem: "Evento criado com sucesso.",
      evento,
    });
  } catch (error) {
    return res.status(400).json({ error: error.message });
  }
};

const listarEventos = async (req, res) => {
  try {
    const eventos = await eventService.listarEventos();
    return res.status(200).json(eventos);
  } catch (error) {
    return res.status(500).json({ error: "Erro ao listar eventos." });
  }
};

const buscarEventoPorId = async (req, res) => {
  try {
    const evento = await eventService.buscarEventoPorId(req.params.id);
    return res.status(200).json(evento);
  } catch (error) {
    return res.status(404).json({ error: error.message });
  }
};

const adicionarParticipante = async (req, res) => {
  try {
    // id do evento vem na URL  → /eventos/5/participantes
    const { id } = req.params;

    // id do utilizador e tipo vêm no body
    // { "id_utilizador": 3, "tipo": "aluno" }
    const { id_utilizador, tipo } = req.body;

    if (!id_utilizador || !tipo) {
      return res.status(400).json({
        error: "id_utilizador e tipo são obrigatórios.",
      });
    }

    const resultado = await eventService.adicionarParticipante(
      id,
      id_utilizador,
      tipo
    );

    return res.status(201).json(resultado);
  } catch (error) {
    return res.status(400).json({ error: error.message });
  }
};

const listarParticipantes = async (req, res) => {
  try {
    const { id } = req.params;
    const participantes = await eventService.listarParticipantes(id);
    return res.status(200).json(participantes);
  } catch (error) {
    return res.status(404).json({ error: error.message });
  }
};

module.exports = {
  criarEvento,
  listarEventos,
  buscarEventoPorId,
  adicionarParticipante,
  listarParticipantes,
};