const express = require('express');
const router = express.Router();
const authorize = require('../middlewares/roleCheckMiddleware');
const tokenValidation = require('../middlewares/authMiddleware');
const relController = require('../controllers/relatorioController');

router.use(tokenValidation, authorize([1]));
router.get('/sessoes', tokenValidation, authorize([1]), relController.getSessoesRelatorio);
router.get('/horas-docente',tokenValidation, authorize([1]), relController.getHorasDocente);
router.get('/alunos', tokenValidation, authorize([1]), relController.getAlunosRelatorio);
router.get('/exportar', tokenValidation, authorize([1]), relController.exportCSV);

module.exports = router;