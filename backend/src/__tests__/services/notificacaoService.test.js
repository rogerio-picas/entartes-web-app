const { PrismaClient } = require('@prisma/client');
const notificacaoService = require('../../services/notificacaoService');

// Mock completo do Prisma Client
jest.mock('@prisma/client', () => {
  const mPrismaClient = {
    notificacao: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
  };
  return { PrismaClient: jest.fn(() => mPrismaClient) };
});

const prisma = new PrismaClient();

describe('Notificacao Service - Testes Unitários', () => {

  // Limpa o histórico de chamadas aos mocks após cada teste
  afterEach(() => {
    jest.clearAllMocks();
  });

  // ---------------------------------------------------------
  // TESTES: listNotificacoes
  // ---------------------------------------------------------
  describe('listNotificacoes', () => {
    it('deve retornar a lista de notificações de um utilizador ordenada por data_envio desc', async () => {
      const mockNotificacoes = [
        { id_notificacao: 1, id_user: 10, mensagem: 'Olá 1', lida: false },
        { id_notificacao: 2, id_user: 10, mensagem: 'Olá 2', lida: true }
      ];

      prisma.notificacao.findMany.mockResolvedValue(mockNotificacoes);

      const result = await notificacaoService.listNotificacoes(10);

      // Garante que enviou a query certa para a BD
      expect(prisma.notificacao.findMany).toHaveBeenCalledWith({
        where: { id_user: 10 },
        orderBy: { data_envio: 'desc' }
      });

      // Garante que o resultado é exatamente o que o prisma devolveu
      expect(result).toEqual(mockNotificacoes);
      expect(result).toHaveLength(2);
    });

    it('deve retornar um array vazio se o utilizador não tiver notificações', async () => {
      prisma.notificacao.findMany.mockResolvedValue([]);

      const result = await notificacaoService.listNotificacoes(99);

      expect(prisma.notificacao.findMany).toHaveBeenCalledWith(expect.objectContaining({
        where: { id_user: 99 }
      }));
      expect(result).toEqual([]);
    });
  });

  // ---------------------------------------------------------
  // TESTES: markAsRead
  // ---------------------------------------------------------
  describe('markAsRead', () => {
    it('deve lançar erro "Acesso negado" se a notificação não existir', async () => {
      // Prisma devolve null quando não encontra registo
      prisma.notificacao.findUnique.mockResolvedValue(null);

      await expect(notificacaoService.markAsRead(100, 10))
        .rejects.toThrow('Acesso negado');

      // Garante que pesquisou pela notificação correta
      expect(prisma.notificacao.findUnique).toHaveBeenCalledWith({
        where: { id_notificacao: 100 }
      });
      // Garante que NUNCA chamou o update
      expect(prisma.notificacao.update).not.toHaveBeenCalled();
    });

    it('deve lançar erro "Acesso negado" se a notificação pertencer a outro utilizador (segurança)', async () => {
      const mockNoteOutroUser = { id_notificacao: 100, id_user: 99, lida: false };
      prisma.notificacao.findUnique.mockResolvedValue(mockNoteOutroUser);

      // Tenta marcar como lida passando id_user = 10 (mas ela pertence ao 99)
      await expect(notificacaoService.markAsRead(100, 10))
        .rejects.toThrow('Acesso negado');

      expect(prisma.notificacao.update).not.toHaveBeenCalled();
    });

    it('deve atualizar a notificação para lida=true com sucesso se for do próprio utilizador', async () => {
      const mockNote = { id_notificacao: 100, id_user: 10, lida: false };
      const mockUpdatedNote = { ...mockNote, lida: true };

      prisma.notificacao.findUnique.mockResolvedValue(mockNote);
      prisma.notificacao.update.mockResolvedValue(mockUpdatedNote);

      const result = await notificacaoService.markAsRead(100, 10);

      // Garante que o update foi feito corretamente
      expect(prisma.notificacao.update).toHaveBeenCalledWith({
        where: { id_notificacao: 100 },
        data: { lida: true }
      });

      // Garante que a função devolve a notificação já com o lida: true
      expect(result).toEqual(mockUpdatedNote);
      expect(result.lida).toBe(true);
    });
  });

  // ---------------------------------------------------------
  // TESTES: deleteNotificacao
  // ---------------------------------------------------------
  describe('deleteNotificacao', () => {
    it('deve lançar erro "Acesso negado" se a notificação não existir', async () => {
      prisma.notificacao.findUnique.mockResolvedValue(null);

      await expect(notificacaoService.deleteNotificacao(200, 10))
        .rejects.toThrow('Acesso negado');

      expect(prisma.notificacao.findUnique).toHaveBeenCalledWith({
        where: { id_notificacao: 200 }
      });
      expect(prisma.notificacao.delete).not.toHaveBeenCalled();
    });

    it('deve lançar erro "Acesso negado" se a notificação pertencer a outro utilizador (segurança)', async () => {
      const mockNoteOutroUser = { id_notificacao: 200, id_user: 99 };
      prisma.notificacao.findUnique.mockResolvedValue(mockNoteOutroUser);

      await expect(notificacaoService.deleteNotificacao(200, 10))
        .rejects.toThrow('Acesso negado');

      expect(prisma.notificacao.delete).not.toHaveBeenCalled();
    });

    it('deve eliminar a notificação com sucesso se pertencer ao utilizador', async () => {
      const mockNote = { id_notificacao: 200, id_user: 10 };

      prisma.notificacao.findUnique.mockResolvedValue(mockNote);
      prisma.notificacao.delete.mockResolvedValue(mockNote);

      const result = await notificacaoService.deleteNotificacao(200, 10);

      expect(prisma.notificacao.delete).toHaveBeenCalledWith({
        where: { id_notificacao: 200 }
      });
      expect(result).toEqual(mockNote);
    });
  });
});
