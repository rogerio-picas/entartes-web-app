// src/controllers/eventoController.js
const eventService = require("../services/eventService");
const { editarGrupo } = require("./groupController");

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

const listarMeusEventos = async (req, res) => {
  try {
    const id_utilizador = req.user.id;
    const role = req.user.role; // Assuming token sets role, or id_tipo
    // The role is probably req.user.id_tipo or req.user.role. Let's check tokenMiddleware.
    const userRole = req.user.id_tipo || req.user.role;
    if (userRole === 1 || userRole === 2) {
      const eventos = await eventService.listarEventos();
      return res.status(200).json(eventos);
    }
    const eventos = await eventService.listarMeusEventos(id_utilizador, userRole);
    return res.status(200).json(eventos);
  } catch (error) {
    return res.status(500).json({ error: "Erro ao listar meus eventos." });
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
    // { "id_utilizador": 3, "tipo": 3 }
    const { codigo_username } = req.body;

    if (!codigo_username) {
      return res.status(400).json({
        error: "O código de utilizador é obrigatório.",
      });
    }

    const resultado = await eventService.adicionarParticipante(
      id,
      codigo_username,
      //id_tipo
    );

    return res.status(201).json(resultado);
  } catch (error) {
    return res.status(400).json({ error: error.message });
  }
};

const editarEvento = async (req, res) => {
  try {
    const { id } = req.params;
    const { nome, descricao, data_de_realizacao } = req.body;

    if (!nome && !descricao && !data_de_realizacao) {
      return res.status(400).json({
        error: "Pelo menos um campo deve ser fornecido para edição.",
      });
    }

    const eventoAtualizado = await eventService.editarEvento(id, req.body);

    return res.status(200).json({
      mensagem: "Evento atualizado com sucesso.",
      evento: eventoAtualizado,
    });
  } catch (error) {
    console.error("Erro no editarEvento:", error.message);
    return res.status(error.message.includes("não encontrado") ? 404 : 400).json({
      error: error.message,
    });
  }
};

/**
 * Cancela um evento existente
 * DELETE /api/event/:id
 */
const cancelarEvento = async (req, res) => {
  try {
    const { id } = req.params;
    const id_coordenadora = req.user.id;

    if (!id) {
      return res.status(400).json({
        error: "ID do evento é obrigatório.",
      });
    }

    const resultado = await eventService.cancelarEvento(id, id_coordenadora);

    return res.status(200).json(resultado);
  } catch (error) {
    console.error("Erro no cancelarEvento:", error.message);

    if (error.message.includes("não encontrado")) {
      return res.status(404).json({ error: error.message });
    }
    if (error.message.includes("Sem permissão")) {
      return res.status(403).json({ error: error.message });
    }
    if (error.message.includes("já está cancelado")) {
      return res.status(400).json({ error: error.message });
    }

    return res.status(500).json({
      error: "Erro ao cancelar evento.",
      details: error.message,
    });
  }
};

const concluirEvento = async (req, res) => {
  try {
    const { id } = req.params;
    const id_coordenadora = req.user.id;

    const resultado = await eventService.concluirEvento(id, id_coordenadora);
    return res.status(200).json(resultado);
  } catch (error) {
    console.error("Erro no concluirEvento:", error.message);

    if (error.message.includes("não encontrado")) {
      return res.status(404).json({ error: error.message });
    }
    if (error.message.includes("Sem permissão")) {
      return res.status(403).json({ error: error.message });
    }
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

const removerAlunoDoEvento = async (req, res) => {
  try {
    const resultado = await eventService.removerAlunoDoEvento(req.params.id, req.params.id_aluno);
    return res.status(200).json(resultado);
  } catch (error) {
    return res.status(400).json({ error: error.message });
  }
};

const removerDocenteDoEvento = async (req, res) => {
  try {
    const resultado = await eventService.removerDocenteDoEvento(req.params.id, req.params.id_docente);
    return res.status(200).json(resultado);
  } catch (error) {
    return res.status(400).json({ error: error.message });
  }
};

module.exports = {
  criarEvento,
  listarEventos,
  listarMeusEventos,
  editarEvento,
  cancelarEvento,
  concluirEvento,
  buscarEventoPorId,
  adicionarParticipante,
  listarParticipantes,
  removerAlunoDoEvento,
  removerDocenteDoEvento,
};