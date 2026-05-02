// src/__tests__/services/anuncioService.test.js
// Testes Unitários — Módulo de Anúncios (Coordinadora)
// Framework: Jest  |  Mocking: jest.mock()

// ─────────────────────────────────────────────────────────────
// MOCK DO PRISMA CLIENT
// ─────────────────────────────────────────────────────────────
jest.mock('@prisma/client', () => {
  const mockPrisma = {
    anuncio: {
      create: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    evento: {
      findUnique: jest.fn(),
    },
    grupo: {
      findUnique: jest.fn(),
    },
    evento_aluno: {
      findMany: jest.fn(),
    },
    evento_docente: {
      findMany: jest.fn(),
    },
    aluno_grupo: {
      findMany: jest.fn(),
    },
    docente_grupo: {
      findMany: jest.fn(),
    },
    notificacao: {
      createMany: jest.fn(),
    },
    $transaction: jest.fn(async (callback) => callback(mockPrisma)),
  };

  return {
    PrismaClient: jest.fn(() => mockPrisma),
  };
});

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const {
  criarAnuncio,
  listarTodosAnuncios,
  obterAnuncioPorId,
  actualizarAnuncio,
  eliminarAnuncio,
  publicarAnuncioNoEvento,
  publicarAnuncioNoGrupo,
  listarAnunciosDoEvento,
  listarAnunciosDoGrupo,
} = require('../../services/anuncioService');

// ─────────────────────────────────────────────────────────────
// FIXTURES
// ─────────────────────────────────────────────────────────────
const anuncioFixture = {
  id_anuncio: 1,
  id_coordenadora: 10,
  titulo: 'Anúncio de Teste',
  mensagem: 'Esta é uma mensagem de teste.',
  data_envio: new Date(),
  id_evento: null,
  id_grupo: null,
  coordenadora: {
    utilizador: { nome: 'Admin', apelido: 'Sistema' }
  },
  evento: null,
  grupo: null
};

beforeEach(() => {
  jest.clearAllMocks();
});

// ═════════════════════════════════════════════════════════════
// TESTES
// ═════════════════════════════════════════════════════════════

describe('anuncioService', () => {

  describe('criarAnuncio', () => {
    test('cria um anúncio simples com sucesso', async () => {
      prisma.anuncio.create.mockResolvedValue(anuncioFixture);

      const dados = { titulo: 'Olá', mensagem: 'Mundo' };
      const resultado = await criarAnuncio(10, dados);

      expect(resultado).toEqual(anuncioFixture);
      expect(prisma.anuncio.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            id_coordenadora: 10,
            titulo: 'Olá',
            mensagem: 'Mundo'
          })
        })
      );
    });

    test('lança erro se título ou mensagem estiverem vazios', async () => {
      await expect(criarAnuncio(10, { titulo: '', mensagem: '...' }))
        .rejects.toThrow('O título e a mensagem são obrigatórios.');
    });
  });

  describe('listarTodosAnuncios', () => {
    test('devolve lista de anúncios ordenada', async () => {
      prisma.anuncio.findMany.mockResolvedValue([anuncioFixture]);

      const resultado = await listarTodosAnuncios();

      expect(resultado).toHaveLength(1);
      expect(prisma.anuncio.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          orderBy: { data_envio: 'desc' }
        })
      );
    });
  });

  describe('obterAnuncioPorId', () => {
    test('devolve o anúncio quando encontrado', async () => {
      prisma.anuncio.findUnique.mockResolvedValue(anuncioFixture);

      const resultado = await obterAnuncioPorId(1);

      expect(resultado.id_anuncio).toBe(1);
    });

    test('lança erro quando o anúncio não existe', async () => {
      prisma.anuncio.findUnique.mockResolvedValue(null);

      await expect(obterAnuncioPorId(999))
        .rejects.toThrow('Anúncio não encontrado.');
    });
  });

  describe('actualizarAnuncio', () => {
    test('actualiza com sucesso se for a autora', async () => {
      prisma.anuncio.findUnique.mockResolvedValue(anuncioFixture);
      prisma.anuncio.update.mockResolvedValue({ ...anuncioFixture, titulo: 'Novo Título' });

      const resultado = await actualizarAnuncio(1, 10, { titulo: 'Novo Título' });

      expect(resultado.titulo).toBe('Novo Título');
      expect(prisma.anuncio.update).toHaveBeenCalled();
    });

    test('lança erro se quem tenta actualizar não for o autor', async () => {
      prisma.anuncio.findUnique.mockResolvedValue(anuncioFixture); // autor id 10

      await expect(actualizarAnuncio(1, 99, { titulo: 'Tentativa' }))
        .rejects.toThrow('Sem permissão para actualizar este anúncio.');
    });
  });

  describe('eliminarAnuncio', () => {
    test('elimina com sucesso se for a autora', async () => {
      prisma.anuncio.findUnique.mockResolvedValue(anuncioFixture);
      prisma.anuncio.delete.mockResolvedValue({});

      const resultado = await eliminarAnuncio(1, 10);

      expect(resultado.mensagem).toBe('Anúncio eliminado com sucesso.');
      expect(prisma.anuncio.delete).toHaveBeenCalled();
    });

    test('bloqueia eliminação por outro utilizador', async () => {
      prisma.anuncio.findUnique.mockResolvedValue(anuncioFixture);

      await expect(eliminarAnuncio(1, 55))
        .rejects.toThrow('Sem permissão');
    });
  });

  describe('publicarAnuncioNoEvento', () => {
    test('cria anúncio e gera notificações para todos os inscritos', async () => {
      prisma.evento.findUnique.mockResolvedValue({ id_evento: 1, nome_evento: 'Workshop' });
      prisma.anuncio.create.mockResolvedValue({ ...anuncioFixture, id_evento: 1 });

      // Mock de participantes
      prisma.evento_aluno.findMany.mockResolvedValue([{ id_utilizador: 101 }]);
      prisma.evento_docente.findMany.mockResolvedValue([{ id_docente: 201 }]);

      const resultado = await publicarAnuncioNoEvento(1, 10, {
        titulo: 'Início',
        mensagem: 'Começamos já.'
      });

      expect(resultado.id_evento).toBe(1);
      expect(prisma.notificacao.createMany).toHaveBeenCalledWith({
        data: expect.arrayContaining([
          { id_user: 101, titulo: 'Workshop: Início', mensagem: 'Começamos já.' },
          { id_user: 201, titulo: 'Workshop: Início', mensagem: 'Começamos já.' }
        ])
      });
    });

    test('lança erro se o evento não existir', async () => {
      prisma.evento.findUnique.mockResolvedValue(null);
      await expect(publicarAnuncioNoEvento(99, 10, { titulo: 'X', mensagem: 'Y' }))
        .rejects.toThrow('Evento não encontrado.');
    });
  });

  describe('publicarAnuncioNoGrupo', () => {
    test('cria anúncio e notifica apenas membros do grupo', async () => {
      prisma.grupo.findUnique.mockResolvedValue({ id_grupo: 5, nome_grupo: 'Nível 1' });
      prisma.anuncio.create.mockResolvedValue({ ...anuncioFixture, id_grupo: 5 });

      prisma.aluno_grupo.findMany.mockResolvedValue([{ id_aluno: 301 }]);
      prisma.docente_grupo.findMany.mockResolvedValue([]);

      const resultado = await publicarAnuncioNoGrupo(5, 10, {
        titulo: 'Aula Extra',
        mensagem: 'Amanhã às 10h.'
      });

      expect(resultado.id_grupo).toBe(5);
      expect(prisma.notificacao.createMany).toHaveBeenCalledWith({
        data: [{ id_user: 301, titulo: 'Grupo Nível 1: Aula Extra', mensagem: 'Amanhã às 10h.' }]
      });
    });
  });

  describe('listarAnunciosDoEvento', () => {
    test('filtra apenas anúncios globais do evento', async () => {
      prisma.anuncio.findMany.mockResolvedValue([]);

      await listarAnunciosDoEvento(1);

      expect(prisma.anuncio.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            id_evento: 1,
            id_grupo: null
          })
        })
      );
    });
  });
});
