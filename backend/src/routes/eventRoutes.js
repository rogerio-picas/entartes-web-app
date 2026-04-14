const express = require("express");
const router = express.Router();
const tokenValidation = require("../middlewares/authMiddleware");
const authorize = require('../middlewares/roleCheckMiddleware');

const eventController = require("../controllers/eventController");
const groupController = require("../controllers/groupController");

// --- ROTAS DE EVENTOS ---
router.get("/", authorize([1,2,3]), tokenValidation, eventController.listarEventos);
router.get("/:id", authorize([1,2,3]), tokenValidation, eventController.buscarEventoPorId);
router.post("/", authorize([1]), tokenValidation, eventController.criarEvento);
router.post("/:id/participantes", authorize([1]), tokenValidation, eventController.adicionarParticipante);
router.get("/:id/participantes", authorize([1]), tokenValidation, eventController.listarParticipantes);

// --- ROTAS DE GRUPOS (Dentro de Eventos) ---
// Criar um grupo para um evento específico
router.post("/:id_evento/grupos", authorize([1]), tokenValidation, groupController.criarGrupo);

// Listar grupos de um evento
router.get("/:id_evento/grupos", authorize([1,2,3]), tokenValidation, groupController.listarGruposDoEvento);

// Gerir alunos e docentes nos grupos
router.post("/grupos/:id_grupo/alunos/:id_aluno", authorize([1,2]), tokenValidation, groupController.adicionarAlunoAoGrupo);
router.delete("/grupos/:id_grupo/alunos/:id_aluno", authorize([1,2]), tokenValidation, groupController.removerAlunoDoGrupo);

router.post("/grupos/:id_grupo/docentes/:id_docente", authorize([1]), tokenValidation, groupController.adicionarDocenteAoGrupo);
router.delete("/grupos/:id_grupo/docentes/:id_docente", authorize([1]), tokenValidation, groupController.removerDocenteDoGrupo);

// Editar e Eliminar Grupos
router.put("/grupos/:id_grupo", authorize([1]), tokenValidation, groupController.editarGrupo);
router.delete("/grupos/:id_grupo", authorize([1]), tokenValidation, groupController.eliminarGrupo);

module.exports = router;