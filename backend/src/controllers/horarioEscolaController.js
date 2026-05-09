// src/controllers/horarioEscolaController.js
const horarioEscolaService = require('../services/horarioEscolaService');

exports.getHorarioEscola = async (req, res) => {
  try {
    const horario = await horarioEscolaService.obterHorarioEscola();
    res.json(horario || {});
  } catch (error) {
    console.error('Erro em getHorarioEscola:', error);
    res.status(500).json({ message: 'Erro ao obter o horário da escola.' });
  }
};

exports.updateHorarioEscola = async (req, res) => {
  try {
    const { data_inicio, data_fim, hora_inicio, hora_fim, dias_semana } = req.body;

    // Validação básica
    if (!data_inicio || !data_fim || !hora_inicio || !hora_fim || !Array.isArray(dias_semana)) {
      return res.status(400).json({ message: 'Todos os campos (data_inicio, data_fim, hora_inicio, hora_fim, dias_semana) são obrigatórios.' });
    }

    const horario = await horarioEscolaService.atualizarHorarioEscola(data_inicio, data_fim, hora_inicio, hora_fim, dias_semana);
    res.json({ message: 'Horário atualizado com sucesso.', data: horario });
  } catch (error) {
    console.error('Erro em updateHorarioEscola:', error);
    res.status(500).json({ message: error.message || 'Erro ao atualizar o horário da escola.' });
  }
};
