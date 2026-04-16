const express = require('express');
const router = express.Router();
const authorize = require('../middlewares/roleCheckMiddleware');
const tokenValidation = require('../middlewares/authMiddleware');
const relController = require('../controllers/relatorioController');

/**
 * @swagger
 * /api/relatorio/sessoes:
 *   get:
 *     summary: Relatório de sessões
 *     tags: [Relatorios]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Sucesso
 *
 * /api/relatorio/horas-docente:
 *   get:
 *     summary: Relatório de horas por docente
 *     tags: [Relatorios]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Sucesso
 *
 * /api/relatorio/alunos:
 *   get:
 *     summary: Relatório de alunos
 *     tags: [Relatorios]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Sucesso
 *
 * /api/relatorio/exportar:
 *   get:
 *     summary: Exporta relatório em CSV
 *     tags: [Relatorios]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Ficheiro CSV gerado com sucesso
 *         content:
 *           text/csv:
 *             schema:
 *               type: string
 */

router.use(tokenValidation, authorize([1]));
router.get('/sessoes', tokenValidation, authorize([1]), relController.getSessoesRelatorio);
router.get('/horas-docente',tokenValidation, authorize([1]), relController.getHorasDocente);
router.get('/alunos', tokenValidation, authorize([1]), relController.getAlunosRelatorio);
router.get('/exportar', tokenValidation, authorize([1]), relController.exportCSV);

module.exports = router;