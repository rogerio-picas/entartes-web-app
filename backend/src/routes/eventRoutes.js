const express = require("express");
const router = express.Router();
const tokenValidation = require("../middlewares/authMiddleware");
const adminAuthCheck = require("../middlewares/adminAuthCheck");

const eventController = require("../controllers/eventController");
const groupController = require("../controllers/groupController");

// --- ROTAS DE EVENTOS ---
router.get("/", tokenValidation, eventController.listarEventos);
router.get("/:id", tokenValidation, eventController.buscarEventoPorId);
router.post("/", tokenValidation, adminAuthCheck, eventController.criarEvento);
router.post("/:id/participantes", tokenValidation, adminAuthCheck, eventController.adicionarParticipante);
router.get("/:id/participantes", tokenValidation, eventController.listarParticipantes);

// --- ROTAS DE GRUPOS (Dentro de Eventos) ---
// Criar um grupo para um evento específico
router.post("/:id_evento/grupos", tokenValidation, adminAuthCheck, groupController.criarGrupo);

// Listar grupos de um evento
router.get("/:id_evento/grupos", tokenValidation, groupController.listarGruposDoEvento);

// Gerir alunos e docentes nos grupos
router.post("/grupos/:id_grupo/alunos/:id_aluno", tokenValidation, adminAuthCheck, groupController.adicionarAlunoAoGrupo);
router.delete("/grupos/:id_grupo/alunos/:id_aluno", tokenValidation, adminAuthCheck, groupController.removerAlunoDoGrupo);

router.post("/grupos/:id_grupo/docentes/:id_docente", tokenValidation, adminAuthCheck, groupController.adicionarDocenteAoGrupo);
router.delete("/grupos/:id_grupo/docentes/:id_docente", tokenValidation, adminAuthCheck, groupController.removerDocenteDoGrupo);

// Editar e Eliminar Grupos
router.put("/grupos/:id_grupo", tokenValidation, adminAuthCheck, groupController.editarGrupo);
router.delete("/grupos/:id_grupo", tokenValidation, adminAuthCheck, groupController.eliminarGrupo);

module.exports = router;