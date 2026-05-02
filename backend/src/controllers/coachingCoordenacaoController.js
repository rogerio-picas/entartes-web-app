const coordenacaoService = require('../services/coachingCoordenacaoService');

function _parseEstados(estados) {
  if (!estados) return null;
  if (Array.isArray(estados)) return estados.map(Number).filter(Boolean);
  return estados
    .toString()
    .split(',')
    .map((item) => Number(item.trim()))
    .filter(Boolean);
}

function _handleError(res, error) {
  const mensagem = error?.message || 'Erro interno no servidor.';
  if (mensagem.includes('não encontrada') || mensagem.includes('não encontrado')) {
    return res.status(404).json({ message: mensagem });
  }
  // CORREÇÃO: erros de permissão não tinham mapeamento para 403
  if (mensagem.includes('não tem permissão') || mensagem.includes('Sem permissão')) {
    return res.status(403).json({ message: mensagem });
  }
  if (
    mensagem.includes('obrigatório') ||
    mensagem.includes('válido') ||
    mensagem.includes('Só é possível') ||
    mensagem.includes('já está') ||
    mensagem.includes('Escolhe outra sala')
  ) {
    return res.status(400).json({ message: mensagem });
  }
  console.error('[coordenacaoController]', error);
  return res.status(500).json({ message: 'Erro interno no servidor.', error: mensagem });
}

const listarPedidosPendentes = async (req, res) => {
  try {
    const estados = _parseEstados(req.query.estados);
    const data_inicio = req.query.data_inicio || null;
    const data_fim    = req.query.data_fim    || null;

    // CORREÇÃO: datas não eram validadas quanto ao formato nem à ordem (fim >= início)
    if (data_inicio && isNaN(new Date(data_inicio).getTime())) {
      return res.status(400).json({ message: 'data_inicio tem formato inválido.' });
    }
    if (data_fim && isNaN(new Date(data_fim).getTime())) {
      return res.status(400).json({ message: 'data_fim tem formato inválido.' });
    }
    if (data_inicio && data_fim && new Date(data_fim) <= new Date(data_inicio)) {
      return res.status(400).json({ message: 'data_fim deve ser posterior a data_inicio.' });
    }

    const pedidos = await coordenacaoService.listarPedidosPendentes({ estados, data_inicio, data_fim });
    return res.status(200).json(pedidos);
  } catch (error) {
    return _handleError(res, error);
  }
};

const confirmarMarcacao = async (req, res) => {
  try {
    const id_coordenadora = req.user?.id;
    const { id_marcacao, id_sala } = req.body;

    if (!id_marcacao || !id_sala) {
      return res.status(400).json({ message: 'id_marcacao e id_sala são obrigatórios.' });
    }

    const marcacao = await coordenacaoService.atribuirSalaEConfirmar(
      Number(id_coordenadora),
      Number(id_marcacao),
      Number(id_sala)
    );

    return res.status(200).json({ message: 'Marcação confirmada com sucesso.', details: marcacao });
  } catch (error) {
    return _handleError(res, error);
  }
};

const rejeitarMarcacao = async (req, res) => {
  try {
    const id_coordenadora = req.user?.id;
    const { id_marcacao, motivo } = req.body;

    if (!id_marcacao || !motivo) {
      return res.status(400).json({ message: 'id_marcacao e motivo são obrigatórios.' });
    }

    const marcacao = await coordenacaoService.rejeitarMarcacao(
      Number(id_coordenadora),
      Number(id_marcacao),
      motivo
    );

    return res.status(200).json({ message: 'Marcação rejeitada com sucesso.', details: marcacao });
  } catch (error) {
    return _handleError(res, error);
  }
};

const cancelarMarcacaoConfirmada = async (req, res) => {
  try {
    const id_coordenadora = req.user?.id;
    const { id_marcacao, motivo } = req.body;

    if (!id_marcacao || !motivo) {
      return res.status(400).json({ message: 'id_marcacao e motivo são obrigatórios.' });
    }

    const marcacao = await coordenacaoService.cancelarMarcacaoConfirmada(
      Number(id_coordenadora),
      Number(id_marcacao),
      motivo
    );

    return res.status(200).json({ message: 'Marcação confirmada cancelada com sucesso.', details: marcacao });
  } catch (error) {
    return _handleError(res, error);
  }
};

const reatribuirSala = async (req, res) => {
  try {
    const id_coordenadora = req.user?.id;
    const { id_marcacao, nova_id_sala } = req.body;

    if (!id_marcacao || !nova_id_sala) {
      return res.status(400).json({ message: 'id_marcacao e nova_id_sala são obrigatórios.' });
    }

    const marcacao = await coordenacaoService.reatribuirSala(
      Number(id_coordenadora),
      Number(id_marcacao),
      Number(nova_id_sala)
    );

    return res.status(200).json({ message: 'Sala reatribuída com sucesso.', details: marcacao });
  } catch (error) {
    return _handleError(res, error);
  }
};

const concluirMarcacao = async (req, res) => {
  try {
    const id_coordenadora = req.user?.id;
    const { id_marcacao } = req.body;

    if (!id_marcacao) {
      return res.status(400).json({ message: 'id_marcacao é obrigatório.' });
    }

    const marcacao = await coordenacaoService.concluirMarcacao(
      Number(id_coordenadora),
      Number(id_marcacao)
    );

    return res.status(200).json({ message: 'Sessão concluída com sucesso.', details: marcacao });
  } catch (error) {
    return _handleError(res, error);
  }
};

const consultarSalasDisponiveis = async (req, res) => {
  try {
    const { data_a_realizar, hora_inicio, duracao_minutos } = req.query;

    if (!data_a_realizar || !hora_inicio || !duracao_minutos) {
      return res.status(400).json({ message: 'data_a_realizar, hora_inicio e duracao_minutos são obrigatórios.' });
    }

    // CORREÇÃO: data_a_realizar não era validada quanto ao formato
    if (isNaN(new Date(data_a_realizar).getTime())) {
      return res.status(400).json({ message: 'data_a_realizar tem formato inválido.' });
    }

    const salas = await coordenacaoService.consultarSalasDisponiveis(
      data_a_realizar,
      hora_inicio,
      Number(duracao_minutos)
    );

    return res.status(200).json(salas);
  } catch (error) {
    return _handleError(res, error);
  }
};

const consultarHistoricoMarcacao = async (req, res) => {
  try {
    // CORREÇÃO: id_marcacao existia no parâmetro de rota mas não era validado como inteiro
    const id_marcacao = parseInt(req.params.id_marcacao);
    if (isNaN(id_marcacao)) {
      return res.status(400).json({ message: 'ID da marcação inválido.' });
    }

    const historico = await coordenacaoService.consultarHistoricoMarcacao(id_marcacao);
    return res.status(200).json(historico);
  } catch (error) {
    return _handleError(res, error);
  }
};

module.exports = {
  listarPedidosPendentes,
  confirmarMarcacao,
  rejeitarMarcacao,
  cancelarMarcacaoConfirmada,
  concluirMarcacao,
  reatribuirSala,
  consultarSalasDisponiveis,
  consultarHistoricoMarcacao,
};
