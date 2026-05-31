'use strict';

jest.mock('../../services/notificacaoService');

const notificacaoController = require('../../controllers/notificacaoController');
const notificacaoService    = require('../../services/notificacaoService');

const mockReqRes = (overrides = {}) => {
  const req = { params: {}, body: {}, user: { id: 1 }, ...overrides };
  const res = { status: jest.fn().mockReturnThis(), json: jest.fn().mockReturnThis() };
  return { req, res };
};

describe('notificacaoController', () => {
  beforeEach(() => jest.clearAllMocks());

  // ── listNotificacoes ──────────────────────────────────────────────────────

  describe('listNotificacoes', () => {
    it('retorna 400 quando id do utilizador está em falta no token', async () => {
      const { req, res } = mockReqRes({ user: {} });
      await notificacaoController.listNotificacoes(req, res);
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ error: 'ID do utilizador em falta no token.' });
      expect(notificacaoService.listNotificacoes).not.toHaveBeenCalled();
    });

    it('retorna 200 com lista de notificações', async () => {
      notificacaoService.listNotificacoes.mockResolvedValue([{ id_notificacao: 1 }]);
      const { req, res } = mockReqRes();
      await notificacaoController.listNotificacoes(req, res);
      expect(res.json).toHaveBeenCalledWith([{ id_notificacao: 1 }]);
    });

    it('retorna 500 quando o service lança erro', async () => {
      notificacaoService.listNotificacoes.mockRejectedValue(new Error('DB error'));
      const { req, res } = mockReqRes();
      await notificacaoController.listNotificacoes(req, res);
      expect(res.status).toHaveBeenCalledWith(500);
    });
  });

  // ── markAsRead ────────────────────────────────────────────────────────────

  describe('markAsRead', () => {
    it('retorna 400 quando id não é um número', async () => {
      const { req, res } = mockReqRes({ params: { id: 'abc' } });
      await notificacaoController.markAsRead(req, res);
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ error: 'ID inválido' });
      expect(notificacaoService.markAsRead).not.toHaveBeenCalled();
    });

    it('retorna 200 quando marca como lida com sucesso', async () => {
      notificacaoService.markAsRead.mockResolvedValue({ id_notificacao: 1, lida: true });
      const { req, res } = mockReqRes({ params: { id: '1' } });
      await notificacaoController.markAsRead(req, res);
      expect(res.json).toHaveBeenCalledWith({ id_notificacao: 1, lida: true });
    });

    it('retorna 403 quando o service lança "Acesso negado"', async () => {
      notificacaoService.markAsRead.mockRejectedValue(new Error('Acesso negado'));
      const { req, res } = mockReqRes({ params: { id: '5' } });
      await notificacaoController.markAsRead(req, res);
      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({ error: 'Acesso negado' });
    });

    it('retorna 500 para outros erros', async () => {
      notificacaoService.markAsRead.mockRejectedValue(new Error('DB error'));
      const { req, res } = mockReqRes({ params: { id: '1' } });
      await notificacaoController.markAsRead(req, res);
      expect(res.status).toHaveBeenCalledWith(500);
    });
  });

  // ── deleteNotificacao ──────────────────────────────────────────────────────

  describe('deleteNotificacao', () => {
    it('retorna 400 quando id não é um número', async () => {
      const { req, res } = mockReqRes({ params: { id: 'abc' } });
      await notificacaoController.deleteNotificacao(req, res);
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ error: 'ID inválido' });
      expect(notificacaoService.deleteNotificacao).not.toHaveBeenCalled();
    });

    it('retorna 200 quando apaga a notificação com sucesso', async () => {
      notificacaoService.deleteNotificacao.mockResolvedValue({ id_notificacao: 1 });
      const { req, res } = mockReqRes({ params: { id: '1' } });
      await notificacaoController.deleteNotificacao(req, res);
      expect(res.json).toHaveBeenCalledWith({ mensagem: 'Notificação descartada com sucesso' });
    });

    it('retorna 403 quando o service lança "Acesso negado"', async () => {
      notificacaoService.deleteNotificacao.mockRejectedValue(new Error('Acesso negado'));
      const { req, res } = mockReqRes({ params: { id: '5' } });
      await notificacaoController.deleteNotificacao(req, res);
      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({ error: 'Acesso negado' });
    });

    it('retorna 500 para outros erros', async () => {
      notificacaoService.deleteNotificacao.mockRejectedValue(new Error('DB error'));
      const { req, res } = mockReqRes({ params: { id: '1' } });
      await notificacaoController.deleteNotificacao(req, res);
      expect(res.status).toHaveBeenCalledWith(500);
    });
  });
});
