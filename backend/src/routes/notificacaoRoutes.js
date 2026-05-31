const express = require('express');
const router = express.Router();
const authorize = require('../middlewares/roleCheckMiddleware');
const tokenValidation = require('../middlewares/authMiddleware');
const notificacaoController = require('../controllers/notificacaoController');

/**
 * @swagger
 * /api/notificacoes:
 *   get:
 *     summary: Lista todas as notificações do utilizador autenticado
 *     tags: [Notificações]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Sucesso
 *
 * /api/notificacoes/{id}/lida:
 *   patch:
 *     summary: Marca uma notificação como lida
 *     tags: [Notificações]
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
 *         description: Notificação marcada como lida
 *       404:
 *         description: Notificação não encontrada
 */

router.get('/', tokenValidation, authorize([1,2,3]), notificacaoController.listNotificacoes);
router.patch('/:id/lida', tokenValidation, authorize([1,2,3]), notificacaoController.markAsRead);
router.delete('/:id', tokenValidation, authorize([1,2,3]), notificacaoController.deleteNotificacao);

module.exports = router;