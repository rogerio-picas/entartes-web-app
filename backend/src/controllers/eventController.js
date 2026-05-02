// src/controllers/eventoController.js
const eventService = require("../services/eventService");
// CORREÇÃO: importação de editarGrupo não era usada neste controlador

const criarEvento = async (req, res) => {
  try {
    console.log("Conteúdo do req.user:", req.user);

    const { data_de_realizacao } = req.body;
    if (data_de_realizacao) {
      if (isNaN(new Date(data_de_realizacao).getTime())) {
        return res.status(400).json({ error: "Data de realizacao tem formato inválido." });
      }
      const today = new Date().toISOString().split('T')[0];
      if (new Date(data_de_realizacao).toISOString().split('T')[0] < today) {
        return res.status(400).json({ error: "Data de realizacao não pode ser no passado." });
      }
    }

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
    const { estado } = req.query; // lê o ?estado=X da URL
    const eventos = await eventService.listarEventos(estado);
    return res.status(200).json(eventos);
  } catch (error) {
    return res.status(500).json({ error: "Erro ao listar eventos." });
  }
};

const listarMeusEventos = async (req, res) => {
  try {
    const id_utilizador = req.user.id;
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
    // CORREÇÃO: ID do parâmetro não era validado antes de chamar o serviço
    const id = parseInt(req.params.id);
    if (isNaN(id)) return res.status(400).json({ error: "ID do evento inválido." });

    const evento = await eventService.buscarEventoPorId(id);
    return res.status(200).json(evento);
  } catch (error) {
    return res.status(404).json({ error: error.message });
  }
};

const adicionarParticipante = async (req, res) => {
  try {
    const { id } = req.params;
    const { codigo_username } = req.body;

    // CORREÇÃO: ID do evento não era validado antes de chamar o serviço
    const eventoId = parseInt(id);
    if (isNaN(eventoId)) return res.status(400).json({ error: "ID do evento inválido." });

    if (!codigo_username) {
      return res.status(400).json({
        error: "O código de utilizador é obrigatório.",
      });
    }

    const resultado = await eventService.adicionarParticipante(
      eventoId,
      codigo_username,
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

    // CORREÇÃO: ID do evento não era validado antes de chamar o serviço
    const eventoId = parseInt(id);
    if (isNaN(eventoId)) return res.status(400).json({ error: "ID do evento inválido." });

    if (!nome && !descricao && !data_de_realizacao) {
      return res.status(400).json({
        error: "Pelo menos um campo deve ser fornecido para edição.",
      });
    }

    // CORREÇÃO: data_de_realizacao não era validada quanto ao formato
    if (data_de_realizacao && isNaN(new Date(data_de_realizacao).getTime())) {
      return res.status(400).json({ error: "data_de_realizacao tem formato inválido." });
    }
    if (data_de_realizacao) {
      const today = new Date().toISOString().split('T')[0];
      if (new Date(data_de_realizacao).toISOString().split('T')[0] < today) {
        return res.status(400).json({ error: "data de realizacao não pode ser no passado." });
      }
    }

    const eventoAtualizado = await eventService.editarEvento(eventoId, req.body);

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
    // CORREÇÃO: IDs dos parâmetros não eram validados antes de chamar o serviço
    const eventoId = parseInt(req.params.id);
    const alunoId  = parseInt(req.params.id_aluno);
    if (isNaN(eventoId)) return res.status(400).json({ error: "ID do evento inválido." });
    if (isNaN(alunoId))  return res.status(400).json({ error: "ID do aluno inválido." });

    const resultado = await eventService.removerAlunoDoEvento(eventoId, alunoId);
    return res.status(200).json(resultado);
  } catch (error) {
    return res.status(400).json({ error: error.message });
  }
};

const removerDocenteDoEvento = async (req, res) => {
  try {
    // CORREÇÃO: IDs dos parâmetros não eram validados antes de chamar o serviço
    const eventoId   = parseInt(req.params.id);
    const docenteId  = parseInt(req.params.id_docente);
    if (isNaN(eventoId))  return res.status(400).json({ error: "ID do evento inválido." });
    if (isNaN(docenteId)) return res.status(400).json({ error: "ID do docente inválido." });

    const resultado = await eventService.removerDocenteDoEvento(eventoId, docenteId);
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