'use strict';

/**
 * @file userRoutes.test.js
 * @description Testes de Integração de Rotas HTTP — /api/users
 *
 * Utiliza supertest para fazer pedidos HTTP reais contra a instância Express.
 * Todos os middlewares de autenticação/autorização são mockados para isolar
 * os testes das rotas.
 *
 * Rotas testadas:
 *   GET    /api/users                            → getUsers (role: 1)
 *   POST   /api/users                            → createUser (role: 1)
 *   GET    /api/users/:id_utilizador             → getUser (roles: 1,2,3)
 *   PUT    /api/users/:id_utilizador             → updateUser (role: 1)
 *   DELETE /api/users/:id_utilizador             → deleteUser (role: 1)
 *   PUT    /api/users/perfil/password/:id        → atualizarPassword (roles: 1,2,3)
 *   PUT    /api/users/perfil/dados-pessoais/:id  → atualizarDadosPessoais (roles: 1,2,3)
 */

// ─── Mocks: autenticação e autorização ───────────────────────────────────────
// Estes mocks devem ser definidos ANTES de qualquer require que os carregue

jest.mock('../../middlewares/authMiddleware', () =>
    jest.fn((req, _res, next) => {
        // Injeta um user coordenador (role 1) por omissão
        req.user = { id: 1, role: 1 };
        next();
    })
);

jest.mock('../../middlewares/roleCheckMiddleware', () =>
    jest.fn((_allowedRoles) => (_req, _res, next) => next())
);

// Mock dos controllers — isola completamente a camada de rotas
jest.mock('../../controllers/userController', () => ({
    getUsers:             jest.fn(),
    getUser:              jest.fn(),
    createUser:           jest.fn(),
    updateUser:           jest.fn(),
    deleteUser:           jest.fn(),
    atualizarPassword:    jest.fn(),
    atualizarDadosPessoais: jest.fn(),
}));

// Mock do PrismaClient (necessário para módulos que instanciam prisma ao ser importados)
jest.mock('@prisma/client', () => ({
    PrismaClient: jest.fn(() => ({
        utilizador: { findMany: jest.fn(), findUnique: jest.fn() },
        $transaction: jest.fn(),
    })),
}));

// ─── Importações ─────────────────────────────────────────────────────────────

const request    = require('supertest');
const express    = require('express');
const userRoutes = require('../../routes/userRoutes');
const userController = require('../../controllers/userController');

// Cria uma mini-app exclusiva para estes testes (não usa o app.js completo
// para evitar carregar módulos desnecessários e manter os testes focados)
const app = express();
app.use(express.json());
app.use('/api/users', userRoutes);

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** Resposta standard de sucesso de um utilizador */
const utilizadorMock = {
    id_utilizador: 1,
    codigo_username: 'aluno001',
    nome: 'Ana',
    apelido: 'Silva',
    email: 'ana@entartes.pt',
    id_tipo: 3,
    estado: 'ATIVO',
};

/** Configura o controller mock para responder com 200 + body */
const setupControllerSuccess = (method, body = {}) => {
    userController[method].mockImplementation((_req, res) => res.status(200).json(body));
};

// ─────────────────────────────────────────────────────────────────────────────
// SUITE: GET /api/users
// ─────────────────────────────────────────────────────────────────────────────

describe('Routes › GET /api/users', () => {

    beforeEach(() => jest.clearAllMocks());

    it('deve retornar 200 com lista de utilizadores', async () => {
        userController.getUsers.mockImplementation((_req, res) =>
            res.status(200).json([utilizadorMock])
        );

        const response = await request(app).get('/api/users');

        expect(response.status).toBe(200);
        expect(response.body).toBeInstanceOf(Array);
        expect(response.body[0]).toMatchObject({ id_utilizador: 1 });
        expect(userController.getUsers).toHaveBeenCalledTimes(1);
    });

    it('deve passar id_tipo como query string para o controller', async () => {
        userController.getUsers.mockImplementation((req, res) => {
            expect(req.query.id_tipo).toBe('3');
            res.status(200).json([]);
        });

        const response = await request(app).get('/api/users?id_tipo=3');
        expect(response.status).toBe(200);
    });

    it('deve retornar 500 quando o controller falha', async () => {
        userController.getUsers.mockImplementation((_req, res) =>
            res.status(500).json({ message: 'Erro interno' })
        );

        const response = await request(app).get('/api/users');
        expect(response.status).toBe(500);
    });
});

// ─────────────────────────────────────────────────────────────────────────────
// SUITE: POST /api/users
// ─────────────────────────────────────────────────────────────────────────────

describe('Routes › POST /api/users', () => {

    beforeEach(() => jest.clearAllMocks());

    const bodyValido = {
        codigo_username: 'aluno001',
        password: 'senha123',
        id_tipo: 3,
        email: 'aluno@entartes.pt',
    };

    it('deve retornar 201 quando o utilizador é criado', async () => {
        userController.createUser.mockImplementation((_req, res) =>
            res.status(201).json({ status: 'Success', data: utilizadorMock })
        );

        const response = await request(app)
            .post('/api/users')
            .send(bodyValido)
            .set('Content-Type', 'application/json');

        expect(response.status).toBe(201);
        expect(response.body.status).toBe('Success');
        expect(userController.createUser).toHaveBeenCalledTimes(1);
    });

    it('deve enviar o body JSON correctamente ao controller', async () => {
        userController.createUser.mockImplementation((req, res) => {
            expect(req.body).toMatchObject(bodyValido);
            res.status(201).json({ status: 'Success' });
        });

        await request(app)
            .post('/api/users')
            .send(bodyValido)
            .set('Content-Type', 'application/json');
    });

    it('deve retornar 400 quando o controller rejeita por dados insuficientes', async () => {
        userController.createUser.mockImplementation((_req, res) =>
            res.status(400).json({ error: 'Dados insuficientes.' })
        );

        const response = await request(app).post('/api/users').send({});
        expect(response.status).toBe(400);
    });
});

// ─────────────────────────────────────────────────────────────────────────────
// SUITE: GET /api/users/:id_utilizador
// ─────────────────────────────────────────────────────────────────────────────

describe('Routes › GET /api/users/:id_utilizador', () => {

    beforeEach(() => jest.clearAllMocks());

    it('deve retornar 200 com o utilizador correcto', async () => {
        userController.getUser.mockImplementation((_req, res) =>
            res.status(200).json(utilizadorMock)
        );

        const response = await request(app).get('/api/users/1');

        expect(response.status).toBe(200);
        expect(response.body).toMatchObject({ id_utilizador: 1 });
        expect(userController.getUser).toHaveBeenCalledTimes(1);
    });

    it('deve passar o id como parâmetro de rota ao controller', async () => {
        userController.getUser.mockImplementation((req, res) => {
            expect(req.params.id_utilizador).toBe('42');
            res.status(200).json({});
        });

        await request(app).get('/api/users/42');
    });

    it('deve retornar 404 quando o utilizador não existe', async () => {
        userController.getUser.mockImplementation((_req, res) =>
            res.status(404).json({ message: 'Utilizador não encontrado' })
        );

        const response = await request(app).get('/api/users/9999');
        expect(response.status).toBe(404);
    });
});

// ─────────────────────────────────────────────────────────────────────────────
// SUITE: PUT /api/users/:id_utilizador
// ─────────────────────────────────────────────────────────────────────────────

describe('Routes › PUT /api/users/:id_utilizador', () => {

    beforeEach(() => jest.clearAllMocks());

    it('deve retornar 200 quando o utilizador é actualizado', async () => {
        userController.updateUser.mockImplementation((_req, res) =>
            res.status(200).json({ message: 'Utilizador atualizado com sucesso', user: utilizadorMock })
        );

        const response = await request(app)
            .put('/api/users/1')
            .send({ nome: 'Novo Nome' });

        expect(response.status).toBe(200);
        expect(response.body.message).toContain('atualizado');
    });

    it('deve enviar o body ao controller', async () => {
        userController.updateUser.mockImplementation((req, res) => {
            expect(req.body.nome).toBe('Teste');
            res.status(200).json({});
        });

        await request(app).put('/api/users/1').send({ nome: 'Teste' });
    });

    it('deve retornar 500 quando o controller falha', async () => {
        userController.updateUser.mockImplementation((_req, res) =>
            res.status(500).json({ message: 'Erro ao atualizar' })
        );

        const response = await request(app).put('/api/users/1').send({ nome: 'X' });
        expect(response.status).toBe(500);
    });
});

// ─────────────────────────────────────────────────────────────────────────────
// SUITE: DELETE /api/users/:id_utilizador
// ─────────────────────────────────────────────────────────────────────────────

describe('Routes › DELETE /api/users/:id_utilizador', () => {

    beforeEach(() => jest.clearAllMocks());

    it('deve retornar 200 quando o utilizador é eliminado', async () => {
        userController.deleteUser.mockImplementation((_req, res) =>
            res.status(200).json({ message: 'Utilizador removido com sucesso' })
        );

        const response = await request(app).delete('/api/users/1');

        expect(response.status).toBe(200);
        expect(response.body.message).toContain('removido');
    });

    it('deve retornar 404 quando o utilizador não existe', async () => {
        userController.deleteUser.mockImplementation((_req, res) =>
            res.status(404).json({ message: 'Utilizador não encontrado' })
        );

        const response = await request(app).delete('/api/users/9999');
        expect(response.status).toBe(404);
    });
});

// ─────────────────────────────────────────────────────────────────────────────
// SUITE: PUT /api/users/perfil/password/:id_utilizador
// ─────────────────────────────────────────────────────────────────────────────

describe('Routes › PUT /api/users/perfil/password/:id_utilizador', () => {

    beforeEach(() => jest.clearAllMocks());

    it('deve retornar 200 quando a password é actualizada', async () => {
        userController.atualizarPassword.mockImplementation((_req, res) =>
            res.status(200).json({ success: true, message: 'Password atualizada com sucesso.' })
        );

        const response = await request(app)
            .put('/api/users/perfil/password/1')
            .send({ oldPassword: 'antiga', newPassword: 'nova123' });

        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
        expect(userController.atualizarPassword).toHaveBeenCalledTimes(1);
    });

    it('deve retornar 400 quando a validação falha', async () => {
        userController.atualizarPassword.mockImplementation((_req, res) =>
            res.status(400).json({ error: 'Password antiga e nova password são obrigatórias.' })
        );

        const response = await request(app)
            .put('/api/users/perfil/password/1')
            .send({ oldPassword: 'apenas_uma' });

        expect(response.status).toBe(400);
    });

    it('deve passar o id como parâmetro ao controller', async () => {
        userController.atualizarPassword.mockImplementation((req, res) => {
            expect(req.params.id_utilizador).toBe('5');
            res.status(200).json({ success: true });
        });

        await request(app)
            .put('/api/users/perfil/password/5')
            .send({ oldPassword: 'x', newPassword: 'y123456' });
    });
});

// ─────────────────────────────────────────────────────────────────────────────
// SUITE: PUT /api/users/perfil/dados-pessoais/:id_utilizador
// ─────────────────────────────────────────────────────────────────────────────

describe('Routes › PUT /api/users/perfil/dados-pessoais/:id_utilizador', () => {

    beforeEach(() => jest.clearAllMocks());

    it('deve retornar 200 quando os dados são actualizados', async () => {
        userController.atualizarDadosPessoais.mockImplementation((_req, res) =>
            res.status(200).json({ success: true, message: 'Dados atualizados.', user: utilizadorMock })
        );

        const response = await request(app)
            .put('/api/users/perfil/dados-pessoais/1')
            .send({ email: 'novo@email.pt' });

        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
        expect(userController.atualizarDadosPessoais).toHaveBeenCalledTimes(1);
    });

    it('deve retornar 400 quando email e telemóvel estão ausentes', async () => {
        userController.atualizarDadosPessoais.mockImplementation((_req, res) =>
            res.status(400).json({ error: 'Forneça pelo menos o email ou telemóvel.' })
        );

        const response = await request(app)
            .put('/api/users/perfil/dados-pessoais/1')
            .send({ nome: 'Apenas Nome' });

        expect(response.status).toBe(400);
    });

    it('deve retornar 400 quando o email é inválido', async () => {
        userController.atualizarDadosPessoais.mockImplementation((_req, res) =>
            res.status(400).json({ error: 'Email inválido.' })
        );

        const response = await request(app)
            .put('/api/users/perfil/dados-pessoais/1')
            .send({ email: 'emailsemarroba' });

        expect(response.status).toBe(400);
        expect(response.body.error).toContain('Email inválido');
    });

    it('deve passar o id como parâmetro ao controller', async () => {
        userController.atualizarDadosPessoais.mockImplementation((req, res) => {
            expect(req.params.id_utilizador).toBe('7');
            res.status(200).json({ success: true });
        });

        await request(app)
            .put('/api/users/perfil/dados-pessoais/7')
            .send({ email: 'x@y.pt' });
    });
});

// ─────────────────────────────────────────────────────────────────────────────
// SUITE: Segurança — Content-Type e respostas JSON
// ─────────────────────────────────────────────────────────────────────────────

describe('Routes › Segurança e formato de respostas', () => {

    beforeEach(() => jest.clearAllMocks());

    it('deve retornar Content-Type application/json nas respostas', async () => {
        userController.getUsers.mockImplementation((_req, res) =>
            res.status(200).json([])
        );

        const response = await request(app).get('/api/users');
        expect(response.headers['content-type']).toMatch(/application\/json/);
    });

    it('deve retornar 404 para rotas inexistentes (fora do /api/users)', async () => {
        const response = await request(app).get('/api/inexistente');
        expect(response.status).toBe(404);
    });
});
