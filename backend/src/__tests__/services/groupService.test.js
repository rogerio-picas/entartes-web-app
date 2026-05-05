'use strict';

const mockPrisma = {
  grupo: { findMany: jest.fn(), findUnique: jest.fn(), create: jest.fn(), update: jest.fn(), delete: jest.fn() },
  evento: { findUnique: jest.fn() },
  evento_aluno: { findUnique: jest.fn() },
  evento_docente: { findUnique: jest.fn() },
  aluno_grupo: { findUnique: jest.fn(), create: jest.fn(), delete: jest.fn() },
  docente_grupo: { findUnique: jest.fn(), create: jest.fn(), delete: jest.fn() },
  docente: { findUnique: jest.fn() },
  utilizador: { findUnique: jest.fn() },
};

jest.mock('@prisma/client', () => ({
  PrismaClient: jest.fn(() => mockPrisma),
}));

const {
  listarTodosOsGrupos,
  criarGrupo,
  listarGruposDoEvento,
  adicionarAlunoAoGrupo,
  adicionarDocenteAoGrupo,
  removerAlunoDoGrupo,
  removerDocenteDoGrupo,
  editarGrupo,
  eliminarGrupo,
} = require('../../services/groupService');

describe('groupService', () => {
  afterEach(() => jest.clearAllMocks());

  // ── listarTodosOsGrupos ───────────────────────────────────────────────────

  describe('listarTodosOsGrupos', () => {
    it('devolve todos os grupos com relações', async () => {
      mockPrisma.grupo.findMany.mockResolvedValue([{ id_grupo: 1 }, { id_grupo: 2 }]);

      const result = await listarTodosOsGrupos();

      expect(mockPrisma.grupo.findMany).toHaveBeenCalled();
      expect(result).toHaveLength(2);
    });
  });

  // ── criarGrupo ────────────────────────────────────────────────────────────

  describe('criarGrupo', () => {
    it('lança erro se id_evento for inválido', async () => {
      await expect(criarGrupo('abc', { nome: 'G1' })).rejects.toThrow('id_evento é obrigatório.');
      await expect(criarGrupo(null, { nome: 'G1' })).rejects.toThrow('id_evento é obrigatório.');
    });

    it('lança erro se nome estiver vazio', async () => {
      await expect(criarGrupo(1, { nome: '' })).rejects.toThrow('O nome do grupo é obrigatório.');
      await expect(criarGrupo(1, { nome: '   ' })).rejects.toThrow('O nome do grupo é obrigatório.');
    });

    it('lança erro se evento não existir', async () => {
      mockPrisma.evento.findUnique.mockResolvedValue(null);

      await expect(criarGrupo(1, { nome: 'G1' })).rejects.toThrow('Evento não encontrado.');
    });

    it('cria grupo com sucesso', async () => {
      mockPrisma.evento.findUnique.mockResolvedValue({ id_evento: 1 });
      mockPrisma.grupo.create.mockResolvedValue({ id_grupo: 1, nome: 'G1', id_evento: 1 });

      const result = await criarGrupo(1, { nome: 'G1', descricao: 'Desc', hora_atuacao: '10:00:00' });

      expect(mockPrisma.grupo.create).toHaveBeenCalled();
      expect(result).toMatchObject({ id_grupo: 1, nome: 'G1' });
    });

    it('cria grupo sem hora_atuacao (null)', async () => {
      mockPrisma.evento.findUnique.mockResolvedValue({ id_evento: 1 });
      mockPrisma.grupo.create.mockResolvedValue({ id_grupo: 2, nome: 'G2' });

      await criarGrupo(1, { nome: 'G2' });

      const createCall = mockPrisma.grupo.create.mock.calls[0][0];
      expect(createCall.data.hora_atuacao).toBeNull();
    });
  });

  // ── listarGruposDoEvento ──────────────────────────────────────────────────

  describe('listarGruposDoEvento', () => {
    it('lança erro se evento não existir', async () => {
      mockPrisma.evento.findUnique.mockResolvedValue(null);

      await expect(listarGruposDoEvento(1)).rejects.toThrow('Evento não encontrado.');
    });

    it('devolve grupos do evento', async () => {
      mockPrisma.evento.findUnique.mockResolvedValue({ id_evento: 1 });
      mockPrisma.grupo.findMany.mockResolvedValue([{ id_grupo: 1 }, { id_grupo: 2 }]);

      const result = await listarGruposDoEvento(1);

      expect(result).toHaveLength(2);
    });
  });

  // ── adicionarAlunoAoGrupo ─────────────────────────────────────────────────

  describe('adicionarAlunoAoGrupo', () => {
    it('lança erro se grupo não pertence ao evento', async () => {
      mockPrisma.grupo.findUnique.mockResolvedValue({ id_grupo: 1, id_evento: 99 });

      await expect(adicionarAlunoAoGrupo(1, 1, 10)).rejects.toThrow('não pertence ao evento');
    });

    it('lança erro se grupo não existe', async () => {
      mockPrisma.grupo.findUnique.mockResolvedValue(null);

      await expect(adicionarAlunoAoGrupo(1, 1, 10)).rejects.toThrow('não pertence ao evento');
    });

    it('lança erro se aluno não está inscrito no evento', async () => {
      mockPrisma.grupo.findUnique.mockResolvedValue({ id_grupo: 1, id_evento: 1 });
      mockPrisma.evento_aluno.findUnique.mockResolvedValue(null);

      await expect(adicionarAlunoAoGrupo(1, 1, 10)).rejects.toThrow('deve estar inscrito no evento');
    });

    it('lança erro se aluno já está no grupo', async () => {
      mockPrisma.grupo.findUnique.mockResolvedValue({ id_grupo: 1, id_evento: 1 });
      mockPrisma.evento_aluno.findUnique.mockResolvedValue({ id_evento: 1 });
      mockPrisma.aluno_grupo.findUnique.mockResolvedValue({ id_grupo: 1, id_aluno: 10 });

      await expect(adicionarAlunoAoGrupo(1, 1, 10)).rejects.toThrow('já faz parte deste grupo');
    });

    it('adiciona aluno ao grupo com sucesso', async () => {
      mockPrisma.grupo.findUnique.mockResolvedValue({ id_grupo: 1, id_evento: 1 });
      mockPrisma.evento_aluno.findUnique.mockResolvedValue({ id_evento: 1 });
      mockPrisma.aluno_grupo.findUnique.mockResolvedValue(null);
      mockPrisma.aluno_grupo.create.mockResolvedValue({ id_grupo: 1, id_aluno: 10 });

      const result = await adicionarAlunoAoGrupo(1, 1, 10);

      expect(mockPrisma.aluno_grupo.create).toHaveBeenCalledWith({
        data: { id_grupo: 1, id_aluno: 10 },
      });
      expect(result).toMatchObject({ id_grupo: 1, id_aluno: 10 });
    });
  });

  // ── adicionarDocenteAoGrupo ───────────────────────────────────────────────

  describe('adicionarDocenteAoGrupo', () => {
    it('lança erro se grupo não existe', async () => {
      mockPrisma.grupo.findUnique.mockResolvedValue(null);

      await expect(adicionarDocenteAoGrupo(1, 1, 5)).rejects.toThrow('Grupo não encontrado.');
    });

    it('lança erro se grupo não pertence ao evento', async () => {
      mockPrisma.grupo.findUnique.mockResolvedValue({ id_grupo: 1, id_evento: 99 });

      await expect(adicionarDocenteAoGrupo(1, 1, 5)).rejects.toThrow('não pertence ao evento');
    });

    it('lança erro se docente não existe na BD', async () => {
      mockPrisma.grupo.findUnique.mockResolvedValue({ id_grupo: 1, id_evento: 1 });
      mockPrisma.docente.findUnique.mockResolvedValue(null);
      mockPrisma.utilizador.findUnique.mockResolvedValue(null);

      await expect(adicionarDocenteAoGrupo(1, 1, 5)).rejects.toThrow('Docente não encontrado.');
    });

    it('lança erro se docente não está associado ao evento', async () => {
      mockPrisma.grupo.findUnique.mockResolvedValue({ id_grupo: 1, id_evento: 1 });
      mockPrisma.docente.findUnique.mockResolvedValue({ id_utilizador: 5 });
      mockPrisma.evento_docente.findUnique.mockResolvedValue(null);

      await expect(adicionarDocenteAoGrupo(1, 1, 5)).rejects.toThrow('não está associado a este evento');
    });

    it('lança erro se docente já está no grupo', async () => {
      mockPrisma.grupo.findUnique.mockResolvedValue({ id_grupo: 1, id_evento: 1 });
      mockPrisma.docente.findUnique.mockResolvedValue({ id_utilizador: 5 });
      mockPrisma.evento_docente.findUnique.mockResolvedValue({ id_evento: 1 });
      mockPrisma.docente_grupo.findUnique.mockResolvedValue({ id_docente: 5 });

      await expect(adicionarDocenteAoGrupo(1, 1, 5)).rejects.toThrow('já está neste grupo');
    });

    it('adiciona docente ao grupo com sucesso', async () => {
      mockPrisma.grupo.findUnique.mockResolvedValue({ id_grupo: 1, id_evento: 1 });
      mockPrisma.docente.findUnique.mockResolvedValue({ id_utilizador: 5 });
      mockPrisma.evento_docente.findUnique.mockResolvedValue({ id_evento: 1 });
      mockPrisma.docente_grupo.findUnique.mockResolvedValue(null);
      mockPrisma.docente_grupo.create.mockResolvedValue({ id_grupo: 1, id_docente: 5 });

      const result = await adicionarDocenteAoGrupo(1, 1, 5);

      expect(result).toMatchObject({ id_grupo: 1, id_docente: 5 });
    });
  });

  // ── removerAlunoDoGrupo ───────────────────────────────────────────────────

  describe('removerAlunoDoGrupo', () => {
    it('lança erro se aluno não está no grupo', async () => {
      mockPrisma.aluno_grupo.findUnique.mockResolvedValue(null);

      await expect(removerAlunoDoGrupo(1, 10)).rejects.toThrow('O aluno não está neste grupo.');
    });

    it('remove aluno do grupo com sucesso', async () => {
      mockPrisma.aluno_grupo.findUnique.mockResolvedValue({ id_grupo: 1, id_aluno: 10 });
      mockPrisma.aluno_grupo.delete.mockResolvedValue({});

      const result = await removerAlunoDoGrupo(1, 10);

      expect(mockPrisma.aluno_grupo.delete).toHaveBeenCalled();
      expect(result).toMatchObject({ mensagem: expect.stringContaining('sucesso') });
    });
  });

  // ── removerDocenteDoGrupo ─────────────────────────────────────────────────

  describe('removerDocenteDoGrupo', () => {
    it('lança erro se docente não está no grupo', async () => {
      mockPrisma.docente_grupo.findUnique.mockResolvedValue(null);

      await expect(removerDocenteDoGrupo(1, 5)).rejects.toThrow('O docente não está neste grupo.');
    });

    it('remove docente do grupo com sucesso', async () => {
      mockPrisma.docente_grupo.findUnique.mockResolvedValue({ id_docente: 5 });
      mockPrisma.docente_grupo.delete.mockResolvedValue({});

      const result = await removerDocenteDoGrupo(1, 5);

      expect(mockPrisma.docente_grupo.delete).toHaveBeenCalled();
      expect(result).toMatchObject({ mensagem: expect.stringContaining('sucesso') });
    });
  });

  // ── editarGrupo ───────────────────────────────────────────────────────────

  describe('editarGrupo', () => {
    it('lança erro se grupo não existe', async () => {
      mockPrisma.grupo.findUnique.mockResolvedValue(null);

      await expect(editarGrupo(1, { nome: 'Novo' })).rejects.toThrow('Grupo não encontrado.');
    });

    it('edita grupo mantendo campos não fornecidos', async () => {
      const grupoExistente = { id_grupo: 1, nome: 'Antigo', descricao: 'Desc', hora_atuacao: null };
      mockPrisma.grupo.findUnique.mockResolvedValue(grupoExistente);
      mockPrisma.grupo.update.mockResolvedValue({ id_grupo: 1, nome: 'Novo' });

      const result = await editarGrupo(1, { nome: 'Novo' });

      expect(mockPrisma.grupo.update).toHaveBeenCalledWith(
        expect.objectContaining({ where: { id_grupo: 1 } })
      );
      expect(result).toMatchObject({ id_grupo: 1 });
    });
  });

  // ── eliminarGrupo ─────────────────────────────────────────────────────────

  describe('eliminarGrupo', () => {
    it('lança erro se grupo não existe', async () => {
      mockPrisma.grupo.findUnique.mockResolvedValue(null);

      await expect(eliminarGrupo(1)).rejects.toThrow('Grupo não encontrado.');
    });

    it('elimina grupo com sucesso', async () => {
      mockPrisma.grupo.findUnique.mockResolvedValue({ id_grupo: 1 });
      mockPrisma.grupo.delete.mockResolvedValue({});

      const result = await eliminarGrupo(1);

      expect(mockPrisma.grupo.delete).toHaveBeenCalledWith({ where: { id_grupo: 1 } });
      expect(result).toMatchObject({ mensagem: expect.stringContaining('sucesso') });
    });
  });
});
