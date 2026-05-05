'use strict';

/**
 * Testes de Integração — /api/auth
 *
 * Cobre os dois cenários de invalidação automática de token:
 *   1. Role alterada na BD após emissão do token
 *   2. Password alterada após emissão do token (fingerprint `pwf`)
 *
 * Estratégia de mock:
 *   - @prisma/client  → mock partilhado por authMiddleware e authService
 *   - bcrypt          → mock para controlar resultado da comparação de password
 *   - rateLimitMiddleware → pass-through para não interferir nos testes
 *   - userService     → mock para isolar o controller getMe da BD
 */

const mockPrismaClient = {
  utilizador: {
    findUnique: jest.fn(),
    update:     jest.fn(),
  },
};

jest.mock('@prisma/client', () => ({
  PrismaClient: jest.fn(() => mockPrismaClient),
}));

jest.mock('bcrypt', () => ({
  compare: jest.fn(),
}));

jest.mock('../../middlewares/rateLimitMiddleware', () => ({
  loginLimiter: (_req, _res, next) => next(),
}));

jest.mock('../../services/userService', () => ({
  getUser: jest.fn(),
}));

process.env.JWT_SECRET = 'test-secret';

const request     = require('supertest');
const express     = require('express');
const jwt         = require('jsonwebtoken');
const bcrypt      = require('bcrypt');
const authRoutes  = require('../../routes/authRoutes');
const userService = require('../../services/userService');

const app = express();
app.use(express.json());
app.use('/api/auth', authRoutes);

const dbUser = {
  id_utilizador:   1,
  nome:            'Ana',
  apelido:         'Silva',
  password:        '$2b$10$abcdefghijklmnopqrstuvwxyz012345',
  estado:          'ATIVO',
  id_tipo:         2,
  tentativas_login: 0,
  codigo_username: 'ana.silva',
};

beforeEach(() => {
  jest.clearAllMocks();
  mockPrismaClient.utilizador.update.mockResolvedValue({});
});

// ─── POST /api/auth/login ─────────────────────────────────────────────────────

describe('POST /api/auth/login', () => {

  it('retorna 200 e token JWT quando as credenciais são válidas', async () => {
    mockPrismaClient.utilizador.findUnique.mockResolvedValue(dbUser);
    bcrypt.compare.mockResolvedValue(true);

    const res = await request(app)
      .post('/api/auth/login')
      .send({ codigo_username: 'ana.silva', password: 'correta' });

    expect(res.status).toBe(200);
    expect(res.body.token).toBeDefined();
    expect(res.body.user.id_utilizador).toBe(1);
  });

  it('o token gerado contém o pwf igual aos últimos 8 chars da password hash', async () => {
    mockPrismaClient.utilizador.findUnique.mockResolvedValue(dbUser);
    bcrypt.compare.mockResolvedValue(true);

    const res = await request(app)
      .post('/api/auth/login')
      .send({ codigo_username: 'ana.silva', password: 'correta' });

    const decoded = jwt.verify(res.body.token, 'test-secret');
    expect(decoded.pwf).toBe(dbUser.password.slice(-8));
  });

  it('retorna 400 quando os campos obrigatórios estão ausentes', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({});

    expect(res.status).toBe(400);
    expect(res.body.message).toContain('obrigatórios');
  });

  it('retorna 401 quando a password está errada', async () => {
    mockPrismaClient.utilizador.findUnique.mockResolvedValue(dbUser);
    bcrypt.compare.mockResolvedValue(false);

    const res = await request(app)
      .post('/api/auth/login')
      .send({ codigo_username: 'ana.silva', password: 'errada' });

    expect(res.status).toBe(401);
    expect(res.body.message).toBe('Credenciais inválidas.');
  });

  it('retorna 401 quando o utilizador não existe', async () => {
    mockPrismaClient.utilizador.findUnique.mockResolvedValue(null);
    bcrypt.compare.mockResolvedValue(false);

    const res = await request(app)
      .post('/api/auth/login')
      .send({ codigo_username: 'naoexiste', password: 'qualquer' });

    expect(res.status).toBe(401);
  });

  it('retorna 500 quando a BD falha', async () => {
    mockPrismaClient.utilizador.findUnique.mockRejectedValue(new Error('DB offline'));

    const res = await request(app)
      .post('/api/auth/login')
      .send({ codigo_username: 'ana.silva', password: 'qualquer' });

    expect(res.status).toBe(500);
  });
});

// ─── GET /api/auth/me ─────────────────────────────────────────────────────────

describe('GET /api/auth/me', () => {

  it('retorna 401 quando não é fornecido token', async () => {
    const res = await request(app).get('/api/auth/me');
    expect(res.status).toBe(401);
  });

  it('retorna 401 quando o token é inválido', async () => {
    const res = await request(app)
      .get('/api/auth/me')
      .set('Authorization', 'Bearer token-invalido');

    expect(res.status).toBe(401);
  });

  it('retorna 200 quando o token é válido e o pwf coincide', async () => {
    const pwf   = dbUser.password.slice(-8);
    const token = jwt.sign({ id: 1, role: 2, pwf }, 'test-secret');

    mockPrismaClient.utilizador.findUnique.mockResolvedValue({
      id_tipo:  2,
      password: dbUser.password,
    });
    userService.getUser.mockResolvedValue({
      id_utilizador: 1,
      nome:          'Ana',
      apelido:       'Silva',
    });

    const res = await request(app)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.id_utilizador).toBe(1);
  });

  it('retorna 401 com "Password alterada" quando o pwf não coincide (password foi alterada)', async () => {
    const token = jwt.sign({ id: 1, role: 2, pwf: 'old12345' }, 'test-secret');

    mockPrismaClient.utilizador.findUnique.mockResolvedValue({
      id_tipo:  2,
      password: '$2b$10$NOVA_HASH_COMPLETAMENTE_DIFERENTE',
    });

    const res = await request(app)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(401);
    expect(res.body.message).toBe('Password alterada. Faça login novamente.');
  });

  it('retorna 401 com "Permissões alteradas" quando a role do token difere da BD', async () => {
    const token = jwt.sign({ id: 1, role: 2 }, 'test-secret');

    mockPrismaClient.utilizador.findUnique.mockResolvedValue({
      id_tipo:  1,
      password: dbUser.password,
    });

    const res = await request(app)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(401);
    expect(res.body.message).toBe('Permissões alteradas. Faça login novamente.');
  });

  it('retorna 401 quando o utilizador foi removido da BD após emissão do token', async () => {
    const token = jwt.sign({ id: 1, role: 2 }, 'test-secret');

    mockPrismaClient.utilizador.findUnique.mockResolvedValue(null);

    const res = await request(app)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(401);
    expect(res.body.message).toBe('Utilizador nao encontrado');
  });
});
