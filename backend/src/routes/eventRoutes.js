const express = require("express");
const router = express.Router();
const tokenValidation = require("../middlewares/authMiddleware");
const authorize = require('../middlewares/roleCheckMiddleware');

const eventController = require("../controllers/eventController");
const groupRoutes = require("../routes/groupRoutes");

/**
 * @swagger
 * /api/evento:
 *   get:
 *     summary: Lista todos os eventos
 *     tags: [Events]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Sucesso
 *   post:
 *     summary: Cria um novo evento
 *     tags: [Events]
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
 *               data_inicio:
 *                 type: string
 *                 format: date
 *               data_fim:
 *                 type: string
 *                 format: date
 *     responses:
 *       201:
 *         description: Criado com sucesso
 *
 * /api/evento/{id}:
 *   get:
 *     summary: Retorna um evento específico
 *     tags: [Events]
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
 *         description: Sucesso
 *       404:
 *         description: Evento não encontrado
 *   put:
 *     summary: Atualiza informações de um evento
 *     tags: [Events]
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
 *               data_de_realizacao:
 *                 type: string
 *                 format: date
 *     responses:
 *       200:
 *         description: Evento atualizado com sucesso
 *       400:
 *         description: Parâmetros inválidos
 *       404:
 *         description: Evento não encontrado
 *   delete:
 *     summary: Cancela um evento
 *     tags: [Events]
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
 *         description: Evento cancelado com sucesso
 *       400:
 *         description: Erro ao cancelar evento
 *       403:
 *         description: Sem permissão para cancelar este evento
 *       404:
 *         description: Evento não encontrado
 *
 * /api/evento/{id}/participantes:
 *   post:
 *     summary: Adiciona um participante ao evento
 *     tags: [Events]
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
 *               codigo_username:
 *                 type: string
 *               tipo_utilizador:
 *                  type: integer
 *     responses:
 *       201:
 *         description: Participante adicionado com sucesso
 *   get:
 *     summary: Lista participantes do evento
 *     tags: [Events]
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
 *         description: Sucesso
 *
 * /api/evento/{id}/participantes/alunos/{id_aluno}:
 *   delete:
 *     summary: Remove um aluno inscrito do evento
 *     tags: [Events]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *       - in: path
 *         name: id_aluno
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Aluno removido com sucesso
 *
 * /api/evento/{id}/participantes/docentes/{id_docente}:
 *   delete:
 *     summary: Remove um docente inscrito do evento
 *     tags: [Events]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *       - in: path
 *         name: id_docente
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Docente removido com sucesso
 */

// --- ROTAS DE GRUPOS (Dentro de Eventos) ---
router.use('/', groupRoutes);

// --- ROTAS DE EVENTOS ---
router.get("/", tokenValidation, authorize([1,2,3]), eventController.listarEventos);
router.get("/:id", tokenValidation, authorize([1,2,3]), eventController.buscarEventoPorId);
router.post("/", tokenValidation, authorize([1]), eventController.criarEvento);
router.put("/:id", tokenValidation, authorize([1]), eventController.editarEvento);
router.delete("/:id", tokenValidation, authorize([1]), eventController.cancelarEvento);
router.post("/:id/participantes", tokenValidation, authorize([1]), eventController.adicionarParticipante);
router.get("/:id/participantes", tokenValidation, authorize([1,2,3]), eventController.listarParticipantes);
router.delete("/:id/participantes/alunos/:id_aluno", tokenValidation, authorize([1]), eventController.removerAlunoDoEvento);
router.delete("/:id/participantes/docentes/:id_docente", tokenValidation, authorize([1]), eventController.removerDocenteDoEvento);

module.exports = router;
