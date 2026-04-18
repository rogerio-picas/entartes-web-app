const express = require('express');
const router = express.Router();
const tokenValidation = require('../middlewares/authMiddleware');
const authorize = require('../middlewares/roleCheckMiddleware');
const {
    getMinhasAulas,
    getAulaDetalhe,
    inscreverEmAula,
    getAulasDisponiveis
} = require('../controllers/horarioController');

/**
 * @swagger
 * /api/horario/minhas-aulas:
 *   get:
 *     summary: Lista as aulas do utilizador autenticado
 *     tags: [Horário]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Lista de marcações do utilizador
 *
 * /api/horario/disponiveis:
 *   get:
 *     summary: Lista aulas disponíveis para inscrição
 *     tags: [Horário]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Lista de aulas disponíveis
 *
 * /api/horario/inscrever:
 *   post:
 *     summary: Inscreve o aluno autenticado numa aula
 *     tags: [Horário]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               id_marcacoes:
 *                 type: integer
 *     responses:
 *       201:
 *         description: Inscrição realizada com sucesso
 *       400:
 *         description: Já inscrito ou aula sem vagas
 *
 * /api/horario/minhas-aulas/{id}:
 *   get:
 *     summary: Detalhes de uma aula específica
 *     tags: [Horário]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Detalhes da aula
 *       404:
 *         description: Aula não encontrada
 */

router.get('/minhas-aulas', tokenValidation, authorize([1, 2, 3]), getMinhasAulas);
router.get('/disponiveis', tokenValidation, authorize([1, 2, 3]), getAulasDisponiveis);
router.post('/inscrever', tokenValidation, authorize([3]), inscreverEmAula);
router.get('/minhas-aulas/:id', tokenValidation, authorize([1, 2, 3]), getAulaDetalhe);

module.exports = router;