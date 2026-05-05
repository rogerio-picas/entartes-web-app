'use strict';

jest.mock('../../services/anuncioService');

const anuncioController = require('../../controllers/anuncioController');
const anuncioService    = require('../../services/anuncioService');

const mockReqRes = (overrides = {}) => {
  const req = { params: {}, body: {}, user: { id: 1 }, ...overrides };
  const res = { status: jest.fn().mockReturnThis(), json: jest.fn().mockReturnThis() };
  return { req, res };
};

describe('anuncioController', () => {
  beforeEach(() => jest.clearAllMocks());

  // ── createAnuncio ─────────────────────────────────────────────────────────

  describe('createAnuncio', () => {
    it('retorna 201 quando cria anuncio com sucesso', async () => {
      anuncioService.criarAnuncio.mockResolvedValue({ id_anuncio: 1 });
      const { req, res } = mockReqRes({ body: { titulo: 'T', mensagem: 'M' }, user: { id: 1 } });
      await anuncioController.createAnuncio(req, res);
      expect(res.status).toHaveBeenCalledWith(201);
    });

    it('retorna 500 quando o service lança erro', async () => {
      anuncioService.criarAnuncio.mockRejectedValue(new Error('DB error'));
      const { req, res } = mockReqRes({ body: {}, user: { id: 1 } });
      await anuncioController.createAnuncio(req, res);
      expect(res.status).toHaveBeenCalledWith(500);
    });
  });

  // ── getAllAnuncios ─────────────────────────────────────────────────────────

  describe('getAllAnuncios', () => {
    it('retorna 200 com lista de anuncios', async () => {
      anuncioService.listarTodosAnuncios.mockResolvedValue([{ id_anuncio: 1 }]);
      const { req, res } = mockReqRes();
      await anuncioController.getAllAnuncios(req, res);
      expect(res.status).toHaveBeenCalledWith(200);
    });

    it('retorna 500 quando o service lança erro', async () => {
      anuncioService.listarTodosAnuncios.mockRejectedValue(new Error('DB error'));
      const { req, res } = mockReqRes();
      await anuncioController.getAllAnuncios(req, res);
      expect(res.status).toHaveBeenCalledWith(500);
    });
  });

  // ── getAnuncioById ────────────────────────────────────────────────────────

  describe('getAnuncioById', () => {
    it('retorna 200 com o anuncio', async () => {
      anuncioService.obterAnuncioPorId.mockResolvedValue({ id_anuncio: 1 });
      const { req, res } = mockReqRes({ params: { id_anuncio: '1' } });
      await anuncioController.getAnuncioById(req, res);
      expect(res.status).toHaveBeenCalledWith(200);
    });

    it('retorna 500 quando o service lança erro', async () => {
      anuncioService.obterAnuncioPorId.mockRejectedValue(new Error('not found'));
      const { req, res } = mockReqRes({ params: { id_anuncio: '99' } });
      await anuncioController.getAnuncioById(req, res);
      expect(res.status).toHaveBeenCalledWith(500);
    });
  });

  // ── updateAnuncio ─────────────────────────────────────────────────────────

  describe('updateAnuncio', () => {
    it('retorna 200 quando atualiza com sucesso', async () => {
      anuncioService.actualizarAnuncio.mockResolvedValue({ id_anuncio: 1 });
      const { req, res } = mockReqRes({ params: { id_anuncio: '1' }, body: { titulo: 'T' }, user: { id: 1 } });
      await anuncioController.updateAnuncio(req, res);
      expect(res.status).toHaveBeenCalledWith(200);
    });

    it('retorna 500 quando o service lança erro', async () => {
      anuncioService.actualizarAnuncio.mockRejectedValue(new Error('fail'));
      const { req, res } = mockReqRes({ params: { id_anuncio: '1' }, body: {}, user: { id: 1 } });
      await anuncioController.updateAnuncio(req, res);
      expect(res.status).toHaveBeenCalledWith(500);
    });
  });

  // ── removeAnuncio ─────────────────────────────────────────────────────────

  describe('removeAnuncio', () => {
    it('retorna 200 quando remove com sucesso', async () => {
      anuncioService.eliminarAnuncio.mockResolvedValue({ mensagem: 'ok' });
      const { req, res } = mockReqRes({ params: { id_anuncio: '1' }, user: { id: 1 } });
      await anuncioController.removeAnuncio(req, res);
      expect(res.status).toHaveBeenCalledWith(200);
    });

    it('retorna 500 quando o service lança erro', async () => {
      anuncioService.eliminarAnuncio.mockRejectedValue(new Error('fail'));
      const { req, res } = mockReqRes({ params: { id_anuncio: '1' }, user: { id: 1 } });
      await anuncioController.removeAnuncio(req, res);
      expect(res.status).toHaveBeenCalledWith(500);
    });
  });

  // ── publicarNoEvento ──────────────────────────────────────────────────────

  describe('publicarNoEvento', () => {
    it('retorna 201 quando publica com sucesso', async () => {
      anuncioService.publicarAnuncioNoEvento.mockResolvedValue({ id_anuncio: 1 });
      const { req, res } = mockReqRes({ params: { id_evento: '1' }, body: { titulo: 'T', mensagem: 'M' }, user: { id: 1 } });
      await anuncioController.publicarNoEvento(req, res);
      expect(res.status).toHaveBeenCalledWith(201);
    });

    it('retorna 500 quando o service lança erro', async () => {
      anuncioService.publicarAnuncioNoEvento.mockRejectedValue(new Error('fail'));
      const { req, res } = mockReqRes({ params: { id_evento: '1' }, body: {}, user: { id: 1 } });
      await anuncioController.publicarNoEvento(req, res);
      expect(res.status).toHaveBeenCalledWith(500);
    });
  });

  // ── publicarNoGrupo ───────────────────────────────────────────────────────

  describe('publicarNoGrupo', () => {
    it('retorna 201 quando publica com sucesso', async () => {
      anuncioService.publicarAnuncioNoGrupo.mockResolvedValue({ id_anuncio: 1 });
      const { req, res } = mockReqRes({ params: { id_grupo: '1' }, body: { titulo: 'T', mensagem: 'M' }, user: { id: 1 } });
      await anuncioController.publicarNoGrupo(req, res);
      expect(res.status).toHaveBeenCalledWith(201);
    });

    it('retorna 500 quando o service lança erro', async () => {
      anuncioService.publicarAnuncioNoGrupo.mockRejectedValue(new Error('fail'));
      const { req, res } = mockReqRes({ params: { id_grupo: '1' }, body: {}, user: { id: 1 } });
      await anuncioController.publicarNoGrupo(req, res);
      expect(res.status).toHaveBeenCalledWith(500);
    });
  });

  // ── getAnunciosByEvento ───────────────────────────────────────────────────

  describe('getAnunciosByEvento', () => {
    it('retorna 200 com anuncios do evento', async () => {
      anuncioService.listarAnunciosDoEvento.mockResolvedValue([{ id_anuncio: 1 }]);
      const { req, res } = mockReqRes({ params: { id_evento: '1' } });
      await anuncioController.getAnunciosByEvento(req, res);
      expect(res.status).toHaveBeenCalledWith(200);
    });

    it('retorna 500 quando o service lança erro', async () => {
      anuncioService.listarAnunciosDoEvento.mockRejectedValue(new Error('fail'));
      const { req, res } = mockReqRes({ params: { id_evento: '1' } });
      await anuncioController.getAnunciosByEvento(req, res);
      expect(res.status).toHaveBeenCalledWith(500);
    });
  });

  // ── getAnunciosByGrupo ────────────────────────────────────────────────────

  describe('getAnunciosByGrupo', () => {
    it('retorna 200 com anuncios do grupo', async () => {
      anuncioService.listarAnunciosDoGrupo.mockResolvedValue([{ id_anuncio: 1 }]);
      const { req, res } = mockReqRes({ params: { id_grupo: '1' } });
      await anuncioController.getAnunciosByGrupo(req, res);
      expect(res.status).toHaveBeenCalledWith(200);
    });

    it('retorna 500 quando o service lança erro', async () => {
      anuncioService.listarAnunciosDoGrupo.mockRejectedValue(new Error('fail'));
      const { req, res } = mockReqRes({ params: { id_grupo: '1' } });
      await anuncioController.getAnunciosByGrupo(req, res);
      expect(res.status).toHaveBeenCalledWith(500);
    });
  });
});
