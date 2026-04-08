const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');

// Rota: GET /api/users
router.get('/', userController.getUsers);

// Rota: GET /api/users/:id (Para obter um único utilizador pelo ID)
router.get('/:id', userController.getUser);

// Rota: POST /api/users (Para inserir dados)
router.post('/', userController.createUser);

module.exports = router;