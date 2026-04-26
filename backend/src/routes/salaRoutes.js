const express = require('express');
const router = express.Router();
const authorize = require('../middlewares/roleCheckMiddleware');
const tokenValidation = require('../middlewares/authMiddleware');
const salaController = require('../controllers/salaController');

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
 *   post:
 *     summary: Cria uma nova sala
 *     tags: [Salas]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               nome:
 *                 type: string
 *               descricao:
 *                 type: string
 *     responses:
 *       201:
 *         description: Sala criada com sucesso
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
 *   put:
 *     summary: Atualiza uma sala existente
 *     tags: [Salas]
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
 *               nome:
 *                 type: string
 *               descricao:
 *                 type: string
 *     responses:
 *       200:
 *         description: Sala atualizada com sucesso
 *       404:
 *         description: Sala não encontrada
 */

router.use(tokenValidation, authorize([1]));
router.get('/', tokenValidation, authorize([1]), salaController.listSalas);
router.post('/', tokenValidation, authorize([1]), salaController.createSala);
router.put('/:id', tokenValidation, authorize([1]), salaController.updateSala);
router.delete('/:id', tokenValidation, authorize([1]), salaController.deleteSala);

module.exports = router;