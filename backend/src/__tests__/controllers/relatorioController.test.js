'use strict';

jest.mock('../../services/relatorioService');

const relatorioController = require('../../controllers/relatorioController');
const relatorioService    = require('../../services/relatorioService');

const mockReqRes = (overrides = {}) => {
  const req = { params: {}, body: {}, query: {}, user: { id: 1 }, ...overrides };
  const res = {
    status: jest.fn().mockReturnThis(),
    json: jest.fn().mockReturnThis(),
    setHeader: jest.fn(),
    send: jest.fn(),
  };
  return { req, res };
};

describe('relatorioController', () => {
  beforeEach(() => jest.clearAllMocks());

  // ── getSessoesRelatorio ───────────────────────────────────────────────────

  describe('getSessoesRelatorio', () => {
    it('retorna 400 quando from ou to estão em falta', async () => {
      const { req, res } = mockReqRes({ query: { from: '2024-01-01' } });
      await relatorioController.getSessoesRelatorio(req, res);
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ error: 'Os parâmetros "from" e "to" são obrigatórios.' });
      expect(relatorioService.obterSessoes).not.toHaveBeenCalled();
    });

    it('retorna 200 com lista de sessões', async () => {
      relatorioService.obterSessoes.mockResolvedValue([{ id_marcacoes: 1 }]);
      const { req, res } = mockReqRes({ query: { from: '2024-01-01', to: '2024-12-31' } });
      await relatorioController.getSessoesRelatorio(req, res);
      expect(res.json).toHaveBeenCalledWith([{ id_marcacoes: 1 }]);
    });

    it('retorna 500 quando o service lança erro', async () => {
      relatorioService.obterSessoes.mockRejectedValue(new Error('DB error'));
      const { req, res } = mockReqRes({ query: { from: '2024-01-01', to: '2024-12-31' } });
      await relatorioController.getSessoesRelatorio(req, res);
      expect(res.status).toHaveBeenCalledWith(500);
    });
  });

  // ── getHorasDocente ───────────────────────────────────────────────────────

  describe('getHorasDocente', () => {
    it('retorna 200 com horas por docente', async () => {
      relatorioService.obterHorasPorDocente.mockResolvedValue([{ id_docente: 1, total_minutos: 120 }]);
      const { req, res } = mockReqRes({ query: {} });
      await relatorioController.getHorasDocente(req, res);
      expect(res.json).toHaveBeenCalled();
    });

    it('retorna 500 quando o service lança erro', async () => {
      relatorioService.obterHorasPorDocente.mockRejectedValue(new Error('DB error'));
      const { req, res } = mockReqRes({ query: {} });
      await relatorioController.getHorasDocente(req, res);
      expect(res.status).toHaveBeenCalledWith(500);
    });
  });

  // ── getAlunosRelatorio ────────────────────────────────────────────────────

  describe('getAlunosRelatorio', () => {
    it('retorna 200 com relatório de alunos', async () => {
      relatorioService.obterRelatorioAlunos.mockResolvedValue([{ id_aluno: 1 }]);
      const { req, res } = mockReqRes({ query: {} });
      await relatorioController.getAlunosRelatorio(req, res);
      expect(res.json).toHaveBeenCalled();
    });

    it('retorna 500 quando o service lança erro', async () => {
      relatorioService.obterRelatorioAlunos.mockRejectedValue(new Error('DB error'));
      const { req, res } = mockReqRes({ query: {} });
      await relatorioController.getAlunosRelatorio(req, res);
      expect(res.status).toHaveBeenCalledWith(500);
    });
  });

  // ── getDocentesRelatorio ──────────────────────────────────────────────────

  describe('getDocentesRelatorio', () => {
    it('retorna 200 com relatório de docentes', async () => {
      relatorioService.obterRelatorioDocentes.mockResolvedValue([{ id_docente: 1 }]);
      const { req, res } = mockReqRes();
      await relatorioController.getDocentesRelatorio(req, res);
      expect(res.json).toHaveBeenCalled();
    });

    it('retorna 500 quando o service lança erro', async () => {
      relatorioService.obterRelatorioDocentes.mockRejectedValue(new Error('DB error'));
      const { req, res } = mockReqRes();
      await relatorioController.getDocentesRelatorio(req, res);
      expect(res.status).toHaveBeenCalledWith(500);
    });
  });

  // ── exportCSV ─────────────────────────────────────────────────────────────

  describe('exportCSV', () => {
    it('retorna 400 quando from ou to estão em falta', async () => {
      const { req, res } = mockReqRes({ query: { to: '2024-12-31' } });
      await relatorioController.exportCSV(req, res);
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ error: 'Os parâmetros "from" e "to" são obrigatórios.' });
      expect(relatorioService.gerarDadosCSV).not.toHaveBeenCalled();
    });

    it('envia ficheiro CSV quando gerado com sucesso', async () => {
      relatorioService.gerarDadosCSV.mockResolvedValue('id,nome\n1,Ana');
      const { req, res } = mockReqRes({ query: { from: '2024-01-01', to: '2024-12-31' } });
      await relatorioController.exportCSV(req, res);
      expect(res.setHeader).toHaveBeenCalledWith('Content-Type', 'text/csv');
      expect(res.setHeader).toHaveBeenCalledWith('Content-Disposition', 'attachment; filename="sessoes.csv"');
      expect(res.send).toHaveBeenCalledWith('id,nome\n1,Ana');
    });

    it('retorna 500 quando o service lança erro', async () => {
      relatorioService.gerarDadosCSV.mockRejectedValue(new Error('fail'));
      const { req, res } = mockReqRes({ query: { from: '2024-01-01', to: '2024-12-31' } });
      await relatorioController.exportCSV(req, res);
      expect(res.status).toHaveBeenCalledWith(500);
    });
  });

  // ── getOcupacaoSalas ──────────────────────────────────────────────────────

  describe('getOcupacaoSalas', () => {
    it('retorna 200 com ocupação das salas', async () => {
      relatorioService.obterOcupacaoSalas.mockResolvedValue([{ id_sala: 1, ocupacao: 2 }]);
      const { req, res } = mockReqRes({ query: { data: '2024-01-15' } });
      await relatorioController.getOcupacaoSalas(req, res);
      expect(res.json).toHaveBeenCalled();
    });

    it('retorna 500 quando o service lança erro', async () => {
      relatorioService.obterOcupacaoSalas.mockRejectedValue(new Error('DB error'));
      const { req, res } = mockReqRes({ query: {} });
      await relatorioController.getOcupacaoSalas(req, res);
      expect(res.status).toHaveBeenCalledWith(500);
    });
  });
});
