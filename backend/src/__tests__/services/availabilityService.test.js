'use strict';

const mockPrisma = {
  disponibilidade: {
    findMany: jest.fn(),
    findFirst: jest.fn(),
    findUnique: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  },
};

jest.mock('@prisma/client', () => ({
  PrismaClient: jest.fn(() => mockPrisma),
}));

const {
  validarDocente,
  validarParametrosCreate,
  verificarSobreposicao,
  verificarPropriedade,
  verificarMarcacoesAtivas,
  criarDisponibilidade,
  listarDisponibilidades,
  obterDisponibilidade,
  atualizarDisponibilidade,
  eliminarDisponibilidade,
} = require('../../services/availabilityService');

describe('availabilityService', () => {
  afterEach(() => jest.clearAllMocks());

  // ── validarDocente ────────────────────────────────────────────────────────

  describe('validarDocente', () => {
    it('lança erro quando id_tipo não é 2', () => {
      expect(() => validarDocente(1)).toThrow('Apenas docentes');
      expect(() => validarDocente(3)).toThrow('Apenas docentes');
    });

    it('não lança erro quando id_tipo é 2', () => {
      expect(() => validarDocente(2)).not.toThrow();
    });
  });

  // ── validarParametrosCreate ───────────────────────────────────────────────

  describe('validarParametrosCreate', () => {
    it('lança erro quando nem dia_semana nem data_especifica são fornecidos', () => {
      expect(() => validarParametrosCreate(null, null, '10:00', '11:00')).toThrow('dia_semana ou data_especifica');
    });

    it('lança erro quando hora_inicio ou hora_fim estão ausentes', () => {
      expect(() => validarParametrosCreate(1, null, null, '11:00')).toThrow('obrigatórios');
      expect(() => validarParametrosCreate(1, null, '10:00', null)).toThrow('obrigatórios');
    });

    it('lança erro quando hora_fim não é posterior à hora_inicio', () => {
      expect(() => validarParametrosCreate(1, null, '11:00', '10:00')).toThrow('posterior');
      expect(() => validarParametrosCreate(1, null, '10:00', '10:00')).toThrow('posterior');
    });

    it('não lança erro com dia_semana e horas válidas', () => {
      expect(() => validarParametrosCreate(1, null, '09:00', '10:00')).not.toThrow();
    });

    it('lança erro quando data_especifica é no passado', () => {
      expect(() => validarParametrosCreate(null, '2000-01-01', '10:00', '11:00'))
        .toThrow('inferior à data atual');
    });

    it('não lança erro com data futura válida', () => {
      expect(() => validarParametrosCreate(null, '2099-12-31', '10:00', '11:00')).not.toThrow();
    });
  });

  // ── verificarSobreposicao ─────────────────────────────────────────────────

  describe('verificarSobreposicao', () => {
    it('lança erro quando existem disponibilidades sobrepostas', async () => {
      mockPrisma.disponibilidade.findMany.mockResolvedValue([{ id_disponibilidade: 1 }]);

      await expect(verificarSobreposicao(1, 1, null, '10:00', '11:00')).rejects.toThrow('sobreposta');
    });

    it('não lança erro quando não há sobreposição', async () => {
      mockPrisma.disponibilidade.findMany.mockResolvedValue([]);

      await expect(verificarSobreposicao(1, 1, null, '10:00', '11:00')).resolves.toBeUndefined();
    });

    it('exclui o registo atual ao verificar sobreposição (update)', async () => {
      mockPrisma.disponibilidade.findMany.mockResolvedValue([]);

      await verificarSobreposicao(1, 1, null, '10:00', '11:00', 5);

      const whereArg = mockPrisma.disponibilidade.findMany.mock.calls[0][0].where;
      expect(whereArg.id_disponibilidade).toEqual({ not: 5 });
    });
  });

  // ── verificarPropriedade ──────────────────────────────────────────────────

  describe('verificarPropriedade', () => {
    it('lança erro quando disponibilidade não pertence ao docente', async () => {
      mockPrisma.disponibilidade.findFirst.mockResolvedValue(null);

      await expect(verificarPropriedade(1, 5)).rejects.toThrow('Disponibilidade não encontrada');
    });

    it('devolve disponibilidade quando pertence ao docente', async () => {
      const disp = { id_disponibilidade: 1, id_docente: 5 };
      mockPrisma.disponibilidade.findFirst.mockResolvedValue(disp);

      const result = await verificarPropriedade(1, 5);

      expect(result).toEqual(disp);
    });
  });

  // ── verificarMarcacoesAtivas ──────────────────────────────────────────────

  describe('verificarMarcacoesAtivas', () => {
    it('lança erro quando disponibilidade não existe', async () => {
      mockPrisma.disponibilidade.findUnique.mockResolvedValue(null);

      await expect(verificarMarcacoesAtivas(1)).rejects.toThrow('Disponibilidade não encontrada.');
    });

    it('lança erro quando existem marcações activas', async () => {
      mockPrisma.disponibilidade.findUnique.mockResolvedValue({
        id_disponibilidade: 1,
        marcacao: [{ id_marcacoes: 1 }],
      });

      await expect(verificarMarcacoesAtivas(1)).rejects.toThrow('marcação ativa');
    });

    it('devolve disponibilidade quando não há marcações activas', async () => {
      const disp = { id_disponibilidade: 1, marcacao: [] };
      mockPrisma.disponibilidade.findUnique.mockResolvedValue(disp);

      const result = await verificarMarcacoesAtivas(1);

      expect(result).toEqual(disp);
    });
  });

  // ── criarDisponibilidade ──────────────────────────────────────────────────

  describe('criarDisponibilidade', () => {
    it('cria disponibilidade por dia_semana com sucesso', async () => {
      mockPrisma.disponibilidade.findMany.mockResolvedValue([]);
      mockPrisma.disponibilidade.create.mockResolvedValue({ id_disponibilidade: 1 });

      const result = await criarDisponibilidade(5, { dia_semana: 1, hora_inicio: '09:00', hora_fim: '10:00' });

      expect(mockPrisma.disponibilidade.create).toHaveBeenCalled();
      expect(result).toMatchObject({ id_disponibilidade: 1 });
    });

    it('propaga erro de validação quando parâmetros são inválidos', async () => {
      await expect(
        criarDisponibilidade(5, { dia_semana: null, data_especifica: null, hora_inicio: '09:00', hora_fim: '10:00' })
      ).rejects.toThrow('dia_semana ou data_especifica');
    });

    it('propaga erro de sobreposição', async () => {
      mockPrisma.disponibilidade.findMany.mockResolvedValue([{ id_disponibilidade: 99 }]);

      await expect(
        criarDisponibilidade(5, { dia_semana: 1, hora_inicio: '09:00', hora_fim: '10:00' })
      ).rejects.toThrow('sobreposta');
    });
  });

  // ── listarDisponibilidades ────────────────────────────────────────────────

  describe('listarDisponibilidades', () => {
    it('devolve disponibilidades do docente ordenadas', async () => {
      const disps = [{ id_disponibilidade: 1 }, { id_disponibilidade: 2 }];
      mockPrisma.disponibilidade.findMany.mockResolvedValue(disps);

      const result = await listarDisponibilidades(5);

      expect(mockPrisma.disponibilidade.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { id_docente: 5 } })
      );
      expect(result).toEqual(disps);
    });
  });

  // ── obterDisponibilidade ──────────────────────────────────────────────────

  describe('obterDisponibilidade', () => {
    it('devolve disponibilidade quando pertence ao docente', async () => {
      const disp = { id_disponibilidade: 1, id_docente: 5 };
      mockPrisma.disponibilidade.findFirst.mockResolvedValue(disp);

      const result = await obterDisponibilidade(1, 5);

      expect(result).toEqual(disp);
    });

    it('lança erro quando não pertence ao docente', async () => {
      mockPrisma.disponibilidade.findFirst.mockResolvedValue(null);

      await expect(obterDisponibilidade(1, 5)).rejects.toThrow('Disponibilidade não encontrada');
    });
  });

  // ── atualizarDisponibilidade ──────────────────────────────────────────────

  describe('atualizarDisponibilidade', () => {
    const existente = {
      id_disponibilidade: 1,
      id_docente: 5,
      hora_inicio: new Date('1970-01-01T09:00:00Z'),
      hora_fim: new Date('1970-01-01T10:00:00Z'),
      dia_semana: 1,
      data_especifica: null,
    };

    it('lança erro quando disponibilidade não pertence ao docente', async () => {
      mockPrisma.disponibilidade.findFirst.mockResolvedValue(null);

      await expect(atualizarDisponibilidade(1, 5, { hora_inicio: '09:00', hora_fim: '11:00' }))
        .rejects.toThrow('Disponibilidade não encontrada');
    });

    it('lança erro quando hora_fim não é posterior à hora_inicio', async () => {
      mockPrisma.disponibilidade.findFirst.mockResolvedValue(existente);

      await expect(atualizarDisponibilidade(1, 5, { hora_inicio: '11:00', hora_fim: '09:00' }))
        .rejects.toThrow('posterior à hora de início');
    });

    it('lança erro quando data_especifica é no passado', async () => {
      mockPrisma.disponibilidade.findFirst.mockResolvedValue(existente);

      await expect(
        atualizarDisponibilidade(1, 5, { data_especifica: '2000-01-01', hora_inicio: '09:00', hora_fim: '11:00' })
      ).rejects.toThrow('passado');
    });

    it('atualiza disponibilidade com sucesso', async () => {
      mockPrisma.disponibilidade.findFirst.mockResolvedValue(existente);
      mockPrisma.disponibilidade.findMany.mockResolvedValue([]);
      mockPrisma.disponibilidade.update.mockResolvedValue({ id_disponibilidade: 1 });

      const result = await atualizarDisponibilidade(1, 5, { hora_inicio: '09:00', hora_fim: '11:00' });

      expect(mockPrisma.disponibilidade.update).toHaveBeenCalled();
      expect(result).toMatchObject({ id_disponibilidade: 1 });
    });
  });

  // ── eliminarDisponibilidade ───────────────────────────────────────────────

  describe('eliminarDisponibilidade', () => {
    it('lança erro se disponibilidade não pertence ao docente', async () => {
      mockPrisma.disponibilidade.findFirst.mockResolvedValue(null);

      await expect(eliminarDisponibilidade(1, 5)).rejects.toThrow('Disponibilidade não encontrada');
    });

    it('elimina disponibilidade com sucesso', async () => {
      mockPrisma.disponibilidade.findFirst.mockResolvedValue({ id_disponibilidade: 1 });
      mockPrisma.disponibilidade.delete.mockResolvedValue({});

      const result = await eliminarDisponibilidade(1, 5);

      expect(mockPrisma.disponibilidade.delete).toHaveBeenCalledWith({ where: { id_disponibilidade: 1 } });
      expect(result).toMatchObject({ message: expect.stringContaining('sucesso') });
    });
  });
});
