const express = require('express');
const router = express.Router();
const authorize = require('../middlewares/roleCheckMiddleware');
const tokenValidation = require('../middlewares/authMiddleware');
const { getAulasParaConfirmar, getAllAulas, updateEstadoAula } = require('../controllers/aulasController');

/**
 * @swagger
 * /api/aulas:
 *   get:
 *     summary: Lista marcações nas próximas 48h para confirmação
 *     tags: [Aulas]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Lista de marcações
 *
 * /api/aulas/todas:
 *   get:
 *     summary: Lista todas as marcações
 *     tags: [Aulas]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Lista completa de marcações
 *
 * /api/aulas/{id}/estado:
 *   patch:
 *     summary: Atualiza o estado de uma marcação
 *     tags: [Aulas]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
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
 *               id_estado:
 *                 type: integer
 *                 description: "1=Pendente, 2=Confirmada, 3=Cancelada, 4=Concluída"
 *     responses:
 *       200:
 *         description: Estado atualizado com sucesso
 */

// Todas as funções (admin, docente, aluno) podem aceder às aulas
router.get('/', tokenValidation, getAulasParaConfirmar);
router.get('/todas', tokenValidation, getAllAulas);
router.patch('/:id/estado', tokenValidation, authorize([1, 2]), updateEstadoAula);

module.exports = router;