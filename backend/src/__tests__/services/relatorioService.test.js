'use strict';

const mockPrisma = {
  marcacao: { findMany: jest.fn() },
  docente: { findMany: jest.fn() },
  aluno: { findMany: jest.fn() },
  sala: { findMany: jest.fn() },
};

jest.mock('@prisma/client', () => ({
  PrismaClient: jest.fn(() => mockPrisma),
}));

const {
  obterSessoes,
  obterHorasPorDocente,
  obterRelatorioAlunos,
  obterRelatorioDocentes,
  gerarDadosCSV,
  obterOcupacaoSalas,
} = require('../../services/relatorioService');

describe('relatorioService', () => {
  afterEach(() => jest.clearAllMocks());

  // ── obterSessoes ──────────────────────────────────────────────────────────

  describe('obterSessoes', () => {
    it('devolve marcações concluídas (estado=4) no intervalo de datas', async () => {
      const sessoes = [{ id_marcacoes: 1 }, { id_marcacoes: 2 }];
      mockPrisma.marcacao.findMany.mockResolvedValue(sessoes);

      const result = await obterSessoes('2025-01-01', '2025-01-31');

      expect(mockPrisma.marcacao.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: expect.objectContaining({ id_estado: 4 }) })
      );
      expect(result).toEqual(sessoes);
    });
  });

  // ── obterHorasPorDocente ──────────────────────────────────────────────────

  describe('obterHorasPorDocente', () => {
    it('agrega sessões por docente e calcula totais', async () => {
      mockPrisma.docente.findMany.mockResolvedValue([
        {
          id_utilizador: 1,
          utilizador: { nome: 'João', apelido: 'Costa' },
          marcacao: [
            { duracao_minutos: 60, modalidade: { nome: 'Guitarra' } },
            { duracao_minutos: 45, modalidade: { nome: 'Piano' } },
          ],
        },
      ]);

      const result = await obterHorasPorDocente();

      expect(result).toHaveLength(1);
      expect(result[0]).toMatchObject({
        id_docente: 1,
        nome: 'João Costa',
        totalSessoes: 2,
        totalMinutos: 105,
      });
    });

    it('exclui docentes sem sessões concluídas', async () => {
      mockPrisma.docente.findMany.mockResolvedValue([
        { id_utilizador: 1, utilizador: { nome: 'Ana', apelido: 'Silva' }, marcacao: [] },
      ]);

      const result = await obterHorasPorDocente('2025-01-01', '2025-01-31');

      expect(result).toEqual([]);
    });

    it('deduplica modalidades no resultado', async () => {
      mockPrisma.docente.findMany.mockResolvedValue([
        {
          id_utilizador: 2,
          utilizador: { nome: 'Pedro', apelido: 'Lopes' },
          marcacao: [
            { duracao_minutos: 60, modalidade: { nome: 'Piano' } },
            { duracao_minutos: 60, modalidade: { nome: 'Piano' } },
          ],
        },
      ]);

      const result = await obterHorasPorDocente();

      expect(result[0].modalidades).toEqual(['Piano']);
    });
  });

  // ── obterRelatorioAlunos ──────────────────────────────────────────────────

  describe('obterRelatorioAlunos', () => {
    it('agrega sessões por aluno e calcula totais', async () => {
      mockPrisma.aluno.findMany.mockResolvedValue([
        {
          id_utilizador: 10,
          utilizador: { nome: 'Maria', apelido: 'Lopes' },
          aluno_marcacao: [
            { marcacao: { duracao_minutos: 60, modalidade: { nome: 'Dança' } } },
            { marcacao: { duracao_minutos: 90, modalidade: { nome: 'Teatro' } } },
          ],
        },
      ]);

      const result = await obterRelatorioAlunos();

      expect(result).toHaveLength(1);
      expect(result[0]).toMatchObject({ id: 10, nome: 'Maria Lopes', totalSessoes: 2, totalMinutos: 150 });
    });

    it('exclui alunos sem sessões concluídas', async () => {
      mockPrisma.aluno.findMany.mockResolvedValue([
        { id_utilizador: 1, utilizador: { nome: 'A', apelido: 'B' }, aluno_marcacao: [] },
      ]);

      const result = await obterRelatorioAlunos();

      expect(result).toEqual([]);
    });
  });

  // ── obterRelatorioDocentes ────────────────────────────────────────────────

  describe('obterRelatorioDocentes', () => {
    it('devolve histórico completo sem filtro de datas', async () => {
      mockPrisma.docente.findMany.mockResolvedValue([
        {
          id_utilizador: 3,
          utilizador: { nome: 'Pedro', apelido: 'Gomes' },
          marcacao: [{ duracao_minutos: 90, modalidade: { nome: 'Violino' } }],
        },
      ]);

      const result = await obterRelatorioDocentes();

      expect(result[0]).toMatchObject({ id: 3, nome: 'Pedro Gomes', totalSessoes: 1, totalMinutos: 90 });
    });
  });

  // ── gerarDadosCSV ─────────────────────────────────────────────────────────

  describe('gerarDadosCSV', () => {
    it('devolve string CSV com cabeçalho e linhas de dados', async () => {
      mockPrisma.marcacao.findMany.mockResolvedValue([
        {
          id_marcacoes: 1,
          data_a_realizar: new Date('2025-01-10T10:00:00Z'),
          hora_inicio: '10:00',
          duracao_minutos: 60,
          docente: { id_utilizador: 5 },
          modalidade: { nome: 'Piano' },
          sala: { nome: 'Sala A' },
        },
      ]);

      const csv = await gerarDadosCSV('2025-01-01', '2025-01-31');

      expect(typeof csv).toBe('string');
      expect(csv).toContain('id,data,hora,duracao_min,docente,modalidade,sala');
      expect(csv).toContain('Piano');
      expect(csv).toContain('Sala A');
    });

    it('devolve string vazia quando não há sessões no período', async () => {
      mockPrisma.marcacao.findMany.mockResolvedValue([]);

      const csv = await gerarDadosCSV('2025-01-01', '2025-01-31');

      expect(csv).toBe('');
    });
  });

  // ── obterOcupacaoSalas ────────────────────────────────────────────────────

  describe('obterOcupacaoSalas', () => {
    it('devolve salas com ocupações e percentagem calculada', async () => {
      mockPrisma.sala.findMany.mockResolvedValue([
        {
          id_sala: 1,
          nome: 'Sala A',
          marcacao: [
            {
              id_marcacoes: 1,
              hora_inicio: new Date('1970-01-01T09:00:00Z'),
              duracao_minutos: 60,
              docente: { utilizador: { nome: 'João', apelido: 'Costa' } },
            },
          ],
        },
      ]);

      const result = await obterOcupacaoSalas('2025-01-10');

      expect(result).toHaveLength(1);
      expect(result[0]).toMatchObject({ id_sala: 1, nome: 'Sala A', totalMinutos: 60 });
      expect(result[0].ocupacoes).toHaveLength(1);
      expect(result[0].ocupacoes[0]).toMatchObject({ inicio: '09:00', fim: '10:00', duracao: 60 });
    });

    it('devolve percentagem 0 para sala sem marcações', async () => {
      mockPrisma.sala.findMany.mockResolvedValue([{ id_sala: 2, nome: 'Sala B', marcacao: [] }]);

      const result = await obterOcupacaoSalas('2025-01-10');

      expect(result[0].percentagemOcupacao).toBe(0);
      expect(result[0].totalMinutos).toBe(0);
    });

    it('aceita ser chamada sem data (usa hoje por omissao)', async () => {
      mockPrisma.sala.findMany.mockResolvedValue([]);

      await obterOcupacaoSalas();

      expect(mockPrisma.sala.findMany).toHaveBeenCalled();
    });
  });
});
