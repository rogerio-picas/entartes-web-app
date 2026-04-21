const docenteService = require('../services/coachingDocenteService');

function _handleError(res, error) {
  const mensagem = error?.message || 'Erro interno no servidor.';
  if (mensagem.includes('não encontrada') || mensagem.includes('não pertence')) {
    return res.status(404).json({ message: mensagem });
  }
  if (
    mensagem.includes('obrigatório') ||
    mensagem.includes('Só é possível') ||
    mensagem.includes('Não é possível')
  ) {
    return res.status(400).json({ message: mensagem });
  }
  console.error('[coachingDocenteController]', error);
  return res.status(500).json({ message: 'Erro interno no servidor.', error: mensagem });
}

const listarMinhasAulas = async (req, res) => {
  try {
    const id_docente = req.user?.id;
    const { id_estado } = req.query;

    const aulas = await docenteService.listarMinhasAulas(Number(id_docente), { id_estado });
    return res.status(200).json(aulas);
  } catch (error) {
    return _handleError(res, error);
  }
};

const validarConclusaoSessao = async (req, res) => {
  try {
    const id_docente = req.user?.id;
    const { id_marcacao } = req.params;

    const resultado = await docenteService.validarConclusaoSessao(Number(id_docente), Number(id_marcacao));
    return res.status(200).json(resultado);
  } catch (error) {
    return _handleError(res, error);
  }
};

const cancelarMarcacao = async (req, res) => {
  try {
    const id_docente = req.user?.id;
    const { id_marcacao } = req.params;
    const { motivo } = req.body;

    const resultado = await docenteService.cancelarMarcacao(Number(id_docente), Number(id_marcacao), motivo);
    return res.status(200).json({ message: 'Sessão cancelada com sucesso.', details: resultado });
  } catch (error) {
    return _handleError(res, error);
  }
};

module.exports = {
  listarMinhasAulas,
  validarConclusaoSessao,
  cancelarMarcacao,
};