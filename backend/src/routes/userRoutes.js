const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const authorize = require('../middlewares/userMiddleware');


// --- ROTAS PÚBLICAS ---

// Rota para autenticação (Login) - Todos os perfis precisam de aceder
// router.post('/login', userController.login);


// --- ROTAS PROTEGIDAS (RBAC) ---

// Apenas a Coordenação pode listar todos os utilizadores ou criar novos
router.get('/', userController.getUsers);
router.post('/', userController.createUser);
router.get('/:id_utilizador', userController.getUser);

// Obter dados de um utilizador específico
// Pode ser acedido pela Coordenação ou pelo próprio Docente/Aluno
// router.get('/id', authorize(['COORDENACAO', 'DOCENTE', 'ALUNO']), userController.getUser);

module.exports = router;