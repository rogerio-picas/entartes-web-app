const express = require('express');
const router = express.Router();
const eventController = require('../controllers/eventController');
const authorize = require('../middlewares/userMiddleware');

router.get('/', authorize([1,2,3]), eventController.getEvents);
router.post('/', authorize([1]), eventController.createEvent);

module.exports = router;