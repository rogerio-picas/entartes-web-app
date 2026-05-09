// src/__tests__/coachingCoordenacaoService.test.js
const { PrismaClient } = require('@prisma/client');
const coachingCoordenacaoService = require('../../services/coachingCoordenacaoService');

// 1. Fazer o Mock do PrismaClient
jest.mock('@prisma/client', () => {
  const mPrismaClient = {
    marcacao: {
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      findMany: jest.fn().mockResolvedValue([]),
      update: jest.fn(),
    },
    sala: {
      findUnique: jest.fn(),
      findMany: jest.fn().mockResolvedValue([]),
    },
    marcacao_estado_historico: {
      create: jest.fn(),
    },
    notificacao: {
      create: jest.fn(),
    },
    // Mock do $transaction: executa a callback injetando o próprio mock do prisma
    $transaction: jest.fn(async (callback) => await callback(mPrismaClient)),
  };
  return { PrismaClient: jest.fn(() => mPrismaClient) };
});

const prisma = new PrismaClient();

describe('Coaching Coordenacao Service - Testes Unitários', () => {

  beforeEach(() => {
    jest.clearAllMocks();
    prisma.marcacao.findMany.mockResolvedValue([]);
    prisma.sala.findMany.mockResolvedValue([]);
  });

  // ---------------------------------------------------------
  // TESTES: rejeitarMarcacao
  // ---------------------------------------------------------
  describe('rejeitarMarcacao', () => {
    it('deve lançar um erro se o motivo de rejeição não for fornecido', async () => {
      await expect(coachingCoordenacaoService.rejeitarMarcacao(1, 100, ''))
        .rejects.toThrow('O motivo da rejeição é obrigatório.');
    });

    it('deve lançar um erro se a marcação de coaching não existir', async () => {
      prisma.marcacao.findUnique.mockResolvedValue(null);
      await expect(coachingCoordenacaoService.rejeitarMarcacao(1, 100, 'Salas indisponiveis'))
        .rejects.toThrow('Marcação não encontrada.');
    });

    it('deve lançar um erro se tentar rejeitar uma marcação de coaching já CONFIRMADA', async () => {
      prisma.marcacao.findUnique.mockResolvedValue({
        id_marcacoes: 100,
        id_estado: coachingCoordenacaoService.ESTADO_MARCACAO.CONFIRMADA,
      });
      await expect(coachingCoordenacaoService.rejeitarMarcacao(1, 100, 'Salas indisponiveis'))
        .rejects.toThrow(/já confirmada/i);
    });

    it('deve rejeitar a marcação de coaching com sucesso (atualizar BD e enviar notificações)', async () => {
      const mockMarcacao = {
        id_marcacoes: 100,
        id_estado: coachingCoordenacaoService.ESTADO_MARCACAO.PENDENTE,
        docente: { id_utilizador: 10 },
        aluno_marcacao: [{ id_aluno: 20 }, { id_aluno: 21 }], // 2 alunos
      };

      prisma.marcacao.findUnique.mockResolvedValue(mockMarcacao);
      prisma.marcacao.update.mockResolvedValue({ ...mockMarcacao, id_estado: coachingCoordenacaoService.ESTADO_MARCACAO.CANCELADA });

      const result = await coachingCoordenacaoService.rejeitarMarcacao(1, 100, 'Salas indisponiveis');

      expect(result.id_estado).toBe(coachingCoordenacaoService.ESTADO_MARCACAO.CANCELADA);
      expect(prisma.$transaction).toHaveBeenCalled();
      expect(prisma.marcacao.update).toHaveBeenCalledWith({
        where: { id_marcacoes: 100 },
        data: { id_estado: coachingCoordenacaoService.ESTADO_MARCACAO.CANCELADA },
      });
      expect(prisma.marcacao_estado_historico.create).toHaveBeenCalled();
      expect(prisma.notificacao.create).toHaveBeenCalledTimes(3); // 1 docente + 2 alunos
    });
  });

  // ---------------------------------------------------------
  // TESTES: atribuirSalaEConfirmar
  // ---------------------------------------------------------
  describe('atribuirSalaEConfirmar', () => {
    it('deve lançar erro se a marcação de coaching não existir', async () => {
      prisma.marcacao.findUnique.mockResolvedValue(null);
      await expect(coachingCoordenacaoService.atribuirSalaEConfirmar(1, 100, 5))
        .rejects.toThrow('Marcação não encontrada.');
    });

    it('deve lançar erro se a marcação de coaching não estiver PENDENTE ou EM_VALIDACAO', async () => {
      prisma.marcacao.findUnique.mockResolvedValue({
        id_marcacoes: 100,
        id_estado: coachingCoordenacaoService.ESTADO_MARCACAO.CONCLUIDA,
      });
      await expect(coachingCoordenacaoService.atribuirSalaEConfirmar(1, 100, 5))
        .rejects.toThrow(/Pendente ou Em Validação/i);
    });

    it('deve lançar erro se houver conflito de sala na marcação de coaching', async () => {
      prisma.marcacao.findUnique.mockResolvedValue({
        id_marcacoes: 100,
        id_estado: coachingCoordenacaoService.ESTADO_MARCACAO.PENDENTE,
        data_a_realizar: new Date('2026-06-05'),
        hora_inicio: new Date('1970-01-01T20:00:00.000Z'),
        duracao_minutos: 90,
        docente: { id_utilizador: 10 },
        aluno_marcacao: [{ id_aluno: 20 }],
      });
      prisma.sala.findUnique.mockResolvedValue({ id_sala: 5, nome: 'Sala T' });
      // Simula conflito de sala: findMany retorna marcação existente no mesmo horário
      prisma.marcacao.findMany.mockResolvedValue([
        { hora_inicio: new Date('1970-01-01T20:00:00Z'), duracao_minutos: 60 }
      ]);

      await expect(coachingCoordenacaoService.atribuirSalaEConfirmar(1, 100, 5))
        .rejects.toThrow('A sala "Sala T" já está ocupada neste horário. Escolhe outra sala.');
    });

    it('deve confirmar a marcação e atribuir a sala com sucesso', async () => {
      const mockMarcacao = {
        id_marcacoes: 100,
        id_estado: coachingCoordenacaoService.ESTADO_MARCACAO.PENDENTE,
        data_a_realizar: new Date('2026-06-05'),
        hora_inicio: new Date('1970-01-01T20:00:00.000Z'),
        duracao_minutos: 60,
        docente: { id_utilizador: 10, utilizador: { nome: 'João', apelido: 'Silva' } },
        aluno_marcacao: [{ id_aluno: 20 }],
        sala: { nome: 'Sala T' }
      };

      prisma.marcacao.findUnique.mockResolvedValue(mockMarcacao);
      prisma.sala.findUnique.mockResolvedValue({ id_sala: 5, nome: 'Sala T' });
      // Sem conflito de sala
      prisma.marcacao.findMany.mockResolvedValue([]);
      prisma.marcacao.update.mockResolvedValue({
        ...mockMarcacao,
        id_estado: coachingCoordenacaoService.ESTADO_MARCACAO.CONFIRMADA,
        id_sala: 5
      });

      const result = await coachingCoordenacaoService.atribuirSalaEConfirmar(1, 100, 5);

      expect(result.id_estado).toBe(coachingCoordenacaoService.ESTADO_MARCACAO.CONFIRMADA);
      expect(result.id_sala).toBe(5);
      expect(prisma.marcacao.update).toHaveBeenCalledWith({
        where: { id_marcacoes: 100 },
        data: { id_sala: 5, id_estado: coachingCoordenacaoService.ESTADO_MARCACAO.CONFIRMADA },
      });
      expect(prisma.marcacao_estado_historico.create).toHaveBeenCalled();
      expect(prisma.notificacao.create).toHaveBeenCalledTimes(2); // Docente + 1 Aluno
    });
  });

  // ---------------------------------------------------------
  // TESTES: cancelarMarcacaoConfirmada
  // ---------------------------------------------------------
  describe('cancelarMarcacaoConfirmada', () => {
    it('deve lançar erro se o motivo não for fornecido', async () => {
      await expect(coachingCoordenacaoService.cancelarMarcacaoConfirmada(1, 100, ''))
        .rejects.toThrow('O motivo do cancelamento é obrigatório');
    });

    it('deve lançar erro se a marcação não estiver CONFIRMADA', async () => {
      prisma.marcacao.findUnique.mockResolvedValue({
        id_marcacoes: 100,
        id_estado: coachingCoordenacaoService.ESTADO_MARCACAO.PENDENTE
      });
      await expect(coachingCoordenacaoService.cancelarMarcacaoConfirmada(1, 100, 'Salas em manutenção'))
        .rejects.toThrow('Só é possível cancelar sessões no estado Confirmada');
    });

    it('deve cancelar com sucesso e libertar a sala', async () => {
      const mockMarcacao = {
        id_marcacoes: 100,
        id_estado: coachingCoordenacaoService.ESTADO_MARCACAO.CONFIRMADA,
        data_a_realizar: new Date('2026-06-02'),
        docente: { id_utilizador: 10 },
        aluno_marcacao: [],
        sala: { nome: 'Sala T' }
      };

      prisma.marcacao.findUnique.mockResolvedValue(mockMarcacao);
      prisma.marcacao.update.mockResolvedValue({
        ...mockMarcacao,
        id_estado: coachingCoordenacaoService.ESTADO_MARCACAO.CANCELADA,
        id_sala: null
      });

      const result = await coachingCoordenacaoService.cancelarMarcacaoConfirmada(1, 100, 'Professor doente');

      // Verifica se a sala foi libertada (id_sala: null)
      expect(prisma.marcacao.update).toHaveBeenCalledWith({
        where: { id_marcacoes: 100 },
        data: { id_estado: coachingCoordenacaoService.ESTADO_MARCACAO.CANCELADA, id_sala: null },
      });
      expect(result.id_estado).toBe(coachingCoordenacaoService.ESTADO_MARCACAO.CANCELADA);
    });
  });

  // ---------------------------------------------------------
  // TESTES: reatribuirSala
  // ---------------------------------------------------------
  describe('reatribuirSala', () => {
    it('deve lançar erro se houver conflito na nova sala', async () => {
      prisma.marcacao.findUnique.mockResolvedValue({
        id_marcacoes: 100,
        id_estado: coachingCoordenacaoService.ESTADO_MARCACAO.CONFIRMADA,
        data_a_realizar: new Date('2026-05-10'),
        hora_inicio: new Date('1970-01-01T20:00:00.000Z'),
        duracao_minutos: 60,
        docente: { id_utilizador: 10 },
        aluno_marcacao: [],
      });
      prisma.sala.findUnique.mockResolvedValue({ id_sala: 8, nome: 'Sala T' });
      // Simula conflito: findMany retorna marcação existente
      prisma.marcacao.findMany.mockResolvedValue([
        { hora_inicio: new Date('1970-01-01T20:00:00Z'), duracao_minutos: 60 }
      ]);

      await expect(coachingCoordenacaoService.reatribuirSala(1, 100, 8))
        .rejects.toThrow('A sala "Sala T" já está ocupada neste horário.');
    });

    it('deve reatribuir a sala com sucesso e notificar', async () => {
      const mockMarcacao = {
        id_marcacoes: 100,
        id_estado: coachingCoordenacaoService.ESTADO_MARCACAO.CONFIRMADA,
        data_a_realizar: new Date('2026-05-10'),
        hora_inicio: new Date('1970-01-01T20:00:00.000Z'),
        duracao_minutos: 60,
        docente: { id_utilizador: 10 },
        aluno_marcacao: [],
      };

      prisma.marcacao.findUnique.mockResolvedValue(mockMarcacao);
      prisma.sala.findUnique.mockResolvedValue({ id_sala: 8, nome: 'Sala T' });
      prisma.marcacao.findMany.mockResolvedValue([]);
      prisma.marcacao.update.mockResolvedValue({ ...mockMarcacao, id_sala: 8 });

      const result = await coachingCoordenacaoService.reatribuirSala(1, 100, 8);

      expect(prisma.marcacao.update).toHaveBeenCalledWith({
        where: { id_marcacoes: 100 },
        data: { id_sala: 8 },
      });
      expect(result.id_sala).toBe(8);
      // Notifica a mudança de sala
      expect(prisma.notificacao.create).toHaveBeenCalledTimes(1);
    });
  });

  // ---------------------------------------------------------
  // TESTES: concluirMarcacao
  // ---------------------------------------------------------
  describe('concluirMarcacao', () => {
    it('deve lançar erro se estado não for CONFIRMADA', async () => {
      prisma.marcacao.findUnique.mockResolvedValue({
        id_marcacoes: 100,
        id_estado: coachingCoordenacaoService.ESTADO_MARCACAO.PENDENTE
      });
      await expect(coachingCoordenacaoService.concluirMarcacao(1, 100))
        .rejects.toThrow('Só é possível concluir sessões no estado Confirmada.');
    });

    it('deve concluir a marcação com sucesso', async () => {
      const mockMarcacao = {
        id_marcacoes: 100,
        id_estado: coachingCoordenacaoService.ESTADO_MARCACAO.CONFIRMADA,
        docente: { id_utilizador: 10 },
        aluno_marcacao: [],
      };

      prisma.marcacao.findUnique.mockResolvedValue(mockMarcacao);
      prisma.marcacao.update.mockResolvedValue({
        ...mockMarcacao,
        id_estado: coachingCoordenacaoService.ESTADO_MARCACAO.CONCLUIDA
      });

      const result = await coachingCoordenacaoService.concluirMarcacao(1, 100);

      expect(prisma.marcacao.update).toHaveBeenCalledWith({
        where: { id_marcacoes: 100 },
        data: { id_estado: coachingCoordenacaoService.ESTADO_MARCACAO.CONCLUIDA },
      });
      expect(result.id_estado).toBe(coachingCoordenacaoService.ESTADO_MARCACAO.CONCLUIDA);
    });
  });

  // ---------------------------------------------------------
  // TESTES: listarPedidosPendentes
  // ---------------------------------------------------------
  describe('listarPedidosPendentes', () => {
    it('deve retornar uma lista de marcações pendentes', async () => {
      const mockMarcacoes = [
        {
          id_marcacoes: 100,
          docente: { utilizador: { nome: 'Maria', apelido: 'Santos' } },
          id_docente: 10,
          modalidade: { nome: 'Ballet' },
          sala: { nome: 'Sala B' },
          data_a_realizar: new Date('2026-05-15'),
          hora_inicio: new Date('1970-01-01T20:00:00.000Z'),
          duracao_minutos: 60,
          numero_alunos_pretendidos: 2,
          estado_marcacao: { nome: 'Pendente' },
          id_estado: 1,
          data_criacao: new Date('2026-05-10'),
          aluno_marcacao: [
            { id_aluno: 20, aluno: { utilizador: { nome: 'Ana', apelido: 'Costa' } }, data_resposta: new Date() }
          ],
          participacao_conclusao: []
        }
      ];

      prisma.marcacao.findMany.mockResolvedValue(mockMarcacoes);

      const result = await coachingCoordenacaoService.listarPedidosPendentes();

      expect(prisma.marcacao.findMany).toHaveBeenCalled();
      expect(result).toHaveLength(1);
      expect(result[0].docente).toBe('Maria Santos');
      expect(result[0].modalidade).toBe('Ballet');
      expect(result[0].alunos[0].nome).toBe('Ana Costa');
      expect(result[0].alunos[0].confirmou).toBe(true);
    });
  });

  // ---------------------------------------------------------
  // TESTES: consultarSalasDisponiveis
  // ---------------------------------------------------------
  describe('consultarSalasDisponiveis', () => {
    it('deve retornar a lista de salas indicando disponibilidade', async () => {
      prisma.sala.findMany.mockResolvedValue([
        { id_sala: 1, nome: 'Sala A' },
        { id_sala: 2, nome: 'Sala B' }
      ]);

      // _verificarSalaLivre usa prisma.marcacao.findMany para cada sala
      // Sala A: tem conflito (marcação existente no mesmo horário)
      // Sala B: sem conflito (array vazio)
      prisma.marcacao.findMany
        .mockResolvedValueOnce([{ hora_inicio: new Date('1970-01-01T20:00:00Z'), duracao_minutos: 60 }])
        .mockResolvedValueOnce([]);

      const result = await coachingCoordenacaoService.consultarSalasDisponiveis('2026-05-10', '20:00:00', 60);

      expect(result).toHaveLength(2);
      expect(result[0].nome).toBe('Sala A');
      expect(result[0].disponivel).toBe(false);
      expect(result[1].nome).toBe('Sala B');
      expect(result[1].disponivel).toBe(true);
    });
  });

  // ---------------------------------------------------------
  // TESTES: consultarHistoricoMarcacao
  // ---------------------------------------------------------
  describe('consultarHistoricoMarcacao', () => {
    it('deve lançar erro se marcação de coaching não for encontrada', async () => {
      prisma.marcacao.findUnique.mockResolvedValue(null);
      await expect(coachingCoordenacaoService.consultarHistoricoMarcacao(100))
        .rejects.toThrow('Marcação não encontrada.');
    });

    it('deve mapear os dados da marcação de coaching com o histórico de estados', async () => {
      const mockMarcacao = {
        id_marcacoes: 100,
        estado_marcacao: { nome: 'Confirmada' },
        docente: { utilizador: { nome: 'Maria', apelido: 'Santos' } },
        modalidade: { nome: 'Ballet' },
        sala: { nome: 'Sala B' },
        data_a_realizar: new Date('2026-05-15'),
        hora_inicio: new Date('1970-01-01T20:00:00.000Z'),
        duracao_minutos: 60,
        data_criacao: new Date('2026-05-10'),
        aluno_marcacao: [],
        marcacao_estado_historico: [
          { estado_marcacao: { nome: 'Pendente' }, data_alteracao: new Date('2026-05-10') },
          { estado_marcacao: { nome: 'Confirmada' }, data_alteracao: new Date('2026-05-11') }
        ],
        participacao_conclusao: []
      };

      prisma.marcacao.findUnique.mockResolvedValue(mockMarcacao);

      const result = await coachingCoordenacaoService.consultarHistoricoMarcacao(100);

      expect(result.id_marcacao).toBe(100);
      expect(result.estado_atual).toBe('Confirmada');
      expect(result.docente).toBe('Maria Santos');
      expect(result.historico_estados).toHaveLength(2);
      expect(result.historico_estados[0].estado).toBe('Pendente');
    });
  });

});
