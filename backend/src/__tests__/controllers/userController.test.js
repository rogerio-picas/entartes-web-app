'use strict';

/**
 * @file userController.test.js
 * @description Testes de Integração — userController
 *
 * Cada handler do controller é testado com mock dos services.
 * Valida: status HTTP, corpo da resposta e delegação correcta para services.
 */

// ─── Mocks globais ───────────────────────────────────────────────────────────

// Mock dos services antes do require do controller
jest.mock('../../services/userService');
jest.mock('../../services/userProfileService');
jest.mock('bcryptjs', () => ({}));

// ─── Importações ─────────────────────────────────────────────────────────────

const userController = require('../../controllers/userController');
const userService = require('../../services/userService');
const userProfileService = require('../../services/userProfileService');

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** Cria um par (req, res) mock simples */
const mockReqRes = (overrides = {}) => {
    const req = {
        query: {},
        params: {},
        body: {},
        user: { id: 1, role: 1 },
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
        userService.getUsers.mockResolvedValue(utilizadores);

        const { req, res } = mockReqRes({ query: {} });
        await userController.getUsers(req, res);

        expect(userService.getUsers).toHaveBeenCalledWith(
            expect.objectContaining({ where: {}, orderBy: { nome: 'asc' } })
        );
        expect(res.status).toHaveBeenCalledWith(200);
        expect(res.json).toHaveBeenCalledWith(utilizadores);
    });

    it('deve filtrar por id_tipo quando fornecido na query', async () => {
        userService.getUsers.mockResolvedValue([]);

        const { req, res } = mockReqRes({ query: { id_tipo: '3' } });
        await userController.getUsers(req, res);

        expect(userService.getUsers).toHaveBeenCalledWith(
            expect.objectContaining({ where: { id_tipo: 3 } })
        );
        expect(res.status).toHaveBeenCalledWith(200);
    });

    it('deve retornar 500 quando o service lança erro', async () => {
        userService.getUsers.mockRejectedValue(new Error('Service error'));

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
        userService.getUser.mockResolvedValue(user);

        const { req, res } = mockReqRes({ params: { id_utilizador: '1' } });
        await userController.getUser(req, res);

        expect(userService.getUser).toHaveBeenCalledWith(
            expect.objectContaining({ where: { id_utilizador: 1 } })
        );
        expect(res.status).toHaveBeenCalledWith(200);
        expect(res.json).toHaveBeenCalledWith(user);
    });

    it('deve retornar 404 quando o utilizador não existe', async () => {
        userService.getUser.mockResolvedValue(null);

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
            expect.objectContaining({ message: expect.stringContaining('inválido') })
        );
        expect(userService.getUser).not.toHaveBeenCalled();
    });

    it('deve retornar 500 quando o service lança erro', async () => {
        userService.getUser.mockRejectedValue(new Error('Service error'));

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
        password: '123',
        id_tipo: 3,
        email: 'aluno@escola.pt',
    };

    it('deve retornar 201 e criar utilizador com dados válidos (bugfix)', async () => {
        const novoUser = { ...corpoValido, id_utilizador: 10 };
        userService.criarUtilizador.mockResolvedValue(novoUser);

        const { req, res } = mockReqRes({ body: corpoValido });
        await userController.createUser(req, res);

        expect(userService.criarUtilizador).toHaveBeenCalledWith(corpoValido);
        expect(res.status).toHaveBeenCalledWith(201);
        expect(res.json).toHaveBeenCalledWith(
            expect.objectContaining({
                message: 'Utilizador criado com sucesso.',
                data: expect.objectContaining({ id_utilizador: 10 }),
            })
        );
    });

    it('deve retornar 400 quando faltam campos obrigatórios (bugfix)', async () => {
        const { req, res } = mockReqRes({ body: { email: 'falta_resto@escola.pt' } });
        await userController.createUser(req, res);

        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.json).toHaveBeenCalledWith(
            expect.objectContaining({ error: expect.stringContaining('Dados insuficientes') })
        );
        expect(userService.criarUtilizador).not.toHaveBeenCalled();
    });

    it('deve retornar 409 em caso de erro DUPLICATE (pré-check do service) (bugfix)', async () => {
        const erroDuplicate = new Error('Já existe um utilizador registado com este(s) campo(s): e-mail.');
        erroDuplicate.code = 'DUPLICATE';
        userService.criarUtilizador.mockRejectedValue(erroDuplicate);

        const { req, res } = mockReqRes({ body: corpoValido });
        await userController.createUser(req, res);

        expect(res.status).toHaveBeenCalledWith(409);
        expect(res.json).toHaveBeenCalledWith({
            error: 'Já existe um utilizador registado com este(s) campo(s): e-mail.',
        });
    });

    it('deve retornar 409 em caso de erro P2002 sem meta.target (fallback genérico) (bugfix)', async () => {
        const erroP2002 = new Error('Unique constraint');
        erroP2002.code = 'P2002';
        userService.criarUtilizador.mockRejectedValue(erroP2002);

        const { req, res } = mockReqRes({ body: corpoValido });
        await userController.createUser(req, res);

        expect(res.status).toHaveBeenCalledWith(409);
        expect(res.json).toHaveBeenCalledWith({
            error: 'Erro de duplicação: o nome de utilizador, e-mail ou NIF já existe.',
        });
    });

    it('deve retornar 409 com label específica quando P2002 identifica o campo (nif) (bugfix)', async () => {
        const erroP2002 = new Error('Unique constraint');
        erroP2002.code = 'P2002';
        erroP2002.meta = { target: ['nif'] };
        userService.criarUtilizador.mockRejectedValue(erroP2002);

        const { req, res } = mockReqRes({ body: corpoValido });
        await userController.createUser(req, res);

        expect(res.status).toHaveBeenCalledWith(409);
        expect(res.json).toHaveBeenCalledWith({
            error: 'Já existe um utilizador registado com este NIF.',
        });
    });

    it('deve retornar 409 com mensagem genérica quando P2002 tem campo desconhecido (bugfix)', async () => {
        const erroP2002 = new Error('Unique constraint');
        erroP2002.code = 'P2002';
        erroP2002.meta = { target: ['campo_desconhecido'] };
        userService.criarUtilizador.mockRejectedValue(erroP2002);

        const { req, res } = mockReqRes({ body: corpoValido });
        await userController.createUser(req, res);

        expect(res.status).toHaveBeenCalledWith(409);
        expect(res.json).toHaveBeenCalledWith({
            error: 'Erro de duplicação: o nome de utilizador, e-mail ou NIF já existe.',
        });
    });

    it('deve retornar 400 (Erro genérico) para outros erros do Service (bugfix)', async () => {
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

    it('deve retornar 200 e atualizar o utilizador (bugfix)', async () => {
        const updatedUser = { id_utilizador: 1, nome: 'Nome Atualizado' };
        userService.atualizarUtilizador.mockResolvedValue(updatedUser);

        const { req, res } = mockReqRes({
            params: { id_utilizador: '1' },
            body: { nome: 'Nome Atualizado' },
        });
        await userController.updateUser(req, res);

        expect(userService.atualizarUtilizador).toHaveBeenCalledWith(1, { nome: 'Nome Atualizado' });
        expect(res.status).toHaveBeenCalledWith(200);
        expect(res.json).toHaveBeenCalledWith(
            expect.objectContaining({ message: 'Utilizador atualizado com sucesso' })
        );
    });

    it('deve retornar 500 quando o service lança erro (bugfix)', async () => {
        userService.atualizarUtilizador.mockRejectedValue(new Error('Service error'));

        const { req, res } = mockReqRes({ params: { id_utilizador: '1' } });
        await userController.updateUser(req, res);

        expect(res.status).toHaveBeenCalledWith(500);
        expect(res.json).toHaveBeenCalledWith(
            expect.objectContaining({ message: 'Erro ao atualizar' })
        );
    });

    it('deve retornar 409 quando o service detecta duplicação (mensagem "Já existe") (bugfix)', async () => {
        const erroDuplicacao = new Error('Já existe um utilizador registado com este NIF.');
        userService.atualizarUtilizador.mockRejectedValue(erroDuplicacao);

        const { req, res } = mockReqRes({
            params: { id_utilizador: '1' },
            body: { nif: '123456789' },
        });
        await userController.updateUser(req, res);

        expect(res.status).toHaveBeenCalledWith(409);
        expect(res.json).toHaveBeenCalledWith({
            message: 'Já existe um utilizador registado com este NIF.',
        });
    });

    it('deve retornar 400 quando o id não é um número válido (bugfix)', async () => {
        const { req, res } = mockReqRes({ params: { id_utilizador: 'abc' } });
        await userController.updateUser(req, res);

        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.json).toHaveBeenCalledWith(
            expect.objectContaining({ message: expect.stringContaining('inválido') })
        );
        expect(userService.atualizarUtilizador).not.toHaveBeenCalled();
    });
});

// ─────────────────────────────────────────────────────────────────────────────
// SUITE: deleteUser
// ─────────────────────────────────────────────────────────────────────────────

describe('userController › deleteUser', () => {
    beforeEach(() => jest.clearAllMocks());

    it('deve retornar 200 e eliminar utilizador com sucesso (bugfix)', async () => {
        userService.deleteUser.mockResolvedValue({});

        const { req, res } = mockReqRes({ params: { id_utilizador: '1' } });
        await userController.deleteUser(req, res);

        expect(userService.deleteUser).toHaveBeenCalledWith(1);
        expect(res.status).toHaveBeenCalledWith(200);
        expect(res.json).toHaveBeenCalledWith({ message: 'Utilizador removido com sucesso' });
    });

    it('deve retornar 404 quando o utilizador não existe (erro custom) (bugfix)', async () => {
        userService.deleteUser.mockRejectedValue(new Error('Utilizador não encontrado'));

        const { req, res } = mockReqRes({ params: { id_utilizador: '999' } });
        await userController.deleteUser(req, res);

        expect(res.status).toHaveBeenCalledWith(404);
        expect(res.json).toHaveBeenCalledWith({ message: 'Utilizador não encontrado' });
    });

    it('deve retornar 500 quando o service lança um erro genérico (bugfix)', async () => {
        userService.deleteUser.mockRejectedValue(new Error('Service error'));

        const { req, res } = mockReqRes({ params: { id_utilizador: '1' } });
        await userController.deleteUser(req, res);

        expect(res.status).toHaveBeenCalledWith(500);
        expect(res.json).toHaveBeenCalledWith(
             expect.objectContaining({ message: 'Erro ao eliminar utilizador' })
        );
    });

    it('deve retornar 400 quando o id não é um número válido (bugfix)', async () => {
        const { req, res } = mockReqRes({ params: { id_utilizador: 'abc' } });
        await userController.deleteUser(req, res);

        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.json).toHaveBeenCalledWith(
            expect.objectContaining({ message: expect.stringContaining('inválido') })
        );
        expect(userService.deleteUser).not.toHaveBeenCalled();
    });
});

// ─────────────────────────────────────────────────────────────────────────────
// SUITE: atualizarPassword (controller)
// ─────────────────────────────────────────────────────────────────────────────

describe('userController › atualizarPassword', () => {
    beforeEach(() => jest.clearAllMocks());

    it('deve retornar 200 quando a password é actualizada com sucesso (bugfix)', async () => {
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

    it('deve retornar 400 quando oldPassword está ausente (bugfix)', async () => {
        const { req, res } = mockReqRes({
            params: { id_utilizador: '1' },
            body: { newPassword: 'nova123' },
        });
        await userController.atualizarPassword(req, res);

        expect(res.status).toHaveBeenCalledWith(400);
        expect(userProfileService.atualizarPassword).not.toHaveBeenCalled();
    });

    it('deve retornar 400 quando newPassword está ausente (bugfix)', async () => {
        const { req, res } = mockReqRes({
            params: { id_utilizador: '1' },
            body: { oldPassword: 'antiga' },
        });
        await userController.atualizarPassword(req, res);

        expect(res.status).toHaveBeenCalledWith(400);
        expect(userProfileService.atualizarPassword).not.toHaveBeenCalled();
    });

    it('deve retornar 400 quando o service lança erro (bugfix)', async () => {
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

    it('deve retornar 403 quando um não-coordenador tenta alterar a password de outro utilizador (bugfix)', async () => {
        const { req, res } = mockReqRes({
            params: { id_utilizador: '5' },
            body: { oldPassword: 'antiga', newPassword: 'nova123' },
            user: { id: 2, role: 3 },
        });
        await userController.atualizarPassword(req, res);

        expect(res.status).toHaveBeenCalledWith(403);
        expect(res.json).toHaveBeenCalledWith(
            expect.objectContaining({ error: expect.stringContaining('Sem permissão') })
        );
        expect(userProfileService.atualizarPassword).not.toHaveBeenCalled();
    });

    it('deve retornar 400 quando o id não é um número válido (bugfix)', async () => {
        const { req, res } = mockReqRes({
            params: { id_utilizador: 'abc' },
            body: { oldPassword: 'antiga', newPassword: 'nova123' },
        });
        await userController.atualizarPassword(req, res);

        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.json).toHaveBeenCalledWith(
            expect.objectContaining({ error: expect.stringContaining('inválido') })
        );
        expect(userProfileService.atualizarPassword).not.toHaveBeenCalled();
    });
});

// ─────────────────────────────────────────────────────────────────────────────
// SUITE: atualizarDadosPessoais (controller)
// ─────────────────────────────────────────────────────────────────────────────

describe('userController › atualizarDadosPessoais', () => {
    beforeEach(() => jest.clearAllMocks());

    it('deve retornar 200 quando os dados são actualizados com sucesso (bugfix)', async () => {
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

    it('deve retornar 400 quando não é fornecido email nem telemóvel (bugfix)', async () => {
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

    it('deve retornar 400 quando o service lança erro de validação (bugfix)', async () => {
        userProfileService.atualizarDadosPessoais.mockRejectedValue(new Error('Email inválido.'));

        const { req, res } = mockReqRes({
            params: { id_utilizador: '1' },
            body: { email: 'emailinvalido' },
        });
        await userController.atualizarDadosPessoais(req, res);

        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.json).toHaveBeenCalledWith({ error: 'Email inválido.' });
    });

    it('deve aceitar actualização apenas com telemóvel (bugfix)', async () => {
        userProfileService.atualizarDadosPessoais.mockResolvedValue({ success: true });

        const { req, res } = mockReqRes({
            params: { id_utilizador: '1' },
            body: { telemovel: '912345678' },
        });
        await userController.atualizarDadosPessoais(req, res);

        expect(userProfileService.atualizarDadosPessoais).toHaveBeenCalled();
        expect(res.status).toHaveBeenCalledWith(200);
    });

    it('deve retornar 403 quando um não-coordenador tenta alterar dados de outro utilizador (bugfix)', async () => {
        const { req, res } = mockReqRes({
            params: { id_utilizador: '5' },
            body: { email: 'novo@email.pt' },
            user: { id: 2, role: 2 },
        });
        await userController.atualizarDadosPessoais(req, res);

        expect(res.status).toHaveBeenCalledWith(403);
        expect(res.json).toHaveBeenCalledWith(
            expect.objectContaining({ error: expect.stringContaining('Sem permissão') })
        );
        expect(userProfileService.atualizarDadosPessoais).not.toHaveBeenCalled();
    });

    it('deve retornar 400 quando o id não é um número válido (bugfix)', async () => {
        const { req, res } = mockReqRes({
            params: { id_utilizador: 'abc' },
            body: { email: 'novo@email.pt' },
        });
        await userController.atualizarDadosPessoais(req, res);

        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.json).toHaveBeenCalledWith(
            expect.objectContaining({ error: expect.stringContaining('inválido') })
        );
        expect(userProfileService.atualizarDadosPessoais).not.toHaveBeenCalled();
    });
});
