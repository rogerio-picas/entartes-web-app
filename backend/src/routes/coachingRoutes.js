const express = require('express');
const router = express.Router();
const coachingController = require('../controllers/coachingController');
const tokenValidation = require('../middlewares/authMiddleware');
const { route } = require('./userRoutes');


router.post('/', tokenValidation, coachingController.createNewCoaching);
router.get('/', tokenValidation, coachingController.getAllCoachings);

module.exports = router;