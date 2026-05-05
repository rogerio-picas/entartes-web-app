'use strict';

jest.mock('../../services/authService');
jest.mock('../../services/userService');

const authController = require('../../controllers/authController');
const authService    = require('../../services/authService');
const userService    = require('../../services/userService');

const mockReqRes = (overrides = {}) => {
  const req = { params: {}, body: {}, user: { id: 1 }, ...overrides };
  const res = { status: jest.fn().mockReturnThis(), json: jest.fn().mockReturnThis() };
  return { req, res };
};

describe('authController', () => {
  beforeEach(() => jest.clearAllMocks());

  // ── login ─────────────────────────────────────────────────────────────────

  describe('login', () => {
    it('retorna 400 quando codigo_username está ausente', async () => {
      const { req, res } = mockReqRes({ body: { password: 'abc' } });
      await authController.login(req, res);
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ message: 'codigo_username e password são obrigatórios.' });
      expect(authService.login).not.toHaveBeenCalled();
    });

    it('retorna 400 quando password está ausente', async () => {
      const { req, res } = mockReqRes({ body: { codigo_username: 'user' } });
      await authController.login(req, res);
      expect(res.status).toHaveBeenCalledWith(400);
      expect(authService.login).not.toHaveBeenCalled();
    });

    it('retorna 200 com token e user quando login é bem-sucedido', async () => {
      authService.login.mockResolvedValue({
        token: 'jwt-token',
        user: { id_utilizador: 1, nome: 'Ana', apelido: 'Silva', role: 1 },
      });
      const { req, res } = mockReqRes({ body: { codigo_username: 'user', password: 'pass' } });
      await authController.login(req, res);
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ token: 'jwt-token' }));
    });

    it('retorna 401 quando o service lança "Credenciais inválidas."', async () => {
      authService.login.mockRejectedValue(new Error('Credenciais inválidas.'));
      const { req, res } = mockReqRes({ body: { codigo_username: 'user', password: 'wrong' } });
      await authController.login(req, res);
      expect(res.status).toHaveBeenCalledWith(401);
    });

    it('retorna 500 para outros erros do service', async () => {
      authService.login.mockRejectedValue(new Error('DB error'));
      const { req, res } = mockReqRes({ body: { codigo_username: 'user', password: 'pass' } });
      await authController.login(req, res);
      expect(res.status).toHaveBeenCalledWith(500);
    });
  });

  // ── getMe ─────────────────────────────────────────────────────────────────

  describe('getMe', () => {
    it('retorna 200 com dados do utilizador', async () => {
      userService.getUser.mockResolvedValue({ id_utilizador: 1, nome: 'Ana' });
      const { req, res } = mockReqRes({ user: { id: 1 } });
      await authController.getMe(req, res);
      expect(res.status).toHaveBeenCalledWith(200);
    });

    it('retorna 404 quando utilizador não é encontrado', async () => {
      userService.getUser.mockResolvedValue(null);
      const { req, res } = mockReqRes({ user: { id: 99 } });
      await authController.getMe(req, res);
      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({ message: 'Utilizador não encontrado.' });
    });

    it('retorna 500 quando o service lança erro', async () => {
      userService.getUser.mockRejectedValue(new Error('DB error'));
      const { req, res } = mockReqRes({ user: { id: 1 } });
      await authController.getMe(req, res);
      expect(res.status).toHaveBeenCalledWith(500);
    });
  });
});
