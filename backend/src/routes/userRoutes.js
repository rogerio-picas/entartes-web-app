const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const authorize = require('../middlewares/userMiddleware');



// router.get('/', userController.getUsers);
// router.get('/:id_utilizador', userController.getUser);

// --- ROTAS DE ACESSO APENAS A COORDENAÇÃO/DIREÇÃO ---

router.get('/', authorize([1]), userController.getUsers); // Apenas Utilizador do Tipo 1 (Coordenadora) possui acesso a este endpoint
router.post('/', userController.createUser); // Apenas Utilizador do Tipo 1 (Coordenadora) possui acesso a este endpoint
router.put('/:id_utilizador', authorize([1]), userController.updateUser); // Apenas Utilizador do Tipo 1 (Coordenadora) possui acesso a este endpoint
router.delete('/:id_utilizador', authorize([1]), userController.deleteUser); // Apenas Utilizador do Tipo 1 (Coordenadora) possui acesso a este endpoint

// --- FIM --- ROTAS DE ACESSO APENAS A COORDENAÇÃO/DIREÇÃO ---

// ROTAS DE ACESSO GERAL [1,2,3] (1- Coordenadora, 2 - Docente, 3 - Aluno)
router.get('/:id_utilizador', authorize([1, 2, 3]), userController.getUser);


module.exports = router;