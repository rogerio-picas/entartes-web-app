'use strict';

/**
 * @file userService.test.js
 * @description Testes Unitários — userService
 *
 * Cobre integralmente as funções exportadas por userService.js:
 *   - criarUtilizador  (Aluno / Docente / Coordenadora / tipo desconhecido)
 *   - atualizarUtilizador (actualização simples, mudança de tipo, coaching, utilizador inexistente)
 *
 * Abordagem: mock completo de @prisma/client e bcrypt.
 * Todos os ramos condicionais são exercitados.
 */

// ─── Mocks globais ───────────────────────────────────────────────────────────

// Mock do bcrypt antes do require do service
jest.mock('bcrypt', () => ({
    genSalt: jest.fn().mockResolvedValue('mock_salt'),
    hash: jest.fn().mockResolvedValue('hashed_password'),
    compare: jest.fn(),
}));

// Estrutura mínima do cliente Prisma necessária para o service
const mockTx = {
    utilizador: {
        create: jest.fn(),
        update: jest.fn(),
        findUnique: jest.fn(),
        delete: jest.fn(),
    },
    aluno: {
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
    },
    docente: {
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
    },
    coordenadora: {
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
    },
};

const mockPrisma = {
    utilizador: {
        findMany: jest.fn(),
        findUnique: jest.fn(),
    },
    $transaction: jest.fn(),
};

jest.mock('@prisma/client', () => ({
    PrismaClient: jest.fn(() => mockPrisma),
}));

// ─── Importações ─────────────────────────────────────────────────────────────

const bcrypt = require('bcrypt');
const { criarUtilizador, atualizarUtilizador, getUsers, getUser, deleteUser } = require('../../services/userService');

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** Simula prisma.$transaction a executar o callback com mockTx */
const setupTransaction = () => {
    mockPrisma.$transaction.mockImplementation(async (callback) => callback(mockTx));
};

/** Dados base para criação de um utilizador aluno */
const dadosAluno = () => ({
    codigo_username: 'aluno001',
    password: 'senha123',
    id_tipo: 3,
    nome: 'Ana',
    apelido: 'Silva',
    data_nascimento: '2000-01-15',
    email: 'ana@entartes.pt',
    telemovel: '912345678',
    nif: '123456789',
    coaching: true,
});

// ─────────────────────────────────────────────────────────────────────────────
// SUITE: criarUtilizador
// ─────────────────────────────────────────────────────────────────────────────

describe('userService › criarUtilizador', () => {

    beforeEach(() => {
        jest.clearAllMocks();
        setupTransaction();
    });

    // ── Happy-path: Aluno ────────────────────────────────────────────────────

    describe('quando id_tipo = 3 (Aluno)', () => {
        it('deve fazer hash da password e criar o utilizador + registo aluno', async () => {
            const utilizadorCriado = {
                id_utilizador: 10,
                codigo_username: 'aluno001',
                id_tipo: 3,
            };
            mockTx.utilizador.create.mockResolvedValue(utilizadorCriado);
            mockTx.aluno.create.mockResolvedValue({});

            const resultado = await criarUtilizador(dadosAluno());

            // bcrypt deve ter sido invocado
            expect(bcrypt.genSalt).toHaveBeenCalledWith(10);
            expect(bcrypt.hash).toHaveBeenCalledWith('senha123', 'mock_salt');

            // utilizador criado com password hasheada
            expect(mockTx.utilizador.create).toHaveBeenCalledWith(
                expect.objectContaining({
                    data: expect.objectContaining({
                        codigo_username: 'aluno001',
                        password: 'hashed_password',
                        id_tipo: 3,
                        estado: 'ATIVO',
                        tentativas_login: 0,
                    }),
                })
            );

            // sub-registo aluno criado com coaching=true
            expect(mockTx.aluno.create).toHaveBeenCalledWith({
                data: {
                    id_utilizador: 10,
                    coaching: true,
                },
            });

            // docente e coordenadora NÃO devem ser criados
            expect(mockTx.docente.create).not.toHaveBeenCalled();
            expect(mockTx.coordenadora.create).not.toHaveBeenCalled();

            expect(resultado).toEqual(utilizadorCriado);
        });

        it('deve usar coaching=false por defeito quando não fornecido', async () => {
            const dados = { ...dadosAluno(), coaching: undefined };
            mockTx.utilizador.create.mockResolvedValue({ id_utilizador: 11, id_tipo: 3 });
            mockTx.aluno.create.mockResolvedValue({});

            await criarUtilizador(dados);

            expect(mockTx.aluno.create).toHaveBeenCalledWith({
                data: { id_utilizador: 11, coaching: false },
            });
        });

        it('deve aceitar data_nascimento como string e convertê-la para Date', async () => {
            mockTx.utilizador.create.mockResolvedValue({ id_utilizador: 12, id_tipo: 3 });
            mockTx.aluno.create.mockResolvedValue({});

            await criarUtilizador(dadosAluno());

            const callArgs = mockTx.utilizador.create.mock.calls[0][0];
            expect(callArgs.data.data_nascimento).toBeInstanceOf(Date);
        });
    });

    // ── Happy-path: Docente ──────────────────────────────────────────────────

    describe('quando id_tipo = 2 (Docente)', () => {
        it('deve criar o utilizador + registo docente com estado_atividade=true', async () => {
            const dadosDocente = { ...dadosAluno(), id_tipo: 2 };
            mockTx.utilizador.create.mockResolvedValue({ id_utilizador: 20, id_tipo: 2 });
            mockTx.docente.create.mockResolvedValue({});

            await criarUtilizador(dadosDocente);

            expect(mockTx.docente.create).toHaveBeenCalledWith({
                data: {
                    id_utilizador: 20,
                    estado_atividade: true,
                },
            });

            expect(mockTx.aluno.create).not.toHaveBeenCalled();
            expect(mockTx.coordenadora.create).not.toHaveBeenCalled();
        });
    });

    // ── Happy-path: Coordenadora ─────────────────────────────────────────────

    describe('quando id_tipo = 1 (Coordenadora)', () => {
        it('deve criar o utilizador + registo coordenadora', async () => {
            const dadosCoordenadora = { ...dadosAluno(), id_tipo: 1 };
            mockTx.utilizador.create.mockResolvedValue({ id_utilizador: 30, id_tipo: 1 });
            mockTx.coordenadora.create.mockResolvedValue({});

            await criarUtilizador(dadosCoordenadora);

            expect(mockTx.coordenadora.create).toHaveBeenCalledWith({
                data: { id_utilizador: 30 },
            });

            expect(mockTx.aluno.create).not.toHaveBeenCalled();
            expect(mockTx.docente.create).not.toHaveBeenCalled();
        });
    });

    // ── Tipo desconhecido ────────────────────────────────────────────────────

    describe('quando id_tipo é desconhecido', () => {
        it('deve criar apenas o utilizador principal sem registo em sub-tabela', async () => {
            const dadosSemTipo = { ...dadosAluno(), id_tipo: 99 };
            mockTx.utilizador.create.mockResolvedValue({ id_utilizador: 99, id_tipo: 99 });

            await criarUtilizador(dadosSemTipo);

            expect(mockTx.aluno.create).not.toHaveBeenCalled();
            expect(mockTx.docente.create).not.toHaveBeenCalled();
            expect(mockTx.coordenadora.create).not.toHaveBeenCalled();
        });
    });

    // ── id_tipo nulo ─────────────────────────────────────────────────────────

    describe('quando id_tipo é nulo/undefined', () => {
        it('deve criar o utilizador com id_tipo=null e sem sub-tabela', async () => {
            const dadosSemTipo = { ...dadosAluno(), id_tipo: undefined };
            mockTx.utilizador.create.mockResolvedValue({ id_utilizador: 40, id_tipo: null });

            await criarUtilizador(dadosSemTipo);

            const createCall = mockTx.utilizador.create.mock.calls[0][0];
            expect(createCall.data.id_tipo).toBeNull();
        });
    });

    // ── Campos opcionais nulos ───────────────────────────────────────────────

    describe('campos opcionais', () => {
        it('deve guardar null nos campos opcionais quando ausentes', async () => {
            const dadosMinimos = {
                codigo_username: 'min001',
                password: 'abc123',
                id_tipo: 3,
            };
            mockTx.utilizador.create.mockResolvedValue({ id_utilizador: 50 });
            mockTx.aluno.create.mockResolvedValue({});

            await criarUtilizador(dadosMinimos);

            const createCall = mockTx.utilizador.create.mock.calls[0][0];
            expect(createCall.data.nome).toBeNull();
            expect(createCall.data.apelido).toBeNull();
            expect(createCall.data.email).toBeNull();
            expect(createCall.data.telemovel).toBeNull();
            expect(createCall.data.nif).toBeNull();
            expect(createCall.data.data_nascimento).toBeNull();
        });
    });

    // ── Propagação de erros da transação ────────────────────────────────────

    describe('gestão de erros', () => {
        it('deve propagar erros lançados pela transação Prisma', async () => {
            mockPrisma.$transaction.mockRejectedValue(new Error('DB connection failed'));

            await expect(criarUtilizador(dadosAluno())).rejects.toThrow('DB connection failed');
        });

        it('deve propagar erro de constraint único (P2002)', async () => {
            const prismaError = Object.assign(new Error('Unique constraint violation'), { code: 'P2002' });
            mockPrisma.$transaction.mockRejectedValue(prismaError);

            await expect(criarUtilizador(dadosAluno())).rejects.toMatchObject({ code: 'P2002' });
        });
    });
});

// ─────────────────────────────────────────────────────────────────────────────
// SUITE: atualizarUtilizador
// ─────────────────────────────────────────────────────────────────────────────

describe('userService › atualizarUtilizador', () => {

    beforeEach(() => {
        jest.clearAllMocks();
        setupTransaction();
    });

    // Utilizador existente (aluno)
    const utilizadorExistenteAluno = {
        id_utilizador: 1,
        id_tipo: 3,
        aluno: { id_utilizador: 1, coaching: false },
        docente: null,
        coordenadora: null,
    };

    // ── Actualização simples de campos ───────────────────────────────────────

    describe('actualização de campos básicos', () => {
        it('deve actualizar nome e apelido sem mudar o tipo', async () => {
            mockPrisma.utilizador.findUnique.mockResolvedValue(utilizadorExistenteAluno);
            const updatedUser = { ...utilizadorExistenteAluno, nome: 'Maria', apelido: 'Costa' };
            mockTx.utilizador.update.mockResolvedValue(updatedUser);

            const resultado = await atualizarUtilizador(1, { nome: 'Maria', apelido: 'Costa' });

            expect(mockTx.utilizador.update).toHaveBeenCalledWith(
                expect.objectContaining({
                    where: { id_utilizador: 1 },
                    data: expect.objectContaining({ nome: 'Maria', apelido: 'Costa' }),
                })
            );
            expect(resultado).toMatchObject({ nome: 'Maria', apelido: 'Costa' });
        });

        it('deve actualizar o email', async () => {
            mockPrisma.utilizador.findUnique.mockResolvedValue(utilizadorExistenteAluno);
            mockTx.utilizador.update.mockResolvedValue({ ...utilizadorExistenteAluno, email: 'novo@email.pt' });

            await atualizarUtilizador(1, { email: 'novo@email.pt' });

            const updateCall = mockTx.utilizador.update.mock.calls[0][0];
            expect(updateCall.data.email).toBe('novo@email.pt');
        });

        it('deve actualizar o estado', async () => {
            mockPrisma.utilizador.findUnique.mockResolvedValue(utilizadorExistenteAluno);
            mockTx.utilizador.update.mockResolvedValue({ ...utilizadorExistenteAluno, estado: 'INATIVO' });

            await atualizarUtilizador(1, { estado: 'INATIVO' });

            const updateCall = mockTx.utilizador.update.mock.calls[0][0];
            expect(updateCall.data.estado).toBe('INATIVO');
        });

        it('deve actualizar o codigo_username', async () => {
            mockPrisma.utilizador.findUnique.mockResolvedValue(utilizadorExistenteAluno);
            mockTx.utilizador.update.mockResolvedValue({ ...utilizadorExistenteAluno, codigo_username: 'novo_username' });

            await atualizarUtilizador(1, { codigo_username: 'novo_username' });

            const updateCall = mockTx.utilizador.update.mock.calls[0][0];
            expect(updateCall.data.codigo_username).toBe('novo_username');
        });

        it('deve converter data_nascimento de string para Date', async () => {
            mockPrisma.utilizador.findUnique.mockResolvedValue(utilizadorExistenteAluno);
            mockTx.utilizador.update.mockResolvedValue(utilizadorExistenteAluno);

            await atualizarUtilizador(1, { data_nascimento: '1995-06-15' });

            const updateCall = mockTx.utilizador.update.mock.calls[0][0];
            expect(updateCall.data.data_nascimento).toBeInstanceOf(Date);
        });

        it('deve actualizar o telemovel', async () => {
            mockPrisma.utilizador.findUnique.mockResolvedValue(utilizadorExistenteAluno);
            mockTx.utilizador.update.mockResolvedValue({ ...utilizadorExistenteAluno, telemovel: '912000000' });

            await atualizarUtilizador(1, { telemovel: '912000000' });

            const updateCall = mockTx.utilizador.update.mock.calls[0][0];
            expect(updateCall.data.telemovel).toBe('912000000');
        });

        it('deve actualizar o nif', async () => {
            mockPrisma.utilizador.findUnique.mockResolvedValue(utilizadorExistenteAluno);
            mockTx.utilizador.update.mockResolvedValue({ ...utilizadorExistenteAluno, nif: '999888777' });

            await atualizarUtilizador(1, { nif: '999888777' });

            const updateCall = mockTx.utilizador.update.mock.calls[0][0];
            expect(updateCall.data.nif).toBe('999888777');
        });
    });

    // ── Actualização de password ─────────────────────────────────────────────

    describe('actualização de password', () => {
        it('deve fazer hash da nova password antes de guardar', async () => {
            mockPrisma.utilizador.findUnique.mockResolvedValue(utilizadorExistenteAluno);
            mockTx.utilizador.update.mockResolvedValue(utilizadorExistenteAluno);

            await atualizarUtilizador(1, { password: 'novasenha456' });

            expect(bcrypt.genSalt).toHaveBeenCalledWith(10);
            expect(bcrypt.hash).toHaveBeenCalledWith('novasenha456', 'mock_salt');

            const updateCall = mockTx.utilizador.update.mock.calls[0][0];
            expect(updateCall.data.password).toBe('hashed_password');
        });

        it('não deve invocar bcrypt quando password não está nos dados', async () => {
            mockPrisma.utilizador.findUnique.mockResolvedValue(utilizadorExistenteAluno);
            mockTx.utilizador.update.mockResolvedValue(utilizadorExistenteAluno);

            await atualizarUtilizador(1, { nome: 'Novo Nome' });

            expect(bcrypt.genSalt).not.toHaveBeenCalled();
            expect(bcrypt.hash).not.toHaveBeenCalled();
        });
    });

    // ── Actualização de coaching (aluno → aluno) ─────────────────────────────

    describe('actualização de coaching', () => {
        it('deve actualizar coaching quando o utilizador continua aluno', async () => {
            mockPrisma.utilizador.findUnique.mockResolvedValue(utilizadorExistenteAluno);
            mockTx.utilizador.update.mockResolvedValue(utilizadorExistenteAluno);
            mockTx.aluno.update.mockResolvedValue({});

            await atualizarUtilizador(1, { id_tipo: 3, coaching: true });

            expect(mockTx.aluno.update).toHaveBeenCalledWith({
                where: { id_utilizador: 1 },
                data: { coaching: true },
            });
        });

        it('não deve actualizar coaching quando o tipo muda (deixa de ser aluno)', async () => {
            mockPrisma.utilizador.findUnique.mockResolvedValue(utilizadorExistenteAluno);
            mockTx.utilizador.update.mockResolvedValue({ ...utilizadorExistenteAluno, id_tipo: 2 });
            mockTx.aluno.delete.mockResolvedValue({});
            mockTx.docente.create.mockResolvedValue({});

            await atualizarUtilizador(1, { id_tipo: 2, coaching: true });

            // aluno.update NÃO deve ser chamado porque o tipo está a mudar
            expect(mockTx.aluno.update).not.toHaveBeenCalled();
        });
    });

    // ── Mudança de tipo (promoção/mudança de papel) ──────────────────────────

    describe('mudança de tipo de utilizador', () => {
        it('deve remover registo aluno e criar registo docente quando aluno → docente', async () => {
            mockPrisma.utilizador.findUnique.mockResolvedValue(utilizadorExistenteAluno);
            mockTx.utilizador.update.mockResolvedValue({ ...utilizadorExistenteAluno, id_tipo: 2 });
            mockTx.aluno.delete.mockResolvedValue({});
            mockTx.docente.create.mockResolvedValue({});

            await atualizarUtilizador(1, { id_tipo: 2 });

            expect(mockTx.aluno.delete).toHaveBeenCalledWith({ where: { id_utilizador: 1 } });
            expect(mockTx.docente.create).toHaveBeenCalledWith({
                data: { id_utilizador: 1, estado_atividade: true },
            });
            expect(mockTx.coordenadora.create).not.toHaveBeenCalled();
        });

        it('deve remover registo aluno e criar coordenadora quando aluno → coordenadora', async () => {
            mockPrisma.utilizador.findUnique.mockResolvedValue(utilizadorExistenteAluno);
            mockTx.utilizador.update.mockResolvedValue({ ...utilizadorExistenteAluno, id_tipo: 1 });
            mockTx.aluno.delete.mockResolvedValue({});
            mockTx.coordenadora.create.mockResolvedValue({});

            await atualizarUtilizador(1, { id_tipo: 1 });

            expect(mockTx.aluno.delete).toHaveBeenCalledWith({ where: { id_utilizador: 1 } });
            expect(mockTx.coordenadora.create).toHaveBeenCalledWith({
                data: { id_utilizador: 1 },
            });
            expect(mockTx.docente.create).not.toHaveBeenCalled();
        });

        it('deve remover docente e criar aluno quando docente → aluno', async () => {
            const utilizadorDocente = {
                id_utilizador: 2,
                id_tipo: 2,
                aluno: null,
                docente: { id_utilizador: 2, estado_atividade: true },
                coordenadora: null,
            };
            mockPrisma.utilizador.findUnique.mockResolvedValue(utilizadorDocente);
            mockTx.utilizador.update.mockResolvedValue({ ...utilizadorDocente, id_tipo: 3 });
            mockTx.docente.delete.mockResolvedValue({});
            mockTx.aluno.create.mockResolvedValue({});

            await atualizarUtilizador(2, { id_tipo: 3 });

            expect(mockTx.docente.delete).toHaveBeenCalledWith({ where: { id_utilizador: 2 } });
            expect(mockTx.aluno.create).toHaveBeenCalledWith({
                data: { id_utilizador: 2 },
            });
        });

        it('deve remover coordenadora e criar docente quando coordenadora → docente', async () => {
            const utilizadorCoord = {
                id_utilizador: 3,
                id_tipo: 1,
                aluno: null,
                docente: null,
                coordenadora: { id_utilizador: 3 },
            };
            mockPrisma.utilizador.findUnique.mockResolvedValue(utilizadorCoord);
            mockTx.utilizador.update.mockResolvedValue({ ...utilizadorCoord, id_tipo: 2 });
            mockTx.coordenadora.delete.mockResolvedValue({});
            mockTx.docente.create.mockResolvedValue({});

            await atualizarUtilizador(3, { id_tipo: 2 });

            expect(mockTx.coordenadora.delete).toHaveBeenCalledWith({ where: { id_utilizador: 3 } });
            expect(mockTx.docente.create).toHaveBeenCalledWith({
                data: { id_utilizador: 3, estado_atividade: true },
            });
        });

        it('não deve eliminar registo de sub-tabela se esta não existir (aluno null)', async () => {
            const utilizadorDocente = {
                id_utilizador: 4,
                id_tipo: 2,
                aluno: null,
                docente: null, // registo docente ausente
                coordenadora: null,
            };
            mockPrisma.utilizador.findUnique.mockResolvedValue(utilizadorDocente);
            mockTx.utilizador.update.mockResolvedValue({ ...utilizadorDocente, id_tipo: 3 });
            mockTx.aluno.create.mockResolvedValue({});

            await atualizarUtilizador(4, { id_tipo: 3 });

            // docente.delete não deve ser chamado porque docente é null
            expect(mockTx.docente.delete).not.toHaveBeenCalled();
        });

        it('deve remover docente e criar coordenadora quando docente → coordenadora', async () => {
            const utilizadorDocente = {
                id_utilizador: 5,
                id_tipo: 2,
                aluno: null,
                docente: { id_utilizador: 5, estado_atividade: true },
                coordenadora: null,
            };
            mockPrisma.utilizador.findUnique.mockResolvedValue(utilizadorDocente);
            mockTx.utilizador.update.mockResolvedValue({ ...utilizadorDocente, id_tipo: 1 });
            mockTx.docente.delete.mockResolvedValue({});
            mockTx.coordenadora.create.mockResolvedValue({});

            await atualizarUtilizador(5, { id_tipo: 1 });

            expect(mockTx.docente.delete).toHaveBeenCalledWith({ where: { id_utilizador: 5 } });
            expect(mockTx.coordenadora.create).toHaveBeenCalledWith({
                data: { id_utilizador: 5 },
            });
            expect(mockTx.aluno.create).not.toHaveBeenCalled();
        });

        it('deve remover coordenadora e criar aluno quando coordenadora → aluno', async () => {
            const utilizadorCoord = {
                id_utilizador: 6,
                id_tipo: 1,
                aluno: null,
                docente: null,
                coordenadora: { id_utilizador: 6 },
            };
            mockPrisma.utilizador.findUnique.mockResolvedValue(utilizadorCoord);
            mockTx.utilizador.update.mockResolvedValue({ ...utilizadorCoord, id_tipo: 3 });
            mockTx.coordenadora.delete.mockResolvedValue({});
            mockTx.aluno.create.mockResolvedValue({});

            await atualizarUtilizador(6, { id_tipo: 3 });

            expect(mockTx.coordenadora.delete).toHaveBeenCalledWith({ where: { id_utilizador: 6 } });
            expect(mockTx.aluno.create).toHaveBeenCalledWith({
                data: { id_utilizador: 6 },
            });
            expect(mockTx.docente.create).not.toHaveBeenCalled();
        });

        it('deve lidar com mudança para tipo desconhecido (não cria registo em sub-tabelas)', async () => {
            const utilizadorDocente = {
                id_utilizador: 7,
                id_tipo: 2,
                aluno: null,
                docente: { id_utilizador: 7 },
                coordenadora: null,
            };
            mockPrisma.utilizador.findUnique.mockResolvedValue(utilizadorDocente);
            mockTx.utilizador.update.mockResolvedValue({ ...utilizadorDocente, id_tipo: 99 });
            mockTx.docente.delete.mockResolvedValue({});

            await atualizarUtilizador(7, { id_tipo: 99 });

            expect(mockTx.docente.delete).toHaveBeenCalled();
            expect(mockTx.aluno.create).not.toHaveBeenCalled();
            expect(mockTx.docente.create).not.toHaveBeenCalled();
            expect(mockTx.coordenadora.create).not.toHaveBeenCalled();
        });
    });

    // ── Utilizador inexistente ───────────────────────────────────────────────

    describe('quando o utilizador não existe', () => {
        it('deve lançar erro "Utilizador não encontrado."', async () => {
            mockPrisma.utilizador.findUnique.mockResolvedValue(null);

            await expect(atualizarUtilizador(999, { nome: 'X' })).rejects.toThrow(
                'Utilizador não encontrado.'
            );

            // A transação nunca deve ser iniciada
            expect(mockPrisma.$transaction).not.toHaveBeenCalled();
        });
    });

    // ── Conversão de ID ──────────────────────────────────────────────────────

    describe('conversão de identificadores', () => {
        it('deve converter id_utilizador string para inteiro antes da consulta', async () => {
            mockPrisma.utilizador.findUnique.mockResolvedValue(utilizadorExistenteAluno);
            mockTx.utilizador.update.mockResolvedValue(utilizadorExistenteAluno);

            await atualizarUtilizador('1', { nome: 'Teste' });

            expect(mockPrisma.utilizador.findUnique).toHaveBeenCalledWith(
                expect.objectContaining({ where: { id_utilizador: 1 } })
            );
        });

        it('deve converter id_tipo string para inteiro nos dados de actualização', async () => {
            mockPrisma.utilizador.findUnique.mockResolvedValue(utilizadorExistenteAluno);
            mockTx.utilizador.update.mockResolvedValue(utilizadorExistenteAluno);

            await atualizarUtilizador(1, { id_tipo: '3' });

            const updateCall = mockTx.utilizador.update.mock.calls[0][0];
            expect(updateCall.data.id_tipo).toBe(3);
        });
    });

    // ── Propagação de erros ──────────────────────────────────────────────────

    describe('gestão de erros', () => {
        it('deve propagar erros da transação Prisma', async () => {
            mockPrisma.utilizador.findUnique.mockResolvedValue(utilizadorExistenteAluno);
            mockPrisma.$transaction.mockRejectedValue(new Error('Transaction failed'));

            await expect(atualizarUtilizador(1, { nome: 'X' })).rejects.toThrow('Transaction failed');
        });
    });
});

// ─────────────────────────────────────────────────────────────────────────────
// SUITE ISOLADA: branch linha 170 — else if (novoTipo === 1) no bloco criação
// Mocks locais frescos garantem que o branch é executado sem interferência
// ─────────────────────────────────────────────────────────────────────────────

describe('userService › atualizarUtilizador [cobertura branch linha 170]', () => {

    it('deve criar coordenadora como novo tipo quando novoTipo=1 (branch else-if criação)', async () => {
        // Arrange: utilizador que era Aluno passa a ser Coordenadora
        const txLocal = {
            utilizador: { update: jest.fn().mockResolvedValue({ id_utilizador: 99, id_tipo: 1 }) },
            aluno:       { delete: jest.fn().mockResolvedValue({}) },
            docente:     { create: jest.fn(), delete: jest.fn() },
            coordenadora:{ create: jest.fn().mockResolvedValue({}) },
        };

        const utilizadorOriginal = {
            id_utilizador: 99,
            id_tipo: 3,
            aluno: { id_utilizador: 99 },
            docente: null,
            coordenadora: null,
        };

        // Mocks frescos com mockResolvedValueOnce/mockImplementationOnce
        mockPrisma.utilizador.findUnique.mockResolvedValueOnce(utilizadorOriginal);
        mockPrisma.$transaction.mockImplementationOnce(async (cb) => cb(txLocal));

        await atualizarUtilizador(99, { id_tipo: 1 });

        // Verifica que o bloco else if (novoTipo === 1) da criação foi executado
        expect(txLocal.coordenadora.create).toHaveBeenCalledWith({
            data: { id_utilizador: 99 },
        });
        expect(txLocal.aluno.delete).toHaveBeenCalledWith({ where: { id_utilizador: 99 } });
        expect(txLocal.docente.create).not.toHaveBeenCalled();
    });
});

// ─────────────────────────────────────────────────────────────────────────────
// SUITE: getUsers
// ─────────────────────────────────────────────────────────────────────────────
describe('userService › getUsers', () => {
    it('deve chamar prisma.utilizador.findMany com opções', async () => {
        const options = { where: { id_tipo: 3 } };
        mockPrisma.utilizador.findMany.mockResolvedValue([{ id: 1 }]);
        const result = await getUsers(options);
        expect(mockPrisma.utilizador.findMany).toHaveBeenCalledWith(options);
        expect(result).toEqual([{ id: 1 }]);
    });
});

// ─────────────────────────────────────────────────────────────────────────────
// SUITE: getUser
// ─────────────────────────────────────────────────────────────────────────────
describe('userService › getUser', () => {
    it('deve chamar prisma.utilizador.findUnique com opções', async () => {
        const options = { where: { id_utilizador: 1 } };
        mockPrisma.utilizador.findUnique.mockResolvedValue({ id: 1 });
        const result = await getUser(options);
        expect(mockPrisma.utilizador.findUnique).toHaveBeenCalledWith(options);
        expect(result).toEqual({ id: 1 });
    });
});

// ─────────────────────────────────────────────────────────────────────────────
// SUITE: deleteUser
// ─────────────────────────────────────────────────────────────────────────────
describe('userService › deleteUser', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        setupTransaction();
    });

    it('deve lançar erro se utilizador não for encontrado', async () => {
        mockPrisma.utilizador.findUnique.mockResolvedValue(null);
        await expect(deleteUser('1')).rejects.toThrow('Utilizador não encontrado');
    });

    it('deve eliminar utilizador e as respetivas sub-tabelas (aluno, docente, coordenadora)', async () => {
        mockPrisma.utilizador.findUnique.mockResolvedValue({
            id_utilizador: 1,
            aluno: true,
            docente: true,
            coordenadora: true,
        });
        await deleteUser('1');
        
        expect(mockPrisma.utilizador.findUnique).toHaveBeenCalledWith(
            expect.objectContaining({ where: { id_utilizador: 1 } })
        );
        expect(mockTx.aluno.delete).toHaveBeenCalledWith({ where: { id_utilizador: 1 } });
        expect(mockTx.docente.delete).toHaveBeenCalledWith({ where: { id_utilizador: 1 } });
        expect(mockTx.coordenadora.delete).toHaveBeenCalledWith({ where: { id_utilizador: 1 } });
        expect(mockTx.utilizador.delete).toHaveBeenCalledWith({ where: { id_utilizador: 1 } });
    });

    it('não deve tentar eliminar sub-tabelas se não existirem no utilizador', async () => {
        mockPrisma.utilizador.findUnique.mockResolvedValue({
            id_utilizador: 2,
            aluno: null,
            docente: null,
            coordenadora: null,
        });
        await deleteUser('2');
        
        expect(mockTx.aluno.delete).not.toHaveBeenCalled();
        expect(mockTx.docente.delete).not.toHaveBeenCalled();
        expect(mockTx.coordenadora.delete).not.toHaveBeenCalled();
        expect(mockTx.utilizador.delete).toHaveBeenCalledWith({ where: { id_utilizador: 2 } });
    });
});
