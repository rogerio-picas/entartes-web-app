const { criarModalidade, listarModalidades } = require('../../services/modalidadeservice');
const { PrismaClient } = require('@prisma/client');

// Mock Prisma
jest.mock('@prisma/client', () => {
  const mPrisma = {
    modalidade: {
      findFirst: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
    },
  };
  return { PrismaClient: jest.fn(() => mPrisma) };
});

const prisma = new PrismaClient();

describe('Modalidade Service - Integration Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('criarModalidade', () => {
    it('should create a new modality if it does not exist', async () => {
      prisma.modalidade.findFirst.mockResolvedValue(null);
      prisma.modalidade.create.mockResolvedValue({ id_modalidade: 1, nome: 'Ballet' });

      const result = await criarModalidade('Ballet');

      expect(prisma.modalidade.findFirst).toHaveBeenCalled();
      expect(prisma.modalidade.create).toHaveBeenCalledWith({
        data: { nome: 'Ballet' },
      });
      expect(result.nome).toBe('Ballet');
    });

    it('should throw an error if the modality already exists', async () => {
      prisma.modalidade.findFirst.mockResolvedValue({ id_modalidade: 1, nome: 'Ballet' });

      await expect(criarModalidade('Ballet')).rejects.toThrow('Já existe uma modalidade com o nome "Ballet".');
      expect(prisma.modalidade.create).not.toHaveBeenCalled();
    });
  });

  describe('listarModalidades', () => {
    it('should return a list of modalities', async () => {
      const mockList = [
        { id_modalidade: 1, nome: 'Ballet' },
        { id_modalidade: 2, nome: 'Salsa' },
      ];
      prisma.modalidade.findMany.mockResolvedValue(mockList);

      const result = await listarModalidades();

      expect(result).toHaveLength(2);
      expect(result[0].nome).toBe('Ballet');
      expect(prisma.modalidade.findMany).toHaveBeenCalled();
    });
  });
});
