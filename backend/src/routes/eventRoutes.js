const express = require("express");
const router = express.Router();
const tokenValidation = require("../middlewares/authMiddleware");
const authorize = require('../middlewares/roleCheckMiddleware');

const eventController = require("../controllers/eventController");
const groupRoutes = require("../routes/groupRoutes");

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
 *               descricao:
 *                 type: string
 *               hora_atuacao:
 *                 type: string
 *                 format: time
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
 * /api/event/{id_evento}/grupos/{id_grupo}:
 *   put:
 *     summary: Edita um grupo
 *     tags: [Events - Grupos]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id_evento
 *         required: true
 *         schema:
 *           type: integer
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
 *               descricao:
 *                 type: string
 *               hora_atuacao:
 *                 type: string
 *                 format: time
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
 *         name: id_evento
 *         required: true
 *         schema:
 *           type: integer
 *       - in: path
 *         name: id_grupo
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Grupo eliminado com sucesso
 *
 * /api/event/{id_evento}/grupos/{id_grupo}/alunos/{id_aluno}:
 *   post:
 *     summary: Adiciona um aluno ao grupo
 *     tags: [Events - Grupos]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id_evento
 *         required: true
 *         schema:
 *           type: integer
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
 *         name: id_evento
 *         required: true
 *         schema:
 *           type: integer
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
 *         description: Aluno removido com sucesso
 *
 * /api/event/{id_evento}/grupos/{id_grupo}/docentes/{id_docente}:
 *   post:
 *     summary: Adiciona um docente ao grupo
 *     tags: [Events - Grupos]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id_evento
 *         required: true
 *         schema:
 *           type: integer
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
 *         name: id_evento
 *         required: true
 *         schema:
 *           type: integer
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
router.get("/:id/participantes", tokenValidation, authorize([1]), eventController.listarParticipantes);


module.exports = router;

