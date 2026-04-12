const express = require('express');
const router = express.Router();
const coachingController = require('../controllers/coachingController');
const tokenValidation = require('../middlewares/authMiddleware');

/**
 * @swagger
 * /api/coaching:
 *   post:
 *     summary: Cria um novo agendamento de coaching
 *     tags: [Coaching]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               id_modalidade:
 *                 type: integer
 *               id_sala:
 *                 type: integer
 *               data_a_realizar:
 *                 type: string
 *               hora_inicio:
 *                 type: string
 *               duracao_minutos:
 *                 type: integer
 *     responses:
 *       201:
 *         description: Criado com sucesso
 *   get:
 *     summary: Lista todos os agendamentos
 *     tags: [Coaching]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Sucesso
 */
router.post('/', tokenValidation, coachingController.createNewCoaching);
router.get('/', tokenValidation, coachingController.getAllCoachings);
router.get('/:id_utilizador', tokenValidation, coachingController.getCoachingById);
router.put('/:id_utilizador', tokenValidation, coachingController.updateCoaching);
router.delete('/:id_utilizador', tokenValidation, coachingController.deleteCoaching);


module.exports = router;