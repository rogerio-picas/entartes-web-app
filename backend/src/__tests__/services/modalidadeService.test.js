'use strict';

const mockPrisma = {
  modalidade: {
    findMany: jest.fn(),
    findUnique: jest.fn(),
    findFirst: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  },
  docente: { findUnique: jest.fn() },
  utilizador: { findUnique: jest.fn() },
  docente_modalidade: {
    findUnique: jest.fn(),
    create: jest.fn(),
    delete: jest.fn(),
    deleteMany: jest.fn(),
  },
};

jest.mock('@prisma/client', () => ({
  PrismaClient: jest.fn(() => mockPrisma),
}));

const {
  listarModalidades,
  obterModalidade,
  criarModalidade,
  editarModalidade,
  eliminarModalidade,
  associarDocente,
  desassociarDocente,
} = require('../../services/modalidadeService');

describe('modalidadeService', () => {
  afterEach(() => jest.clearAllMocks());

  // ── listarModalidades ─────────────────────────────────────────────────────

  describe('listarModalidades', () => {
    it('devolve todas as modalidades sem filtro', async () => {
      const mockList = [{ id_modalidade: 1, nome: 'Ballet' }, { id_modalidade: 2, nome: 'Salsa' }];
      mockPrisma.modalidade.findMany.mockResolvedValue(mockList);

      const result = await listarModalidades();

      expect(mockPrisma.modalidade.findMany).toHaveBeenCalled();
      expect(result).toHaveLength(2);
      expect(result[0].nome).toBe('Ballet');
    });

    it('filtra por id_docente quando fornecido', async () => {
      mockPrisma.modalidade.findMany.mockResolvedValue([{ id_modalidade: 1, nome: 'Ballet' }]);

      await listarModalidades(5);

      const callArg = mockPrisma.modalidade.findMany.mock.calls[0][0];
      expect(callArg.where).toEqual({ docente_modalidade: { some: { id_docente: 5 } } });
    });

    it('inclui e formata docentes quando comDocentes=true', async () => {
      mockPrisma.modalidade.findMany.mockResolvedValue([{
        id_modalidade: 1,
        nome: 'Ballet',
        docente_modalidade: [{
          id_docente: 5,
          docente: { utilizador: { nome: 'João', apelido: 'Costa', codigo_username: 'jcosta' } },
        }],
      }]);

      const result = await listarModalidades(null, true);

      expect(result[0].docente_modalidade[0]).toMatchObject({
        id_docente: 5,
        nome: 'João',
        apelido: 'Costa',
        codigo_username: 'jcosta',
      });
    });

    it('não inclui docentes quando comDocentes=false', async () => {
      const mockList = [{ id_modalidade: 1, nome: 'Ballet' }];
      mockPrisma.modalidade.findMany.mockResolvedValue(mockList);

      const result = await listarModalidades();

      const callArg = mockPrisma.modalidade.findMany.mock.calls[0][0];
      expect(callArg.include).toBeUndefined();
      expect(result).toEqual(mockList);
    });
  });

  // ── obterModalidade ───────────────────────────────────────────────────────

  describe('obterModalidade', () => {
    it('lança erro quando modalidade não existe', async () => {
      mockPrisma.modalidade.findUnique.mockResolvedValue(null);

      await expect(obterModalidade(99)).rejects.toThrow('Modalidade não encontrada.');
    });

    it('devolve modalidade sem docentes', async () => {
      mockPrisma.modalidade.findUnique.mockResolvedValue({ id_modalidade: 1, nome: 'Ballet' });

      const result = await obterModalidade(1);

      expect(result).toMatchObject({ id_modalidade: 1, nome: 'Ballet' });
    });

    it('devolve modalidade com docentes formatados quando comDocentes=true', async () => {
      mockPrisma.modalidade.findUnique.mockResolvedValue({
        id_modalidade: 1,
        nome: 'Ballet',
        docente_modalidade: [{
          id_docente: 5,
          docente: { utilizador: { nome: 'Ana', apelido: 'Silva', codigo_username: 'asilva' } },
        }],
      });

      const result = await obterModalidade(1, true);

      expect(result.docente_modalidade[0]).toMatchObject({ id_docente: 5, nome: 'Ana' });
    });
  });

  // ── criarModalidade ───────────────────────────────────────────────────────

  describe('criarModalidade', () => {
    it('lança erro quando nome está vazio', async () => {
      await expect(criarModalidade('')).rejects.toThrow('O nome da modalidade é obrigatório.');
      await expect(criarModalidade('   ')).rejects.toThrow('O nome da modalidade é obrigatório.');
    });

    it('lança erro quando já existe modalidade com o mesmo nome', async () => {
      mockPrisma.modalidade.findFirst.mockResolvedValue({ id_modalidade: 1, nome: 'Ballet' });

      await expect(criarModalidade('Ballet')).rejects.toThrow('Já existe uma modalidade com o nome "Ballet".');
      expect(mockPrisma.modalidade.create).not.toHaveBeenCalled();
    });

    it('cria modalidade com sucesso (trim do nome)', async () => {
      mockPrisma.modalidade.findFirst.mockResolvedValue(null);
      mockPrisma.modalidade.create.mockResolvedValue({ id_modalidade: 1, nome: 'Ballet' });

      const result = await criarModalidade('  Ballet  ');

      expect(mockPrisma.modalidade.create).toHaveBeenCalledWith({ data: { nome: 'Ballet' } });
      expect(result.nome).toBe('Ballet');
    });
  });

  // ── editarModalidade ──────────────────────────────────────────────────────

  describe('editarModalidade', () => {
    it('lança erro quando nome está vazio', async () => {
      await expect(editarModalidade(1, '')).rejects.toThrow('O nome da modalidade é obrigatório.');
    });

    it('lança erro quando modalidade não existe', async () => {
      mockPrisma.modalidade.findUnique.mockResolvedValue(null);

      await expect(editarModalidade(99, 'Novo')).rejects.toThrow('Modalidade não encontrada.');
    });

    it('lança erro quando nome já está em uso por outra modalidade', async () => {
      mockPrisma.modalidade.findUnique.mockResolvedValue({ id_modalidade: 1, nome: 'Ballet' });
      mockPrisma.modalidade.findFirst.mockResolvedValue({ id_modalidade: 2, nome: 'Salsa' });

      await expect(editarModalidade(1, 'Salsa')).rejects.toThrow('Já existe outra modalidade com o nome "Salsa".');
      expect(mockPrisma.modalidade.update).not.toHaveBeenCalled();
    });

    it('edita modalidade com sucesso', async () => {
      mockPrisma.modalidade.findUnique.mockResolvedValue({ id_modalidade: 1, nome: 'Ballet' });
      mockPrisma.modalidade.findFirst.mockResolvedValue(null);
      mockPrisma.modalidade.update.mockResolvedValue({ id_modalidade: 1, nome: 'Ballet Clássico' });

      const result = await editarModalidade(1, 'Ballet Clássico');

      expect(mockPrisma.modalidade.update).toHaveBeenCalledWith({
        where: { id_modalidade: 1 },
        data: { nome: 'Ballet Clássico' },
      });
      expect(result.nome).toBe('Ballet Clássico');
    });
  });

  // ── eliminarModalidade ────────────────────────────────────────────────────

  describe('eliminarModalidade', () => {
    it('lança erro quando modalidade não existe', async () => {
      mockPrisma.modalidade.findUnique.mockResolvedValue(null);

      await expect(eliminarModalidade(99)).rejects.toThrow('Modalidade não encontrada.');
    });

    it('lança erro quando existem marcações (ativas ou históricas)', async () => {
      mockPrisma.modalidade.findUnique.mockResolvedValue({
        id_modalidade: 1,
        nome: 'Ballet',
        docente_modalidade: [],
        aluno_modalidade: [],
        marcacao: [{ id_marcacoes: 1, id_estado: 1 }, { id_marcacoes: 2, id_estado: 1 }],
      });

      await expect(eliminarModalidade(1)).rejects.toThrow('Não é possível eliminar');
    });

    it('elimina modalidade com docentes associados (cascade trata as associações)', async () => {
      mockPrisma.modalidade.findUnique.mockResolvedValue({
        id_modalidade: 1,
        nome: 'Ballet',
        docente_modalidade: [{ id_docente: 5 }],
        aluno_modalidade: [],
        marcacao: [],
      });
      mockPrisma.modalidade.delete.mockResolvedValue({});

      await eliminarModalidade(1);

      expect(mockPrisma.modalidade.delete).toHaveBeenCalled();
    });

    it('elimina modalidade sem docentes associados diretamente', async () => {
      mockPrisma.modalidade.findUnique.mockResolvedValue({
        id_modalidade: 1,
        nome: 'Ballet',
        docente_modalidade: [],
        aluno_modalidade: [],
        marcacao: [],
      });
      mockPrisma.modalidade.delete.mockResolvedValue({});

      const result = await eliminarModalidade(1);

      expect(mockPrisma.docente_modalidade.deleteMany).not.toHaveBeenCalled();
      expect(result).toMatchObject({ mensagem: expect.stringContaining('"Ballet"') });
    });
  });

  // ── associarDocente ───────────────────────────────────────────────────────

  describe('associarDocente', () => {
    it('lança erro quando modalidade não existe', async () => {
      mockPrisma.modalidade.findUnique.mockResolvedValue(null);

      await expect(associarDocente(99, 5)).rejects.toThrow('Modalidade não encontrada.');
    });

    it('lança erro quando docente não existe', async () => {
      mockPrisma.modalidade.findUnique.mockResolvedValue({ id_modalidade: 1 });
      mockPrisma.docente.findUnique.mockResolvedValue(null);
      mockPrisma.utilizador.findUnique.mockResolvedValue(null);

      await expect(associarDocente(1, 99)).rejects.toThrow('Docente não encontrado.');
    });

    it('lança erro quando docente já está associado', async () => {
      mockPrisma.modalidade.findUnique.mockResolvedValue({ id_modalidade: 1 });
      mockPrisma.docente.findUnique.mockResolvedValue({
        id_utilizador: 5,
        utilizador: { nome: 'João', apelido: 'Costa', codigo_username: 'jcosta' },
      });
      mockPrisma.docente_modalidade.findUnique.mockResolvedValue({ id_docente: 5, id_modalidade: 1 });

      await expect(associarDocente(1, 5)).rejects.toThrow('já está associado a esta modalidade');
    });

    it('associa docente com sucesso', async () => {
      mockPrisma.modalidade.findUnique.mockResolvedValue({ id_modalidade: 1 });
      mockPrisma.docente.findUnique.mockResolvedValue({
        id_utilizador: 5,
        utilizador: { nome: 'João', apelido: 'Costa', codigo_username: 'jcosta' },
      });
      mockPrisma.docente_modalidade.findUnique.mockResolvedValue(null);
      mockPrisma.docente_modalidade.create.mockResolvedValue({});

      const result = await associarDocente(1, 5);

      expect(mockPrisma.docente_modalidade.create).toHaveBeenCalledWith({
        data: { id_docente: 5, id_modalidade: 1 },
      });
      expect(result).toMatchObject({ id_docente: 5, nome: 'João', codigo_username: 'jcosta' });
    });
  });

  // ── desassociarDocente ────────────────────────────────────────────────────

  describe('desassociarDocente', () => {
    it('lança erro quando associação não existe', async () => {
      mockPrisma.docente_modalidade.findUnique.mockResolvedValue(null);

      await expect(desassociarDocente(1, 5)).rejects.toThrow('Associação não encontrada.');
    });

    it('remove associação com sucesso', async () => {
      mockPrisma.docente_modalidade.findUnique.mockResolvedValue({ id_docente: 5, id_modalidade: 1 });
      mockPrisma.docente_modalidade.delete.mockResolvedValue({});

      const result = await desassociarDocente(1, 5);

      expect(mockPrisma.docente_modalidade.delete).toHaveBeenCalled();
      expect(result).toMatchObject({ mensagem: expect.stringContaining('sucesso') });
    });
  });
});
