'use strict';

const mockPrisma = {
  aluno_marcacao: {
    findMany: jest.fn(),
    create: jest.fn(),
  },
  marcacao: {
    findUnique: jest.fn(),
    findMany: jest.fn(),
  },
};

jest.mock('@prisma/client', () => ({
  PrismaClient: jest.fn(() => mockPrisma),
}));

const { getMinhasAulas, getAulaDetalhe, inscreverEmAula, getAulasDisponiveis } = require('../../services/horarioService');

describe('horarioService', () => {
  afterEach(() => jest.clearAllMocks());

  // ── getMinhasAulas ────────────────────────────────────────────────────────

  describe('getMinhasAulas', () => {
    it('role 3 (aluno): devolve marcações via aluno_marcacao', async () => {
      mockPrisma.aluno_marcacao.findMany.mockResolvedValue([
        { marcacao: { id_marcacoes: 1 } },
        { marcacao: { id_marcacoes: 2 } },
      ]);

      const result = await getMinhasAulas(10, 3);

      expect(mockPrisma.aluno_marcacao.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { id_aluno: 10 } })
      );
      expect(result).toEqual([{ id_marcacoes: 1 }, { id_marcacoes: 2 }]);
    });

    it('role 3: filtra entradas sem marcacao associada', async () => {
      mockPrisma.aluno_marcacao.findMany.mockResolvedValue([
        { marcacao: { id_marcacoes: 1 } },
        { marcacao: null },
      ]);

      const result = await getMinhasAulas(10, 3);

      expect(result).toHaveLength(1);
    });

    it('role 2 (docente): devolve marcações do docente diretamente', async () => {
      const mockMarcacoes = [{ id_marcacoes: 1 }, { id_marcacoes: 2 }];
      mockPrisma.marcacao.findMany.mockResolvedValue(mockMarcacoes);

      const result = await getMinhasAulas(5, 2);

      expect(mockPrisma.marcacao.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { id_docente: 5 } })
      );
      expect(result).toEqual(mockMarcacoes);
    });

    it('role 1 (coordenadora): devolve todas as marcações sem filtro', async () => {
      const mockMarcacoes = [{ id_marcacoes: 1 }];
      mockPrisma.marcacao.findMany.mockResolvedValue(mockMarcacoes);

      const result = await getMinhasAulas(1, 1);

      const callArg = mockPrisma.marcacao.findMany.mock.calls[0][0];
      expect(callArg).not.toHaveProperty('where');
      expect(result).toEqual(mockMarcacoes);
    });
  });

  // ── getAulaDetalhe ────────────────────────────────────────────────────────

  describe('getAulaDetalhe', () => {
    it('lança NOT_FOUND quando marcação não existe', async () => {
      mockPrisma.marcacao.findUnique.mockResolvedValue(null);

      await expect(getAulaDetalhe(99, 1, 1)).rejects.toThrow('NOT_FOUND');
    });

    it('lança FORBIDDEN quando aluno tenta aceder a marcação alheia', async () => {
      mockPrisma.marcacao.findUnique.mockResolvedValue({
        id_marcacoes: 1,
        aluno_marcacao: [{ id_aluno: 999 }],
      });

      await expect(getAulaDetalhe(1, 10, 3)).rejects.toThrow('FORBIDDEN');
    });

    it('devolve marcação quando aluno é participante', async () => {
      const marcacao = { id_marcacoes: 1, aluno_marcacao: [{ id_aluno: 10 }] };
      mockPrisma.marcacao.findUnique.mockResolvedValue(marcacao);

      const result = await getAulaDetalhe(1, 10, 3);

      expect(result).toEqual(marcacao);
    });

    it('coordenadora pode aceder a qualquer marcação', async () => {
      const marcacao = { id_marcacoes: 1, aluno_marcacao: [] };
      mockPrisma.marcacao.findUnique.mockResolvedValue(marcacao);

      const result = await getAulaDetalhe(1, 1, 1);

      expect(result).toEqual(marcacao);
    });
  });

  // ── inscreverEmAula ───────────────────────────────────────────────────────

  describe('inscreverEmAula', () => {
    it('lança FORBIDDEN para utilizador não-aluno (role != 3)', async () => {
      await expect(inscreverEmAula(1, 2, 1)).rejects.toThrow('FORBIDDEN');
      await expect(inscreverEmAula(1, 1, 1)).rejects.toThrow('FORBIDDEN');
    });

    it('lança erro quando id_marcacoes está ausente', async () => {
      await expect(inscreverEmAula(1, 3, null)).rejects.toThrow('id_marcacoes é obrigatório.');
    });

    it('lança NOT_FOUND quando marcação não existe', async () => {
      mockPrisma.marcacao.findUnique.mockResolvedValue(null);

      await expect(inscreverEmAula(1, 3, 99)).rejects.toThrow('NOT_FOUND');
    });

    it('lança LOTACAO_ESGOTADA quando aula está cheia', async () => {
      mockPrisma.marcacao.findUnique.mockResolvedValue({
        id_marcacoes: 1,
        numero_alunos_pretendidos: 2,
        aluno_marcacao: [{ id_aluno: 10 }, { id_aluno: 11 }],
      });

      await expect(inscreverEmAula(12, 3, 1)).rejects.toThrow('LOTACAO_ESGOTADA');
    });

    it('lança JA_INSCRITO quando aluno já está inscrito', async () => {
      mockPrisma.marcacao.findUnique.mockResolvedValue({
        id_marcacoes: 1,
        numero_alunos_pretendidos: null,
        aluno_marcacao: [{ id_aluno: 10 }],
      });

      await expect(inscreverEmAula(10, 3, 1)).rejects.toThrow('JA_INSCRITO');
    });

    it('inscreve aluno com sucesso quando lotação não está esgotada', async () => {
      mockPrisma.marcacao.findUnique.mockResolvedValue({
        id_marcacoes: 1,
        numero_alunos_pretendidos: 5,
        aluno_marcacao: [{ id_aluno: 11 }],
      });
      mockPrisma.aluno_marcacao.create.mockResolvedValue({ id_aluno: 10, id_marcacoes: 1 });

      const result = await inscreverEmAula(10, 3, 1);

      expect(mockPrisma.aluno_marcacao.create).toHaveBeenCalled();
      expect(result).toMatchObject({ id_aluno: 10, id_marcacoes: 1 });
    });

    it('inscreve aluno quando lotação é ilimitada (null)', async () => {
      mockPrisma.marcacao.findUnique.mockResolvedValue({
        id_marcacoes: 1,
        numero_alunos_pretendidos: null,
        aluno_marcacao: [],
      });
      mockPrisma.aluno_marcacao.create.mockResolvedValue({ id_aluno: 10, id_marcacoes: 1 });

      await inscreverEmAula(10, 3, 1);

      expect(mockPrisma.aluno_marcacao.create).toHaveBeenCalled();
    });
  });

  // ── getAulasDisponiveis ───────────────────────────────────────────────────

  describe('getAulasDisponiveis', () => {
    it('enriquece marcações com ja_inscrito=true e vagas_disponiveis para aluno inscrito', async () => {
      mockPrisma.marcacao.findMany.mockResolvedValue([{
        id_marcacoes: 1,
        numero_alunos_pretendidos: 5,
        aluno_marcacao: [{ id_aluno: 10 }],
      }]);

      const result = await getAulasDisponiveis(10, 3);

      expect(result[0].ja_inscrito).toBe(true);
      expect(result[0].vagas_disponiveis).toBe(4);
    });

    it('ja_inscrito=false para aluno não inscrito', async () => {
      mockPrisma.marcacao.findMany.mockResolvedValue([{
        id_marcacoes: 1,
        numero_alunos_pretendidos: 5,
        aluno_marcacao: [{ id_aluno: 99 }],
      }]);

      const result = await getAulasDisponiveis(10, 3);

      expect(result[0].ja_inscrito).toBe(false);
    });

    it('ja_inscrito é sempre false para docentes', async () => {
      mockPrisma.marcacao.findMany.mockResolvedValue([{
        id_marcacoes: 1,
        numero_alunos_pretendidos: null,
        aluno_marcacao: [],
      }]);

      const result = await getAulasDisponiveis(1, 2);

      expect(result[0].ja_inscrito).toBe(false);
      expect(result[0].vagas_disponiveis).toBeNull();
    });
  });
});
