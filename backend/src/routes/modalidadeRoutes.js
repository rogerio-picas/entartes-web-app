const express = require('express');
const router = express.Router();
const authorize = require('../middlewares/roleCheckMiddleware');
const tokenValidation = require('../middlewares/authMiddleware');
const modalidadeController = require('../controllers/modalidadeController');

/**
 * @swagger
 * /api/modalidades:
 *   get:
 *     summary: Lista todas as modalidades
 *     tags: [Modalidades]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: id_docente
 *         schema:
 *           type: integer
 *         description: Filtra modalidades atribuídas ao docente com este ID
 *       - in: query
 *         name: id_aluno
 *         schema:
 *           type: integer
 *         description: Filtrar modalidades em que um aluno está inscrito (se a role autenticada for Aluno, este filtro aplica-se automaticamente ao seu ID).
 *       - in: query
 *         name: docentes
 *         schema:
 *           type: boolean
 *         description: Se true, inclui os docentes associados a cada modalidade
 *     responses:
 *       200:
 *         description: Lista de modalidades
 *       401:
 *         description: Não autenticado
 *
 *   post:
 *     summary: Cria uma nova modalidade
 *     description: Apenas disponível para administradores (Coordenador).
 *     tags: [Modalidades]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [nome]
 *             properties:
 *               nome:
 *                 type: string
 *                 example: Canto
 *     responses:
 *       201:
 *         description: Modalidade criada com sucesso
 *       400:
 *         description: Dados inválidos
 *       403:
 *         description: Acesso negado — requer perfil de Coordenador
 *
 * /api/modalidades/{id}:
 *   get:
 *     summary: Obtém uma modalidade pelo ID
 *     tags: [Modalidades]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *       - in: query
 *         name: docentes
 *         schema:
 *           type: boolean
 *         description: Se true, inclui os docentes associados à modalidade
 *     responses:
 *       200:
 *         description: Modalidade encontrada
 *       404:
 *         description: Modalidade não encontrada
 *
 *   put:
 *     summary: Atualiza uma modalidade
 *     description: Apenas disponível para administradores (Coordenador).
 *     tags: [Modalidades]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [nome]
 *             properties:
 *               nome:
 *                 type: string
 *                 example: Piano
 *     responses:
 *       200:
 *         description: Modalidade atualizada com sucesso
 *       400:
 *         description: Dados inválidos
 *       404:
 *         description: Modalidade não encontrada
 *       403:
 *         description: Acesso negado — requer perfil de Coordenador
 *
 *   delete:
 *     summary: Elimina uma modalidade
 *     description: Apenas disponível para administradores (Coordenador). Não é possível eliminar se tiver docentes associados.
 *     tags: [Modalidades]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Modalidade eliminada com sucesso
 *       404:
 *         description: Modalidade não encontrada
 *       409:
 *         description: Não é possível eliminar — existem docentes associados
 *       403:
 *         description: Acesso negado — requer perfil de Coordenador
 *
 * /api/modalidades/{id}/docentes:
 *   post:
 *     summary: Associa um docente a uma modalidade
 *     description: Apenas disponível para administradores (Coordenador).
 *     tags: [Modalidades]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID da modalidade
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [id_docente]
 *             properties:
 *               id_docente:
 *                 type: integer
 *                 example: 5
 *     responses:
 *       201:
 *         description: Docente associado com sucesso
 *       400:
 *         description: Dados inválidos
 *       404:
 *         description: Modalidade ou docente não encontrado
 *       409:
 *         description: Docente já está associado a esta modalidade
 *       403:
 *         description: Acesso negado — requer perfil de Coordenador
 *
 * /api/modalidades/{id}/docentes/{id_docente}:
 *   delete:
 *     summary: Desassocia um docente de uma modalidade
 *     description: Apenas disponível para administradores (Coordenador).
 *     tags: [Modalidades]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID da modalidade
 *       - in: path
 *         name: id_docente
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID do docente
 *     responses:
 *       200:
 *         description: Docente desassociado com sucesso
 *       404:
 *         description: Associação não encontrada
 *       403:
 *         description: Acesso negado — requer perfil de Coordenador
 */

router.get('/', tokenValidation, authorize([1, 2, 3]), modalidadeController.listModalidades);
router.get('/:id', tokenValidation, authorize([1, 2, 3]), modalidadeController.getModalidade);
router.post('/', tokenValidation, authorize([1]), modalidadeController.createModalidade);
router.put('/:id', tokenValidation, authorize([1]), modalidadeController.updateModalidade);
router.delete('/:id', tokenValidation, authorize([1]), modalidadeController.deleteModalidade);
router.post('/:id/docentes', tokenValidation, authorize([1]), modalidadeController.associarDocente);
router.delete('/:id/docentes/:id_docente', tokenValidation, authorize([1]), modalidadeController.desassociarDocente);

module.exports = router;
