'use strict';

jest.mock('bcrypt', () => ({
  compare: jest.fn(),
}));

jest.mock('jsonwebtoken', () => ({
  sign: jest.fn().mockReturnValue('mock.jwt.token'),
}));

const mockPrisma = {
  utilizador: {
    findUnique: jest.fn(),
    update: jest.fn(),
  },
};

jest.mock('@prisma/client', () => ({
  PrismaClient: jest.fn(() => mockPrisma),
}));

const bcrypt = require('bcrypt');
const { login } = require('../../services/authService');

process.env.JWT_SECRET = 'test-secret';

describe('authService › login', () => {
  afterEach(() => jest.clearAllMocks());

  const userAtivo = {
    id_utilizador: 1,
    nome: 'Ana',
    apelido: 'Silva',
    password: 'hashed_pw_xyz',
    estado: 'ATIVO',
    id_tipo: 3,
    tentativas_login: 0,
  };

  it('lança erro se os campos não forem strings', async () => {
    await expect(login(123, 'pass')).rejects.toThrow('Formato inválido');
    await expect(login('user', 123)).rejects.toThrow('Formato inválido');
  });

  it('lança "Credenciais inválidas" e executa dummy hash quando utilizador não existe', async () => {
    mockPrisma.utilizador.findUnique.mockResolvedValue(null);
    bcrypt.compare.mockResolvedValue(false);

    await expect(login('desconhecido', 'pass')).rejects.toThrow('Credenciais inválidas.');
    expect(bcrypt.compare).toHaveBeenCalledTimes(1);
  });

  it('lança "Conta bloqueada" quando tentativas_login >= 10', async () => {
    mockPrisma.utilizador.findUnique.mockResolvedValue({ ...userAtivo, tentativas_login: 10 });

    await expect(login('user', 'pass')).rejects.toThrow('Conta bloqueada por excesso de tentativas.');
  });

  it('incrementa tentativas_login e lança "Credenciais inválidas" quando password errada', async () => {
    mockPrisma.utilizador.findUnique.mockResolvedValue(userAtivo);
    bcrypt.compare.mockResolvedValue(false);

    await expect(login('user', 'errada')).rejects.toThrow('Credenciais inválidas.');
    expect(mockPrisma.utilizador.update).toHaveBeenCalledWith({
      where: { id_utilizador: 1 },
      data: { tentativas_login: { increment: 1 } },
    });
  });

  it('lança "Conta suspensa" quando estado não é ATIVO', async () => {
    mockPrisma.utilizador.findUnique.mockResolvedValue({ ...userAtivo, estado: 'INATIVO' });
    bcrypt.compare.mockResolvedValue(true);

    await expect(login('user', 'correta')).rejects.toThrow('Conta suspensa ou inativa.');
  });

  it('faz login com sucesso e devolve token + user', async () => {
    mockPrisma.utilizador.findUnique.mockResolvedValue(userAtivo);
    bcrypt.compare.mockResolvedValue(true);

    const result = await login('user', 'correta');

    expect(result.token).toBe('mock.jwt.token');
    expect(result.user).toMatchObject({ id_utilizador: 1, nome: 'Ana', apelido: 'Silva', role: 3 });
  });

  it('normaliza o username (trim + toLowerCase) antes da pesquisa', async () => {
    mockPrisma.utilizador.findUnique.mockResolvedValue(userAtivo);
    bcrypt.compare.mockResolvedValue(true);

    await login('  USER  ', 'pass');

    expect(mockPrisma.utilizador.findUnique).toHaveBeenCalledWith(
      expect.objectContaining({ where: { codigo_username: 'user' } })
    );
  });

  it('repõe tentativas_login a 0 quando o utilizador tinha tentativas anteriores', async () => {
    mockPrisma.utilizador.findUnique.mockResolvedValue({ ...userAtivo, tentativas_login: 3 });
    bcrypt.compare.mockResolvedValue(true);
    mockPrisma.utilizador.update.mockResolvedValue({});

    await login('user', 'correta');

    expect(mockPrisma.utilizador.update).toHaveBeenCalledWith({
      where: { id_utilizador: 1 },
      data: { tentativas_login: 0 },
    });
  });

  it('não repõe tentativas_login quando já eram 0', async () => {
    mockPrisma.utilizador.findUnique.mockResolvedValue(userAtivo);
    bcrypt.compare.mockResolvedValue(true);

    await login('user', 'correta');

    expect(mockPrisma.utilizador.update).not.toHaveBeenCalled();
  });
});
