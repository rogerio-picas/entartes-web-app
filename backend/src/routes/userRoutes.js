const express = require('express');
const router = express.Router();

const userController = require('../controllers/userController');
const authorize = require('../middlewares/roleCheckMiddleware');
const tokenValidation = require('../middlewares/authMiddleware');

/**
 * @swagger
 * tags:
 *   name: Users
 *   description: Gestão de utilizadores e perfis
 */

// --- 1. ROTAS ADMINISTRATIVAS (Acesso: Apenas Coordenador - Role 1) ---

/**
 * @swagger
 * /api/users:
 *   get:
 *     summary: Lista todos os utilizadores
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: id_tipo
 *         schema:
 *           type: integer
 *           enum: [1, 2, 3]
 *         description: "Filtra por tipo: 1 = Coordenador, 2 = Docente, 3 = Aluno"
 *     responses:
 *       200:
 *         description: Sucesso
 *   post:
 *     summary: Cria um novo utilizador
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               nome:
 *                 type: string
 *               apelido:
 *                 type: string
 *               email:
 *                 type: string
 *               codigo_username:
 *                 type: string
 *               password:
 *                 type: string
 *               id_tipo:
 *                 type: integer
 *                 description: "1-Coordenador, 2-Docente, 3-Aluno"
 *     responses:
 *       201:
 *         description: Criado com sucesso
 */
router.get('/', tokenValidation, authorize([1]), userController.getUsers);
router.post('/', tokenValidation, authorize([1]), userController.createUser);

/**
 * @swagger
 * /api/users/{id_utilizador}:
 *   put:
 *     summary: Atualização administrativa de um utilizador
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id_utilizador
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Utilizador atualizado
 *   delete:
 *     summary: Apaga um utilizador
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id_utilizador
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Utilizador apagado
 */
router.put('/:id_utilizador', tokenValidation, authorize([1]), userController.updateUser);
router.delete('/:id_utilizador', tokenValidation, authorize([1]), userController.deleteUser);

// --- 2. ROTAS DE PERFIL (Acesso: Todos os níveis - Role 1, 2, 3) ---

/**
 * @swagger
 * /api/users/{id_utilizador}:
 *   get:
 *     summary: Retorna detalhes de um utilizador específico
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id_utilizador
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Sucesso
 */
router.get('/:id_utilizador', tokenValidation, authorize([1, 2, 3]), userController.getUser);

/**
 * @swagger
 * /api/users/perfil/password/{id_utilizador}:
 *   put:
 *     summary: Atualiza a password do utilizador autenticado
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id_utilizador
 *         required: true
 *         schema:
 *           type: integer
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               oldPassword:
 *                 type: string
 *                 description: "Password atual"
 *               newPassword:
 *                 type: string
 *                 description: "Nova password (min 6 chars)"
 *     responses:
 *       200:
 *         description: Password atualizada com sucesso
 *       400:
 *         description: Erro na validação ou password incorreta
 */
router.put(
  '/perfil/password/:id_utilizador',
  tokenValidation,
  authorize([1, 2, 3]),
  userController.atualizarPassword
);

/**
 * @swagger
 * /api/users/perfil/dados-pessoais/{id_utilizador}:
 *   put:
 *     summary: Atualiza dados pessoais (email/telemóvel)
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id_utilizador
 *         required: true
 *         schema:
 *           type: integer
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               email:
 *                 type: string
 *               telemovel:
 *                 type: string
 *                 description: "Formato PT: 9xxxxxxxx"
 *     responses:
 *       200:
 *         description: Dados atualizados com sucesso
 *       400:
 *         description: Email ou telemóvel inválido
 */
router.put(
  '/perfil/dados-pessoais/:id_utilizador',
  tokenValidation,
  authorize([1, 2, 3]),
  userController.atualizarDadosPessoais
);

module.exports = router;