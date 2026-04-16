const express = require('express');
const router = express.Router();
const authorize = require('../controllers/roleCheckMiddleware');
const tokenValidation = require('../middlewares/authMiddleware');

/**
 * @swagger
 * /api/anuncios:
 *   post:
 *     summary: Cria um novo anúncio
 *     tags: [Anúncios]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               titulo:
 *                 type: string
 *               conteudo:
 *                 type: string
 *     responses:
 *       201:
 *         description: Anúncio criado com sucesso
 */

router.use(tokenValidation, authorize[1]);
router.post('/', authorize[1,2], tokenValidation, anuncioController.createAnuncio);

module.exports = router;