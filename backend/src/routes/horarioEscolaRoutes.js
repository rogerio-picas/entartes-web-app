// src/routes/horarioEscolaRoutes.js
const express = require('express');
const router = express.Router();
const horarioEscolaController = require('../controllers/horarioEscolaController');
const tokenValidation = require('../middlewares/authMiddleware');
const authorize = require('../middlewares/roleCheckMiddleware');

/**
 * @swagger
 * /api/configuracao/horario-escola:
 *   get:
 *     summary: Obtém o horário de funcionamento da escola
 *     tags: [Configurações]
 *     responses:
 *       200:
 *         description: Horário da escola retornado com sucesso
 *   put:
 *     summary: Atualiza o horário de funcionamento da escola
 *     tags: [Configurações]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               data_inicio:
 *                 type: string
 *                 example: "2026-09-01"
 *               data_fim:
 *                 type: string
 *                 example: "2027-07-31"
 *               hora_inicio:
 *                 type: string
 *                 example: "09:00"
 *               hora_fim:
 *                 type: string
 *                 example: "20:00"
 *               dias_semana:
 *                 type: array
 *                 items:
 *                   type: integer
 *                 example: [1, 2, 3, 4, 5]
 *     responses:
 *       200:
 *         description: Horário atualizado com sucesso
 */

router.get('/horario-letivo', tokenValidation, horarioEscolaController.getHorarioEscola);

router.put('/horario-letivo', tokenValidation, authorize([1]), horarioEscolaController.updateHorarioEscola);

module.exports = router;
