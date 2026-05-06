const express = require('express');
const router = express.Router();
const tokenValidation = require('../middlewares/authMiddleware');
const authorize = require('../middlewares/roleCheckMiddleware');

const anuncioController = require('../controllers/anuncioController');

// --- ROTAS DE ANÚNCIOS ---

/**
 * @swagger
 * /api/anuncios:
 *   get:
 *     summary: Listar todos os anúncios
 *     tags: [Anúncios]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Lista de anúncios
 */
router.get('/', tokenValidation, authorize([1, 2, 3]), anuncioController.getAllAnuncios);

/**
 * @swagger
 * /api/anuncios:
 *   post:
 *     summary: Criar novo anúncio
 *     tags: [Anúncios]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               titulo:
 *                 type: string
 *               mensagem:
 *                 type: string
 *               id_evento:
 *                 type: integer
 *               id_grupo:
 *                 type: integer
 *     responses:
 *       201:
 *         description: Anúncio criado com sucesso
 */
router.post('/', tokenValidation, authorize([1]), anuncioController.createAnuncio);

/**
 * @swagger
 * /api/anuncios/{id_anuncio}:
 *   get:
 *     summary: Obter anúncio por ID
 *     tags: [Anúncios]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id_anuncio
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Anúncio encontrado
 *       404:
 *         description: Anúncio não encontrado
 */
router.get('/:id_anuncio', tokenValidation, authorize([1, 2, 3]), anuncioController.getAnuncioById);

/**
 * @swagger
 * /api/anuncios/{id_anuncio}:
 *   put:
 *     summary: Atualizar anúncio
 *     tags: [Anúncios]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id_anuncio
 *         required: true
 *         schema:
 *           type: integer
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               titulo:
 *                 type: string
 *               mensagem:
 *                 type: string
 *     responses:
 *       200:
 *         description: Anúncio atualizado com sucesso
 */
router.put('/:id_anuncio', tokenValidation, authorize([1]), anuncioController.updateAnuncio);

/**
 * @swagger
 * /api/anuncios/{id_anuncio}:
 *   delete:
 *     summary: Eliminar anúncio
 *     tags: [Anúncios]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id_anuncio
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Anúncio eliminado com sucesso
 */
router.delete('/:id_anuncio', tokenValidation, authorize([1]), anuncioController.removeAnuncio);

/**
 * @swagger
 * /api/anuncios/evento/{id_evento}:
 *   post:
 *     summary: Publicar anúncio num evento
 *     tags: [Anúncios]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id_evento
 *         required: true
 *         schema:
 *           type: integer
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               titulo:
 *                 type: string
 *               mensagem:
 *                 type: string
 *     responses:
 *       201:
 *         description: Anúncio publicado no evento com sucesso
 *
 *   get:
 *     summary: Listar anúncios de um evento
 *     tags: [Anúncios]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id_evento
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Lista de anúncios do evento
 */
router.post('/evento/:id_evento', tokenValidation, authorize([1]), anuncioController.publicarNoEvento);
router.get('/evento/:id_evento', tokenValidation, authorize([1, 2, 3]), anuncioController.getAnunciosByEvento);

/**
 * @swagger
 * /api/anuncios/grupo/{id_grupo}:
 *   post:
 *     summary: Publicar anúncio num grupo
 *     tags: [Anúncios]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id_grupo
 *         required: true
 *         schema:
 *           type: integer
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               titulo:
 *                 type: string
 *               mensagem:
 *                 type: string
 *     responses:
 *       201:
 *         description: Anúncio publicado no grupo com sucesso
 *
 *   get:
 *     summary: Listar anúncios de um grupo
 *     tags: [Anúncios]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id_grupo
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Lista de anúncios do grupo
 */
router.post('/grupo/:id_grupo', tokenValidation, authorize([1]), anuncioController.publicarNoGrupo);
router.get('/grupo/:id_grupo', tokenValidation, authorize([1, 2, 3]), anuncioController.getAnunciosByGrupo);

module.exports = router;