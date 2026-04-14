const express = require('express');
const router = express.Router();
const authorize = require('../controllers/roleCheckMiddleware');
const tokenValidation = require('../middlewares/authMiddleware');


router.use(tokenValidation, authorize([1]));
router.get('/', tokenValidation, authorize([1]), salaController.listSalas);
router.delete('/:id', tokenValidation, authorize([1]), salaController.deleteSala);

module.exports = router;