const express = require("express");
const router = express.Router({mergeParams : true});
const tokenValidation = require("../middlewares/authMiddleware");
const authorize = require('../middlewares/roleCheckMiddleware');
const groupController = require('../controllers/groupController');

// --- ROTAS DE GRUPOS (Dentro de Eventos) ---
// Obs: mergeParams: true permite aceder a parâmetros da rota pai (id_evento)

// Criar: POST /api/event/:id_evento/grupos
router.post("/:id_evento/", tokenValidation, authorize([1]), groupController.criarGrupo);

// Listar: GET /api/event/:id_evento/grupos
router.get("/:id_evento/grupos", tokenValidation, authorize([1,2,3]), groupController.listarGruposDoEvento);

// Editar: PUT /api/event/:id_evento/grupos/:id_grupo
router.put("/:id_evento/grupos/:id_grupo", tokenValidation, authorize([1]), groupController.editarGrupo);

// Eliminar: DELETE /api/event/:id_evento/grupos/:id_grupo
router.delete("/:id_evento/grupos/:id_grupo", tokenValidation, authorize([1]), groupController.eliminarGrupo);

// --- Rotas de sub-recursos (Alunos/Docentes) ---

// Alunos: POST /api/event/:id_evento/grupos/:id_grupo/alunos/:id_aluno
router.post("/:id_evento/grupos/:id_grupo/alunos/:id_aluno", tokenValidation, authorize([1,2]), groupController.adicionarAlunoAoGrupo);
router.delete("/:id_evento/grupos/:id_grupo/alunos/:id_aluno", tokenValidation, authorize([1,2]), groupController.removerAlunoDoGrupo);

// Docentes: POST /api/event/:id_evento/grupos/:id_grupo/docentes/:id_docente
router.post("/:id_evento/grupos/:id_grupo/docentes/:id_docente", tokenValidation, authorize([1]), groupController.adicionarDocenteAoGrupo);
router.delete("/:id_evento/grupos/:id_grupo/docentes/:id_docente", tokenValidation, authorize([1]), groupController.removerDocenteDoGrupo);

module.exports = router;


module.exports = router;