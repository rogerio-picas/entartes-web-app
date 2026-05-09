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
 *     parameters:
 *       - in: query
 *         name: estado
 *         schema:
 *           type: string
 *         description: Filtra eventos por estado (ex. ativos, cancelados, concluidos)
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
 *             required: [nome]
 *             properties:
 *               nome:
 *                 type: string
 *               descricao:
 *                 type: string
 *               data_de_realizacao:
 *                 type: string
 *                 format: date-time
 *                 description: Data e hora de realização do evento
 *               local:
 *                 type: string
 *                 description: Local do evento
 *               duracao_minutos:
 *                 type: integer
 *                 description: Duração em minutos (default 60)
 *               link_whatsapp:
 *                 type: string
 *                 description: Link do grupo WhatsApp do evento
 *     responses:
 *       201:
 *         description: Criado com sucesso
 *       400:
 *         description: Dados inválidos
 *
 * /api/evento/paginados:
 *   get:
 *     summary: Lista eventos com paginação, pesquisa e filtros
 *     tags: [Events]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: Número da página
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 6
 *         description: Número de eventos por página
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Termo de pesquisa (nome do evento)
 *       - in: query
 *         name: estado
 *         schema:
 *           type: string
 *           default: ativos
 *         description: "Filtro de estado: ativos, cancelados, concluidos, todos"
 *       - in: query
 *         name: sortBy
 *         schema:
 *           type: string
 *           default: date_asc
 *         description: "Ordenação: date_asc, date_desc"
 *     responses:
 *       200:
 *         description: Lista paginada de eventos
 *       500:
 *         description: Erro interno no servidor
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
 *                 format: date-time
 *               local:
 *                 type: string
 *               duracao_minutos:
 *                 type: integer
 *               link_whatsapp:
 *                 type: string
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
 * /api/evento/meus-eventos:
 *   get:
 *     summary: Lista eventos onde o utilizador autenticado participa (docente/aluno)
 *     tags: [Events]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Lista de eventos do utilizador
 *
 * /api/evento/{id}/concluir:
 *   post:
 *     summary: Marca um evento como concluído
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
 *         description: Evento concluído com sucesso
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
 *     responses:
 *       201:
 *         description: Participante adicionado com sucesso
 *       400:
 *         description: Código de utilizador é obrigatório
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
router.get("/paginados", tokenValidation, authorize([1,2,3]), eventController.listarEventosPaginados);
router.get("/meus-eventos", tokenValidation, authorize([2,3]), eventController.listarMeusEventos);
router.get("/", tokenValidation, authorize([1,2,3]), eventController.listarEventos);
router.get("/:id", tokenValidation, authorize([1,2,3]), eventController.buscarEventoPorId);
router.post("/", tokenValidation, authorize([1]), eventController.criarEvento);
router.put("/:id", tokenValidation, authorize([1]), eventController.editarEvento);
router.post("/:id/concluir", tokenValidation, authorize([1]), eventController.concluirEvento);
router.delete("/:id", tokenValidation, authorize([1]), eventController.cancelarEvento);
router.post("/:id/participantes", tokenValidation, authorize([1]), eventController.adicionarParticipante);
router.get("/:id/participantes", tokenValidation, authorize([1,2,3]), eventController.listarParticipantes);
router.delete("/:id/participantes/alunos/:id_aluno", tokenValidation, authorize([1]), eventController.removerAlunoDoEvento);
router.delete("/:id/participantes/docentes/:id_docente", tokenValidation, authorize([1]), eventController.removerDocenteDoEvento);

module.exports = router;
