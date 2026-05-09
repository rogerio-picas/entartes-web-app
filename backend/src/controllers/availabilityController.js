
const availabilityService = require('../services/availabilityService');

/**
 * CONTROLLER - Camada de apresentação HTTP
 * Apenas mapeia requisições HTTP para chamadas de serviço
 */

/**
 * POST /api/disponibilidades
 * Cria uma nova disponibilidade
 */
const criarDisponibilidade = async (req, res) => {
  try {
    const { id: id_utilizador, role: id_tipo } = req.user;

    // Chamar serviço (validação de rol já foi feita pelo middleware)
    const novaDisponibilidade = await availabilityService.criarDisponibilidade(
      id_utilizador,
      req.body
    );

    res.status(201).json({
      message: "Disponibilidade criada com sucesso!",
      data: novaDisponibilidade,
    });
  } catch (error) {
    res.status(error.message.includes("Apenas docentes") ? 403 : 400).json({
      message: error.message,
    });
  }
};

/**
 * GET /api/disponibilidades
 * Lista todas as disponibilidades do docente autenticado
 */
const listarDisponibilidades = async (req, res) => {
  try {
    const { id: id_utilizador } = req.user;

    // Chamar serviço (validação de rol já foi feita pelo middleware)
    const disponibilidades = await availabilityService.listarDisponibilidades(id_utilizador);

    res.status(200).json({
      message: "Disponibilidades listadas com sucesso!",
      data: disponibilidades,
    });
  } catch (error) {
    res.status(403).json({
      message: error.message,
    });
  }
};

/**
 * PUT /api/disponibilidades/:id_disponibilidade
 * Atualiza uma disponibilidade existente
 */
const updateAvailability = async (req, res) => {
  try {
    const { id: id_utilizador } = req.user;
    const { id_disponibilidade } = req.params;

    // Chamar serviço (validação de rol já foi feita pelo middleware)
    const disponibilidadeAtualizada = await availabilityService.atualizarDisponibilidade(
      id_disponibilidade,
      id_utilizador,
      req.body
    );

    res.status(200).json({
      message: "Disponibilidade atualizada com sucesso!",
      data: disponibilidadeAtualizada,
    });
  } catch (error) {

    if (error.message.includes("Apenas docentes")) {
      return res.status(403).json({ message: error.message });
    }
    if (error.message.includes("não encontrada")) {
      return res.status(404).json({ message: error.message });
    }

    res.status(400).json({ message: error.message });
  }
};

/**
 * DELETE /api/disponibilidades/:id_disponibilidade
 * Remove uma disponibilidade
 */
const deleteAvailability = async (req, res) => {
  try {
    const { id: id_utilizador } = req.user;
    const { id_disponibilidade } = req.params;

    // Chamar serviço (validação de rol já foi feita pelo middleware)
    const resultado = await availabilityService.eliminarDisponibilidade(
      id_disponibilidade,
      id_utilizador
    );

    res.status(200).json(resultado);
  } catch (error) {

    if (error.message.includes("Apenas docentes")) {
      return res.status(403).json({ message: error.message });
    }
    if (error.message.includes("não encontrada")) {
      return res.status(404).json({ message: error.message });
    }
    if (error.message.includes("marcação ativa")) {
      return res.status(400).json({ message: error.message });
    }
    if (error.code === 'P2003') {
      return res.status(400).json({ 
        message: "Erro: Esta disponibilidade está a ser usada noutro registo." 
      });
    }

    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  criarDisponibilidade,
  listarDisponibilidades,
  updateAvailability,
  deleteAvailability,
};