const coachingAlunoService = require('../services/coachingAlunoService');

function _handleError(res, error) {
  const mensagemOriginal = error?.message || 'Erro interno no servidor.';
  const mensagemMinuscula = mensagemOriginal.toLowerCase();

  if (
    mensagemMinuscula.includes('não encontrado') ||
    mensagemMinuscula.includes('não pertence') ||
    mensagemMinuscula.includes('não está ativo') ||
    mensagemMinuscula.includes('não leciona')
  ) {
    return res.status(404).json({ message: mensagemOriginal });
  }
  // CORREÇÃO: 'não tem permissão' era mapeado para 400 em vez de 403
  if (mensagemMinuscula.includes('não tem permissão')) {
    return res.status(403).json({ message: mensagemOriginal });
  }
  if (
    mensagemMinuscula.includes('obrigatório') ||
    mensagemMinuscula.includes('inválido') ||
    mensagemMinuscula.includes('já existe') ||
    mensagemMinuscula.includes('já tem') ||
    mensagemMinuscula.includes('coincide') ||
    mensagemMinuscula.includes('expirou') ||
    mensagemMinuscula.includes('não cabe') ||
    mensagemMinuscula.includes('já não está disponível') ||
    mensagemMinuscula.includes('conflito') ||
    mensagemMinuscula.includes('só é possível') ||
    mensagemMinuscula.includes('só podem') ||
    mensagemMinuscula.includes('só são') ||
    mensagemMinuscula.includes('não está aberta') ||
    mensagemMinuscula.includes('não está aberto') ||
    mensagemMinuscula.includes('ano letivo') ||
    mensagemMinuscula.includes('não existe') ||
    mensagemMinuscula.includes('não tem permissão de coaching') ||
    mensagemMinuscula.includes('dentro da disponibilidade')
  ) {
    return res.status(400).json({ message: mensagemOriginal });
  }
  return res.status(500).json({ message: 'Erro interno no servidor.', error: mensagemOriginal });
}

const consultarDisponibilidades = async (req, res) => {
  try {
    const { id_modalidade, data } = req.query;

    // CORREÇÃO: data não era validada quanto ao formato
    if (data && isNaN(new Date(data).getTime())) {
      return res.status(400).json({ message: 'data tem formato inválido.' });
    }

    const filtros = {};
    if (id_modalidade) filtros.id_modalidade = Number(id_modalidade);
    if (data) filtros.data = data;

    const disponibilidades = await coachingAlunoService.consultarDisponibilidades(filtros);
    return res.status(200).json(disponibilidades);
  } catch (error) {
    return _handleError(res, error);
  }
};

const solicitarMarcacao = async (req, res) => {
  try {
    const id_aluno = req.user?.id;
    const dados = req.body;

    if (!dados.id_docente || !dados.id_modalidade || !dados.data_a_realizar || !dados.hora_inicio || !dados.duracao_minutos) {
      return res.status(400).json({ message: 'id_docente, id_modalidade, data_a_realizar, hora_inicio e duracao_minutos são obrigatórios.' });
    }

    // CORREÇÃO: data_a_realizar não era validada quanto ao formato
    if (isNaN(new Date(dados.data_a_realizar).getTime())) {
      return res.status(400).json({ message: 'data_a_realizar tem formato inválido.' });
    }
    const today = new Date().toISOString().split('T')[0];
    if (new Date(dados.data_a_realizar).toISOString().split('T')[0] < today) {
      return res.status(400).json({ message: 'data_a_realizar não pode ser no passado.' });
    }

    const marcacao = await coachingAlunoService.solicitarMarcacao(id_aluno, dados);
    return res.status(201).json({ message: 'Pedido de marcação enviado com sucesso.', details: marcacao });
  } catch (error) {
    return _handleError(res, error);
  }
};

const listarMeusPedidos = async (req, res) => {
  try {
    const id_aluno = req.user?.id;
    const { id_estado } = req.query;
    const filtros = {};
    if (id_estado) filtros.id_estado = Number(id_estado);

    const pedidos = await coachingAlunoService.listarMeusPedidos(id_aluno, filtros);
    return res.status(200).json(pedidos);
  } catch (error) {
    return _handleError(res, error);
  }
};

const cancelarPedidoPendente = async (req, res) => {
  try {
    const id_aluno = req.user?.id;
    const { id_marcacao } = req.params;

    if (!id_marcacao) {
      return res.status(400).json({ message: 'id_marcacao é obrigatório.' });
    }

    const marcacao = await coachingAlunoService.cancelarPedidoPendente(id_aluno, Number(id_marcacao));
    return res.status(200).json({ message: 'Pedido cancelado com sucesso.', details: marcacao });
  } catch (error) {
    return _handleError(res, error);
  }
};

const confirmarPresencaGrupo = async (req, res) => {
  try {
    const id_aluno = req.user?.id;
    const { id_marcacao, aceitar } = req.body;

    if (!id_marcacao || aceitar === undefined) {
      return res.status(400).json({ message: 'id_marcacao e aceitar são obrigatórios.' });
    }

    const resultado = await coachingAlunoService.confirmarPresencaGrupo(id_aluno, Number(id_marcacao), Boolean(aceitar));
    return res.status(200).json(resultado);
  } catch (error) {
    return _handleError(res, error);
  }
};

const validarConclusaoSessao = async (req, res) => {
  try {
    const id_aluno = req.user?.id;
    const { id_marcacao } = req.params;

    if (!id_marcacao) {
      return res.status(400).json({ message: 'id_marcacao é obrigatório.' });
    }

    const resultado = await coachingAlunoService.validarConclusaoSessao(id_aluno, Number(id_marcacao));
    return res.status(200).json(resultado);
  } catch (error) {
    return _handleError(res, error);
  }
};

const listarColegas = async (req, res) => {
  try {
    // req.user is populated by tokenValidation
    const id_aluno = req.user.id || req.user.id_utilizador;
    const colegas = await coachingAlunoService.listarColegas(id_aluno);
    return res.status(200).json(colegas);
  } catch (error) {
    return _handleError(res, error);
  }
};

module.exports = {
  consultarDisponibilidades,
  solicitarMarcacao,
  listarMeusPedidos,
  cancelarPedidoPendente,
  confirmarPresencaGrupo,
  validarConclusaoSessao,
  listarColegas,
};
