'use strict';

jest.mock('../../services/salaService');

const salaController = require('../../controllers/salaController');
const salaService    = require('../../services/salaService');

const mockReqRes = (overrides = {}) => {
  const req = { params: {}, body: {}, user: { id: 1 }, ...overrides };
  const res = { status: jest.fn().mockReturnThis(), json: jest.fn().mockReturnThis() };
  return { req, res };
};

describe('salaController', () => {
  beforeEach(() => jest.clearAllMocks());

  // ── listSalas ─────────────────────────────────────────────────────────────

  describe('listSalas', () => {
    it('retorna 200 com lista de salas', async () => {
      salaService.listSalas.mockResolvedValue([{ id_sala: 1, nome: 'A1' }]);
      const { req, res } = mockReqRes();
      await salaController.listSalas(req, res);
      expect(res.json).toHaveBeenCalledWith([{ id_sala: 1, nome: 'A1' }]);
    });

    it('retorna 500 quando o service lança erro', async () => {
      salaService.listSalas.mockRejectedValue(new Error('DB error'));
      const { req, res } = mockReqRes();
      await salaController.listSalas(req, res);
      expect(res.status).toHaveBeenCalledWith(500);
    });
  });

  // ── deleteSala ────────────────────────────────────────────────────────────

  describe('deleteSala', () => {
    it('retorna 400 quando id não é um número', async () => {
      const { req, res } = mockReqRes({ params: { id: 'abc' } });
      await salaController.deleteSala(req, res);
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ error: 'ID da sala inválido' });
      expect(salaService.deleteSala).not.toHaveBeenCalled();
    });

    it('retorna 200 quando elimina com sucesso', async () => {
      salaService.deleteSala.mockResolvedValue();
      const { req, res } = mockReqRes({ params: { id: '1' } });
      await salaController.deleteSala(req, res);
      expect(res.json).toHaveBeenCalledWith({ message: 'Sala removida com sucesso.' });
    });

    it('retorna 500 quando o service lança erro', async () => {
      salaService.deleteSala.mockRejectedValue(new Error('FK constraint'));
      const { req, res } = mockReqRes({ params: { id: '1' } });
      await salaController.deleteSala(req, res);
      expect(res.status).toHaveBeenCalledWith(500);
    });
  });

  // ── createSala ────────────────────────────────────────────────────────────

  describe('createSala', () => {
    it('retorna 201 quando cria sala com sucesso', async () => {
      salaService.createSala.mockResolvedValue({ id_sala: 1, nome: 'B2' });
      const { req, res } = mockReqRes({ body: { nome: 'B2', descricao: 'desc' } });
      await salaController.createSala(req, res);
      expect(res.status).toHaveBeenCalledWith(201);
    });

    it('retorna 400 quando nome é obrigatório', async () => {
      salaService.createSala.mockRejectedValue(new Error('Nome da sala é obrigatório'));
      const { req, res } = mockReqRes({ body: {} });
      await salaController.createSala(req, res);
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ error: 'Nome da sala é obrigatório' });
    });

    it('retorna 400 quando já existe sala com o mesmo nome', async () => {
      salaService.createSala.mockRejectedValue(new Error('Já existe uma sala com esse nome'));
      const { req, res } = mockReqRes({ body: { nome: 'A1' } });
      await salaController.createSala(req, res);
      expect(res.status).toHaveBeenCalledWith(400);
    });

    it('retorna 500 para outros erros', async () => {
      salaService.createSala.mockRejectedValue(new Error('DB error'));
      const { req, res } = mockReqRes({ body: { nome: 'X' } });
      await salaController.createSala(req, res);
      expect(res.status).toHaveBeenCalledWith(500);
    });
  });

  // ── updateSala ────────────────────────────────────────────────────────────

  describe('updateSala', () => {
    it('retorna 400 quando id não é um número', async () => {
      const { req, res } = mockReqRes({ params: { id: 'abc' }, body: { nome: 'X' } });
      await salaController.updateSala(req, res);
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ error: 'ID da sala inválido' });
      expect(salaService.updateSala).not.toHaveBeenCalled();
    });

    it('retorna 400 quando nem nome nem descricao são fornecidos', async () => {
      const { req, res } = mockReqRes({ params: { id: '1' }, body: {} });
      await salaController.updateSala(req, res);
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ error: 'Forneça pelo menos o nome ou a descrição para atualizar' });
    });

    it('retorna 200 quando atualiza com sucesso', async () => {
      salaService.updateSala.mockResolvedValue({ id_sala: 1, nome: 'Novo' });
      const { req, res } = mockReqRes({ params: { id: '1' }, body: { nome: 'Novo' } });
      await salaController.updateSala(req, res);
      expect(res.json).toHaveBeenCalledWith({ id_sala: 1, nome: 'Novo' });
    });

    it('retorna 400 quando já existe outra sala com esse nome', async () => {
      salaService.updateSala.mockRejectedValue(new Error('Já existe uma outra sala com esse nome'));
      const { req, res } = mockReqRes({ params: { id: '1' }, body: { nome: 'Duplicada' } });
      await salaController.updateSala(req, res);
      expect(res.status).toHaveBeenCalledWith(400);
    });

    it('retorna 500 para outros erros', async () => {
      salaService.updateSala.mockRejectedValue(new Error('DB error'));
      const { req, res } = mockReqRes({ params: { id: '1' }, body: { nome: 'X' } });
      await salaController.updateSala(req, res);
      expect(res.status).toHaveBeenCalledWith(500);
    });
  });
});
