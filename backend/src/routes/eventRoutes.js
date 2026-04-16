const express = require("express");
const router = express.Router();
const tokenValidation = require("../middlewares/authMiddleware");
const authorize = require('../middlewares/roleCheckMiddleware');

const eventController = require("../controllers/eventController");
const groupController = require("../controllers/groupController");

// --- ROTAS DE EVENTOS ---
router.get("/", authorize([1,2,3]), tokenValidation, eventController.listarEventos);
router.get("/:id", authorize([1,2,3]), tokenValidation, eventController.buscarEventoPorId);
router.post("/", authorize([1]), tokenValidation, eventController.criarEvento);
router.post("/:id/participantes", authorize([1]), tokenValidation, eventController.adicionarParticipante);
router.get("/:id/participantes", authorize([1]), tokenValidation, eventController.listarParticipantes);



module.exports = router;