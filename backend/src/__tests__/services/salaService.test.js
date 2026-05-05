'use strict';

const mockPrisma = {
  sala: {
    findMany: jest.fn(),
    delete: jest.fn(),
    findFirst: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
  },
};

jest.mock('@prisma/client', () => ({
  PrismaClient: jest.fn(() => mockPrisma),
}));

const { listSalas, deleteSala, createSala, updateSala } = require('../../services/salaService');

describe('salaService', () => {
  afterEach(() => jest.clearAllMocks());

  describe('listSalas', () => {
    it('devolve todas as salas ordenadas por nome', async () => {
      const salas = [{ id_sala: 1, nome: 'Sala A' }, { id_sala: 2, nome: 'Sala B' }];
      mockPrisma.sala.findMany.mockResolvedValue(salas);

      const result = await listSalas();

      expect(mockPrisma.sala.findMany).toHaveBeenCalledWith({ orderBy: { nome: 'asc' } });
      expect(result).toEqual(salas);
    });
  });

  describe('deleteSala', () => {
    it('elimina sala pelo id', async () => {
      mockPrisma.sala.delete.mockResolvedValue({ id_sala: 1 });

      await deleteSala(1);

      expect(mockPrisma.sala.delete).toHaveBeenCalledWith({ where: { id_sala: 1 } });
    });
  });

  describe('createSala', () => {
    it('lança erro se nome estiver ausente', async () => {
      await expect(createSala('')).rejects.toThrow('Nome da sala é obrigatório');
      await expect(createSala(null)).rejects.toThrow('Nome da sala é obrigatório');
    });

    it('lança erro se já existir uma sala com esse nome', async () => {
      mockPrisma.sala.findFirst.mockResolvedValue({ id_sala: 1, nome: 'Sala A' });

      await expect(createSala('Sala A')).rejects.toThrow('Já existe uma sala com esse nome');
      expect(mockPrisma.sala.create).not.toHaveBeenCalled();
    });

    it('cria sala quando o nome é único', async () => {
      mockPrisma.sala.findFirst.mockResolvedValue(null);
      mockPrisma.sala.create.mockResolvedValue({ id_sala: 2, nome: 'Sala B', descricao: 'Desc' });

      const result = await createSala('Sala B', 'Desc');

      expect(mockPrisma.sala.create).toHaveBeenCalledWith({ data: { nome: 'Sala B', descricao: 'Desc' } });
      expect(result).toMatchObject({ id_sala: 2, nome: 'Sala B' });
    });

    it('cria sala sem descrição', async () => {
      mockPrisma.sala.findFirst.mockResolvedValue(null);
      mockPrisma.sala.create.mockResolvedValue({ id_sala: 3, nome: 'Sala C' });

      await createSala('Sala C');

      expect(mockPrisma.sala.create).toHaveBeenCalledWith({ data: { nome: 'Sala C', descricao: undefined } });
    });
  });

  describe('updateSala', () => {
    it('lança erro se outro registo tiver o mesmo nome', async () => {
      mockPrisma.sala.findFirst.mockResolvedValue({ id_sala: 99, nome: 'Sala Existente' });

      await expect(updateSala(1, 'Sala Existente')).rejects.toThrow('Já existe uma outra sala com esse nome');
      expect(mockPrisma.sala.update).not.toHaveBeenCalled();
    });

    it('atualiza sala quando nome é único', async () => {
      mockPrisma.sala.findFirst.mockResolvedValue(null);
      mockPrisma.sala.update.mockResolvedValue({ id_sala: 1, nome: 'Sala Nova' });

      const result = await updateSala(1, 'Sala Nova', 'Nova desc');

      expect(mockPrisma.sala.update).toHaveBeenCalledWith({
        where: { id_sala: 1 },
        data: { nome: 'Sala Nova', descricao: 'Nova desc' },
      });
      expect(result).toMatchObject({ nome: 'Sala Nova' });
    });

    it('não verifica nome duplicado quando nome não é fornecido', async () => {
      mockPrisma.sala.update.mockResolvedValue({ id_sala: 1 });

      await updateSala(1, undefined, 'Nova desc');

      expect(mockPrisma.sala.findFirst).not.toHaveBeenCalled();
      expect(mockPrisma.sala.update).toHaveBeenCalled();
    });
  });
});
