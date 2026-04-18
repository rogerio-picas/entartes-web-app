const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const authorize = require('../middlewares/roleCheckMiddleware');
const tokenValidation = require('../middlewares/authMiddleware');


// --- ROTAS DE ACESSO APENAS A COORDENAÇÃO/DIREÇÃO ---

/**
 * @swagger
 * /api/users:
 *   get:
 *     summary: Lista todos os utilizadores
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Sucesso
 *   post:
 *     summary: Cria um novo utilizador
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               nome:
 *                 type: string
 *               apelido:
 *                 type: string
 *               codigo_username:
 *                 type: string
 *               password:
 *                 type: string
 *               id_tipo_utilizador:
 *                 type: integer
 *                 description: 1 - Coordenadora, 2 - Docente, 3 - Aluno
 *             example:
 *               nome: "João"
 *               apelido: "Silva"
 *               email: "joaosilva@joaosilva.pt"
 *               codigo_username: "jsilva"
 *               password: "password123"
 *               telemovel: "944995678"
 *               nif: "231333321"
 *               data_nascimento: "1997-02-02"
 *               id_tipo: 3
 *               
 *     responses:
 *       201:
 *         description: Criado com sucesso
 * 
 * /api/users/{id_utilizador}:
 *   get:
 *     summary: Retorna os detalhes de um utilizador específico
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id_utilizador
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Sucesso
 *   put:
 *     summary: Atualiza um utilizador
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id_utilizador
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Sucesso
 *   delete:
 *     summary: Apaga um utilizador
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id_utilizador
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Sucesso
 */


router.get('/', tokenValidation, authorize([1]), userController.getUsers); // Apenas Utilizador do Tipo 1 (Coordenadora) possui acesso a este endpoint
router.post('/',tokenValidation, authorize([1]), userController.createUser); // Apenas Utilizador do Tipo 1 (Coordenadora) possui acesso a este endpoint
router.put('/:id_utilizador',tokenValidation, authorize([1]), userController.updateUser); // Apenas Utilizador do Tipo 1 (Coordenadora) possui acesso a este endpoint
router.delete('/:id_utilizador', tokenValidation, authorize([1]), userController.deleteUser); // Apenas Utilizador do Tipo 1 (Coordenadora) possui acesso a este endpoint

// --- FIM --- ROTAS DE ACESSO APENAS A COORDENAÇÃO/DIREÇÃO ---

// ROTAS DE ACESSO GERAL [1,2,3] (1- Coordenadora, 2 - Docente, 3 - Aluno)
router.get('/:id_utilizador', tokenValidation, authorize([1, 2, 3]), userController.getUser);


module.exports = router;