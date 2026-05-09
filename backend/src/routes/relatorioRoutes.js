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
 *     parameters:
 *       - in: query
 *         name: from
 *         schema:
 *           type: string
 *           format: date
 *         description: Data de início (YYYY-MM-DD)
 *       - in: query
 *         name: to
 *         schema:
 *           type: string
 *           format: date
 *         description: Data de fim (YYYY-MM-DD)
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
 *     parameters:
 *       - in: query
 *         name: data_inicio
 *         schema:
 *           type: string
 *           format: date
 *         description: Data de início opcional (YYYY-MM-DD)
 *       - in: query
 *         name: data_fim
 *         schema:
 *           type: string
 *           format: date
 *         description: Data de fim opcional (YYYY-MM-DD)
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
 *     parameters:
 *       - in: query
 *         name: data_inicio
 *         schema:
 *           type: string
 *           format: date
 *         description: Data de início opcional (YYYY-MM-DD)
 *       - in: query
 *         name: data_fim
 *         schema:
 *           type: string
 *           format: date
 *         description: Data de fim opcional (YYYY-MM-DD)
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
 * /api/relatorio/ocupacao-salas:
 *   get:
 *     summary: Relatório de ocupação de salas
 *     tags: [Relatórios]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: data
 *         schema:
 *           type: string
 *           format: date
 *         description: Data opcional para filtrar a ocupação (YYYY-MM-DD)
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
 *     parameters:
 *       - in: query
 *         name: from
 *         schema:
 *           type: string
 *           format: date
 *         description: Data de início (YYYY-MM-DD)
 *       - in: query
 *         name: to
 *         schema:
 *           type: string
 *           format: date
 *         description: Data de fim (YYYY-MM-DD)
 *     responses:
 *       200:
 *         description: Ficheiro CSV gerado com sucesso
 *         content:
 *           text/csv:
 *             schema:
 *               type: string
 *       400:
 *         description: Parâmetros em falta
 */

// CORREÇÃO: middleware duplicado — router.use aplicava tokenValidation+authorize e cada rota repetia-os
router.get('/sessoes', tokenValidation, authorize([1]), relController.getSessoesRelatorio);
router.get('/horas-docente', tokenValidation, authorize([1]), relController.getHorasDocente);
router.get('/alunos', tokenValidation, authorize([1]), relController.getAlunosRelatorio);
router.get('/docentes', tokenValidation, authorize([1]), relController.getDocentesRelatorio);
router.get('/ocupacao-salas', tokenValidation, authorize([1]), relController.getOcupacaoSalas);
router.get('/exportar', tokenValidation, authorize([1]), relController.exportCSV);

module.exports = router;