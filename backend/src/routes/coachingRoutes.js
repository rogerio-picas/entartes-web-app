const express = require('express');
const router = express.Router();
const coachingController = require('../controllers/coachingController');
const tokenValidation = require('../middlewares/authMiddleware');
const authorize = require('../middlewares/roleCheckMiddleware');

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
 *
 * /api/coaching/{id_utilizador}:
 *   get:
 *     summary: Retorna agendamentos de coaching de um utilizador
 *     tags: [Coaching]
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
 *     summary: Atualiza um agendamento de coaching
 *     tags: [Coaching]
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
 *   delete:
 *     summary: Elimina um agendamento de coaching
 *     tags: [Coaching]
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
router.post('/', authorize([1]), tokenValidation, coachingController.createNewCoaching);
router.get('/', authorize([1]), tokenValidation, coachingController.getAllCoachings);
router.get('/:id_utilizador', authorize([1,2,3]), tokenValidation, coachingController.getCoachingById);
router.put('/:id_utilizador', authorize([1]), tokenValidation, coachingController.updateCoaching);
router.delete('/:id_utilizador', authorize([1]), tokenValidation, coachingController.deleteCoaching);


// Faltam Funções específicas para aluno/docente como getMyCoachings, cancelCoaching

module.exports = router;