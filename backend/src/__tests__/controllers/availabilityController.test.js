'use strict';

jest.mock('../../services/availabilityService');

const availabilityController = require('../../controllers/availabilityController');
const availabilityService    = require('../../services/availabilityService');

const mockReqRes = (overrides = {}) => {
  const req = { params: {}, body: {}, query: {}, user: { id: 5, role: 2 }, ...overrides };
  const res = { status: jest.fn().mockReturnThis(), json: jest.fn().mockReturnThis() };
  return { req, res };
};

describe('availabilityController', () => {
  beforeEach(() => jest.clearAllMocks());

  // ── criarDisponibilidade ──────────────────────────────────────────────────

  describe('criarDisponibilidade', () => {
    it('retorna 201 quando cria disponibilidade com sucesso', async () => {
      availabilityService.criarDisponibilidade.mockResolvedValue({ id_disponibilidade: 1 });
      const { req, res } = mockReqRes({ body: { data_inicio: '2099-01-01', hora_inicio: '10:00', hora_fim: '11:00' } });
      await availabilityController.criarDisponibilidade(req, res);
      expect(res.status).toHaveBeenCalledWith(201);
    });

    it('retorna 403 quando o service lança "Apenas docentes"', async () => {
      availabilityService.criarDisponibilidade.mockRejectedValue(new Error('Apenas docentes podem criar disponibilidades.'));
      const { req, res } = mockReqRes({ body: {} });
      await availabilityController.criarDisponibilidade(req, res);
      expect(res.status).toHaveBeenCalledWith(403);
    });

    it('retorna 400 para outros erros do service', async () => {
      availabilityService.criarDisponibilidade.mockRejectedValue(new Error('Data inválida.'));
      const { req, res } = mockReqRes({ body: {} });
      await availabilityController.criarDisponibilidade(req, res);
      expect(res.status).toHaveBeenCalledWith(400);
    });
  });

  // ── listarDisponibilidades ────────────────────────────────────────────────

  describe('listarDisponibilidades', () => {
    it('retorna 200 com lista de disponibilidades', async () => {
      availabilityService.listarDisponibilidades.mockResolvedValue([{ id_disponibilidade: 1 }]);
      const { req, res } = mockReqRes();
      await availabilityController.listarDisponibilidades(req, res);
      expect(res.status).toHaveBeenCalledWith(200);
    });

    it('retorna 403 quando o service lança erro', async () => {
      availabilityService.listarDisponibilidades.mockRejectedValue(new Error('Apenas docentes podem listar.'));
      const { req, res } = mockReqRes();
      await availabilityController.listarDisponibilidades(req, res);
      expect(res.status).toHaveBeenCalledWith(403);
    });
  });

  // ── updateAvailability ────────────────────────────────────────────────────

  describe('updateAvailability', () => {
    it('retorna 200 quando atualiza com sucesso', async () => {
      availabilityService.atualizarDisponibilidade.mockResolvedValue({ id_disponibilidade: 1 });
      const { req, res } = mockReqRes({ params: { id_disponibilidade: '1' }, body: { hora_inicio: '09:00' } });
      await availabilityController.updateAvailability(req, res);
      expect(res.status).toHaveBeenCalledWith(200);
    });

    it('retorna 403 quando o service lança "Apenas docentes"', async () => {
      availabilityService.atualizarDisponibilidade.mockRejectedValue(new Error('Apenas docentes podem atualizar.'));
      const { req, res } = mockReqRes({ params: { id_disponibilidade: '1' }, body: {} });
      await availabilityController.updateAvailability(req, res);
      expect(res.status).toHaveBeenCalledWith(403);
    });

    it('retorna 404 quando o service lança "não encontrada"', async () => {
      availabilityService.atualizarDisponibilidade.mockRejectedValue(new Error('Disponibilidade não encontrada.'));
      const { req, res } = mockReqRes({ params: { id_disponibilidade: '99' }, body: {} });
      await availabilityController.updateAvailability(req, res);
      expect(res.status).toHaveBeenCalledWith(404);
    });

    it('retorna 400 para outros erros do service', async () => {
      availabilityService.atualizarDisponibilidade.mockRejectedValue(new Error('Data inválida.'));
      const { req, res } = mockReqRes({ params: { id_disponibilidade: '1' }, body: {} });
      await availabilityController.updateAvailability(req, res);
      expect(res.status).toHaveBeenCalledWith(400);
    });
  });

  // ── deleteAvailability ────────────────────────────────────────────────────

  describe('deleteAvailability', () => {
    it('retorna 200 quando elimina com sucesso', async () => {
      availabilityService.eliminarDisponibilidade.mockResolvedValue({ mensagem: 'Eliminada com sucesso.' });
      const { req, res } = mockReqRes({ params: { id_disponibilidade: '1' } });
      await availabilityController.deleteAvailability(req, res);
      expect(res.status).toHaveBeenCalledWith(200);
    });

    it('retorna 403 quando o service lança "Apenas docentes"', async () => {
      availabilityService.eliminarDisponibilidade.mockRejectedValue(new Error('Apenas docentes podem eliminar.'));
      const { req, res } = mockReqRes({ params: { id_disponibilidade: '1' } });
      await availabilityController.deleteAvailability(req, res);
      expect(res.status).toHaveBeenCalledWith(403);
    });

    it('retorna 404 quando o service lança "não encontrada"', async () => {
      availabilityService.eliminarDisponibilidade.mockRejectedValue(new Error('Disponibilidade não encontrada.'));
      const { req, res } = mockReqRes({ params: { id_disponibilidade: '99' } });
      await availabilityController.deleteAvailability(req, res);
      expect(res.status).toHaveBeenCalledWith(404);
    });

    it('retorna 400 quando existe marcação ativa', async () => {
      availabilityService.eliminarDisponibilidade.mockRejectedValue(new Error('Existe uma marcação ativa associada.'));
      const { req, res } = mockReqRes({ params: { id_disponibilidade: '1' } });
      await availabilityController.deleteAvailability(req, res);
      expect(res.status).toHaveBeenCalledWith(400);
    });

    it('retorna 400 quando o erro tem código P2003', async () => {
      const err = Object.assign(new Error('FK constraint'), { code: 'P2003' });
      availabilityService.eliminarDisponibilidade.mockRejectedValue(err);
      const { req, res } = mockReqRes({ params: { id_disponibilidade: '1' } });
      await availabilityController.deleteAvailability(req, res);
      expect(res.status).toHaveBeenCalledWith(400);
    });

    it('retorna 500 para outros erros', async () => {
      availabilityService.eliminarDisponibilidade.mockRejectedValue(new Error('DB error'));
      const { req, res } = mockReqRes({ params: { id_disponibilidade: '1' } });
      await availabilityController.deleteAvailability(req, res);
      expect(res.status).toHaveBeenCalledWith(500);
    });
  });
});
