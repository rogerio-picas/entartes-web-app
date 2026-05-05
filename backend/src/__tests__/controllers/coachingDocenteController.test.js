'use strict';

jest.mock('../../services/coachingDocenteService');

const coachingDocenteController = require('../../controllers/coachingDocenteController');
const docenteService            = require('../../services/coachingDocenteService');

const mockReqRes = (overrides = {}) => {
  const req = { params: {}, body: {}, query: {}, user: { id: 5 }, ...overrides };
  const res = { status: jest.fn().mockReturnThis(), json: jest.fn().mockReturnThis() };
  return { req, res };
};

describe('coachingDocenteController', () => {
  beforeEach(() => jest.clearAllMocks());

  // ── listarMinhasAulas ─────────────────────────────────────────────────────

  describe('listarMinhasAulas', () => {
    it('retorna 200 com lista de aulas', async () => {
      docenteService.listarMinhasAulas.mockResolvedValue([{ id_marcacao: 1 }]);
      const { req, res } = mockReqRes({ query: {} });
      await coachingDocenteController.listarMinhasAulas(req, res);
      expect(res.status).toHaveBeenCalledWith(200);
    });

    it('retorna 404 quando o service lança "não encontrada"', async () => {
      docenteService.listarMinhasAulas.mockRejectedValue(new Error('Docente não encontrada.'));
      const { req, res } = mockReqRes({ query: {} });
      await coachingDocenteController.listarMinhasAulas(req, res);
      expect(res.status).toHaveBeenCalledWith(404);
    });

    it('retorna 500 para erros genéricos', async () => {
      docenteService.listarMinhasAulas.mockRejectedValue(new Error('DB error'));
      const { req, res } = mockReqRes({ query: {} });
      await coachingDocenteController.listarMinhasAulas(req, res);
      expect(res.status).toHaveBeenCalledWith(500);
    });
  });

  // ── validarConclusaoSessao ────────────────────────────────────────────────

  describe('validarConclusaoSessao', () => {
    it('retorna 400 quando id_marcacao não é um número', async () => {
      const { req, res } = mockReqRes({ params: { id_marcacao: 'abc' } });
      await coachingDocenteController.validarConclusaoSessao(req, res);
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ message: 'ID da marcação inválido.' });
      expect(docenteService.validarConclusaoSessao).not.toHaveBeenCalled();
    });

    it('retorna 200 quando valida com sucesso', async () => {
      docenteService.validarConclusaoSessao.mockResolvedValue({ mensagem: 'ok' });
      const { req, res } = mockReqRes({ params: { id_marcacao: '3' } });
      await coachingDocenteController.validarConclusaoSessao(req, res);
      expect(res.status).toHaveBeenCalledWith(200);
    });

    it('retorna 403 quando o service lança "não tem permissão"', async () => {
      docenteService.validarConclusaoSessao.mockRejectedValue(new Error('O docente não tem permissão para esta sessão.'));
      const { req, res } = mockReqRes({ params: { id_marcacao: '3' } });
      await coachingDocenteController.validarConclusaoSessao(req, res);
      expect(res.status).toHaveBeenCalledWith(403);
    });

    it('retorna 404 quando o service lança "não encontrada"', async () => {
      docenteService.validarConclusaoSessao.mockRejectedValue(new Error('Marcação não encontrada.'));
      const { req, res } = mockReqRes({ params: { id_marcacao: '99' } });
      await coachingDocenteController.validarConclusaoSessao(req, res);
      expect(res.status).toHaveBeenCalledWith(404);
    });

    it('retorna 400 quando o service lança "Só é possível"', async () => {
      docenteService.validarConclusaoSessao.mockRejectedValue(new Error('Só é possível concluir sessões confirmadas.'));
      const { req, res } = mockReqRes({ params: { id_marcacao: '3' } });
      await coachingDocenteController.validarConclusaoSessao(req, res);
      expect(res.status).toHaveBeenCalledWith(400);
    });
  });

  // ── cancelarMarcacao ──────────────────────────────────────────────────────

  describe('cancelarMarcacao', () => {
    it('retorna 400 quando id_marcacao não é um número', async () => {
      const { req, res } = mockReqRes({ params: { id_marcacao: 'xyz' }, body: { motivo: 'motivo' } });
      await coachingDocenteController.cancelarMarcacao(req, res);
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ message: 'ID da marcação inválido.' });
      expect(docenteService.cancelarMarcacao).not.toHaveBeenCalled();
    });

    it('retorna 200 quando cancela com sucesso', async () => {
      docenteService.cancelarMarcacao.mockResolvedValue({ id_marcacao: 1 });
      const { req, res } = mockReqRes({ params: { id_marcacao: '5' }, body: { motivo: 'conflito' } });
      await coachingDocenteController.cancelarMarcacao(req, res);
      expect(res.status).toHaveBeenCalledWith(200);
    });

    it('retorna 403 quando o service lança "Sem permissão"', async () => {
      docenteService.cancelarMarcacao.mockRejectedValue(new Error('Sem permissão para cancelar esta marcação.'));
      const { req, res } = mockReqRes({ params: { id_marcacao: '5' }, body: {} });
      await coachingDocenteController.cancelarMarcacao(req, res);
      expect(res.status).toHaveBeenCalledWith(403);
    });

    it('retorna 400 quando o service lança "Não é possível"', async () => {
      docenteService.cancelarMarcacao.mockRejectedValue(new Error('Não é possível cancelar uma sessão já concluída.'));
      const { req, res } = mockReqRes({ params: { id_marcacao: '5' }, body: {} });
      await coachingDocenteController.cancelarMarcacao(req, res);
      expect(res.status).toHaveBeenCalledWith(400);
    });
  });
});
