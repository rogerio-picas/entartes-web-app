const express = require("express");
const router = express.Router({mergeParams : true});
const tokenValidation = require("../middlewares/authMiddleware");
const authorize = require('../middlewares/roleCheckMiddleware');
const groupController = require('../controllers/groupController');

// Editar: PUT /api/event/grupos/edit/:id_grupo
router.put("/grupos/:id_grupo", tokenValidation, authorize([1]), groupController.editarGrupo);

// Eliminar: DELETE /api/event/grupos/delete/:id_grupo
router.delete("/grupos/:id_grupo", tokenValidation, authorize([1]), groupController.eliminarGrupo);

// --- Rotas de sub-recursos (Alunos/Docentes) ---

// Alunos: POST /api/event/grupos/:id_grupo/alunos/:id_aluno
router.post("/:id_evento/grupos/:id_grupo/alunos/:id_aluno", tokenValidation, authorize([1,2]), groupController.adicionarAlunoAoGrupo);
router.delete("/:id_evento/grupos/:id_grupo/alunos/:id_aluno", tokenValidation, authorize([1,2]), groupController.removerAlunoDoGrupo);

// Docentes: POST /api/event/grupos/:id_grupo/docentes/:id_docente
router.post("/:id_evento/grupos/:id_grupo/docentes/:id_docente", tokenValidation, authorize([1]), groupController.adicionarDocenteAoGrupo);
router.delete("/:id_evento/grupos/:id_grupo/docentes/:id_docente", tokenValidation, authorize([1]), groupController.removerDocenteDoGrupo);

// --- Rotas genéricas com apenas um parâmetro (:id_evento) ---

// Criar: POST /api/event/grupos/:id_evento
router.post("/:id_evento/grupos", tokenValidation, authorize([1]), groupController.criarGrupo);

// Listar: GET /api/event/grupos/:id_evento
router.get("/:id_evento/grupos", tokenValidation, authorize([1,2,3]), groupController.listarGruposDoEvento);

module.exports = router;