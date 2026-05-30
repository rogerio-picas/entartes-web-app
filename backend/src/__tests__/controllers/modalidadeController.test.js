'use strict';

jest.mock('../../services/modalidadeService');

const modalidadeController = require('../../controllers/modalidadeController');
const modalidadeService    = require('../../services/modalidadeService');

const mockReqRes = (overrides = {}) => {
  const req = { params: {}, body: {}, query: {}, user: { id: 1 }, ...overrides };
  const res = { status: jest.fn().mockReturnThis(), json: jest.fn().mockReturnThis() };
  return { req, res };
};

describe('modalidadeController', () => {
  beforeAll(() => {
    jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterAll(() => {
    console.error.mockRestore();
  });

  beforeEach(() => jest.clearAllMocks());

  // ── listModalidades ───────────────────────────────────────────────────────

  describe('listModalidades', () => {
    it('retorna 200 com lista de modalidades', async () => {
      modalidadeService.listarModalidades.mockResolvedValue([{ id_modalidade: 1 }]);
      const { req, res } = mockReqRes({ query: {} });
      await modalidadeController.listModalidades(req, res);
      expect(res.json).toHaveBeenCalledWith([{ id_modalidade: 1 }]);
    });

    it('retorna 500 quando o service lança erro', async () => {
      modalidadeService.listarModalidades.mockRejectedValue(new Error('DB error'));
      const { req, res } = mockReqRes({ query: {} });
      await modalidadeController.listModalidades(req, res);
      expect(res.status).toHaveBeenCalledWith(500);
    });
  });

  // ── getModalidade ─────────────────────────────────────────────────────────

  describe('getModalidade', () => {
    it('retorna 400 quando id não é um número', async () => {
      const { req, res } = mockReqRes({ params: { id: 'abc' } });
      await modalidadeController.getModalidade(req, res);
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ error: 'ID da modalidade inválido' });
      expect(modalidadeService.obterModalidade).not.toHaveBeenCalled();
    });

    it('retorna 200 com a modalidade', async () => {
      modalidadeService.obterModalidade.mockResolvedValue({ id_modalidade: 1, nome: 'Ballet' });
      const { req, res } = mockReqRes({ params: { id: '1' }, query: {} });
      await modalidadeController.getModalidade(req, res);
      expect(res.json).toHaveBeenCalledWith({ id_modalidade: 1, nome: 'Ballet' });
    });

    it('retorna 404 quando modalidade não é encontrada', async () => {
      modalidadeService.obterModalidade.mockRejectedValue(new Error('Modalidade não encontrada.'));
      const { req, res } = mockReqRes({ params: { id: '99' }, query: {} });
      await modalidadeController.getModalidade(req, res);
      expect(res.status).toHaveBeenCalledWith(404);
    });

    it('retorna 500 para outros erros', async () => {
      modalidadeService.obterModalidade.mockRejectedValue(new Error('DB error'));
      const { req, res } = mockReqRes({ params: { id: '1' }, query: {} });
      await modalidadeController.getModalidade(req, res);
      expect(res.status).toHaveBeenCalledWith(500);
    });
  });

  // ── createModalidade ──────────────────────────────────────────────────────

  describe('createModalidade', () => {
    it('retorna 201 quando cria modalidade com sucesso', async () => {
      modalidadeService.criarModalidade.mockResolvedValue({ id_modalidade: 1, nome: 'Ballet' });
      const { req, res } = mockReqRes({ body: { nome: 'Ballet' } });
      await modalidadeController.createModalidade(req, res);
      expect(res.status).toHaveBeenCalledWith(201);
    });

    it('retorna 400 quando nome é obrigatório', async () => {
      modalidadeService.criarModalidade.mockRejectedValue(new Error('O nome da modalidade é obrigatório.'));
      const { req, res } = mockReqRes({ body: {} });
      await modalidadeController.createModalidade(req, res);
      expect(res.status).toHaveBeenCalledWith(400);
    });

    it('retorna 400 quando já existe modalidade com o mesmo nome', async () => {
      modalidadeService.criarModalidade.mockRejectedValue(new Error('Já existe uma modalidade com o nome "Ballet".'));
      const { req, res } = mockReqRes({ body: { nome: 'Ballet' } });
      await modalidadeController.createModalidade(req, res);
      expect(res.status).toHaveBeenCalledWith(400);
    });

    it('retorna 500 para outros erros', async () => {
      modalidadeService.criarModalidade.mockRejectedValue(new Error('DB error'));
      const { req, res } = mockReqRes({ body: { nome: 'Ballet' } });
      await modalidadeController.createModalidade(req, res);
      expect(res.status).toHaveBeenCalledWith(500);
    });
  });

  // ── updateModalidade ──────────────────────────────────────────────────────

  describe('updateModalidade', () => {
    it('retorna 400 quando id não é um número', async () => {
      const { req, res } = mockReqRes({ params: { id: 'abc' }, body: { nome: 'X' } });
      await modalidadeController.updateModalidade(req, res);
      expect(res.status).toHaveBeenCalledWith(400);
      expect(modalidadeService.editarModalidade).not.toHaveBeenCalled();
    });

    it('retorna 200 quando edita com sucesso', async () => {
      modalidadeService.editarModalidade.mockResolvedValue({ id_modalidade: 1, nome: 'Novo' });
      const { req, res } = mockReqRes({ params: { id: '1' }, body: { nome: 'Novo' } });
      await modalidadeController.updateModalidade(req, res);
      expect(res.json).toHaveBeenCalledWith({ id_modalidade: 1, nome: 'Novo' });
    });

    it('retorna 404 quando modalidade não é encontrada', async () => {
      modalidadeService.editarModalidade.mockRejectedValue(new Error('Modalidade não encontrada.'));
      const { req, res } = mockReqRes({ params: { id: '99' }, body: { nome: 'X' } });
      await modalidadeController.updateModalidade(req, res);
      expect(res.status).toHaveBeenCalledWith(404);
    });

    it('retorna 400 quando nome já existe', async () => {
      modalidadeService.editarModalidade.mockRejectedValue(new Error('Já existe outra modalidade com o nome "X".'));
      const { req, res } = mockReqRes({ params: { id: '1' }, body: { nome: 'X' } });
      await modalidadeController.updateModalidade(req, res);
      expect(res.status).toHaveBeenCalledWith(400);
    });
  });

  // ── deleteModalidade ──────────────────────────────────────────────────────

  describe('deleteModalidade', () => {
    it('retorna 400 quando id não é um número', async () => {
      const { req, res } = mockReqRes({ params: { id: 'abc' } });
      await modalidadeController.deleteModalidade(req, res);
      expect(res.status).toHaveBeenCalledWith(400);
      expect(modalidadeService.eliminarModalidade).not.toHaveBeenCalled();
    });

    it('retorna 200 quando elimina com sucesso', async () => {
      modalidadeService.eliminarModalidade.mockResolvedValue({ mensagem: 'Modalidade "Ballet" eliminada com sucesso.' });
      const { req, res } = mockReqRes({ params: { id: '1' } });
      await modalidadeController.deleteModalidade(req, res);
      expect(res.json).toHaveBeenCalled();
    });

    it('retorna 404 quando modalidade não é encontrada', async () => {
      modalidadeService.eliminarModalidade.mockRejectedValue(new Error('Modalidade não encontrada.'));
      const { req, res } = mockReqRes({ params: { id: '99' } });
      await modalidadeController.deleteModalidade(req, res);
      expect(res.status).toHaveBeenCalledWith(404);
    });

    it('retorna 409 quando não é possível eliminar por ter dependências', async () => {
      modalidadeService.eliminarModalidade.mockRejectedValue(new Error('Não é possível eliminar: existem marcações ativas.'));
      const { req, res } = mockReqRes({ params: { id: '1' } });
      await modalidadeController.deleteModalidade(req, res);
      expect(res.status).toHaveBeenCalledWith(409);
    });
  });

  // ── associarDocente ───────────────────────────────────────────────────────

  describe('associarDocente', () => {
    it('retorna 400 quando id da modalidade não é um número', async () => {
      const { req, res } = mockReqRes({ params: { id: 'abc' }, body: { id_docente: 5 } });
      await modalidadeController.associarDocente(req, res);
      expect(res.status).toHaveBeenCalledWith(400);
      expect(modalidadeService.associarDocente).not.toHaveBeenCalled();
    });

    it('retorna 400 quando id_docente está em falta', async () => {
      const { req, res } = mockReqRes({ params: { id: '1' }, body: {} });
      await modalidadeController.associarDocente(req, res);
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ error: 'O campo "id_docente" é obrigatório' });
    });

    it('retorna 201 quando associa com sucesso', async () => {
      modalidadeService.associarDocente.mockResolvedValue({ id_docente: 5, nome: 'João' });
      const { req, res } = mockReqRes({ params: { id: '1' }, body: { id_docente: 5 } });
      await modalidadeController.associarDocente(req, res);
      expect(res.status).toHaveBeenCalledWith(201);
    });

    it('retorna 404 quando modalidade ou docente não são encontrados', async () => {
      modalidadeService.associarDocente.mockRejectedValue(new Error('Docente não encontrado.'));
      const { req, res } = mockReqRes({ params: { id: '1' }, body: { id_docente: 99 } });
      await modalidadeController.associarDocente(req, res);
      expect(res.status).toHaveBeenCalledWith(404);
    });

    it('retorna 409 quando docente já está associado', async () => {
      modalidadeService.associarDocente.mockRejectedValue(new Error('O docente já está associado a esta modalidade.'));
      const { req, res } = mockReqRes({ params: { id: '1' }, body: { id_docente: 5 } });
      await modalidadeController.associarDocente(req, res);
      expect(res.status).toHaveBeenCalledWith(409);
    });

    it('retorna 422 quando perfil de docente está em falta', async () => {
      modalidadeService.associarDocente.mockRejectedValue(new Error('O utilizador tem tipo docente mas o perfil de docente está em falta na base de dados.'));
      const { req, res } = mockReqRes({ params: { id: '1' }, body: { id_docente: 5 } });
      await modalidadeController.associarDocente(req, res);
      expect(res.status).toHaveBeenCalledWith(422);
    });
  });

  // ── desassociarDocente ────────────────────────────────────────────────────

  describe('desassociarDocente', () => {
    it('retorna 400 quando id da modalidade não é um número', async () => {
      const { req, res } = mockReqRes({ params: { id: 'abc', id_docente: '5' } });
      await modalidadeController.desassociarDocente(req, res);
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ error: 'ID da modalidade inválido' });
    });

    it('retorna 400 quando id do docente não é um número', async () => {
      const { req, res } = mockReqRes({ params: { id: '1', id_docente: 'abc' } });
      await modalidadeController.desassociarDocente(req, res);
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ error: 'ID do docente inválido' });
    });

    it('retorna 200 quando desassocia com sucesso', async () => {
      modalidadeService.desassociarDocente.mockResolvedValue({ mensagem: 'Docente desassociado com sucesso.' });
      const { req, res } = mockReqRes({ params: { id: '1', id_docente: '5' } });
      await modalidadeController.desassociarDocente(req, res);
      expect(res.json).toHaveBeenCalled();
    });

    it('retorna 404 quando associação não é encontrada', async () => {
      modalidadeService.desassociarDocente.mockRejectedValue(new Error('Associação não encontrada.'));
      const { req, res } = mockReqRes({ params: { id: '1', id_docente: '99' } });
      await modalidadeController.desassociarDocente(req, res);
      expect(res.status).toHaveBeenCalledWith(404);
    });
  });
});
