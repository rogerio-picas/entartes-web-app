'use strict';

/**
 * @file userProfileService.test.js
 * @description Testes Unitários — userProfileService
 *
 * Cobre as funções:
 *   - atualizarPassword  (validação de comprimento, utilizador inexistente, password errada, sucesso)
 *   - atualizarDadosPessoais (email inválido, email duplicado, telemóvel inválido, campos em falta, sucesso)
 */

// ─── Mocks globais ───────────────────────────────────────────────────────────

jest.mock('bcrypt', () => ({
    genSalt: jest.fn().mockResolvedValue('mock_salt'),
    hash: jest.fn().mockResolvedValue('hashed_new_password'),
    compare: jest.fn(),
}));

const mockPrisma = {
    utilizador: {
        findUnique: jest.fn(),
        findFirst: jest.fn(),
        update: jest.fn(),
    },
};

jest.mock('@prisma/client', () => ({
    PrismaClient: jest.fn(() => mockPrisma),
}));

// ─── Importações ─────────────────────────────────────────────────────────────

const bcrypt = require('bcrypt');
const { atualizarPassword, atualizarDadosPessoais } = require('../../services/userProfileService');

// ─────────────────────────────────────────────────────────────────────────────
// SUITE: atualizarPassword
// ─────────────────────────────────────────────────────────────────────────────

describe('userProfileService › atualizarPassword', () => {

    beforeEach(() => {
        jest.clearAllMocks();
    });

    // ── Regras de validação da nova password ─────────────────────────────────

    describe('validação da nova password', () => {
        it('deve lançar erro quando newPassword tem menos de 6 caracteres', async () => {
            await expect(
                atualizarPassword(1, 'oldPass', 'abc')
            ).rejects.toThrow('A nova password deve ter pelo menos 6 caracteres.');
        });

        it('deve lançar erro quando newPassword é string vazia', async () => {
            await expect(
                atualizarPassword(1, 'oldPass', '')
            ).rejects.toThrow('A nova password deve ter pelo menos 6 caracteres.');
        });

        it('deve lançar erro quando newPassword é null/undefined', async () => {
            await expect(
                atualizarPassword(1, 'oldPass', null)
            ).rejects.toThrow('A nova password deve ter pelo menos 6 caracteres.');
        });
    });

    // ── Utilizador não encontrado ─────────────────────────────────────────────

    describe('quando o utilizador não existe', () => {
        it('deve lançar erro "Utilizador não encontrado."', async () => {
            mockPrisma.utilizador.findUnique.mockResolvedValue(null);

            await expect(
                atualizarPassword(999, 'oldPass', 'novapassword')
            ).rejects.toThrow('Utilizador não encontrado.');

            expect(mockPrisma.utilizador.update).not.toHaveBeenCalled();
        });
    });

    // ── Password atual incorreta ──────────────────────────────────────────────

    describe('quando a password atual está incorreta', () => {
        it('deve lançar erro "A password atual está incorreta."', async () => {
            mockPrisma.utilizador.findUnique.mockResolvedValue({ password: 'hashed_old_pass' });
            bcrypt.compare.mockResolvedValue(false);

            await expect(
                atualizarPassword(1, 'passwordErrada', 'novapassword')
            ).rejects.toThrow('A password atual está incorreta.');

            expect(mockPrisma.utilizador.update).not.toHaveBeenCalled();
        });
    });

    // ── Sucesso ──────────────────────────────────────────────────────────────

    describe('quando todos os dados são válidos', () => {
        it('deve actualizar a password e retornar sucesso', async () => {
            mockPrisma.utilizador.findUnique.mockResolvedValue({ password: 'hashed_old_pass' });
            bcrypt.compare.mockResolvedValue(true);
            mockPrisma.utilizador.update.mockResolvedValue({});

            const resultado = await atualizarPassword(1, 'oldPass', 'novapassword');

            // Deve consultar apenas o campo password
            expect(mockPrisma.utilizador.findUnique).toHaveBeenCalledWith({
                where: { id_utilizador: 1 },
                select: { password: true },
            });

            // Deve fazer hash da nova password
            expect(bcrypt.hash).toHaveBeenCalledWith('novapassword', 'mock_salt');

            // Deve actualizar o utilizador com a nova password hasheada
            expect(mockPrisma.utilizador.update).toHaveBeenCalledWith({
                where: { id_utilizador: 1 },
                data: { password: 'hashed_new_password' },
            });

            expect(resultado).toEqual({
                success: true,
                message: 'Password atualizada com sucesso.',
            });
        });

        it('deve aceitar password exactamente com 6 caracteres', async () => {
            mockPrisma.utilizador.findUnique.mockResolvedValue({ password: 'h' });
            bcrypt.compare.mockResolvedValue(true);
            mockPrisma.utilizador.update.mockResolvedValue({});

            const resultado = await atualizarPassword(1, 'old', '123456');

            expect(resultado.success).toBe(true);
        });
    });

    // ── Propagação de erros ──────────────────────────────────────────────────

    describe('propagação de erros', () => {
        it('deve propagar erros do Prisma como Error com a mesma mensagem', async () => {
            mockPrisma.utilizador.findUnique.mockRejectedValue(new Error('DB offline'));

            await expect(
                atualizarPassword(1, 'old', 'novapassword')
            ).rejects.toThrow('DB offline');
        });
    });
});

// ─────────────────────────────────────────────────────────────────────────────
// SUITE: atualizarDadosPessoais
// ─────────────────────────────────────────────────────────────────────────────

describe('userProfileService › atualizarDadosPessoais', () => {

    beforeEach(() => {
        jest.clearAllMocks();
    });

    // ── Validação de Email ────────────────────────────────────────────────────

    describe('validação de email', () => {
        it('deve lançar erro quando o email é inválido (sem @)', async () => {
            await expect(
                atualizarDadosPessoais(1, { email: 'emailsemarroba.pt' })
            ).rejects.toThrow('Email inválido.');
        });

        it('deve lançar erro quando o email é inválido (sem domínio)', async () => {
            await expect(
                atualizarDadosPessoais(1, { email: 'utilizador@' })
            ).rejects.toThrow('Email inválido.');
        });

        it('deve lançar erro quando o email já está em uso por outro utilizador', async () => {
            mockPrisma.utilizador.findFirst.mockResolvedValue({ id_utilizador: 99, email: 'ocupado@email.pt' });

            await expect(
                atualizarDadosPessoais(1, { email: 'ocupado@email.pt' })
            ).rejects.toThrow('Este email já está em uso.');

            expect(mockPrisma.utilizador.update).not.toHaveBeenCalled();
        });

        it('deve aceitar um email válido e único', async () => {
            mockPrisma.utilizador.findFirst.mockResolvedValue(null); // email não existe
            mockPrisma.utilizador.update.mockResolvedValue({
                id_utilizador: 1,
                nome: 'Ana',
                apelido: 'Silva',
                email: 'novo@email.pt',
                telemovel: null,
            });

            const resultado = await atualizarDadosPessoais(1, { email: 'novo@email.pt' });

            expect(resultado.success).toBe(true);
            expect(mockPrisma.utilizador.update).toHaveBeenCalledWith(
                expect.objectContaining({
                    data: expect.objectContaining({ email: 'novo@email.pt' }),
                })
            );
        });

        it('deve verificar unicidade excluindo o próprio utilizador', async () => {
            mockPrisma.utilizador.findFirst.mockResolvedValue(null);
            mockPrisma.utilizador.update.mockResolvedValue({ id_utilizador: 1, email: 'self@email.pt' });

            await atualizarDadosPessoais(1, { email: 'self@email.pt' });

            expect(mockPrisma.utilizador.findFirst).toHaveBeenCalledWith({
                where: { email: 'self@email.pt', id_utilizador: { not: 1 } },
            });
        });
    });

    // ── Validação de Telemóvel ────────────────────────────────────────────────

    describe('validação de telemóvel', () => {
        const invalidosPortugal = [
            ['apenas 8 dígitos', '91234567'],
            ['começa por 0', '012345678'],
            ['começa por 1', '112345678'],
            ['letras no meio', '9abc45678'],
            ['demasiados dígitos', '9123456789'],
        ];

        test.each(invalidosPortugal)(
            'deve lançar erro para telemóvel inválido: %s',
            async (_, telemovel) => {
                await expect(
                    atualizarDadosPessoais(1, { telemovel })
                ).rejects.toThrow(/Telemóvel inválido/);
            }
        );

        const validosPortugal = [
            ['começa por 9', '912345678'],
            ['começa por 2', '212345678'],
            ['começa por 3', '312345678'],
            ['com espaços (serão removidos)', '912 345 678'],
        ];

        test.each(validosPortugal)(
            'deve aceitar telemóvel válido: %s',
            async (_, telemovel) => {
                mockPrisma.utilizador.update.mockResolvedValue({
                    id_utilizador: 1,
                    telemovel: telemovel.replace(/\s/g, ''),
                });

                const resultado = await atualizarDadosPessoais(1, { telemovel });

                expect(resultado.success).toBe(true);
                // O telemóvel deve ser limpo de espaços
                const updateCall = mockPrisma.utilizador.update.mock.calls[0][0];
                expect(updateCall.data.telemovel).toBe(telemovel.replace(/\s/g, ''));
            }
        );
    });

    // ── Outros campos ─────────────────────────────────────────────────────────

    describe('actualização de nome e apelido', () => {
        it('deve actualizar nome e apelido sem validações extra', async () => {
            mockPrisma.utilizador.update.mockResolvedValue({
                id_utilizador: 1,
                nome: 'Carlos',
                apelido: 'Pereira',
            });

            const resultado = await atualizarDadosPessoais(1, { nome: 'Carlos', apelido: 'Pereira' });

            expect(resultado.success).toBe(true);
            const updateCall = mockPrisma.utilizador.update.mock.calls[0][0];
            expect(updateCall.data.nome).toBe('Carlos');
            expect(updateCall.data.apelido).toBe('Pereira');
        });
    });

    // ── Nenhum dado para actualizar ───────────────────────────────────────────

    describe('quando não há dados para actualizar', () => {
        it('deve lançar erro "Nenhum dado válido para atualizar."', async () => {
            await expect(
                atualizarDadosPessoais(1, {})
            ).rejects.toThrow('Nenhum dado válido para atualizar.');
        });

        it('deve lançar erro quando só são enviados campos desconhecidos', async () => {
            await expect(
                atualizarDadosPessoais(1, { campoDesconhecido: 'valor' })
            ).rejects.toThrow('Nenhum dado válido para atualizar.');
        });
    });

    // ── Resposta de sucesso ───────────────────────────────────────────────────

    describe('estrutura da resposta de sucesso', () => {
        it('deve retornar { success: true, message, user } com os campos seleccionados', async () => {
            mockPrisma.utilizador.findFirst.mockResolvedValue(null);
            const updatedUser = {
                id_utilizador: 1,
                nome: 'Ana',
                apelido: 'Silva',
                email: 'ana@entartes.pt',
                telemovel: '912345678',
            };
            mockPrisma.utilizador.update.mockResolvedValue(updatedUser);

            const resultado = await atualizarDadosPessoais(1, {
                email: 'ana@entartes.pt',
                nome: 'Ana',
            });

            expect(resultado).toMatchObject({
                success: true,
                message: 'Dados atualizados.',
                user: updatedUser,
            });
        });

        it('deve seleccionar apenas os campos esperados na query de update', async () => {
            mockPrisma.utilizador.findFirst.mockResolvedValue(null);
            mockPrisma.utilizador.update.mockResolvedValue({ id_utilizador: 1 });

            await atualizarDadosPessoais(1, { email: 'a@b.pt' });

            const updateCall = mockPrisma.utilizador.update.mock.calls[0][0];
            expect(updateCall.select).toMatchObject({
                id_utilizador: true,
                nome: true,
                apelido: true,
                email: true,
                telemovel: true,
            });
        });
    });

    // ── Propagação de erros ───────────────────────────────────────────────────

    describe('propagação de erros', () => {
        it('deve propagar erros do Prisma update como Error', async () => {
            mockPrisma.utilizador.findFirst.mockResolvedValue(null);
            mockPrisma.utilizador.update.mockRejectedValue(new Error('DB timeout'));

            await expect(
                atualizarDadosPessoais(1, { email: 'valido@email.pt' })
            ).rejects.toThrow('DB timeout');
        });
    });
});
