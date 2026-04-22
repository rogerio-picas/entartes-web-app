const express = require('express');
const router = express.Router();

const authController = require('../controllers/authController');
const tokenValidation = require('../middlewares/authMiddleware');

/**
 * @swagger
 * /api/auth/login:
 *   post:
 *     summary: Iniciar sessão
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               codigo_username:
 *                 type: string
 *               password:
 *                 type: string
 *     responses:
 *       200:
 *         description: Login efetuado com sucesso (Retorna o JWT)
 *       401:
 *         description: Credenciais inválidas
 */
router.post('/login', authController.login);

/**
 * @swagger
 * /api/auth/me:
 *   get:
 *     summary: Retorna os dados completos do utilizador autenticado
 *     tags: [Auth]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Dados do utilizador
 *       401:
 *         description: Token inválido
 */
router.get('/me', tokenValidation, authController.getMe);

module.exports = router;