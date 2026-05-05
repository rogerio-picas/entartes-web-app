'use strict';

jest.mock('../../services/eventService');

const eventController = require('../../controllers/eventController');
const eventService    = require('../../services/eventService');

const mockReqRes = (overrides = {}) => {
  const req = { params: {}, body: {}, query: {}, user: { id: 1, role: 1 }, ...overrides };
  const res = { status: jest.fn().mockReturnThis(), json: jest.fn().mockReturnThis() };
  return { req, res };
};

describe('eventController', () => {
  beforeEach(() => jest.clearAllMocks());

  // ── criarEvento ───────────────────────────────────────────────────────────

  describe('criarEvento', () => {
    it('retorna 400 quando data_de_realizacao tem formato inválido', async () => {
      const { req, res } = mockReqRes({ body: { nome: 'Ev', data_de_realizacao: 'nao-e-data' } });
      await eventController.criarEvento(req, res);
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ error: 'Data de realizacao tem formato inválido.' });
      expect(eventService.criarEvento).not.toHaveBeenCalled();
    });

    it('retorna 400 quando data_de_realizacao é no passado', async () => {
      const { req, res } = mockReqRes({ body: { nome: 'Ev', data_de_realizacao: '2000-01-01' } });
      await eventController.criarEvento(req, res);
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ error: 'Data de realizacao não pode ser no passado.' });
    });

    it('retorna 201 quando cria evento com sucesso (sem data)', async () => {
      eventService.criarEvento.mockResolvedValue({ id_evento: 1, nome: 'Ev' });
      const { req, res } = mockReqRes({ body: { nome: 'Ev' }, user: { id: 1 } });
      await eventController.criarEvento(req, res);
      expect(res.status).toHaveBeenCalledWith(201);
    });

    it('retorna 201 quando cria evento com data futura válida', async () => {
      eventService.criarEvento.mockResolvedValue({ id_evento: 1 });
      const { req, res } = mockReqRes({ body: { nome: 'Ev', data_de_realizacao: '2099-12-31' }, user: { id: 1 } });
      await eventController.criarEvento(req, res);
      expect(res.status).toHaveBeenCalledWith(201);
    });

    it('retorna 400 quando o service lança erro', async () => {
      eventService.criarEvento.mockRejectedValue(new Error('Coordenadora não encontrada.'));
      const { req, res } = mockReqRes({ body: { nome: 'Ev' }, user: { id: 1 } });
      await eventController.criarEvento(req, res);
      expect(res.status).toHaveBeenCalledWith(400);
    });
  });

  // ── listarEventos ─────────────────────────────────────────────────────────

  describe('listarEventos', () => {
    it('retorna 200 com lista de eventos', async () => {
      eventService.listarEventos.mockResolvedValue([{ id_evento: 1 }]);
      const { req, res } = mockReqRes({ query: {} });
      await eventController.listarEventos(req, res);
      expect(res.status).toHaveBeenCalledWith(200);
    });

    it('retorna 500 quando o service lança erro', async () => {
      eventService.listarEventos.mockRejectedValue(new Error('DB error'));
      const { req, res } = mockReqRes();
      await eventController.listarEventos(req, res);
      expect(res.status).toHaveBeenCalledWith(500);
    });
  });

  // ── buscarEventoPorId ─────────────────────────────────────────────────────

  describe('buscarEventoPorId', () => {
    it('retorna 400 quando id não é um número', async () => {
      const { req, res } = mockReqRes({ params: { id: 'abc' } });
      await eventController.buscarEventoPorId(req, res);
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ error: 'ID do evento inválido.' });
      expect(eventService.buscarEventoPorId).not.toHaveBeenCalled();
    });

    it('retorna 200 com o evento', async () => {
      eventService.buscarEventoPorId.mockResolvedValue({ id_evento: 1 });
      const { req, res } = mockReqRes({ params: { id: '1' } });
      await eventController.buscarEventoPorId(req, res);
      expect(res.status).toHaveBeenCalledWith(200);
    });

    it('retorna 404 quando o service lança erro', async () => {
      eventService.buscarEventoPorId.mockRejectedValue(new Error('Evento não encontrado.'));
      const { req, res } = mockReqRes({ params: { id: '99' } });
      await eventController.buscarEventoPorId(req, res);
      expect(res.status).toHaveBeenCalledWith(404);
    });
  });

  // ── adicionarParticipante ─────────────────────────────────────────────────

  describe('adicionarParticipante', () => {
    it('retorna 400 quando id do evento não é um número', async () => {
      const { req, res } = mockReqRes({ params: { id: 'abc' }, body: { codigo_username: 'user' } });
      await eventController.adicionarParticipante(req, res);
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ error: 'ID do evento inválido.' });
    });

    it('retorna 400 quando codigo_username está ausente', async () => {
      const { req, res } = mockReqRes({ params: { id: '1' }, body: {} });
      await eventController.adicionarParticipante(req, res);
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ error: 'O código de utilizador é obrigatório.' });
      expect(eventService.adicionarParticipante).not.toHaveBeenCalled();
    });

    it('retorna 201 quando adiciona participante com sucesso', async () => {
      eventService.adicionarParticipante.mockResolvedValue({ id_evento: 1 });
      const { req, res } = mockReqRes({ params: { id: '1' }, body: { codigo_username: 'aluno' } });
      await eventController.adicionarParticipante(req, res);
      expect(res.status).toHaveBeenCalledWith(201);
    });

    it('retorna 400 quando o service lança erro', async () => {
      eventService.adicionarParticipante.mockRejectedValue(new Error('Evento não encontrado.'));
      const { req, res } = mockReqRes({ params: { id: '1' }, body: { codigo_username: 'x' } });
      await eventController.adicionarParticipante(req, res);
      expect(res.status).toHaveBeenCalledWith(400);
    });
  });

  // ── editarEvento ──────────────────────────────────────────────────────────

  describe('editarEvento', () => {
    it('retorna 400 quando id não é um número', async () => {
      const { req, res } = mockReqRes({ params: { id: 'abc' }, body: { nome: 'X' } });
      await eventController.editarEvento(req, res);
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ error: 'ID do evento inválido.' });
    });

    it('retorna 400 quando nenhum campo é fornecido', async () => {
      const { req, res } = mockReqRes({ params: { id: '1' }, body: {} });
      await eventController.editarEvento(req, res);
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ error: 'Pelo menos um campo deve ser fornecido para edição.' });
    });

    it('retorna 400 quando data_de_realizacao tem formato inválido', async () => {
      const { req, res } = mockReqRes({ params: { id: '1' }, body: { data_de_realizacao: 'invalida' } });
      await eventController.editarEvento(req, res);
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ error: 'data_de_realizacao tem formato inválido.' });
    });

    it('retorna 400 quando data_de_realizacao é no passado', async () => {
      const { req, res } = mockReqRes({ params: { id: '1' }, body: { data_de_realizacao: '2000-01-01' } });
      await eventController.editarEvento(req, res);
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ error: 'data de realizacao não pode ser no passado.' });
    });

    it('retorna 200 quando edita com sucesso', async () => {
      eventService.editarEvento.mockResolvedValue({ id_evento: 1, nome: 'Novo' });
      const { req, res } = mockReqRes({ params: { id: '1' }, body: { nome: 'Novo' } });
      await eventController.editarEvento(req, res);
      expect(res.status).toHaveBeenCalledWith(200);
    });

    it('retorna 404 quando o service lança "não encontrado"', async () => {
      eventService.editarEvento.mockRejectedValue(new Error('Evento não encontrado.'));
      const { req, res } = mockReqRes({ params: { id: '99' }, body: { nome: 'X' } });
      await eventController.editarEvento(req, res);
      expect(res.status).toHaveBeenCalledWith(404);
    });
  });

  // ── cancelarEvento ────────────────────────────────────────────────────────

  describe('cancelarEvento', () => {
    it('retorna 400 quando id não está presente', async () => {
      const { req, res } = mockReqRes({ params: {}, user: { id: 1 } });
      await eventController.cancelarEvento(req, res);
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ error: 'ID do evento é obrigatório.' });
    });

    it('retorna 403 quando o service lança "Sem permissão"', async () => {
      eventService.cancelarEvento.mockRejectedValue(new Error('Sem permissão para cancelar este evento.'));
      const { req, res } = mockReqRes({ params: { id: '1' }, user: { id: 99 } });
      await eventController.cancelarEvento(req, res);
      expect(res.status).toHaveBeenCalledWith(403);
    });

    it('retorna 404 quando o service lança "não encontrado"', async () => {
      eventService.cancelarEvento.mockRejectedValue(new Error('Evento não encontrado.'));
      const { req, res } = mockReqRes({ params: { id: '99' }, user: { id: 1 } });
      await eventController.cancelarEvento(req, res);
      expect(res.status).toHaveBeenCalledWith(404);
    });

    it('retorna 400 quando o evento já está cancelado', async () => {
      eventService.cancelarEvento.mockRejectedValue(new Error('O evento já está cancelado.'));
      const { req, res } = mockReqRes({ params: { id: '1' }, user: { id: 1 } });
      await eventController.cancelarEvento(req, res);
      expect(res.status).toHaveBeenCalledWith(400);
    });

    it('retorna 200 quando cancela com sucesso', async () => {
      eventService.cancelarEvento.mockResolvedValue({ mensagem: 'Evento cancelado com sucesso.' });
      const { req, res } = mockReqRes({ params: { id: '1' }, user: { id: 1 } });
      await eventController.cancelarEvento(req, res);
      expect(res.status).toHaveBeenCalledWith(200);
    });
  });

  // ── concluirEvento ────────────────────────────────────────────────────────

  describe('concluirEvento', () => {
    it('retorna 403 quando o service lança "Sem permissão"', async () => {
      eventService.concluirEvento.mockRejectedValue(new Error('Sem permissão para concluir este evento.'));
      const { req, res } = mockReqRes({ params: { id: '1' }, user: { id: 99 } });
      await eventController.concluirEvento(req, res);
      expect(res.status).toHaveBeenCalledWith(403);
    });

    it('retorna 404 quando o service lança "não encontrado"', async () => {
      eventService.concluirEvento.mockRejectedValue(new Error('Evento não encontrado.'));
      const { req, res } = mockReqRes({ params: { id: '99' }, user: { id: 1 } });
      await eventController.concluirEvento(req, res);
      expect(res.status).toHaveBeenCalledWith(404);
    });

    it('retorna 400 para outros erros do service', async () => {
      eventService.concluirEvento.mockRejectedValue(new Error('O evento já está concluído.'));
      const { req, res } = mockReqRes({ params: { id: '1' }, user: { id: 1 } });
      await eventController.concluirEvento(req, res);
      expect(res.status).toHaveBeenCalledWith(400);
    });

    it('retorna 200 quando conclui com sucesso', async () => {
      eventService.concluirEvento.mockResolvedValue({ mensagem: 'Evento concluído com sucesso.' });
      const { req, res } = mockReqRes({ params: { id: '1' }, user: { id: 1 } });
      await eventController.concluirEvento(req, res);
      expect(res.status).toHaveBeenCalledWith(200);
    });
  });

  // ── removerAlunoDoEvento ──────────────────────────────────────────────────

  describe('removerAlunoDoEvento', () => {
    it('retorna 400 quando id do evento não é um número', async () => {
      const { req, res } = mockReqRes({ params: { id: 'abc', id_aluno: '10' } });
      await eventController.removerAlunoDoEvento(req, res);
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ error: 'ID do evento inválido.' });
    });

    it('retorna 400 quando id do aluno não é um número', async () => {
      const { req, res } = mockReqRes({ params: { id: '1', id_aluno: 'abc' } });
      await eventController.removerAlunoDoEvento(req, res);
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ error: 'ID do aluno inválido.' });
    });

    it('retorna 200 quando remove aluno com sucesso', async () => {
      eventService.removerAlunoDoEvento.mockResolvedValue({ mensagem: 'Aluno removido do evento com sucesso.' });
      const { req, res } = mockReqRes({ params: { id: '1', id_aluno: '10' } });
      await eventController.removerAlunoDoEvento(req, res);
      expect(res.status).toHaveBeenCalledWith(200);
    });
  });

  // ── removerDocenteDoEvento ────────────────────────────────────────────────

  describe('removerDocenteDoEvento', () => {
    it('retorna 400 quando id do evento não é um número', async () => {
      const { req, res } = mockReqRes({ params: { id: 'abc', id_docente: '5' } });
      await eventController.removerDocenteDoEvento(req, res);
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ error: 'ID do evento inválido.' });
    });

    it('retorna 400 quando id do docente não é um número', async () => {
      const { req, res } = mockReqRes({ params: { id: '1', id_docente: 'abc' } });
      await eventController.removerDocenteDoEvento(req, res);
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ error: 'ID do docente inválido.' });
    });

    it('retorna 200 quando remove docente com sucesso', async () => {
      eventService.removerDocenteDoEvento.mockResolvedValue({ mensagem: 'Docente removido do evento com sucesso.' });
      const { req, res } = mockReqRes({ params: { id: '1', id_docente: '5' } });
      await eventController.removerDocenteDoEvento(req, res);
      expect(res.status).toHaveBeenCalledWith(200);
    });
  });
});
