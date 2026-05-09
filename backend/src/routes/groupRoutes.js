const express = require("express");
const router = express.Router({ mergeParams: true });
const tokenValidation = require("../middlewares/authMiddleware");
const authorize = require('../middlewares/roleCheckMiddleware');
const groupController = require('../controllers/groupController');

/**
 * @swagger
 * /api/evento/{id_evento}/grupos:
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
 * /api/evento/{id_evento}/grupos/{id_grupo}:
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
 * /api/evento/{id_evento}/grupos/{id_grupo}/alunos/{id_aluno}:
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
 * /api/evento/{id_evento}/grupos/{id_grupo}/docentes/{id_docente}:
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
// Obs: mergeParams: true permite aceder a parâmetros da rota pai (id_evento)

// Criar: POST /api/event/:id_evento/grupos
router.post("/:id_evento/grupos", tokenValidation, authorize([1]), groupController.criarGrupo);

// Listar: GET /api/event/:id_evento/grupos
router.get("/:id_evento/grupos", tokenValidation, authorize([1, 2, 3]), groupController.listarGruposDoEvento);

// Editar: PUT /api/event/:id_evento/grupos/:id_grupo
router.put("/:id_evento/grupos/:id_grupo", tokenValidation, authorize([1]), groupController.editarGrupo);

// Eliminar: DELETE /api/event/:id_evento/grupos/:id_grupo
router.delete("/:id_evento/grupos/:id_grupo", tokenValidation, authorize([1]), groupController.eliminarGrupo);

// --- Rotas de sub-recursos (Alunos/Docentes) ---

// Alunos: POST /api/event/:id_evento/grupos/:id_grupo/alunos/:id_aluno
router.post("/:id_evento/grupos/:id_grupo/alunos/:id_aluno", tokenValidation, authorize([1, 2]), groupController.adicionarAlunoAoGrupo);
router.delete("/:id_evento/grupos/:id_grupo/alunos/:id_aluno", tokenValidation, authorize([1, 2]), groupController.removerAlunoDoGrupo);

// Docentes: POST /api/event/:id_evento/grupos/:id_grupo/docentes/:id_docente
router.post("/:id_evento/grupos/:id_grupo/docentes/:id_docente", tokenValidation, authorize([1]), groupController.adicionarDocenteAoGrupo);
router.delete("/:id_evento/grupos/:id_grupo/docentes/:id_docente", tokenValidation, authorize([1]), groupController.removerDocenteDoGrupo);

module.exports = router;