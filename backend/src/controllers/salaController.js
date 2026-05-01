const salaService = require('../services/salaService');

const listSalas = async (req, res) => {
    try {
        const rooms = await salaService.listSalas();
        res.json(rooms);
    } catch (error) {
        res.status(500).json({ error: 'Internal server error' });
    }
};

const deleteSala = async (req, res) => {
    try {
        const id = parseInt(req.params.id);
        await salaService.deleteSala(id);
        res.json({ message: 'Room removed' });
    } catch (error) {
        res.status(500).json({ error: 'Conflict: Room might be linked to existing bookings' });
    }
};

const createSala = async (req, res) => {
    try {
        const { nome, descricao } = req.body;
        const newRoom = await salaService.createSala(nome, descricao);
        res.status(201).json(newRoom);
    } catch (error) {
        console.error('[salaController.createSala]', error);
        if (error.message === 'Nome da sala é obrigatório' ||
            error.message === 'Já existe uma sala com esse nome') {
            return res.status(400).json({ error: error.message });
        }
        res.status(500).json({ error: 'Internal server error' });
    }
};

const updateSala = async (req, res) => {
    try {
        const id = parseInt(req.params.id);
        const { nome, descricao } = req.body;
        const updatedRoom = await salaService.updateSala(id, nome, descricao);
        res.json(updatedRoom);
    } catch (error) {
        console.error('[salaController.updateSala]', error);
        if (error.message === 'Já existe uma outra sala com esse nome') {
            return res.status(400).json({ error: error.message });
        }
        res.status(500).json({ error: 'Room not found or update failed' });
    }
};

module.exports = { listSalas, deleteSala, createSala, updateSala };