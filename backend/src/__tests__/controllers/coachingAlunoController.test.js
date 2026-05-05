'use strict';

jest.mock('../../services/coachingAlunoService');

const coachingAlunoController = require('../../controllers/coachingAlunoController');
const coachingAlunoService    = require('../../services/coachingAlunoService');

const mockReqRes = (overrides = {}) => {
  const req = { params: {}, body: {}, query: {}, user: { id: 10 }, ...overrides };
  const res = { status: jest.fn().mockReturnThis(), json: jest.fn().mockReturnThis() };
  return { req, res };
};

describe('coachingAlunoController', () => {
  beforeEach(() => jest.clearAllMocks());

  // ── consultarDisponibilidades ──────────────────────────────────────────────

  describe('consultarDisponibilidades', () => {
    it('retorna 400 quando data tem formato inválido', async () => {
      const { req, res } = mockReqRes({ query: { data: 'nao-e-data' } });
      await coachingAlunoController.consultarDisponibilidades(req, res);
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ message: 'data tem formato inválido.' });
      expect(coachingAlunoService.consultarDisponibilidades).not.toHaveBeenCalled();
    });

    it('retorna 200 com disponibilidades', async () => {
      coachingAlunoService.consultarDisponibilidades.mockResolvedValue([]);
      const { req, res } = mockReqRes({ query: {} });
      await coachingAlunoController.consultarDisponibilidades(req, res);
      expect(res.status).toHaveBeenCalledWith(200);
    });

    it('retorna 404 quando o service lança "não encontrado"', async () => {
      coachingAlunoService.consultarDisponibilidades.mockRejectedValue(new Error('Docente não encontrado.'));
      const { req, res } = mockReqRes({ query: {} });
      await coachingAlunoController.consultarDisponibilidades(req, res);
      expect(res.status).toHaveBeenCalledWith(404);
    });
  });

  // ── solicitarMarcacao ──────────────────────────────────────────────────────

  describe('solicitarMarcacao', () => {
    it('retorna 400 quando campos obrigatórios estão em falta', async () => {
      const { req, res } = mockReqRes({ body: { id_docente: 1 } });
      await coachingAlunoController.solicitarMarcacao(req, res);
      expect(res.status).toHaveBeenCalledWith(400);
      expect(coachingAlunoService.solicitarMarcacao).not.toHaveBeenCalled();
    });

    it('retorna 400 quando data_a_realizar tem formato inválido', async () => {
      const { req, res } = mockReqRes({
        body: { id_docente: 1, id_modalidade: 2, data_a_realizar: 'invalida', hora_inicio: '10:00', duracao_minutos: 60 },
      });
      await coachingAlunoController.solicitarMarcacao(req, res);
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ message: 'data_a_realizar tem formato inválido.' });
    });

    it('retorna 400 quando data_a_realizar é no passado', async () => {
      const { req, res } = mockReqRes({
        body: { id_docente: 1, id_modalidade: 2, data_a_realizar: '2000-01-01', hora_inicio: '10:00', duracao_minutos: 60 },
      });
      await coachingAlunoController.solicitarMarcacao(req, res);
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ message: 'data_a_realizar não pode ser no passado.' });
    });

    it('retorna 201 quando solicita marcação com sucesso', async () => {
      coachingAlunoService.solicitarMarcacao.mockResolvedValue({ id_marcacao: 1 });
      const { req, res } = mockReqRes({
        body: { id_docente: 1, id_modalidade: 2, data_a_realizar: '2099-12-31', hora_inicio: '10:00', duracao_minutos: 60 },
      });
      await coachingAlunoController.solicitarMarcacao(req, res);
      expect(res.status).toHaveBeenCalledWith(201);
    });

    it('retorna 400 quando o service lança erro de validação', async () => {
      coachingAlunoService.solicitarMarcacao.mockRejectedValue(new Error('O slot já não está disponível.'));
      const { req, res } = mockReqRes({
        body: { id_docente: 1, id_modalidade: 2, data_a_realizar: '2099-12-31', hora_inicio: '10:00', duracao_minutos: 60 },
      });
      await coachingAlunoController.solicitarMarcacao(req, res);
      expect(res.status).toHaveBeenCalledWith(400);
    });
  });

  // ── listarMeusPedidos ──────────────────────────────────────────────────────

  describe('listarMeusPedidos', () => {
    it('retorna 200 com lista de pedidos', async () => {
      coachingAlunoService.listarMeusPedidos.mockResolvedValue([]);
      const { req, res } = mockReqRes({ query: {} });
      await coachingAlunoController.listarMeusPedidos(req, res);
      expect(res.status).toHaveBeenCalledWith(200);
    });

    it('retorna 404 quando o service lança "não encontrado"', async () => {
      coachingAlunoService.listarMeusPedidos.mockRejectedValue(new Error('Aluno não encontrado.'));
      const { req, res } = mockReqRes({ query: {} });
      await coachingAlunoController.listarMeusPedidos(req, res);
      expect(res.status).toHaveBeenCalledWith(404);
    });
  });

  // ── cancelarPedidoPendente ────────────────────────────────────────────────

  describe('cancelarPedidoPendente', () => {
    it('retorna 400 quando id_marcacao está ausente', async () => {
      const { req, res } = mockReqRes({ params: {} });
      await coachingAlunoController.cancelarPedidoPendente(req, res);
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ message: 'id_marcacao é obrigatório.' });
    });

    it('retorna 200 quando cancela com sucesso', async () => {
      coachingAlunoService.cancelarPedidoPendente.mockResolvedValue({ id_marcacao: 1 });
      const { req, res } = mockReqRes({ params: { id_marcacao: '5' } });
      await coachingAlunoController.cancelarPedidoPendente(req, res);
      expect(res.status).toHaveBeenCalledWith(200);
    });

    it('retorna 400 quando o service lança "Só é possível"', async () => {
      coachingAlunoService.cancelarPedidoPendente.mockRejectedValue(new Error('Só é possível cancelar pedidos pendentes.'));
      const { req, res } = mockReqRes({ params: { id_marcacao: '5' } });
      await coachingAlunoController.cancelarPedidoPendente(req, res);
      expect(res.status).toHaveBeenCalledWith(400);
    });
  });

  // ── confirmarPresencaGrupo ────────────────────────────────────────────────

  describe('confirmarPresencaGrupo', () => {
    it('retorna 400 quando id_marcacao ou aceitar estão ausentes', async () => {
      const { req, res } = mockReqRes({ body: { id_marcacao: 1 } });
      await coachingAlunoController.confirmarPresencaGrupo(req, res);
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ message: 'id_marcacao e aceitar são obrigatórios.' });
    });

    it('retorna 200 quando confirma com sucesso', async () => {
      coachingAlunoService.confirmarPresencaGrupo.mockResolvedValue({ mensagem: 'ok' });
      const { req, res } = mockReqRes({ body: { id_marcacao: 1, aceitar: true } });
      await coachingAlunoController.confirmarPresencaGrupo(req, res);
      expect(res.status).toHaveBeenCalledWith(200);
    });
  });

  // ── validarConclusaoSessao ────────────────────────────────────────────────

  describe('validarConclusaoSessao', () => {
    it('retorna 400 quando id_marcacao está ausente', async () => {
      const { req, res } = mockReqRes({ params: {} });
      await coachingAlunoController.validarConclusaoSessao(req, res);
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ message: 'id_marcacao é obrigatório.' });
    });

    it('retorna 200 quando valida com sucesso', async () => {
      coachingAlunoService.validarConclusaoSessao.mockResolvedValue({ mensagem: 'ok' });
      const { req, res } = mockReqRes({ params: { id_marcacao: '3' } });
      await coachingAlunoController.validarConclusaoSessao(req, res);
      expect(res.status).toHaveBeenCalledWith(200);
    });
  });

  // ── listarColegas ─────────────────────────────────────────────────────────

  describe('listarColegas', () => {
    it('retorna 200 com lista de colegas', async () => {
      coachingAlunoService.listarColegas.mockResolvedValue([{ id_utilizador: 2 }]);
      const { req, res } = mockReqRes();
      await coachingAlunoController.listarColegas(req, res);
      expect(res.status).toHaveBeenCalledWith(200);
    });

    it('retorna 404 quando o service lança "não encontrado"', async () => {
      coachingAlunoService.listarColegas.mockRejectedValue(new Error('Aluno não encontrado.'));
      const { req, res } = mockReqRes();
      await coachingAlunoController.listarColegas(req, res);
      expect(res.status).toHaveBeenCalledWith(404);
    });

    it('retorna 500 para erros genéricos do service', async () => {
      coachingAlunoService.listarColegas.mockRejectedValue(new Error('DB error'));
      const { req, res } = mockReqRes();
      await coachingAlunoController.listarColegas(req, res);
      expect(res.status).toHaveBeenCalledWith(500);
    });
  });

  // ── _handleError — mapeamentos de status ──────────────────────────────────

  describe('_handleError via solicitarMarcacao', () => {
    const validBody = {
      id_docente: 1, id_modalidade: 2, data_a_realizar: '2099-12-31', hora_inicio: '10:00', duracao_minutos: 60,
    };

    it('retorna 403 quando mensagem contém "não tem permissão"', async () => {
      coachingAlunoService.solicitarMarcacao.mockRejectedValue(new Error('O aluno não tem permissão neste contexto.'));
      const { req, res } = mockReqRes({ body: validBody });
      await coachingAlunoController.solicitarMarcacao(req, res);
      expect(res.status).toHaveBeenCalledWith(403);
    });

    it('retorna 400 quando mensagem contém "já existe"', async () => {
      coachingAlunoService.solicitarMarcacao.mockRejectedValue(new Error('Já existe uma marcação neste horário.'));
      const { req, res } = mockReqRes({ body: validBody });
      await coachingAlunoController.solicitarMarcacao(req, res);
      expect(res.status).toHaveBeenCalledWith(400);
    });

    it('retorna 500 para erros genéricos', async () => {
      coachingAlunoService.solicitarMarcacao.mockRejectedValue(new Error('Unexpected failure'));
      const { req, res } = mockReqRes({ body: validBody });
      await coachingAlunoController.solicitarMarcacao(req, res);
      expect(res.status).toHaveBeenCalledWith(500);
    });
  });
});
