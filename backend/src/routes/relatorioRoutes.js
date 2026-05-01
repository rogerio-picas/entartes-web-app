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
 *     tags: [Relatórios]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Sucesso
 *
 * /api/relatorio/horas-docente:
 *   get:
 *     summary: Relatório de horas por docente
 *     tags: [Relatórios]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Sucesso
 *
 * /api/relatorio/alunos:
 *   get:
 *     summary: Relatório de alunos
 *     tags: [Relatórios]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Sucesso
 *
 * /api/relatorio/docentes:
 *   get:
 *     summary: Relatório de docentes
 *     tags: [Relatórios]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Sucesso
 *
 * /api/relatorio/exportar:
 *   get:
 *     summary: Exporta relatório em CSV
 *     tags: [Relatórios]
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

// CORREÇÃO: middleware duplicado — router.use aplicava tokenValidation+authorize e cada rota repetia-os
router.get('/sessoes',       tokenValidation, authorize([1]), relController.getSessoesRelatorio);
router.get('/horas-docente', tokenValidation, authorize([1]), relController.getHorasDocente);
router.get('/alunos',        tokenValidation, authorize([1]), relController.getAlunosRelatorio);
router.get('/docentes',      tokenValidation, authorize([1]), relController.getDocentesRelatorio);
router.get('/exportar',      tokenValidation, authorize([1]), relController.exportCSV);

module.exports = router;