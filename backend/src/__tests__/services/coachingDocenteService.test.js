// src/__tests__/coachingDocenteService.test.js
const { PrismaClient } = require('@prisma/client');
const coachingDocenteService = require('../../services/coachingDocenteService');

// 1. Mock do PrismaClient
jest.mock('@prisma/client', () => {
  const mPrismaClient = {
    marcacao: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    participacao_conclusao: {
      findFirst: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    marcacao_estado_historico: {
      create: jest.fn(),
    },
    notificacao: {
      create: jest.fn(),
    },
    $transaction: jest.fn(async (callback) => await callback(mPrismaClient)),
  };
  return { PrismaClient: jest.fn(() => mPrismaClient) };
});

const prisma = new PrismaClient();

describe('Coaching Docente Service - Testes Unitários', () => {

  // Limpa o estado dos mocks após cada teste
  afterEach(() => {
    jest.clearAllMocks();
  });

  // ---------------------------------------------------------
  // TESTES: listarMinhasAulas
  // ---------------------------------------------------------
  describe('listarMinhasAulas', () => {
    it('deve listar e mapear corretamente as aulas de um docente', async () => {
      const mockMarcacoes = [
        {
          id_marcacoes: 100,
          modalidade: { nome: 'Ballet' },
          sala: { nome: 'Sala B' },
          data_a_realizar: new Date('2026-05-15'),
          hora_inicio: new Date('1970-01-01T20:00:00.000Z'),
          duracao_minutos: 60,
          numero_alunos_pretendidos: 2,
          estado_marcacao: { nome: 'Confirmada' },
          id_estado: 3,
          aluno_marcacao: [
            { id_aluno: 20, aluno: { utilizador: { nome: 'Ana', apelido: 'Costa' } }, data_resposta: new Date() }
          ],
          participacao_conclusao: [
            { confirmou_conclusao: true }
          ]
        }
      ];

      prisma.marcacao.findMany.mockResolvedValue(mockMarcacoes);

      const result = await coachingDocenteService.listarMinhasAulas(10);

      expect(prisma.marcacao.findMany).toHaveBeenCalledWith(expect.objectContaining({
        where: expect.objectContaining({ id_docente: 10 })
      }));
      expect(result).toHaveLength(1);
      expect(result[0].modalidade).toBe('Ballet');
      expect(result[0].alunos[0].nome).toBe('Ana Costa');
      expect(result[0].ja_validou).toBe(true); // O docente já validou
      expect(result[0].alunos[0].confirmou_presenca).toBe(true);
    });

    it('deve aplicar filtro de estado, lidar com campos nulos e mapear ja_validou corretamente', async () => {
      const mockMarcacoes = [
        {
          id_marcacoes: 101,
          modalidade: null, // Testar fallback
          sala: null, // Testar fallback
          data_a_realizar: new Date('2026-05-15'),
          hora_inicio: new Date('1970-01-01T20:00:00.000Z'),
          duracao_minutos: 60,
          numero_alunos_pretendidos: 1,
          estado_marcacao: null, // Testar fallback
          id_estado: 1, // PENDENTE
          aluno_marcacao: [],
          participacao_conclusao: [] // Docente não validou
        }
      ];

      prisma.marcacao.findMany.mockResolvedValue(mockMarcacoes);

      const result = await coachingDocenteService.listarMinhasAulas(10, { id_estado: 1 });

      // Garante que enviou o filtro de estado para o Prisma
      expect(prisma.marcacao.findMany).toHaveBeenCalledWith(expect.objectContaining({
        where: expect.objectContaining({ id_docente: 10, id_estado: 1 })
      }));

      expect(result).toHaveLength(1);
      // Fallbacks
      expect(result[0].modalidade).toBe('—');
      expect(result[0].sala).toBe('Por atribuir');
      expect(result[0].estado).toBe('—');
      // ja_validou deve ser falso porque o array está vazio
      expect(result[0].ja_validou).toBe(false);
      expect(result[0].alunos).toHaveLength(0);
    });
  });

  // ---------------------------------------------------------
  // TESTES: validarConclusaoSessao
  // ---------------------------------------------------------
  describe('validarConclusaoSessao', () => {
    it('deve lançar erro se a marcação não existir', async () => {
      prisma.marcacao.findUnique.mockResolvedValue(null);
      await expect(coachingDocenteService.validarConclusaoSessao(10, 100))
        .rejects.toThrow('Marcação não encontrada.');
    });

    it('deve lançar erro se a marcação não pertencer ao docente', async () => {
      prisma.marcacao.findUnique.mockResolvedValue({ id_marcacoes: 100, id_docente: 99 });
      await expect(coachingDocenteService.validarConclusaoSessao(10, 100))
        .rejects.toThrow('A marcação não pertence a este docente.');
    });

    it('deve lançar erro se a marcação não estiver CONFIRMADA', async () => {
      prisma.marcacao.findUnique.mockResolvedValue({
        id_marcacoes: 100,
        id_docente: 10,
        id_estado: 1 // PENDENTE
      });
      await expect(coachingDocenteService.validarConclusaoSessao(10, 100))
        .rejects.toThrow('Só é possível validar sessões no estado Confirmada.');
    });

    it('deve lançar erro se o prazo de 48 horas tiver expirado', async () => {
      const dataAntiga = new Date();
      dataAntiga.setDate(dataAntiga.getDate() - 3); // 3 dias atrás (> 48h)

      prisma.marcacao.findUnique.mockResolvedValue({
        id_marcacoes: 100,
        id_docente: 10,
        id_estado: 3, // CONFIRMADA
        data_a_realizar: dataAntiga
      });

      await expect(coachingDocenteService.validarConclusaoSessao(10, 100))
        .rejects.toThrow('O prazo de 48 horas para validação da sessão já expirou.');
    });

    it('deve criar uma nova participação e retornar estado incompleto se aluno ainda não validou', async () => {
      prisma.marcacao.findUnique.mockResolvedValue({
        id_marcacoes: 100, id_docente: 10, id_estado: 3, data_a_realizar: new Date()
      });

      // Simula que o docente AINDA NÃO TEM um registo de validação de presença
      prisma.participacao_conclusao.findFirst
        .mockResolvedValueOnce(null) // Para a pesquisa do docente
        .mockResolvedValueOnce(null); // Para a pesquisa do aluno

      prisma.participacao_conclusao.findMany.mockResolvedValue([]); // Mock do console.log de diagnóstico

      const result = await coachingDocenteService.validarConclusaoSessao(10, 100);

      expect(prisma.participacao_conclusao.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          id_marcacoes: 100,
          id_docente: 10,
          id_aluno: null,
          confirmou_conclusao: true
        })
      });

      expect(result.dupla_validacao_completa).toBe(false);
      expect(result.estado).toBe('Confirmada');
    });

    it('deve concluir a sessão inteira se o aluno JÁ TIVER validado', async () => {
      prisma.marcacao.findUnique.mockResolvedValue({
        id_marcacoes: 100, id_docente: 10, id_estado: 3, data_a_realizar: new Date()
      });

      const participacaoDocenteExistente = { id_participacao_conclusao: 5 };

      // Simula que o docente já tem registo (faz update)
      // e que o aluno já tem registo também (vai despachar a transação final)
      prisma.participacao_conclusao.findFirst
        .mockResolvedValueOnce(participacaoDocenteExistente) // Docente
        .mockResolvedValueOnce({ id_participacao_conclusao: 6 }); // Aluno validou

      prisma.participacao_conclusao.findMany.mockResolvedValue([]); // Diagnóstico

      const result = await coachingDocenteService.validarConclusaoSessao(10, 100);

      expect(prisma.participacao_conclusao.update).toHaveBeenCalledWith({
        where: { id_participacao_conclusao: 5 },
        data: expect.objectContaining({ confirmou_conclusao: true })
      });

      // Como o aluno já tinha validado, a sessão passa a CONCLUIDA!
      expect(prisma.marcacao.update).toHaveBeenCalledWith({
        where: { id_marcacoes: 100 },
        data: { id_estado: 4 } // CONCLUIDA (4)
      });
      expect(prisma.marcacao_estado_historico.create).toHaveBeenCalled();

      expect(result.dupla_validacao_completa).toBe(true);
      expect(result.estado).toBe('Concluída');
    });
  });

  // ---------------------------------------------------------
  // TESTES: cancelarMarcacao
  // ---------------------------------------------------------
  describe('cancelarMarcacao', () => {
    it('deve lançar erro se a marcação não existir', async () => {
      prisma.marcacao.findUnique.mockResolvedValue(null);
      await expect(coachingDocenteService.cancelarMarcacao(10, 100, 'Motivos de doença'))
        .rejects.toThrow('Marcação não encontrada.');
    });

    it('deve lançar erro se a marcação não for do docente', async () => {
      prisma.marcacao.findUnique.mockResolvedValue({ id_marcacoes: 100, id_docente: 99 });
      await expect(coachingDocenteService.cancelarMarcacao(10, 100, 'Motivos de doença'))
        .rejects.toThrow('A marcação não pertence a este docente.');
    });

    it('deve lançar erro se já estiver cancelada ou concluída', async () => {
      prisma.marcacao.findUnique.mockResolvedValue({ id_marcacoes: 100, id_docente: 10, id_estado: 4 }); // 4 = CONCLUIDA
      await expect(coachingDocenteService.cancelarMarcacao(10, 100, 'Motivos de doença'))
        .rejects.toThrow('Não é possível cancelar uma marcação que já está concluída ou cancelada.');
    });

    it('deve cancelar com sucesso e notificar os alunos', async () => {
      const mockMarcacao = {
        id_marcacoes: 100,
        id_docente: 10,
        id_estado: 3, // CONFIRMADA
        data_a_realizar: new Date('2026-05-20'),
        aluno_marcacao: [
          { id_aluno: 20 },
          { id_aluno: 21 }
        ]
      };

      prisma.marcacao.findUnique.mockResolvedValue(mockMarcacao);
      prisma.marcacao.update.mockResolvedValue({ ...mockMarcacao, id_estado: 5 }); // 5 = CANCELADA

      await coachingDocenteService.cancelarMarcacao(10, 100, 'Motivos de doença');

      // Atualiza estado e liberta sala
      expect(prisma.marcacao.update).toHaveBeenCalledWith({
        where: { id_marcacoes: 100 },
        data: { id_estado: 5, id_sala: null }
      });

      // Regista histórico
      expect(prisma.marcacao_estado_historico.create).toHaveBeenCalled();

      // Notifica os 2 alunos (2 chamadas ao notificacao.create)
      expect(prisma.notificacao.create).toHaveBeenCalledTimes(2);
      expect(prisma.notificacao.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            mensagem: expect.stringContaining('Motivos de doença')
          })
        })
      );
    });

    it('deve cancelar com sucesso e notificar alunos SEM incluir motivo na mensagem se o mesmo não for enviado', async () => {
      const mockMarcacao = {
        id_marcacoes: 100,
        id_docente: 10,
        id_estado: 3, // CONFIRMADA
        data_a_realizar: new Date('2026-05-20'),
        aluno_marcacao: [{ id_aluno: 20 }]
      };

      prisma.marcacao.findUnique.mockResolvedValue(mockMarcacao);
      prisma.marcacao.update.mockResolvedValue({ ...mockMarcacao, id_estado: 5 });

      // Envia string vazia como motivo
      await coachingDocenteService.cancelarMarcacao(10, 100, '   ');

      // Verifica que a notificação não tem a palavra "Motivo:"
      expect(prisma.notificacao.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            mensagem: expect.not.stringContaining('Motivo:')
          })
        })
      );
    });
  });

});
