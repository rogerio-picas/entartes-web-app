'use strict';

jest.mock('../../services/groupService');

const groupController = require('../../controllers/groupController');
const groupService    = require('../../services/groupService');

const mockReqRes = (overrides = {}) => {
  const req = { params: {}, body: {}, user: { id: 1, role: 1 }, ...overrides };
  const res = { status: jest.fn().mockReturnThis(), json: jest.fn().mockReturnThis() };
  return { req, res };
};

describe('groupController', () => {
  beforeEach(() => jest.clearAllMocks());

  // ── listarTodosOsGrupos ───────────────────────────────────────────────────

  describe('listarTodosOsGrupos', () => {
    it('retorna 200 com lista de grupos', async () => {
      groupService.listarTodosOsGrupos.mockResolvedValue([{ id_grupo: 1 }]);
      const { req, res } = mockReqRes();
      await groupController.listarTodosOsGrupos(req, res);
      expect(res.status).toHaveBeenCalledWith(200);
    });

    it('retorna 500 quando o service lança erro', async () => {
      groupService.listarTodosOsGrupos.mockRejectedValue(new Error('DB error'));
      const { req, res } = mockReqRes();
      await groupController.listarTodosOsGrupos(req, res);
      expect(res.status).toHaveBeenCalledWith(500);
    });
  });

  // ── criarGrupo ────────────────────────────────────────────────────────────

  describe('criarGrupo', () => {
    it('retorna 400 quando id_evento não é um número', async () => {
      const { req, res } = mockReqRes({ params: { id_evento: 'abc' } });
      await groupController.criarGrupo(req, res);
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ erro: 'ID do evento inválido.' });
      expect(groupService.criarGrupo).not.toHaveBeenCalled();
    });

    it('retorna 201 quando cria grupo com sucesso', async () => {
      groupService.criarGrupo.mockResolvedValue({ id_grupo: 1 });
      const { req, res } = mockReqRes({ params: { id_evento: '1' }, body: { nome: 'G1' } });
      await groupController.criarGrupo(req, res);
      expect(res.status).toHaveBeenCalledWith(201);
    });

    it('retorna 400 quando o service lança erro', async () => {
      groupService.criarGrupo.mockRejectedValue(new Error('Evento não encontrado.'));
      const { req, res } = mockReqRes({ params: { id_evento: '1' } });
      await groupController.criarGrupo(req, res);
      expect(res.status).toHaveBeenCalledWith(400);
    });
  });

  // ── listarGruposDoEvento ──────────────────────────────────────────────────

  describe('listarGruposDoEvento', () => {
    it('retorna 400 quando id_evento não é um número', async () => {
      const { req, res } = mockReqRes({ params: { id_evento: 'x' } });
      await groupController.listarGruposDoEvento(req, res);
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ erro: 'ID do evento inválido.' });
    });

    it('retorna 200 com grupos do evento', async () => {
      groupService.listarGruposDoEvento.mockResolvedValue([{ id_grupo: 1 }]);
      const { req, res } = mockReqRes({ params: { id_evento: '1' } });
      await groupController.listarGruposDoEvento(req, res);
      expect(res.status).toHaveBeenCalledWith(200);
    });

    it('retorna 404 quando o service lança erro', async () => {
      groupService.listarGruposDoEvento.mockRejectedValue(new Error('Evento não encontrado.'));
      const { req, res } = mockReqRes({ params: { id_evento: '1' } });
      await groupController.listarGruposDoEvento(req, res);
      expect(res.status).toHaveBeenCalledWith(404);
    });
  });

  // ── adicionarAlunoAoGrupo ─────────────────────────────────────────────────

  describe('adicionarAlunoAoGrupo', () => {
    it('retorna 400 quando id_evento não é um número', async () => {
      const { req, res } = mockReqRes({ params: { id_evento: 'abc', id_grupo: '1', id_aluno: '1' } });
      await groupController.adicionarAlunoAoGrupo(req, res);
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ erro: 'ID do evento inválido.' });
    });

    it('retorna 400 quando id_grupo não é um número', async () => {
      const { req, res } = mockReqRes({ params: { id_evento: '1', id_grupo: 'x', id_aluno: '1' } });
      await groupController.adicionarAlunoAoGrupo(req, res);
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ erro: 'ID do grupo inválido.' });
    });

    it('retorna 400 quando id_aluno não é um número', async () => {
      const { req, res } = mockReqRes({ params: { id_evento: '1', id_grupo: '1', id_aluno: 'x' } });
      await groupController.adicionarAlunoAoGrupo(req, res);
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ erro: 'ID do aluno inválido.' });
    });

    it('retorna 201 quando adiciona aluno com sucesso', async () => {
      groupService.adicionarAlunoAoGrupo.mockResolvedValue({ id_grupo: 1, id_aluno: 10 });
      const { req, res } = mockReqRes({ params: { id_evento: '1', id_grupo: '1', id_aluno: '10' } });
      await groupController.adicionarAlunoAoGrupo(req, res);
      expect(res.status).toHaveBeenCalledWith(201);
    });
  });

  // ── adicionarDocenteAoGrupo ───────────────────────────────────────────────

  describe('adicionarDocenteAoGrupo', () => {
    it('retorna 400 quando id_evento não é um número', async () => {
      const { req, res } = mockReqRes({ params: { id_evento: 'abc', id_grupo: '1', id_docente: '1' } });
      await groupController.adicionarDocenteAoGrupo(req, res);
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ erro: 'ID do evento inválido.' });
    });

    it('retorna 400 quando id_grupo não é um número', async () => {
      const { req, res } = mockReqRes({ params: { id_evento: '1', id_grupo: 'x', id_docente: '1' } });
      await groupController.adicionarDocenteAoGrupo(req, res);
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ erro: 'ID do grupo inválido.' });
    });

    it('retorna 400 quando id_docente não é um número', async () => {
      const { req, res } = mockReqRes({ params: { id_evento: '1', id_grupo: '1', id_docente: 'x' } });
      await groupController.adicionarDocenteAoGrupo(req, res);
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ erro: 'ID do docente inválido.' });
    });

    it('retorna 422 quando o perfil de docente está em falta na BD', async () => {
      groupService.adicionarDocenteAoGrupo.mockRejectedValue(
        new Error('O utilizador tem tipo docente mas o perfil de docente está em falta na base de dados. Corrija a inconsistência antes de continuar.')
      );
      const { req, res } = mockReqRes({ params: { id_evento: '1', id_grupo: '1', id_docente: '5' } });
      await groupController.adicionarDocenteAoGrupo(req, res);
      expect(res.status).toHaveBeenCalledWith(422);
    });

    it('retorna 400 para outros erros do service', async () => {
      groupService.adicionarDocenteAoGrupo.mockRejectedValue(new Error('Docente não encontrado.'));
      const { req, res } = mockReqRes({ params: { id_evento: '1', id_grupo: '1', id_docente: '5' } });
      await groupController.adicionarDocenteAoGrupo(req, res);
      expect(res.status).toHaveBeenCalledWith(400);
    });

    it('retorna 201 quando adiciona docente com sucesso', async () => {
      groupService.adicionarDocenteAoGrupo.mockResolvedValue({ id_grupo: 1, id_docente: 5 });
      const { req, res } = mockReqRes({ params: { id_evento: '1', id_grupo: '1', id_docente: '5' } });
      await groupController.adicionarDocenteAoGrupo(req, res);
      expect(res.status).toHaveBeenCalledWith(201);
    });
  });

  // ── removerAlunoDoGrupo ───────────────────────────────────────────────────

  describe('removerAlunoDoGrupo', () => {
    it('retorna 400 quando id_grupo não é um número', async () => {
      const { req, res } = mockReqRes({ params: { id_grupo: 'x', id_aluno: '1' } });
      await groupController.removerAlunoDoGrupo(req, res);
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ erro: 'ID do grupo inválido.' });
    });

    it('retorna 400 quando id_aluno não é um número', async () => {
      const { req, res } = mockReqRes({ params: { id_grupo: '1', id_aluno: 'x' } });
      await groupController.removerAlunoDoGrupo(req, res);
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ erro: 'ID do aluno inválido.' });
    });

    it('retorna 200 quando remove aluno com sucesso', async () => {
      groupService.removerAlunoDoGrupo.mockResolvedValue({ mensagem: 'Aluno removido do grupo com sucesso.' });
      const { req, res } = mockReqRes({ params: { id_grupo: '1', id_aluno: '10' } });
      await groupController.removerAlunoDoGrupo(req, res);
      expect(res.status).toHaveBeenCalledWith(200);
    });
  });

  // ── removerDocenteDoGrupo ─────────────────────────────────────────────────

  describe('removerDocenteDoGrupo', () => {
    it('retorna 400 quando id_grupo não é um número', async () => {
      const { req, res } = mockReqRes({ params: { id_grupo: 'x', id_docente: '1' } });
      await groupController.removerDocenteDoGrupo(req, res);
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ erro: 'ID do grupo inválido.' });
    });

    it('retorna 400 quando id_docente não é um número', async () => {
      const { req, res } = mockReqRes({ params: { id_grupo: '1', id_docente: 'x' } });
      await groupController.removerDocenteDoGrupo(req, res);
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ erro: 'ID do docente inválido.' });
    });

    it('retorna 200 quando remove docente com sucesso', async () => {
      groupService.removerDocenteDoGrupo.mockResolvedValue({ mensagem: 'Docente removido do grupo com sucesso.' });
      const { req, res } = mockReqRes({ params: { id_grupo: '1', id_docente: '5' } });
      await groupController.removerDocenteDoGrupo(req, res);
      expect(res.status).toHaveBeenCalledWith(200);
    });
  });

  // ── editarGrupo ───────────────────────────────────────────────────────────

  describe('editarGrupo', () => {
    it('retorna 400 quando id_grupo não é um número', async () => {
      const { req, res } = mockReqRes({ params: { id_grupo: 'abc' } });
      await groupController.editarGrupo(req, res);
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ erro: 'ID do grupo inválido.' });
    });

    it('retorna 200 quando edita grupo com sucesso', async () => {
      groupService.editarGrupo.mockResolvedValue({ id_grupo: 1, nome: 'Novo' });
      const { req, res } = mockReqRes({ params: { id_grupo: '1' }, body: { nome: 'Novo' } });
      await groupController.editarGrupo(req, res);
      expect(res.status).toHaveBeenCalledWith(200);
    });
  });

  // ── eliminarGrupo ─────────────────────────────────────────────────────────

  describe('eliminarGrupo', () => {
    it('retorna 400 quando id_grupo não é um número', async () => {
      const { req, res } = mockReqRes({ params: { id_grupo: 'abc' } });
      await groupController.eliminarGrupo(req, res);
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ erro: 'ID do grupo inválido.' });
    });

    it('retorna 200 quando elimina grupo com sucesso', async () => {
      groupService.eliminarGrupo.mockResolvedValue({ mensagem: 'Grupo eliminado com sucesso.' });
      const { req, res } = mockReqRes({ params: { id_grupo: '1' } });
      await groupController.eliminarGrupo(req, res);
      expect(res.status).toHaveBeenCalledWith(200);
    });
  });
});
