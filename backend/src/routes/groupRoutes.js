const express = require("express");
const router = express.Router();
const tokenValidation = require("../middlewares/authMiddleware");
const authorize = require('../middlewares/roleCheckMiddleware');

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