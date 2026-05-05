'use strict';

jest.mock('../../services/coachingCoordenacaoService');

const coachingCoordenacaoController = require('../../controllers/coachingCoordenacaoController');
const coordenacaoService            = require('../../services/coachingCoordenacaoService');

const mockReqRes = (overrides = {}) => {
  const req = { params: {}, body: {}, query: {}, user: { id: 1 }, ...overrides };
  const res = { status: jest.fn().mockReturnThis(), json: jest.fn().mockReturnThis() };
  return { req, res };
};

describe('coachingCoordenacaoController', () => {
  beforeEach(() => jest.clearAllMocks());

  // ── listarPedidosPendentes ────────────────────────────────────────────────

  describe('listarPedidosPendentes', () => {
    it('retorna 400 quando data_inicio tem formato inválido', async () => {
      const { req, res } = mockReqRes({ query: { data_inicio: 'invalida' } });
      await coachingCoordenacaoController.listarPedidosPendentes(req, res);
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ message: 'data_inicio tem formato inválido.' });
      expect(coordenacaoService.listarPedidosPendentes).not.toHaveBeenCalled();
    });

    it('retorna 400 quando data_fim tem formato inválido', async () => {
      const { req, res } = mockReqRes({ query: { data_fim: 'invalida' } });
      await coachingCoordenacaoController.listarPedidosPendentes(req, res);
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ message: 'data_fim tem formato inválido.' });
    });

    it('retorna 400 quando data_fim não é posterior a data_inicio', async () => {
      const { req, res } = mockReqRes({ query: { data_inicio: '2099-06-01', data_fim: '2099-05-01' } });
      await coachingCoordenacaoController.listarPedidosPendentes(req, res);
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ message: 'data_fim deve ser posterior a data_inicio.' });
    });

    it('retorna 200 com lista de pedidos', async () => {
      coordenacaoService.listarPedidosPendentes.mockResolvedValue([{ id_marcacao: 1 }]);
      const { req, res } = mockReqRes({ query: {} });
      await coachingCoordenacaoController.listarPedidosPendentes(req, res);
      expect(res.status).toHaveBeenCalledWith(200);
    });
  });

  // ── confirmarMarcacao ─────────────────────────────────────────────────────

  describe('confirmarMarcacao', () => {
    it('retorna 400 quando id_marcacao ou id_sala estão em falta', async () => {
      const { req, res } = mockReqRes({ body: { id_marcacao: 1 } });
      await coachingCoordenacaoController.confirmarMarcacao(req, res);
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ message: 'id_marcacao e id_sala são obrigatórios.' });
    });

    it('retorna 200 quando confirma com sucesso', async () => {
      coordenacaoService.atribuirSalaEConfirmar.mockResolvedValue({ id_marcacao: 1 });
      const { req, res } = mockReqRes({ body: { id_marcacao: 1, id_sala: 2 } });
      await coachingCoordenacaoController.confirmarMarcacao(req, res);
      expect(res.status).toHaveBeenCalledWith(200);
    });

    it('retorna 404 quando o service lança "não encontrada"', async () => {
      coordenacaoService.atribuirSalaEConfirmar.mockRejectedValue(new Error('Marcação não encontrada.'));
      const { req, res } = mockReqRes({ body: { id_marcacao: 99, id_sala: 1 } });
      await coachingCoordenacaoController.confirmarMarcacao(req, res);
      expect(res.status).toHaveBeenCalledWith(404);
    });

    it('retorna 400 quando o service lança "Escolhe outra sala"', async () => {
      coordenacaoService.atribuirSalaEConfirmar.mockRejectedValue(new Error('Escolhe outra sala, esta está ocupada.'));
      const { req, res } = mockReqRes({ body: { id_marcacao: 1, id_sala: 2 } });
      await coachingCoordenacaoController.confirmarMarcacao(req, res);
      expect(res.status).toHaveBeenCalledWith(400);
    });
  });

  // ── rejeitarMarcacao ──────────────────────────────────────────────────────

  describe('rejeitarMarcacao', () => {
    it('retorna 400 quando id_marcacao ou motivo estão em falta', async () => {
      const { req, res } = mockReqRes({ body: { id_marcacao: 1 } });
      await coachingCoordenacaoController.rejeitarMarcacao(req, res);
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ message: 'id_marcacao e motivo são obrigatórios.' });
    });

    it('retorna 200 quando rejeita com sucesso', async () => {
      coordenacaoService.rejeitarMarcacao.mockResolvedValue({ id_marcacao: 1 });
      const { req, res } = mockReqRes({ body: { id_marcacao: 1, motivo: 'indisponibilidade' } });
      await coachingCoordenacaoController.rejeitarMarcacao(req, res);
      expect(res.status).toHaveBeenCalledWith(200);
    });

    it('retorna 403 quando o service lança "Sem permissão"', async () => {
      coordenacaoService.rejeitarMarcacao.mockRejectedValue(new Error('Sem permissão para rejeitar.'));
      const { req, res } = mockReqRes({ body: { id_marcacao: 1, motivo: 'x' } });
      await coachingCoordenacaoController.rejeitarMarcacao(req, res);
      expect(res.status).toHaveBeenCalledWith(403);
    });
  });

  // ── cancelarMarcacaoConfirmada ────────────────────────────────────────────

  describe('cancelarMarcacaoConfirmada', () => {
    it('retorna 400 quando id_marcacao ou motivo estão em falta', async () => {
      const { req, res } = mockReqRes({ body: { motivo: 'x' } });
      await coachingCoordenacaoController.cancelarMarcacaoConfirmada(req, res);
      expect(res.status).toHaveBeenCalledWith(400);
    });

    it('retorna 200 quando cancela com sucesso', async () => {
      coordenacaoService.cancelarMarcacaoConfirmada.mockResolvedValue({ id_marcacao: 1 });
      const { req, res } = mockReqRes({ body: { id_marcacao: 1, motivo: 'motivo' } });
      await coachingCoordenacaoController.cancelarMarcacaoConfirmada(req, res);
      expect(res.status).toHaveBeenCalledWith(200);
    });
  });

  // ── reatribuirSala ────────────────────────────────────────────────────────

  describe('reatribuirSala', () => {
    it('retorna 400 quando id_marcacao ou nova_id_sala estão em falta', async () => {
      const { req, res } = mockReqRes({ body: { id_marcacao: 1 } });
      await coachingCoordenacaoController.reatribuirSala(req, res);
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ message: 'id_marcacao e nova_id_sala são obrigatórios.' });
    });

    it('retorna 200 quando reatribui com sucesso', async () => {
      coordenacaoService.reatribuirSala.mockResolvedValue({ id_marcacao: 1 });
      const { req, res } = mockReqRes({ body: { id_marcacao: 1, nova_id_sala: 3 } });
      await coachingCoordenacaoController.reatribuirSala(req, res);
      expect(res.status).toHaveBeenCalledWith(200);
    });
  });

  // ── concluirMarcacao ──────────────────────────────────────────────────────

  describe('concluirMarcacao', () => {
    it('retorna 400 quando id_marcacao está em falta', async () => {
      const { req, res } = mockReqRes({ body: {} });
      await coachingCoordenacaoController.concluirMarcacao(req, res);
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ message: 'id_marcacao é obrigatório.' });
    });

    it('retorna 200 quando conclui com sucesso', async () => {
      coordenacaoService.concluirMarcacao.mockResolvedValue({ id_marcacao: 1 });
      const { req, res } = mockReqRes({ body: { id_marcacao: 1 } });
      await coachingCoordenacaoController.concluirMarcacao(req, res);
      expect(res.status).toHaveBeenCalledWith(200);
    });

    it('retorna 400 quando o service lança "já está"', async () => {
      coordenacaoService.concluirMarcacao.mockRejectedValue(new Error('A sessão já está concluída.'));
      const { req, res } = mockReqRes({ body: { id_marcacao: 1 } });
      await coachingCoordenacaoController.concluirMarcacao(req, res);
      expect(res.status).toHaveBeenCalledWith(400);
    });
  });

  // ── consultarSalasDisponiveis ─────────────────────────────────────────────

  describe('consultarSalasDisponiveis', () => {
    it('retorna 400 quando campos obrigatórios estão em falta', async () => {
      const { req, res } = mockReqRes({ query: { data_a_realizar: '2099-01-01' } });
      await coachingCoordenacaoController.consultarSalasDisponiveis(req, res);
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ message: 'data_a_realizar, hora_inicio e duracao_minutos são obrigatórios.' });
    });

    it('retorna 400 quando data_a_realizar tem formato inválido', async () => {
      const { req, res } = mockReqRes({ query: { data_a_realizar: 'invalida', hora_inicio: '10:00', duracao_minutos: '60' } });
      await coachingCoordenacaoController.consultarSalasDisponiveis(req, res);
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ message: 'data_a_realizar tem formato inválido.' });
    });

    it('retorna 200 com salas disponíveis', async () => {
      coordenacaoService.consultarSalasDisponiveis.mockResolvedValue([{ id_sala: 1 }]);
      const { req, res } = mockReqRes({ query: { data_a_realizar: '2099-01-01', hora_inicio: '10:00', duracao_minutos: '60' } });
      await coachingCoordenacaoController.consultarSalasDisponiveis(req, res);
      expect(res.status).toHaveBeenCalledWith(200);
    });
  });

  // ── consultarHistoricoMarcacao ────────────────────────────────────────────

  describe('consultarHistoricoMarcacao', () => {
    it('retorna 400 quando id_marcacao não é um número', async () => {
      const { req, res } = mockReqRes({ params: { id_marcacao: 'abc' } });
      await coachingCoordenacaoController.consultarHistoricoMarcacao(req, res);
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ message: 'ID da marcação inválido.' });
      expect(coordenacaoService.consultarHistoricoMarcacao).not.toHaveBeenCalled();
    });

    it('retorna 200 com histórico', async () => {
      coordenacaoService.consultarHistoricoMarcacao.mockResolvedValue([{ estado: 'PENDENTE' }]);
      const { req, res } = mockReqRes({ params: { id_marcacao: '7' } });
      await coachingCoordenacaoController.consultarHistoricoMarcacao(req, res);
      expect(res.status).toHaveBeenCalledWith(200);
    });

    it('retorna 404 quando o service lança "não encontrada"', async () => {
      coordenacaoService.consultarHistoricoMarcacao.mockRejectedValue(new Error('Marcação não encontrada.'));
      const { req, res } = mockReqRes({ params: { id_marcacao: '99' } });
      await coachingCoordenacaoController.consultarHistoricoMarcacao(req, res);
      expect(res.status).toHaveBeenCalledWith(404);
    });
  });
});
