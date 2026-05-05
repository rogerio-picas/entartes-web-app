'use strict';

jest.mock('../../services/horarioService');

const horarioController = require('../../controllers/horarioController');
const horarioService    = require('../../services/horarioService');

const mockReqRes = (overrides = {}) => {
  const req = { params: {}, body: {}, query: {}, user: { id: 3, role: 3 }, ...overrides };
  const res = { status: jest.fn().mockReturnThis(), json: jest.fn().mockReturnThis() };
  return { req, res };
};

describe('horarioController', () => {
  beforeEach(() => jest.clearAllMocks());

  // ── getMinhasAulas ────────────────────────────────────────────────────────

  describe('getMinhasAulas', () => {
    it('retorna 200 com lista de marcações', async () => {
      horarioService.getMinhasAulas.mockResolvedValue([{ id_marcacoes: 1 }]);
      const { req, res } = mockReqRes();
      await horarioController.getMinhasAulas(req, res);
      expect(res.status).toHaveBeenCalledWith(200);
    });

    it('retorna 500 quando o service lança erro', async () => {
      horarioService.getMinhasAulas.mockRejectedValue(new Error('DB error'));
      const { req, res } = mockReqRes();
      await horarioController.getMinhasAulas(req, res);
      expect(res.status).toHaveBeenCalledWith(500);
    });
  });

  // ── getAulaDetalhe ────────────────────────────────────────────────────────

  describe('getAulaDetalhe', () => {
    it('retorna 400 quando id não é um número', async () => {
      const { req, res } = mockReqRes({ params: { id: 'abc' } });
      await horarioController.getAulaDetalhe(req, res);
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ message: 'ID da aula inválido.' });
      expect(horarioService.getAulaDetalhe).not.toHaveBeenCalled();
    });

    it('retorna 200 com detalhes da aula', async () => {
      horarioService.getAulaDetalhe.mockResolvedValue({ id_marcacoes: 1 });
      const { req, res } = mockReqRes({ params: { id: '1' } });
      await horarioController.getAulaDetalhe(req, res);
      expect(res.status).toHaveBeenCalledWith(200);
    });

    it('retorna 404 quando o service lança NOT_FOUND', async () => {
      horarioService.getAulaDetalhe.mockRejectedValue(new Error('NOT_FOUND'));
      const { req, res } = mockReqRes({ params: { id: '99' } });
      await horarioController.getAulaDetalhe(req, res);
      expect(res.status).toHaveBeenCalledWith(404);
    });

    it('retorna 403 quando o service lança FORBIDDEN', async () => {
      horarioService.getAulaDetalhe.mockRejectedValue(new Error('FORBIDDEN'));
      const { req, res } = mockReqRes({ params: { id: '1' } });
      await horarioController.getAulaDetalhe(req, res);
      expect(res.status).toHaveBeenCalledWith(403);
    });

    it('retorna 500 para outros erros', async () => {
      horarioService.getAulaDetalhe.mockRejectedValue(new Error('DB error'));
      const { req, res } = mockReqRes({ params: { id: '1' } });
      await horarioController.getAulaDetalhe(req, res);
      expect(res.status).toHaveBeenCalledWith(500);
    });
  });

  // ── inscreverEmAula ───────────────────────────────────────────────────────

  describe('inscreverEmAula', () => {
    it('retorna 201 quando inscrição é bem-sucedida', async () => {
      horarioService.inscreverEmAula.mockResolvedValue({ id_aluno_marcacao: 1 });
      const { req, res } = mockReqRes({ body: { id_marcacoes: 5 } });
      await horarioController.inscreverEmAula(req, res);
      expect(res.status).toHaveBeenCalledWith(201);
    });

    it('retorna 403 quando o service lança FORBIDDEN', async () => {
      horarioService.inscreverEmAula.mockRejectedValue(new Error('FORBIDDEN'));
      const { req, res } = mockReqRes({ body: { id_marcacoes: 5 } });
      await horarioController.inscreverEmAula(req, res);
      expect(res.status).toHaveBeenCalledWith(403);
    });

    it('retorna 404 quando o service lança NOT_FOUND', async () => {
      horarioService.inscreverEmAula.mockRejectedValue(new Error('NOT_FOUND'));
      const { req, res } = mockReqRes({ body: { id_marcacoes: 5 } });
      await horarioController.inscreverEmAula(req, res);
      expect(res.status).toHaveBeenCalledWith(404);
    });

    it('retorna 400 quando o service lança "id_marcacoes é obrigatório."', async () => {
      horarioService.inscreverEmAula.mockRejectedValue(new Error('id_marcacoes é obrigatório.'));
      const { req, res } = mockReqRes({ body: {} });
      await horarioController.inscreverEmAula(req, res);
      expect(res.status).toHaveBeenCalledWith(400);
    });

    it('retorna 400 quando o service lança LOTACAO_ESGOTADA', async () => {
      horarioService.inscreverEmAula.mockRejectedValue(new Error('LOTACAO_ESGOTADA'));
      const { req, res } = mockReqRes({ body: { id_marcacoes: 5 } });
      await horarioController.inscreverEmAula(req, res);
      expect(res.status).toHaveBeenCalledWith(400);
    });

    it('retorna 400 quando o service lança JA_INSCRITO', async () => {
      horarioService.inscreverEmAula.mockRejectedValue(new Error('JA_INSCRITO'));
      const { req, res } = mockReqRes({ body: { id_marcacoes: 5 } });
      await horarioController.inscreverEmAula(req, res);
      expect(res.status).toHaveBeenCalledWith(400);
    });

    it('retorna 500 para outros erros', async () => {
      horarioService.inscreverEmAula.mockRejectedValue(new Error('DB error'));
      const { req, res } = mockReqRes({ body: { id_marcacoes: 5 } });
      await horarioController.inscreverEmAula(req, res);
      expect(res.status).toHaveBeenCalledWith(500);
    });
  });

  // ── getAulasDisponiveis ───────────────────────────────────────────────────

  describe('getAulasDisponiveis', () => {
    it('retorna 200 com aulas disponíveis', async () => {
      horarioService.getAulasDisponiveis.mockResolvedValue([{ id_marcacoes: 1 }]);
      const { req, res } = mockReqRes();
      await horarioController.getAulasDisponiveis(req, res);
      expect(res.status).toHaveBeenCalledWith(200);
    });

    it('retorna 500 quando o service lança erro', async () => {
      horarioService.getAulasDisponiveis.mockRejectedValue(new Error('DB error'));
      const { req, res } = mockReqRes();
      await horarioController.getAulasDisponiveis(req, res);
      expect(res.status).toHaveBeenCalledWith(500);
    });
  });
});
