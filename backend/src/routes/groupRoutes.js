const express = require("express");
const router = express.Router({ mergeParams: true });
const tokenValidation = require("../middlewares/authMiddleware");
const authorize = require('../middlewares/roleCheckMiddleware');
const groupController = require('../controllers/groupController')

// --- ROTAS DE GRUPOS (Dentro de Eventos) ---
// Obs: mergeParams: true permite aceder a parâmetros da rota pai (id_evento)

// Criar: POST /api/event/:id_evento/grupos
router.post("/", tokenValidation, authorize([1]), groupController.criarGrupo);

// Listar: GET /api/event/:id_evento/grupos
router.get("/", tokenValidation, authorize([1,2,3]), groupController.listarGruposDoEvento);

// Alunos: POST /api/event/:id_evento/grupos/:id_grupo/alunos/:id_aluno
router.post("/:id_grupo/alunos/:id_aluno", tokenValidation, authorize([1,2]), groupController.adicionarAlunoAoGrupo);
router.delete("/:id_grupo/alunos/:id_aluno", tokenValidation, authorize([1,2]), groupController.removerAlunoDoGrupo);

// Docentes: POST /api/event/:id_evento/grupos/:id_grupo/docentes/:id_docente
router.post("/:id_grupo/docentes/:id_docente", tokenValidation, authorize([1]), groupController.adicionarDocenteAoGrupo);
router.delete("/:id_grupo/docentes/:id_docente", tokenValidation, authorize([1]), groupController.removerDocenteDoGrupo);

// Editar/Eliminar: PUT /api/event/:id_evento/grupos/:id_grupo
router.put("/:id_grupo", tokenValidation, authorize([1]), groupController.editarGrupo);
router.delete("/:id_grupo", tokenValidation, authorize([1]), groupController.eliminarGrupo);

module.exports = router;