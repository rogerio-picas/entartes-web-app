const express = require('express');
const router = express.Router();
const tokenValidation = require('../middlewares/authMiddleware');
const userController = require('../controllers/userController');
const authorize = require('../middlewares/roleCheckMiddleware');

/**
 * @swagger
 * /api/users:
 *   get:
 *     summary: Lista todos os utilizadores
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
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
 *               codigo_username:
 *                 type: string
 *               password:
 *                 type: string
 *               id_tipo:
 *                 type: integer
 *                 description: 1=Coordenadora, 2=Docente, 3=Aluno
 *     responses:
 *       201:
 *         description: Criado com sucesso
 *
 * /api/users/{id_utilizador}:
 *   get:
 *     summary: Retorna os detalhes de um utilizador
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
 *   put:
 *     summary: Atualiza dados pessoais e/ou password do utilizador
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
 *               nome:
 *                 type: string
 *               apelido:
 *                 type: string
 *               email:
 *                 type: string
 *               telemovel:
 *                 type: string
 *               data_nascimento:
 *                 type: string
 *                 format: date
 *               nif:
 *                 type: string
 *               password_atual:
 *                 type: string
 *                 description: Obrigatório apenas ao alterar a password
 *               password:
 *                 type: string
 *                 description: Nova password (requer password_atual)
 *     responses:
 *       200:
 *         description: Dados atualizados com sucesso
 *       400:
 *         description: Dados inválidos ou password atual incorreta
 *       403:
 *         description: Sem permissão para editar este perfil
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
 *         description: Sucesso
 */

// Apenas coordenadora
router.get('/', tokenValidation, authorize([1]), userController.getUsers);
router.post('/', tokenValidation, authorize([1]), userController.createUser);
router.delete('/:id_utilizador', tokenValidation, authorize([1]), userController.deleteUser);

// Qualquer utilizador autenticado (controller verifica ownership)
router.get('/:id_utilizador', tokenValidation, authorize([1, 2, 3]), userController.getUser);
router.put('/:id_utilizador', tokenValidation, authorize([1, 2, 3]), userController.updateUser);

module.exports = router;