// tests/services/horarioEscolaService.test.js
const {
    obterHorarioEscola,
    atualizarHorarioEscola,
    validarHorario,
    validarHorarioDisponibilidade,
} = require('../../services/horarioEscolaService');

// ─── Mock do PrismaClient ───────────────────────────────────────────────────
jest.mock('@prisma/client', () => {
    const mockPrisma = {
        horario_letivo: {
            findMany: jest.fn(),
            deleteMany: jest.fn(),
            createMany: jest.fn(),
        },
        $transaction: jest.fn(async (cb) => {
            const tx = {
                horario_letivo: {
                    deleteMany: mockPrisma.horario_letivo.deleteMany,
                    createMany: mockPrisma.horario_letivo.createMany,
                },
            };
            return cb(tx);
        }),
    };
    return {
        PrismaClient: jest.fn(() => mockPrisma),
    };
});

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// ─── Helpers ────────────────────────────────────────────────────────────────

/** Cria um Date UTC para uma hora "HH:MM" (simula o campo Time do Prisma) */
function horaParaDate(hhmm) {
    return new Date(`1970-01-01T${hhmm}:00Z`);
}

/** Registo base devolvido pelo Prisma */
function registoBase(overwrites = {}) {
    return {
        data_inicio: new Date('2025-01-01'),
        data_fim: new Date('2025-06-30'),
        hora_inicio: horaParaDate('08:00'),
        hora_fim: horaParaDate('17:00'),
        dia_semana: 1,
        id_docente: null,
        ...overwrites,
    };
}

// ─────────────────────────────────────────────────────────────────────────────
// obterHorarioEscola
// ─────────────────────────────────────────────────────────────────────────────
describe('obterHorarioEscola', () => {
    beforeEach(() => jest.clearAllMocks());

    it('deve retornar null quando não existem registos', async () => {
        prisma.horario_letivo.findMany.mockResolvedValue([]);
        const resultado = await obterHorarioEscola();
        expect(resultado).toBeNull();
    });

    it('deve retornar null quando o Prisma devolve null', async () => {
        prisma.horario_letivo.findMany.mockResolvedValue(null);
        const resultado = await obterHorarioEscola();
        expect(resultado).toBeNull();
    });

    it('deve mapear corretamente os campos do primeiro registo', async () => {
        prisma.horario_letivo.findMany.mockResolvedValue([
            registoBase({ dia_semana: 1 }),
            registoBase({ dia_semana: 3 }),
            registoBase({ dia_semana: 5 }),
        ]);

        const resultado = await obterHorarioEscola();

        expect(resultado).toEqual({
            data_inicio: new Date('2025-01-01'),
            data_fim: new Date('2025-06-30'),
            hora_inicio: '08:00',
            hora_fim: '17:00',
            dias_semana: [1, 3, 5],
        });
    });

    it('deve filtrar dias_semana nulos', async () => {
        prisma.horario_letivo.findMany.mockResolvedValue([
            registoBase({ dia_semana: 2 }),
            registoBase({ dia_semana: null }),
        ]);

        const resultado = await obterHorarioEscola();
        expect(resultado.dias_semana).toEqual([2]);
    });

    it('deve devolver null para hora_inicio quando o campo é null', async () => {
        prisma.horario_letivo.findMany.mockResolvedValue([registoBase({ hora_inicio: null })]);
        const resultado = await obterHorarioEscola();
        expect(resultado.hora_inicio).toBeNull();
    });

    it('deve devolver null para hora_fim quando o campo é null', async () => {
        prisma.horario_letivo.findMany.mockResolvedValue([registoBase({ hora_fim: null })]);
        const resultado = await obterHorarioEscola();
        expect(resultado.hora_fim).toBeNull();
    });

    it('deve chamar o Prisma com os filtros corretos', async () => {
        prisma.horario_letivo.findMany.mockResolvedValue([registoBase()]);
        await obterHorarioEscola();

        expect(prisma.horario_letivo.findMany).toHaveBeenCalledWith({
            where: { id_docente: null },
            orderBy: { dia_semana: 'asc' },
        });
    });
});

// ─────────────────────────────────────────────────────────────────────────────
// atualizarHorarioEscola
// ─────────────────────────────────────────────────────────────────────────────
describe('atualizarHorarioEscola', () => {
    const params = ['2025-01-01', '2025-06-30', '08:00', '17:00', [1, 2, 3, 4, 5]];

    beforeEach(() => {
        jest.clearAllMocks();
        // Por defeito, a transação executa o callback
        prisma.$transaction.mockImplementation(async (cb) => {
            const tx = {
                horario_letivo: {
                    deleteMany: prisma.horario_letivo.deleteMany,
                    createMany: prisma.horario_letivo.createMany,
                },
            };
            return cb(tx);
        });
        // Após a transação, obterHorarioEscola é chamada internamente
        prisma.horario_letivo.findMany.mockResolvedValue([registoBase()]);
    });

    it('deve lançar erro quando data_inicio está ausente', async () => {
        await expect(
            atualizarHorarioEscola(null, '2025-06-30', '08:00', '17:00', [1])
        ).rejects.toThrow('Parâmetros inválidos');
    });

    it('deve lançar erro quando data_fim está ausente', async () => {
        await expect(
            atualizarHorarioEscola('2025-01-01', null, '08:00', '17:00', [1])
        ).rejects.toThrow('Parâmetros inválidos');
    });

    it('deve lançar erro quando hora_inicio está ausente', async () => {
        await expect(
            atualizarHorarioEscola('2025-01-01', '2025-06-30', null, '17:00', [1])
        ).rejects.toThrow('Parâmetros inválidos');
    });

    it('deve lançar erro quando hora_fim está ausente', async () => {
        await expect(
            atualizarHorarioEscola('2025-01-01', '2025-06-30', '08:00', null, [1])
        ).rejects.toThrow('Parâmetros inválidos');
    });

    it('deve lançar erro quando dias_semana não é array', async () => {
        await expect(
            atualizarHorarioEscola('2025-01-01', '2025-06-30', '08:00', '17:00', '1,2,3')
        ).rejects.toThrow('Parâmetros inválidos');
    });

    it('deve apagar registos antigos e criar os novos dentro de uma transação', async () => {
        await atualizarHorarioEscola(...params);

        expect(prisma.horario_letivo.deleteMany).toHaveBeenCalledWith({ where: { id_docente: null } });
        expect(prisma.horario_letivo.createMany).toHaveBeenCalledWith({
            data: [1, 2, 3, 4, 5].map((dia) => ({
                id_docente: null,
                dia_semana: dia,
                data_inicio: new Date('2025-01-01'),
                data_fim: new Date('2025-06-30'),
                hora_inicio: new Date('1970-01-01T08:00:00Z'),
                hora_fim: new Date('1970-01-01T17:00:00Z'),
            })),
        });
    });

    it('deve apagar os registos mas NÃO criar novos quando dias_semana está vazio', async () => {
        await atualizarHorarioEscola('2025-01-01', '2025-06-30', '08:00', '17:00', []);

        expect(prisma.horario_letivo.deleteMany).toHaveBeenCalled();
        expect(prisma.horario_letivo.createMany).not.toHaveBeenCalled();
    });

    it('deve devolver o resultado de obterHorarioEscola após atualização', async () => {
        const horarioEsperado = {
            data_inicio: new Date('2025-01-01'),
            data_fim: new Date('2025-06-30'),
            hora_inicio: '08:00',
            hora_fim: '17:00',
            dias_semana: [1, 2, 3, 4, 5],
        };
        prisma.horario_letivo.findMany.mockResolvedValue([1, 2, 3, 4, 5].map((d) => registoBase({ dia_semana: d })));

        const resultado = await atualizarHorarioEscola(...params);

        expect(resultado).toEqual(horarioEsperado);
    });
});

// ─────────────────────────────────────────────────────────────────────────────
// validarHorario
// ─────────────────────────────────────────────────────────────────────────────
describe('validarHorario', () => {
    beforeEach(() => jest.clearAllMocks());

    const escolaPadrao = () => [
        registoBase({ dia_semana: 1 }), // Segunda
        registoBase({ dia_semana: 2 }), // Terça
        registoBase({ dia_semana: 3 }), // Quarta
        registoBase({ dia_semana: 4 }), // Quinta
        registoBase({ dia_semana: 5 }), // Sexta
    ];

    it('deve retornar true quando não existe horário de escola configurado', async () => {
        prisma.horario_letivo.findMany.mockResolvedValue([]);
        const resultado = await validarHorario('2025-03-10', '18:00', 60);
        expect(resultado).toBe(true);
    });

    it('deve lançar erro quando a data está fora do ano letivo (antes)', async () => {
        prisma.horario_letivo.findMany.mockResolvedValue(escolaPadrao());
        await expect(validarHorario('2024-12-31', '18:00', 60)).rejects.toThrow(
            'fora do ano letivo'
        );
    });

    it('deve lançar erro quando a data está fora do ano letivo (depois)', async () => {
        prisma.horario_letivo.findMany.mockResolvedValue(escolaPadrao());
        await expect(validarHorario('2025-07-01', '18:00', 60)).rejects.toThrow(
            'fora do ano letivo'
        );
    });

    it('deve lançar erro quando o dia da semana não está nos dias configurados', async () => {
        // 2025-03-16 é Domingo (0) — não está nos dias configurados
        prisma.horario_letivo.findMany.mockResolvedValue(escolaPadrao());
        await expect(validarHorario('2025-03-16', '18:00', 60)).rejects.toThrow(
            'não está aberta neste dia'
        );
    });

    it('deve lançar erro quando a hora de início é anterior ao fecho da escola', async () => {
        // Escola fecha às 17:00; coaching a partir das 17:00
        prisma.horario_letivo.findMany.mockResolvedValue(escolaPadrao());
        // 2025-03-10 é Segunda-feira (1)
        await expect(validarHorario('2025-03-10', '16:00', 60)).rejects.toThrow(
            'entre as 17:00 e as 22:00'
        );
    });

    it('deve lançar erro quando o fim do coaching ultrapassa as 22:00', async () => {
        prisma.horario_letivo.findMany.mockResolvedValue(escolaPadrao());
        // Coaching às 21:30 com 60 min → termina às 22:30
        await expect(validarHorario('2025-03-10', '21:30', 60)).rejects.toThrow(
            'entre as 17:00 e as 22:00'
        );
    });

    it('deve retornar true para um coaching válido num dia de semana', async () => {
        prisma.horario_letivo.findMany.mockResolvedValue(escolaPadrao());
        // Segunda-feira, 17:00, 60 min → termina às 18:00
        const resultado = await validarHorario('2025-03-10', '17:00', 60);
        expect(resultado).toBe(true);
    });

    describe('Sábado (exceção)', () => {
        it('deve retornar true para coaching válido ao Sábado (08:30 – 20:00)', async () => {
            prisma.horario_letivo.findMany.mockResolvedValue(escolaPadrao());
            // 2025-03-15 é Sábado
            const resultado = await validarHorario('2025-03-15', '09:00', 60);
            expect(resultado).toBe(true);
        });

        it('deve lançar erro para coaching ao Sábado antes das 08:30', async () => {
            prisma.horario_letivo.findMany.mockResolvedValue(escolaPadrao());
            await expect(validarHorario('2025-03-15', '08:00', 60)).rejects.toThrow(
                '08:30 e as 20:00'
            );
        });

        it('deve lançar erro para coaching ao Sábado que termina depois das 20:00', async () => {
            prisma.horario_letivo.findMany.mockResolvedValue(escolaPadrao());
            // 19:30 + 60 min = 20:30
            await expect(validarHorario('2025-03-15', '19:30', 60)).rejects.toThrow(
                '08:30 e as 20:00'
            );
        });
    });
});

// ─────────────────────────────────────────────────────────────────────────────
// validarHorarioDisponibilidade
// ─────────────────────────────────────────────────────────────────────────────
describe('validarHorarioDisponibilidade', () => {
    beforeEach(() => jest.clearAllMocks());

    const escolaPadrao = () => [
        registoBase({ dia_semana: 1 }),
        registoBase({ dia_semana: 2 }),
        registoBase({ dia_semana: 3 }),
        registoBase({ dia_semana: 4 }),
        registoBase({ dia_semana: 5 }),
    ];

    it('deve retornar true quando não existe horário configurado', async () => {
        prisma.horario_letivo.findMany.mockResolvedValue([]);
        const resultado = await validarHorarioDisponibilidade(1, null, '17:00', '18:00');
        expect(resultado).toBe(true);
    });

    describe('com data_especifica', () => {
        it('deve lançar erro quando a data está fora do ano letivo', async () => {
            prisma.horario_letivo.findMany.mockResolvedValue(escolaPadrao());
            await expect(
                validarHorarioDisponibilidade(null, '2024-12-01', '17:00', '18:00')
            ).rejects.toThrow('fora do ano letivo');
        });

        it('deve lançar erro quando o dia da data_especifica não está nos dias configurados', async () => {
            // 2025-03-16 = Domingo (0)
            prisma.horario_letivo.findMany.mockResolvedValue(escolaPadrao());
            await expect(
                validarHorarioDisponibilidade(null, '2025-03-16', '17:00', '18:00')
            ).rejects.toThrow('não está aberta neste dia');
        });

        it('deve aceitar disponibilidade válida com data_especifica', async () => {
            prisma.horario_letivo.findMany.mockResolvedValue(escolaPadrao());
            // 2025-03-10 = Segunda-feira, das 17:00 às 18:00
            const resultado = await validarHorarioDisponibilidade(null, '2025-03-10', '17:00', '18:00');
            expect(resultado).toBe(true);
        });
    });

    describe('com dia_semana (sem data_especifica)', () => {
        it('deve lançar erro quando o dia não está nos dias configurados', async () => {
            prisma.horario_letivo.findMany.mockResolvedValue(escolaPadrao());
            // Domingo = 0
            await expect(
                validarHorarioDisponibilidade(0, null, '17:00', '18:00')
            ).rejects.toThrow('não está aberta neste dia');
        });

        it('deve lançar erro quando a hora_inicio é anterior ao fecho da escola', async () => {
            prisma.horario_letivo.findMany.mockResolvedValue(escolaPadrao());
            await expect(
                validarHorarioDisponibilidade(1, null, '16:00', '17:00')
            ).rejects.toThrow('entre as 17:00 e as 22:00');
        });

        it('deve lançar erro quando a hora_fim ultrapassa as 22:00', async () => {
            prisma.horario_letivo.findMany.mockResolvedValue(escolaPadrao());
            await expect(
                validarHorarioDisponibilidade(1, null, '21:30', '22:30')
            ).rejects.toThrow('entre as 17:00 e as 22:00');
        });

        it('deve aceitar disponibilidade válida com dia_semana', async () => {
            prisma.horario_letivo.findMany.mockResolvedValue(escolaPadrao());
            const resultado = await validarHorarioDisponibilidade(2, null, '17:00', '19:00');
            expect(resultado).toBe(true);
        });

        it('deve aceitar horas como objetos Date (formato Prisma)', async () => {
            prisma.horario_letivo.findMany.mockResolvedValue(escolaPadrao());
            const resultado = await validarHorarioDisponibilidade(
                2,
                null,
                horaParaDate('17:00'),
                horaParaDate('19:00')
            );
            expect(resultado).toBe(true);
        });
    });

    describe('Sábado (exceção)', () => {
        it('deve aceitar disponibilidade válida ao Sábado', async () => {
            prisma.horario_letivo.findMany.mockResolvedValue(escolaPadrao());
            // 2025-03-15 = Sábado
            const resultado = await validarHorarioDisponibilidade(null, '2025-03-15', '09:00', '11:00');
            expect(resultado).toBe(true);
        });

        it('deve lançar erro para disponibilidade ao Sábado antes das 08:30', async () => {
            prisma.horario_letivo.findMany.mockResolvedValue(escolaPadrao());
            await expect(
                validarHorarioDisponibilidade(null, '2025-03-15', '08:00', '09:00')
            ).rejects.toThrow('08:30 e as 20:00');
        });

        it('deve lançar erro para disponibilidade ao Sábado após as 20:00', async () => {
            prisma.horario_letivo.findMany.mockResolvedValue(escolaPadrao());
            await expect(
                validarHorarioDisponibilidade(null, '2025-03-15', '19:00', '21:00')
            ).rejects.toThrow('08:30 e as 20:00');
        });

        it('deve aceitar Sábado via dia_semana numérico (6)', async () => {
            prisma.horario_letivo.findMany.mockResolvedValue(escolaPadrao());
            const resultado = await validarHorarioDisponibilidade(6, null, '09:00', '11:00');
            expect(resultado).toBe(true);
        });
    });
});