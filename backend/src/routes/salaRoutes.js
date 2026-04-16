const express = require('express');
const router = express.Router();
const authorize = require('../controllers/roleCheckMiddleware');
const tokenValidation = require('../middlewares/authMiddleware');

/**
 * @swagger
 * /api/salas:
 *   get:
 *     summary: Lista todas as salas
 *     tags: [Salas]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Sucesso
 *
 * /api/salas/{id}:
 *   delete:
 *     summary: Elimina uma sala
 *     tags: [Salas]
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
 *         description: Sala eliminada com sucesso
 *       404:
 *         description: Sala não encontrada
 */

router.use(tokenValidation, authorize([1]));
router.get('/', tokenValidation, authorize([1]), salaController.listSalas);
router.delete('/:id', tokenValidation, authorize([1]), salaController.deleteSala);

module.exports = router;