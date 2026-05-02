const jwt = require('jsonwebtoken');

// Mock Prisma antes do require do middleware
const mockPrismaClient = {
  utilizador: {
    findUnique: jest.fn()
  }
};

jest.mock('@prisma/client', () => ({
  PrismaClient: jest.fn(() => mockPrismaClient)
}));

const tokenValidation = require('../../middlewares/authMiddleware');

process.env.JWT_SECRET = 'test-secret';

describe('tokenValidation middleware', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('retorna erro 401 quando não fornece token', async () => {
    const req = { headers: {} };
    const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
    const next = jest.fn();

    await tokenValidation(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });

  it('passa para o next e preenche req.user com token válido', async () => {
    const token = jwt.sign({ id: 1, role: 2 }, 'test-secret');
    const req = { headers: { authorization: `Bearer ${token}` } };
    const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
    const next = jest.fn();

    mockPrismaClient.utilizador.findUnique.mockResolvedValue({ id_tipo: 2 });

    await tokenValidation(req, res, next);

    expect(next).toHaveBeenCalledTimes(1);
    expect(req.user).toMatchObject({ id: 1, role: 2 });
  });

  it('retorna erro 401 quando utilizador não existe na BD', async () => {
    const token = jwt.sign({ id: 1, role: 2 }, 'test-secret');
    const req = { headers: { authorization: `Bearer ${token}` } };
    const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
    const next = jest.fn();

    mockPrismaClient.utilizador.findUnique.mockResolvedValue(null);

    await tokenValidation(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ message: 'Utilizador nao encontrado' });
    expect(next).not.toHaveBeenCalled();
  });

  it('retorna erro 401 quando a role da BD é diferente da role do token', async () => {
    const token = jwt.sign({ id: 1, role: 2 }, 'test-secret');
    const req = { headers: { authorization: `Bearer ${token}` } };
    const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
    const next = jest.fn();

    mockPrismaClient.utilizador.findUnique.mockResolvedValue({ id_tipo: 1 }); // Role diferente

    await tokenValidation(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ message: 'Permissões alteradas. Faça login novamente.' });
    expect(next).not.toHaveBeenCalled();
  });

  it('retorna erro 401 quando token é inválido ou expirado', async () => {
    const req = { headers: { authorization: `Bearer token-falso-123` } };
    const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
    const next = jest.fn();

    await tokenValidation(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ message: 'Token inválido ou sessão expirada.' })
    );
    expect(next).not.toHaveBeenCalled();
  });

  it('retorna erro 401 quando token é assinado com segredo errado', async () => {
    const token = jwt.sign({ id: 1, role: 1 }, 'wrong-secret');
    const req = { headers: { authorization: `Bearer ${token}` } };
    const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
    const next = jest.fn();
  
    await tokenValidation(req, res, next);
    
    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ message: 'Token inválido ou sessão expirada.' })
    );
    expect(next).not.toHaveBeenCalled();
  });
    
  it('retorna erro 401 quando o cabeçalho existe mas não tem a palavra "Bearer " (formato incorreto)', async () => {
    const req = { headers: { authorization: `token-valido-mas-sem-bearer` } };
    const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
    const next = jest.fn();
    await tokenValidation(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ message: 'Acesso negado. É necessária autenticação.' });
    expect(next).not.toHaveBeenCalled();
  });

  it('retorna erro 401 quando o cabeçalho só tem a palavra "Bearer " mas o token está vazio', async () => {
    const req = { headers: { authorization: `Bearer ` } };
    const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
    const next = jest.fn();

    await tokenValidation(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ message: 'Acesso negado. É necessária autenticação.' });
    expect(next).not.toHaveBeenCalled();
  });
});