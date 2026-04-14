const express = require('express');
const router = express.Router();
const authorize = require('../controllers/roleCheckMiddleware');
const tokenValidation = require('../middlewares/authMiddleware');


router.use(tokenValidation, authorize[1]);
router.post('/', authorize[1,2], tokenValidation, anuncioController.createAnuncio);

module.exports = router;