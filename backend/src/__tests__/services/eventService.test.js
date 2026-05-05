'use strict';

jest.mock('../../services/groupService', () => ({
  removerAlunoDoGrupo: jest.fn(),
  removerDocenteDoGrupo: jest.fn(),
}));

const mockTx = {
  evento: { create: jest.fn(), update: jest.fn() },
  coordenadora_evento: { create: jest.fn() },
  evento_aluno: { create: jest.fn() },
  evento_docente: { create: jest.fn() },
  notificacao: { create: jest.fn(), createMany: jest.fn() },
};

const mockPrisma = {
  coordenadora: { findUnique: jest.fn() },
  evento: { findUnique: jest.fn(), findMany: jest.fn(), update: jest.fn() },
  utilizador: { findUnique: jest.fn() },
  evento_aluno: { findUnique: jest.fn(), findMany: jest.fn(), delete: jest.fn() },
  evento_docente: { findUnique: jest.fn(), findMany: jest.fn(), delete: jest.fn() },
  aluno_grupo: { findMany: jest.fn() },
  docente_grupo: { findMany: jest.fn() },
  evento_estado: { findFirst: jest.fn() },
  $transaction: jest.fn(),
};

jest.mock('@prisma/client', () => ({
  PrismaClient: jest.fn(() => mockPrisma),
}));

const groupService = require('../../services/groupService');
const {
  criarEvento,
  listarEventos,
  listarMeusEventos,
  buscarEventoPorId,
  adicionarParticipante,
  listarParticipantes,
  removerAlunoDoEvento,
  removerDocenteDoEvento,
  cancelarEvento,
  concluirEvento,
  editarEvento,
} = require('../../services/eventService');

const setupTransaction = () => {
  mockPrisma.$transaction.mockImplementation(async (cb) => cb(mockTx));
};

describe('eventService', () => {
  afterEach(() => jest.clearAllMocks());

  // ── criarEvento ───────────────────────────────────────────────────────────

  describe('criarEvento', () => {
    it('lança erro quando nome está vazio', async () => {
      await expect(criarEvento({ nome: '' }, 1)).rejects.toThrow('nome do evento é obrigatório');
      await expect(criarEvento({ nome: '   ' }, 1)).rejects.toThrow('nome do evento é obrigatório');
    });

    it('lança erro quando coordenadora não existe', async () => {
      mockPrisma.coordenadora.findUnique.mockResolvedValue(null);

      await expect(criarEvento({ nome: 'Evento' }, 1)).rejects.toThrow('Coordenadora não encontrada.');
    });

    it('cria evento e registo coordenadora_evento numa transação', async () => {
      mockPrisma.coordenadora.findUnique.mockResolvedValue({ id_utilizador: 1 });
      setupTransaction();
      mockTx.evento.create.mockResolvedValue({ id_evento: 10, nome: 'Evento' });
      mockTx.coordenadora_evento.create.mockResolvedValue({});

      const result = await criarEvento({ nome: 'Evento', duracao_minutos: 90 }, 1);

      expect(mockTx.evento.create).toHaveBeenCalled();
      expect(mockTx.coordenadora_evento.create).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ id_utilizador: 1, id_evento: 10 }) })
      );
      expect(result).toMatchObject({ id_evento: 10 });
    });

    it('usa duracao_minutos=60 por omissao quando não fornecida', async () => {
      mockPrisma.coordenadora.findUnique.mockResolvedValue({ id_utilizador: 1 });
      setupTransaction();
      mockTx.evento.create.mockResolvedValue({ id_evento: 1 });
      mockTx.coordenadora_evento.create.mockResolvedValue({});

      await criarEvento({ nome: 'Evento' }, 1);

      const createData = mockTx.evento.create.mock.calls[0][0].data;
      expect(createData.duracao_minutos).toBe(60);
    });
  });

  // ── listarEventos ─────────────────────────────────────────────────────────

  describe('listarEventos', () => {
    it('lista todos os eventos sem filtro de estado', async () => {
      mockPrisma.evento.findMany.mockResolvedValue([{ id_evento: 1 }, { id_evento: 2 }]);

      const result = await listarEventos();

      const callArg = mockPrisma.evento.findMany.mock.calls[0][0];
      expect(callArg.where).toBeUndefined();
      expect(result).toHaveLength(2);
    });

    it('filtra por estado quando fornecido', async () => {
      mockPrisma.evento.findMany.mockResolvedValue([]);

      await listarEventos(2);

      const callArg = mockPrisma.evento.findMany.mock.calls[0][0];
      expect(callArg.where).toEqual({ id_evento_estado: 2 });
    });
  });

  // ── listarMeusEventos ─────────────────────────────────────────────────────

  describe('listarMeusEventos', () => {
    it('role 2 (docente): filtra por evento_docente', async () => {
      mockPrisma.evento.findMany.mockResolvedValue([{ id_evento: 1 }]);

      const result = await listarMeusEventos(5, 2);

      expect(mockPrisma.evento.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { evento_docente: { some: { id_docente: 5 } } } })
      );
      expect(result).toHaveLength(1);
    });

    it('role 3 (aluno): filtra por evento_aluno', async () => {
      mockPrisma.evento.findMany.mockResolvedValue([{ id_evento: 2 }]);

      const result = await listarMeusEventos(10, 3);

      expect(mockPrisma.evento.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { evento_aluno: { some: { id_utilizador: 10 } } } })
      );
      expect(result).toHaveLength(1);
    });

    it('outros roles: devolve array vazio sem chamar a BD', async () => {
      const result = await listarMeusEventos(1, 1);

      expect(mockPrisma.evento.findMany).not.toHaveBeenCalled();
      expect(result).toEqual([]);
    });
  });

  // ── buscarEventoPorId ─────────────────────────────────────────────────────

  describe('buscarEventoPorId', () => {
    it('lança erro quando evento não existe', async () => {
      mockPrisma.evento.findUnique.mockResolvedValue(null);

      await expect(buscarEventoPorId(99)).rejects.toThrow('Evento não encontrado.');
    });

    it('devolve evento quando existe', async () => {
      mockPrisma.evento.findUnique.mockResolvedValue({ id_evento: 1 });

      const result = await buscarEventoPorId(1);

      expect(result).toMatchObject({ id_evento: 1 });
    });
  });

  // ── adicionarParticipante ─────────────────────────────────────────────────

  describe('adicionarParticipante', () => {
    it('lança erro quando evento não existe', async () => {
      mockPrisma.evento.findUnique.mockResolvedValue(null);

      await expect(adicionarParticipante(1, 'user')).rejects.toThrow('Evento não encontrado.');
    });

    it('lança erro quando evento está concluído', async () => {
      mockPrisma.evento.findUnique.mockResolvedValue({ id_evento: 1, id_evento_estado: 4 });

      await expect(adicionarParticipante(1, 'user')).rejects.toThrow('concluído ou cancelado');
    });

    it('lança erro quando evento está cancelado', async () => {
      mockPrisma.evento.findUnique.mockResolvedValue({ id_evento: 1, id_evento_estado: 5 });

      await expect(adicionarParticipante(1, 'user')).rejects.toThrow('concluído ou cancelado');
    });

    it('lança erro quando evento está em realização', async () => {
      mockPrisma.evento.findUnique.mockResolvedValue({ id_evento: 1, id_evento_estado: 3 });

      await expect(adicionarParticipante(1, 'user')).rejects.toThrow('em realização');
    });

    it('lança erro quando utilizador não existe', async () => {
      mockPrisma.evento.findUnique.mockResolvedValue({ id_evento: 1, id_evento_estado: 1 });
      mockPrisma.utilizador.findUnique.mockResolvedValue(null);

      await expect(adicionarParticipante(1, 'fantasma')).rejects.toThrow('não encontrado');
    });

    it('lança erro quando id_tipo=1 (coordenadora)', async () => {
      mockPrisma.evento.findUnique.mockResolvedValue({ id_evento: 1, id_evento_estado: 1 });
      mockPrisma.utilizador.findUnique.mockResolvedValue({ id_utilizador: 1, id_tipo: 1 });

      await expect(adicionarParticipante(1, 'admin')).rejects.toThrow('Administradores');
    });

    it('lança erro quando aluno já está inscrito', async () => {
      mockPrisma.evento.findUnique.mockResolvedValue({ id_evento: 1, id_evento_estado: 1 });
      mockPrisma.utilizador.findUnique.mockResolvedValue({ id_utilizador: 10, id_tipo: 3, aluno: {} });
      mockPrisma.evento_aluno.findUnique.mockResolvedValue({ id_evento: 1 });

      await expect(adicionarParticipante(1, 'aluno')).rejects.toThrow('já está inscrito no evento');
    });

    it('adiciona aluno ao evento com sucesso', async () => {
      mockPrisma.evento.findUnique.mockResolvedValue({ id_evento: 1, id_evento_estado: 1, nome: 'Evento' });
      mockPrisma.utilizador.findUnique.mockResolvedValue({ id_utilizador: 10, id_tipo: 3, aluno: {} });
      mockPrisma.evento_aluno.findUnique.mockResolvedValue(null);
      setupTransaction();
      mockTx.evento_aluno.create.mockResolvedValue({ id_evento: 1, id_utilizador: 10 });
      mockTx.evento.update.mockResolvedValue({});
      mockTx.notificacao.create.mockResolvedValue({});

      const result = await adicionarParticipante(1, 'aluno');

      expect(mockTx.evento_aluno.create).toHaveBeenCalled();
      expect(result).toMatchObject({ id_evento: 1 });
    });

    it('lança erro quando docente já está inscrito', async () => {
      mockPrisma.evento.findUnique.mockResolvedValue({ id_evento: 1, id_evento_estado: 1 });
      mockPrisma.utilizador.findUnique.mockResolvedValue({ id_utilizador: 5, id_tipo: 2, docente: {} });
      mockPrisma.evento_docente.findUnique.mockResolvedValue({ id_evento: 1 });

      await expect(adicionarParticipante(1, 'docente')).rejects.toThrow('já está inscrito no evento');
    });
  });

  // ── listarParticipantes ───────────────────────────────────────────────────

  describe('listarParticipantes', () => {
    it('lança erro quando evento não existe', async () => {
      mockPrisma.evento.findUnique.mockResolvedValue(null);

      await expect(listarParticipantes(1)).rejects.toThrow('Evento não encontrado.');
    });

    it('devolve alunos e docentes com total', async () => {
      mockPrisma.evento.findUnique.mockResolvedValue({ id_evento: 1 });
      mockPrisma.evento_aluno.findMany.mockResolvedValue([
        { aluno: { id_utilizador: 10, utilizador: { nome: 'Ana', apelido: 'Silva', email: 'a@a.pt' } } },
      ]);
      mockPrisma.evento_docente.findMany.mockResolvedValue([
        { docente: { id_utilizador: 5, utilizador: { nome: 'João', apelido: 'Costa', email: 'j@j.pt' } } },
      ]);

      const result = await listarParticipantes(1);

      expect(result.total).toBe(2);
      expect(result.alunos).toHaveLength(1);
      expect(result.docentes).toHaveLength(1);
    });
  });

  // ── removerAlunoDoEvento ──────────────────────────────────────────────────

  describe('removerAlunoDoEvento', () => {
    it('lança erro quando evento não existe', async () => {
      mockPrisma.evento.findUnique.mockResolvedValue(null);

      await expect(removerAlunoDoEvento(1, 10)).rejects.toThrow('Evento não encontrado.');
    });

    it('lança erro quando aluno não está inscrito', async () => {
      mockPrisma.evento.findUnique.mockResolvedValue({ id_evento: 1 });
      mockPrisma.evento_aluno.findUnique.mockResolvedValue(null);

      await expect(removerAlunoDoEvento(1, 10)).rejects.toThrow('não está inscrito neste evento');
    });

    it('remove aluno dos grupos do evento antes de remover do evento', async () => {
      mockPrisma.evento.findUnique.mockResolvedValue({ id_evento: 1 });
      mockPrisma.evento_aluno.findUnique.mockResolvedValue({ id_evento: 1 });
      mockPrisma.aluno_grupo.findMany.mockResolvedValue([{ id_grupo: 5 }, { id_grupo: 6 }]);
      groupService.removerAlunoDoGrupo.mockResolvedValue({});
      mockPrisma.evento_aluno.delete.mockResolvedValue({});

      await removerAlunoDoEvento(1, 10);

      expect(groupService.removerAlunoDoGrupo).toHaveBeenCalledTimes(2);
    });

    it('remove aluno sem grupos associados', async () => {
      mockPrisma.evento.findUnique.mockResolvedValue({ id_evento: 1 });
      mockPrisma.evento_aluno.findUnique.mockResolvedValue({ id_evento: 1 });
      mockPrisma.aluno_grupo.findMany.mockResolvedValue([]);
      mockPrisma.evento_aluno.delete.mockResolvedValue({});

      const result = await removerAlunoDoEvento(1, 10);

      expect(groupService.removerAlunoDoGrupo).not.toHaveBeenCalled();
      expect(result).toMatchObject({ mensagem: expect.stringContaining('sucesso') });
    });
  });

  // ── removerDocenteDoEvento ────────────────────────────────────────────────

  describe('removerDocenteDoEvento', () => {
    it('lança erro quando evento não existe', async () => {
      mockPrisma.evento.findUnique.mockResolvedValue(null);

      await expect(removerDocenteDoEvento(1, 5)).rejects.toThrow('Evento não encontrado.');
    });

    it('lança erro quando docente não está inscrito', async () => {
      mockPrisma.evento.findUnique.mockResolvedValue({ id_evento: 1 });
      mockPrisma.evento_docente.findUnique.mockResolvedValue(null);

      await expect(removerDocenteDoEvento(1, 5)).rejects.toThrow('não está inscrito neste evento');
    });

    it('remove docente com sucesso', async () => {
      mockPrisma.evento.findUnique.mockResolvedValue({ id_evento: 1 });
      mockPrisma.evento_docente.findUnique.mockResolvedValue({ id_evento: 1 });
      mockPrisma.docente_grupo.findMany.mockResolvedValue([]);
      mockPrisma.evento_docente.delete.mockResolvedValue({});

      const result = await removerDocenteDoEvento(1, 5);

      expect(result).toMatchObject({ mensagem: expect.stringContaining('sucesso') });
    });
  });

  // ── cancelarEvento ────────────────────────────────────────────────────────

  describe('cancelarEvento', () => {
    const eventoBase = {
      id_evento: 1,
      nome: 'Evento',
      id_evento_estado: 1,
      evento_aluno: [{ id_utilizador: 10 }],
      evento_docente: [{ id_docente: 5 }],
      coordenadora_evento: [],
    };

    it('lança erro quando evento não existe', async () => {
      mockPrisma.evento.findUnique.mockResolvedValue(null);

      await expect(cancelarEvento(1, 1)).rejects.toThrow('Evento não encontrado.');
    });

    it('lança erro quando estado "Cancelado" não existe na BD', async () => {
      mockPrisma.evento.findUnique.mockResolvedValue(eventoBase);
      mockPrisma.evento_estado.findFirst.mockResolvedValue(null);

      await expect(cancelarEvento(1, 1)).rejects.toThrow("Estado 'Cancelado' não encontrado");
    });

    it('lança erro quando evento já está cancelado', async () => {
      mockPrisma.evento.findUnique.mockResolvedValue({ ...eventoBase, id_evento_estado: 5 });
      mockPrisma.evento_estado.findFirst.mockResolvedValue({ id_evento_estado: 5 });

      await expect(cancelarEvento(1, 1)).rejects.toThrow('já está cancelado');
    });

    it('cancela evento e notifica todos os participantes', async () => {
      mockPrisma.evento.findUnique.mockResolvedValue(eventoBase);
      mockPrisma.evento_estado.findFirst.mockResolvedValue({ id_evento_estado: 5 });
      setupTransaction();
      mockTx.evento.update.mockResolvedValue({});
      mockTx.notificacao.createMany.mockResolvedValue({});

      const result = await cancelarEvento(1, 1);

      expect(mockTx.evento.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: { id_evento_estado: 5 } })
      );
      expect(result.participantes_notificados).toBe(2);
    });

    it('cancela evento sem participantes (sem notificações)', async () => {
      const eventoSemParticipantes = { ...eventoBase, evento_aluno: [], evento_docente: [] };
      mockPrisma.evento.findUnique.mockResolvedValue(eventoSemParticipantes);
      mockPrisma.evento_estado.findFirst.mockResolvedValue({ id_evento_estado: 5 });
      setupTransaction();
      mockTx.evento.update.mockResolvedValue({});

      const result = await cancelarEvento(1, 1);

      expect(mockTx.notificacao.createMany).not.toHaveBeenCalled();
      expect(result.participantes_notificados).toBe(0);
    });
  });

  // ── concluirEvento ────────────────────────────────────────────────────────

  describe('concluirEvento', () => {
    const eventoAberto = {
      id_evento: 1,
      nome: 'Evento',
      id_evento_estado: 2,
      coordenadora_evento: [{ id_utilizador: 1 }],
      evento_aluno: [],
      evento_docente: [],
    };

    it('lança erro quando evento não existe', async () => {
      mockPrisma.evento.findUnique.mockResolvedValue(null);

      await expect(concluirEvento(1, 1)).rejects.toThrow('Evento não encontrado.');
    });

    it('lança erro quando coordenadora não tem permissão', async () => {
      mockPrisma.evento.findUnique.mockResolvedValue({
        ...eventoAberto,
        coordenadora_evento: [{ id_utilizador: 99 }],
      });

      await expect(concluirEvento(1, 1)).rejects.toThrow('Sem permissão');
    });

    it('lança erro quando evento está cancelado', async () => {
      mockPrisma.evento.findUnique.mockResolvedValue({ ...eventoAberto, id_evento_estado: 5 });

      await expect(concluirEvento(1, 1)).rejects.toThrow('cancelado');
    });

    it('lança erro quando evento já está concluído', async () => {
      mockPrisma.evento.findUnique.mockResolvedValue({ ...eventoAberto, id_evento_estado: 4 });

      await expect(concluirEvento(1, 1)).rejects.toThrow('já está concluído');
    });

    it('lança erro quando evento não está em estado válido para conclusão', async () => {
      mockPrisma.evento.findUnique.mockResolvedValue({ ...eventoAberto, id_evento_estado: 1 });

      await expect(concluirEvento(1, 1)).rejects.toThrow('não está em estado válido');
    });

    it('conclui evento com sucesso', async () => {
      mockPrisma.evento.findUnique.mockResolvedValue(eventoAberto);
      setupTransaction();
      mockTx.evento.update.mockResolvedValue({});
      mockTx.notificacao.createMany.mockResolvedValue({});

      const result = await concluirEvento(1, 1);

      expect(mockTx.evento.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: { id_evento_estado: 4 } })
      );
      expect(result).toMatchObject({ mensagem: expect.stringContaining('sucesso') });
    });
  });

  // ── editarEvento ──────────────────────────────────────────────────────────

  describe('editarEvento', () => {
    it('lança erro quando evento não existe', async () => {
      mockPrisma.evento.findUnique.mockResolvedValue(null);

      await expect(editarEvento(1, { nome: 'Novo' })).rejects.toThrow('Evento não encontrado.');
    });

    it('lança erro quando nenhum campo válido é fornecido', async () => {
      mockPrisma.evento.findUnique.mockResolvedValue({ id_evento: 1, id_evento_estado: 2 });

      await expect(editarEvento(1, {})).rejects.toThrow('Nenhum campo válido');
    });

    it('lança erro quando nome é string vazia', async () => {
      mockPrisma.evento.findUnique.mockResolvedValue({ id_evento: 1, id_evento_estado: 2 });

      await expect(editarEvento(1, { nome: '' })).rejects.toThrow('Nenhum campo válido');
    });

    it('edita evento com sucesso', async () => {
      mockPrisma.evento.findUnique.mockResolvedValue({ id_evento: 1, id_evento_estado: 1 });
      mockPrisma.evento.update.mockResolvedValue({ id_evento: 1, nome: 'Novo Nome' });

      const result = await editarEvento(1, { nome: 'Novo Nome', descricao: 'Nova desc' });

      expect(mockPrisma.evento.update).toHaveBeenCalled();
      expect(result).toMatchObject({ nome: 'Novo Nome' });
    });

    it('muda estado para EM_REALIZACAO quando data é definida num evento ABERTO', async () => {
      mockPrisma.evento.findUnique.mockResolvedValue({ id_evento: 1, id_evento_estado: 2 });
      mockPrisma.evento.update.mockResolvedValue({ id_evento: 1 });

      await editarEvento(1, { data_de_realizacao: '2025-06-01' });

      const updateData = mockPrisma.evento.update.mock.calls[0][0].data;
      expect(updateData.id_evento_estado).toBe(3);
    });
  });
});
