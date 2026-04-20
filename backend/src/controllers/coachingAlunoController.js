const coachingAlunoService = require('../services/coachingAlunoService');

function _handleError(res, error) {
  const mensagem = error?.message || 'Erro interno no servidor.';
  if (mensagem.includes('não encontrado') || mensagem.includes('não pertence')) {
    return res.status(404).json({ message: mensagem });
  }
  if (
    mensagem.includes('obrigatório') ||
    mensagem.includes('inválido') ||
    mensagem.includes('já existe') ||
    mensagem.includes('não tem permissão') ||
    mensagem.includes('coincide') ||
    mensagem.includes('expirou') ||
    mensagem.includes('já não está disponível')
  ) {
    return res.status(400).json({ message: mensagem });
  }
  console.error('[coachingAlunoController]', error);
  return res.status(500).json({ message: 'Erro interno no servidor.', error: mensagem });
}

const consultarDisponibilidades = async (req, res) => {
  try {
    const { id_modalidade, data } = req.query;
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
    const {
      id_docente,
      id_modalidade,
      data_a_realizar,
      hora_inicio,
      duracao_minutos,
      numero_alunos_pretendidos = 1,
    } = req.body;

    if (!id_docente || !id_modalidade || !data_a_realizar || !hora_inicio || !duracao_minutos) {
      return res.status(400).json({ message: 'Todos os campos são obrigatórios: id_docente, id_modalidade, data_a_realizar, hora_inicio, duracao_minutos.' });
    }

    const marcacao = await coachingAlunoService.solicitarMarcacao(id_aluno, {
      id_docente: Number(id_docente),
      id_modalidade: Number(id_modalidade),
      data_a_realizar,
      hora_inicio,
      duracao_minutos: Number(duracao_minutos),
      numero_alunos_pretendidos: Number(numero_alunos_pretendidos),
    });

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

module.exports = {
  consultarDisponibilidades,
  solicitarMarcacao,
  listarMeusPedidos,
  cancelarPedidoPendente,
  confirmarPresencaGrupo,
  validarConclusaoSessao,
};
