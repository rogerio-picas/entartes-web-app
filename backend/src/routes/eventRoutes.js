const express = require("express");
const router = express.Router();
const tokenValidation = require("../middlewares/authMiddleware");
const authorize = require('../middlewares/roleCheckMiddleware');

const eventController = require("../controllers/eventController");
const groupController = require("../controllers/groupController");

/**
 * @swagger
 * /api/event:
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
 * /api/event/{id}:
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
 *
 * /api/event/{id}/participantes:
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
 *               id_utilizador:
 *                 type: integer
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
 * /api/event/{id_evento}/grupos:
 *   post:
 *     summary: Cria um grupo para um evento
 *     tags: [Events - Grupos]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id_evento
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
 *     responses:
 *       201:
 *         description: Grupo criado com sucesso
 *   get:
 *     summary: Lista grupos de um evento
 *     tags: [Events - Grupos]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id_evento
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Sucesso
 *
 * /api/event/grupos/{id_grupo}:
 *   put:
 *     summary: Edita um grupo
 *     tags: [Events - Grupos]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id_grupo
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
 *     responses:
 *       200:
 *         description: Sucesso
 *   delete:
 *     summary: Elimina um grupo
 *     tags: [Events - Grupos]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id_grupo
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Sucesso
 *
 * /api/event/grupos/{id_grupo}/alunos/{id_aluno}:
 *   post:
 *     summary: Adiciona um aluno ao grupo
 *     tags: [Events - Grupos]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id_grupo
 *         required: true
 *         schema:
 *           type: integer
 *       - in: path
 *         name: id_aluno
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       201:
 *         description: Aluno adicionado com sucesso
 *   delete:
 *     summary: Remove um aluno do grupo
 *     tags: [Events - Grupos]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id_grupo
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
 *         description: Sucesso
 *
 * /api/event/grupos/{id_grupo}/docentes/{id_docente}:
 *   post:
 *     summary: Adiciona um docente ao grupo
 *     tags: [Events - Grupos]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id_grupo
 *         required: true
 *         schema:
 *           type: integer
 *       - in: path
 *         name: id_docente
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       201:
 *         description: Docente adicionado com sucesso
 *   delete:
 *     summary: Remove um docente do grupo
 *     tags: [Events - Grupos]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id_grupo
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
 *         description: Sucesso
 */

// --- ROTAS DE EVENTOS ---
router.get("/", authorize([1,2,3]), tokenValidation, eventController.listarEventos);
router.get("/:id", authorize([1,2,3]), tokenValidation, eventController.buscarEventoPorId);
router.post("/", authorize([1]), tokenValidation, eventController.criarEvento);
router.post("/:id/participantes", authorize([1]), tokenValidation, eventController.adicionarParticipante);
router.get("/:id/participantes", authorize([1]), tokenValidation, eventController.listarParticipantes);



module.exports = router;