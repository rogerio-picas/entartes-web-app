const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { loginLimiter } = require('../middlewares/rateLimitMiddleware');  // ✅ Aqui

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


router.post('/login', loginLimiter, authController.login);  // ✅ Aqui sim

module.exports = router;