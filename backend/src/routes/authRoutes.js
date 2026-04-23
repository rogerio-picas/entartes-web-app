const express = require('express');
const router = express.Router();

const authController = require('../controllers/authController');
const tokenValidation = require('../middlewares/authMiddleware');
const { loginLimiter } = require('../middlewares/rateLimitMiddleware');

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
 *         description: Login efetuado com sucesso
 *       401:
 *         description: Credenciais invalidas
 */
router.post('/login', loginLimiter, authController.login);

/**
 * @swagger
 * /api/auth/me:
 *   get:
 *     summary: Dados do utilizador
 *     tags: [Auth]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Sucesso
 */
router.get('/me', tokenValidation, authController.getMe);

module.exports = router;