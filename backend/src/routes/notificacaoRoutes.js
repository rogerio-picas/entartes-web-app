const express = require('express');
const router = express.Router();
const authorize = require('../controllers/roleCheckMiddleware');
const tokenValidation = require('../middlewares/authMiddleware');


router.use(authorize([1,2,3]), tokenValidation);
router.get('/', authorize([1,2,3]), tokenValidation, notificacaoController.listNotificacoes);
router.patch('/:id/lida', authorize([1,2,3]), tokenValidation, notificacaoController.markAsRead);

module.exports = router;