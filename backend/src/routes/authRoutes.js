const express = require('express');
const router = express.Router();

const authController = require('../controllers/authController');
const tokenValidation = require('../middlewares/authMiddleware');
const { loginLimiter } = require('../middlewares/rateLimitMiddleware');  // ✅ Aqui

/**
 * @swagger
 * /api/auth/login:
 *   post:
 *     summary: Iniciar sessão
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               codigo_username:
 *                 type: string
 *               password:
 *                 type: string
 *     responses:
 *       200:
 *         description: Login efetuado com sucesso (Retorna o JWT)
 *       401:
 *         description: Credenciais inválidas
 *       429:
 *         description: Demasiadas tentativas de login (Rate Limit)
 */
router.post('/login', loginLimiter, authController.login);
/**
 * @swagger
 * /api/auth/me:
 *   get:
 *     summary: Retorna os dados completos do utilizador autenticado
 *     tags: [Auth]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Dados do utilizador
 *       401:
 *         description: Token inválido ou ausente
 */
router.get('/me', tokenValidation, authController.getMe);

module.exports = router;
