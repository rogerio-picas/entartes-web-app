const express = require('express');
const router = express.Router();
const tokenValidation = require('../middlewares/authMiddleware');
const authorize = require('../middlewares/roleCheckMiddleware');

const availabilityController = require('../controllers/availabilityController');

// --- ROTAS DE DISPONIBILIDADES ---

/**
 * @swagger
 * /api/disponibilidades:
 *   post:
 *     summary: Cria uma nova disponibilidade de horário
 *     tags: [Disponibilidades]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               dia_semana:
 *                 type: integer
 *                 description: "0-6 (domingo-sábado) para disponibilidade recorrente"
 *               data_especifica:
 *                 type: string
 *                 format: date
 *                 description: "Data pontual da disponibilidade"
 *               hora_inicio:
 *                 type: string
 *                 format: time
 *                 example: "09:00"
 *               hora_fim:
 *                 type: string
 *                 format: time
 *                 example: "11:00"
 *     responses:
 *       201:
 *         description: Disponibilidade criada com sucesso
 *       400:
 *         description: Parâmetros inválidos ou horário sobreposto
 *       403:
 *         description: Apenas docentes podem criar disponibilidades
 *   get:
 *     summary: Lista todas as disponibilidades do docente autenticado
 *     tags: [Disponibilidades]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Lista de disponibilidades
 *       403:
 *         description: Apenas docentes podem listar disponibilidades
 *
 * /api/disponibilidades/{id_disponibilidade}:
 *   put:
 *     summary: Atualiza uma disponibilidade existente
 *     tags: [Disponibilidades]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id_disponibilidade
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
 *               dia_semana:
 *                 type: integer
 *               data_especifica:
 *                 type: string
 *                 format: date
 *               hora_inicio:
 *                 type: string
 *                 format: time
 *               hora_fim:
 *                 type: string
 *                 format: time
 *     responses:
 *       200:
 *         description: Disponibilidade atualizada com sucesso
 *       400:
 *         description: Novo horário sobrepõe-se a uma disponibilidade existente
 *       403:
 *         description: Sem permissão para atualizar
 *       404:
 *         description: Disponibilidade não encontrada
 *   delete:
 *     summary: Remove uma disponibilidade
 *     tags: [Disponibilidades]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id_disponibilidade
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Disponibilidade eliminada com sucesso
 *       400:
 *         description: Não é possível remover (ex: tem marcação ativa)
 *       403:
 *         description: Sem permissão para eliminar
 *       404:
 *         description: Disponibilidade não encontrada
 */

// POST - Criar disponibilidade
router.post('/', tokenValidation, authorize([2]), availabilityController.criarDisponibilidade);

// GET - Listar disponibilidades
router.get('/', tokenValidation, authorize([2]), availabilityController.listarDisponibilidades);

// PUT - Atualizar disponibilidade
router.put('/:id_disponibilidade', tokenValidation, authorize([2]), availabilityController.updateAvailability);

// DELETE - Remover disponibilidade
router.delete('/:id_disponibilidade', tokenValidation, authorize([2]), availabilityController.deleteAvailability);

module.exports = router;
