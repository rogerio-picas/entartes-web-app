'use strict';

/**
 * @file userController.test.js
 * @description Testes de Integração — userController
 *
 * Cada handler do controller é testado com mock dos services e do Prisma.
 * Valida: status HTTP, corpo da resposta e delegação correcta para services.
 *
 * Handlers testados:
 *   - getUsers
 *   - getUser
 *   - createUser
 *   - updateUser
 *   - deleteUser
 *   - atualizarPassword
 *   - atualizarDadosPessoais
 */

// ─── Mocks globais ───────────────────────────────────────────────────────────

// Mock dos services antes do require do controller
jest.mock('../../services/userService');
jest.mock('../../services/userProfileService');

// Mock do PrismaClient usado directamente no controller
const mockPrisma = {
    utilizador: {
        findMany: jest.fn(),
        findUnique: jest.fn(),
        delete: jest.fn(),
    },
    aluno: { delete: jest.fn() },
    docente: { delete: jest.fn() },
    coordenadora: { delete: jest.fn() },
    $transaction: jest.fn(),
};

jest.mock('@prisma/client', () => ({
    PrismaClient: jest.fn(() => mockPrisma),
}));

jest.mock('bcryptjs', () => ({}));

// ─── Importações ─────────────────────────────────────────────────────────────

const userController      = require('../../controllers/userController');
const userService         = require('../../services/userService');
const userProfileService  = require('../../services/userProfileService');

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** Cria um par (req, res) mock simples */
const mockReqRes = (overrides = {}) => {
    const req = {
        query: {},
        params: {},
        body: {},
        ...overrides,
    };
    const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn().mockReturnThis(),
    };
    return { req, res };
};

// ─────────────────────────────────────────────────────────────────────────────
// SUITE: getUsers
// ─────────────────────────────────────────────────────────────────────────────

describe('userController › getUsers', () => {

    beforeEach(() => jest.clearAllMocks());

    it('deve retornar 200 com a lista de utilizadores (sem filtro)', async () => {
        const utilizadores = [
            { id_utilizador: 1, nome: 'Ana', id_tipo: 3 },
            { id_utilizador: 2, nome: 'Rui', id_tipo: 2 },
        ];
        mockPrisma.utilizador.findMany.mockResolvedValue(utilizadores);

        const { req, res } = mockReqRes({ query: {} });
        await userController.getUsers(req, res);

        expect(mockPrisma.utilizador.findMany).toHaveBeenCalledWith(
            expect.objectContaining({ where: {}, orderBy: { nome: 'asc' } })
        );
        expect(res.status).toHaveBeenCalledWith(200);
        expect(res.json).toHaveBeenCalledWith(utilizadores);
    });

    it('deve filtrar por id_tipo quando fornecido na query', async () => {
        mockPrisma.utilizador.findMany.mockResolvedValue([]);

        const { req, res } = mockReqRes({ query: { id_tipo: '3' } });
        await userController.getUsers(req, res);

        expect(mockPrisma.utilizador.findMany).toHaveBeenCalledWith(
            expect.objectContaining({ where: { id_tipo: 3 } })
        );
        expect(res.status).toHaveBeenCalledWith(200);
    });

    it('deve retornar 500 quando o Prisma lança erro', async () => {
        mockPrisma.utilizador.findMany.mockRejectedValue(new Error('DB error'));

        const { req, res } = mockReqRes();
        await userController.getUsers(req, res);

        expect(res.status).toHaveBeenCalledWith(500);
        expect(res.json).toHaveBeenCalledWith(
            expect.objectContaining({ message: 'Erro ao encontrar utilizador.' })
        );
    });
});

// ─────────────────────────────────────────────────────────────────────────────
// SUITE: getUser
// ─────────────────────────────────────────────────────────────────────────────

describe('userController › getUser', () => {

    beforeEach(() => jest.clearAllMocks());

    it('deve retornar 200 com o utilizador quando encontrado', async () => {
        const user = { id_utilizador: 1, nome: 'Ana' };
        mockPrisma.utilizador.findUnique.mockResolvedValue(user);

        const { req, res } = mockReqRes({ params: { id_utilizador: '1' } });
        await userController.getUser(req, res);

        expect(mockPrisma.utilizador.findUnique).toHaveBeenCalledWith(
            expect.objectContaining({ where: { id_utilizador: 1 } })
        );
        expect(res.status).toHaveBeenCalledWith(200);
        expect(res.json).toHaveBeenCalledWith(user);
    });

    it('deve retornar 404 quando o utilizador não existe', async () => {
        mockPrisma.utilizador.findUnique.mockResolvedValue(null);

        const { req, res } = mockReqRes({ params: { id_utilizador: '999' } });
        await userController.getUser(req, res);

        expect(res.status).toHaveBeenCalledWith(404);
        expect(res.json).toHaveBeenCalledWith({ message: 'Utilizador não encontrado' });
    });

    it('deve retornar 400 quando o id não é um número válido', async () => {
        const { req, res } = mockReqRes({ params: { id_utilizador: 'abc' } });
        await userController.getUser(req, res);

        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.json).toHaveBeenCalledWith(
            expect.objectContaining({ message: expect.stringContaining('formato válido') })
        );
        expect(mockPrisma.utilizador.findUnique).not.toHaveBeenCalled();
    });

    it('deve retornar 500 quando o Prisma lança erro', async () => {
        mockPrisma.utilizador.findUnique.mockRejectedValue(new Error('DB error'));

        const { req, res } = mockReqRes({ params: { id_utilizador: '1' } });
        await userController.getUser(req, res);

        expect(res.status).toHaveBeenCalledWith(500);
    });
});

// ─────────────────────────────────────────────────────────────────────────────
// SUITE: createUser
// ─────────────────────────────────────────────────────────────────────────────

describe('userController › createUser', () => {

    beforeEach(() => jest.clearAllMocks());

    const corpoValido = {
        codigo_username: 'aluno001',
        password: 'senha123',
        id_tipo: 3,
        email: 'aluno@entartes.pt',
        nome: 'Ana',
        apelido: 'Silva',
    };

    it('deve retornar 201 quando o utilizador é criado com sucesso', async () => {
        const novoUser = { id_utilizador: 1, codigo_username: 'aluno001', id_tipo: 3, email: 'aluno@entartes.pt' };
        userService.criarUtilizador.mockResolvedValue(novoUser);

        const { req, res } = mockReqRes({ body: corpoValido });
        await userController.createUser(req, res);

        expect(userService.criarUtilizador).toHaveBeenCalledWith(corpoValido);
        expect(res.status).toHaveBeenCalledWith(201);
        expect(res.json).toHaveBeenCalledWith(
            expect.objectContaining({
                status: 'Success',
                data: expect.objectContaining({ id_utilizador: 1 }),
            })
        );
    });

    describe('validação de campos obrigatórios', () => {
        const camposObrigatorios = ['codigo_username', 'password', 'id_tipo', 'email'];

        test.each(camposObrigatorios)(
            'deve retornar 400 quando "%s" está ausente',
            async (campo) => {
                const corpoSemCampo = { ...corpoValido, [campo]: undefined };
                const { req, res } = mockReqRes({ body: corpoSemCampo });
                await userController.createUser(req, res);

                expect(res.status).toHaveBeenCalledWith(400);
                expect(userService.criarUtilizador).not.toHaveBeenCalled();
            }
        );
    });

    it('deve retornar 400 com mensagem de duplicação quando Prisma lança P2002', async () => {
        const prismaError = Object.assign(new Error('Unique constraint'), { code: 'P2002' });
        userService.criarUtilizador.mockRejectedValue(prismaError);

        const { req, res } = mockReqRes({ body: corpoValido });
        await userController.createUser(req, res);

        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.json).toHaveBeenCalledWith(
            expect.objectContaining({ error: expect.stringContaining('duplicação') })
        );
    });

    it('deve retornar 400 para outros erros do service', async () => {
        userService.criarUtilizador.mockRejectedValue(new Error('Erro genérico'));

        const { req, res } = mockReqRes({ body: corpoValido });
        await userController.createUser(req, res);

        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.json).toHaveBeenCalledWith(
            expect.objectContaining({ detalhe: 'Erro genérico' })
        );
    });
});

// ─────────────────────────────────────────────────────────────────────────────
// SUITE: updateUser
// ─────────────────────────────────────────────────────────────────────────────

describe('userController › updateUser', () => {

    beforeEach(() => jest.clearAllMocks());

    it('deve retornar 200 com o utilizador actualizado', async () => {
        const updatedUser = { id_utilizador: 1, nome: 'Novo Nome' };
        userService.atualizarUtilizador.mockResolvedValue(updatedUser);

        const { req, res } = mockReqRes({
            params: { id_utilizador: '1' },
            body: { nome: 'Novo Nome' },
        });
        await userController.updateUser(req, res);

        expect(userService.atualizarUtilizador).toHaveBeenCalledWith(1, { nome: 'Novo Nome' });
        expect(res.status).toHaveBeenCalledWith(200);
        expect(res.json).toHaveBeenCalledWith(
            expect.objectContaining({ user: updatedUser })
        );
    });

    it('deve retornar 500 quando o service lança erro', async () => {
        userService.atualizarUtilizador.mockRejectedValue(new Error('Erro na actualização'));

        const { req, res } = mockReqRes({
            params: { id_utilizador: '1' },
            body: { nome: 'X' },
        });
        await userController.updateUser(req, res);

        expect(res.status).toHaveBeenCalledWith(500);
        expect(res.json).toHaveBeenCalledWith(
            expect.objectContaining({ message: 'Erro ao atualizar' })
        );
    });
});

// ─────────────────────────────────────────────────────────────────────────────
// SUITE: deleteUser
// ─────────────────────────────────────────────────────────────────────────────

describe('userController › deleteUser', () => {

    beforeEach(() => jest.clearAllMocks());

    /** Simula a transação de eliminação */
    const setupDeleteTransaction = () => {
        mockPrisma.$transaction.mockImplementation(async (callback) => {
            await callback({
                aluno: { delete: mockPrisma.aluno.delete },
                docente: { delete: mockPrisma.docente.delete },
                coordenadora: { delete: mockPrisma.coordenadora.delete },
                utilizador: { delete: mockPrisma.utilizador.delete },
            });
        });
    };

    it('deve retornar 200 e eliminar utilizador aluno (com sub-registo)', async () => {
        const utilizadorAluno = {
            id_utilizador: 1,
            aluno: { id_utilizador: 1 },
            docente: null,
            coordenadora: null,
        };
        mockPrisma.utilizador.findUnique.mockResolvedValue(utilizadorAluno);
        setupDeleteTransaction();
        mockPrisma.aluno.delete.mockResolvedValue({});
        mockPrisma.utilizador.delete.mockResolvedValue({});

        const { req, res } = mockReqRes({ params: { id_utilizador: '1' } });
        await userController.deleteUser(req, res);

        expect(mockPrisma.aluno.delete).toHaveBeenCalledWith({ where: { id_utilizador: 1 } });
        expect(mockPrisma.utilizador.delete).toHaveBeenCalledWith({ where: { id_utilizador: 1 } });
        expect(res.status).toHaveBeenCalledWith(200);
        expect(res.json).toHaveBeenCalledWith({ message: 'Utilizador removido com sucesso' });
    });

    it('deve retornar 200 sem tentar apagar sub-registos ausentes', async () => {
        const utilizadorSemSubRegistos = {
            id_utilizador: 2,
            aluno: null,
            docente: null,
            coordenadora: null,
        };
        mockPrisma.utilizador.findUnique.mockResolvedValue(utilizadorSemSubRegistos);
        setupDeleteTransaction();
        mockPrisma.utilizador.delete.mockResolvedValue({});

        const { req, res } = mockReqRes({ params: { id_utilizador: '2' } });
        await userController.deleteUser(req, res);

        expect(mockPrisma.aluno.delete).not.toHaveBeenCalled();
        expect(mockPrisma.docente.delete).not.toHaveBeenCalled();
        expect(mockPrisma.coordenadora.delete).not.toHaveBeenCalled();
        expect(res.status).toHaveBeenCalledWith(200);
    });

    it('deve retornar 404 quando o utilizador não existe', async () => {
        mockPrisma.utilizador.findUnique.mockResolvedValue(null);

        const { req, res } = mockReqRes({ params: { id_utilizador: '999' } });
        await userController.deleteUser(req, res);

        expect(res.status).toHaveBeenCalledWith(404);
        expect(res.json).toHaveBeenCalledWith({ message: 'Utilizador não encontrado' });
    });

    it('deve retornar 500 quando o Prisma lança erro', async () => {
        mockPrisma.utilizador.findUnique.mockRejectedValue(new Error('DB error'));

        const { req, res } = mockReqRes({ params: { id_utilizador: '1' } });
        await userController.deleteUser(req, res);

        expect(res.status).toHaveBeenCalledWith(500);
    });

    it('deve eliminar utilizador docente (com sub-registo docente)', async () => {
        const utilizadorDocente = {
            id_utilizador: 3,
            aluno: null,
            docente: { id_utilizador: 3 },
            coordenadora: null,
        };
        mockPrisma.utilizador.findUnique.mockResolvedValue(utilizadorDocente);
        setupDeleteTransaction();
        mockPrisma.docente.delete.mockResolvedValue({});
        mockPrisma.utilizador.delete.mockResolvedValue({});

        const { req, res } = mockReqRes({ params: { id_utilizador: '3' } });
        await userController.deleteUser(req, res);

        expect(mockPrisma.docente.delete).toHaveBeenCalledWith({ where: { id_utilizador: 3 } });
        expect(mockPrisma.aluno.delete).not.toHaveBeenCalled();
        expect(mockPrisma.coordenadora.delete).not.toHaveBeenCalled();
        expect(res.status).toHaveBeenCalledWith(200);
    });

    it('deve eliminar utilizador coordenadora (com sub-registo coordenadora)', async () => {
        const utilizadorCoordenadora = {
            id_utilizador: 4,
            aluno: null,
            docente: null,
            coordenadora: { id_utilizador: 4 },
        };
        mockPrisma.utilizador.findUnique.mockResolvedValue(utilizadorCoordenadora);
        setupDeleteTransaction();
        mockPrisma.coordenadora.delete.mockResolvedValue({});
        mockPrisma.utilizador.delete.mockResolvedValue({});

        const { req, res } = mockReqRes({ params: { id_utilizador: '4' } });
        await userController.deleteUser(req, res);

        expect(mockPrisma.coordenadora.delete).toHaveBeenCalledWith({ where: { id_utilizador: 4 } });
        expect(mockPrisma.aluno.delete).not.toHaveBeenCalled();
        expect(mockPrisma.docente.delete).not.toHaveBeenCalled();
        expect(res.status).toHaveBeenCalledWith(200);
    });
});

// ─────────────────────────────────────────────────────────────────────────────
// SUITE: atualizarPassword (controller)
// ─────────────────────────────────────────────────────────────────────────────

describe('userController › atualizarPassword', () => {

    beforeEach(() => jest.clearAllMocks());

    it('deve retornar 200 quando a password é actualizada com sucesso', async () => {
        userProfileService.atualizarPassword.mockResolvedValue({
            success: true,
            message: 'Password atualizada com sucesso.',
        });

        const { req, res } = mockReqRes({
            params: { id_utilizador: '1' },
            body: { oldPassword: 'antiga', newPassword: 'nova123' },
        });
        await userController.atualizarPassword(req, res);

        expect(userProfileService.atualizarPassword).toHaveBeenCalledWith(1, 'antiga', 'nova123');
        expect(res.status).toHaveBeenCalledWith(200);
        expect(res.json).toHaveBeenCalledWith(
            expect.objectContaining({ success: true })
        );
    });

    it('deve retornar 400 quando oldPassword está ausente', async () => {
        const { req, res } = mockReqRes({
            params: { id_utilizador: '1' },
            body: { newPassword: 'nova123' },
        });
        await userController.atualizarPassword(req, res);

        expect(res.status).toHaveBeenCalledWith(400);
        expect(userProfileService.atualizarPassword).not.toHaveBeenCalled();
    });

    it('deve retornar 400 quando newPassword está ausente', async () => {
        const { req, res } = mockReqRes({
            params: { id_utilizador: '1' },
            body: { oldPassword: 'antiga' },
        });
        await userController.atualizarPassword(req, res);

        expect(res.status).toHaveBeenCalledWith(400);
        expect(userProfileService.atualizarPassword).not.toHaveBeenCalled();
    });

    it('deve retornar 400 quando o service lança erro (password errada, etc.)', async () => {
        userProfileService.atualizarPassword.mockRejectedValue(
            new Error('A password atual está incorreta.')
        );

        const { req, res } = mockReqRes({
            params: { id_utilizador: '1' },
            body: { oldPassword: 'errada', newPassword: 'nova123' },
        });
        await userController.atualizarPassword(req, res);

        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.json).toHaveBeenCalledWith(
            expect.objectContaining({ error: 'A password atual está incorreta.' })
        );
    });
});

// ─────────────────────────────────────────────────────────────────────────────
// SUITE: atualizarDadosPessoais (controller)
// ─────────────────────────────────────────────────────────────────────────────

describe('userController › atualizarDadosPessoais', () => {

    beforeEach(() => jest.clearAllMocks());

    it('deve retornar 200 quando os dados são actualizados com sucesso', async () => {
        userProfileService.atualizarDadosPessoais.mockResolvedValue({
            success: true,
            message: 'Dados atualizados.',
            user: { id_utilizador: 1, email: 'novo@email.pt' },
        });

        const { req, res } = mockReqRes({
            params: { id_utilizador: '1' },
            body: { email: 'novo@email.pt' },
        });
        await userController.atualizarDadosPessoais(req, res);

        expect(userProfileService.atualizarDadosPessoais).toHaveBeenCalledWith(1, { email: 'novo@email.pt' });
        expect(res.status).toHaveBeenCalledWith(200);
    });

    it('deve retornar 400 quando não é fornecido email nem telemóvel', async () => {
        const { req, res } = mockReqRes({
            params: { id_utilizador: '1' },
            body: { nome: 'Só Nome' },
        });
        await userController.atualizarDadosPessoais(req, res);

        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.json).toHaveBeenCalledWith(
            expect.objectContaining({ error: expect.stringContaining('email ou telemóvel') })
        );
        expect(userProfileService.atualizarDadosPessoais).not.toHaveBeenCalled();
    });

    it('deve retornar 400 quando o service lança erro de validação', async () => {
        userProfileService.atualizarDadosPessoais.mockRejectedValue(new Error('Email inválido.'));

        const { req, res } = mockReqRes({
            params: { id_utilizador: '1' },
            body: { email: 'emailinvalido' },
        });
        await userController.atualizarDadosPessoais(req, res);

        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.json).toHaveBeenCalledWith({ error: 'Email inválido.' });
    });

    it('deve aceitar actualização apenas com telemóvel', async () => {
        userProfileService.atualizarDadosPessoais.mockResolvedValue({ success: true });

        const { req, res } = mockReqRes({
            params: { id_utilizador: '1' },
            body: { telemovel: '912345678' },
        });
        await userController.atualizarDadosPessoais(req, res);

        expect(userProfileService.atualizarDadosPessoais).toHaveBeenCalled();
        expect(res.status).toHaveBeenCalledWith(200);
    });
});
