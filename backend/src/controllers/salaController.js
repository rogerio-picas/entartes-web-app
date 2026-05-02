const salaService = require('../services/salaService');

const listSalas = async (req, res) => {
    try {
        const rooms = await salaService.listSalas();
        res.json(rooms);
    } catch (error) {
        res.status(500).json({ error: 'Erro interno do servidor.' });
    }
};

const deleteSala = async (req, res) => {
    try {
        // CORREÇÃO: ID do parâmetro não era validado antes de chamar o serviço
        const id = parseInt(req.params.id);
        if (isNaN(id)) return res.status(400).json({ error: 'ID da sala inválido' });

        await salaService.deleteSala(id);
        res.json({ message: 'Sala removida com sucesso.' });
    } catch (error) {
        res.status(500).json({ error: 'Conflito: a sala pode estar associada a marcações existentes.' });
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
        res.status(500).json({ error: 'Erro interno do servidor.' });
    }
};

const updateSala = async (req, res) => {
    try {
        // CORREÇÃO: ID do parâmetro não era validado e não se verificava se havia campos para atualizar
        const id = parseInt(req.params.id);
        if (isNaN(id)) return res.status(400).json({ error: 'ID da sala inválido' });

        const { nome, descricao } = req.body;
        if (!nome && !descricao) return res.status(400).json({ error: 'Forneça pelo menos o nome ou a descrição para atualizar' });

        const updatedRoom = await salaService.updateSala(id, nome, descricao);
        res.json(updatedRoom);
    } catch (error) {
        console.error('[salaController.updateSala]', error);
        if (error.message === 'Já existe uma outra sala com esse nome') {
            return res.status(400).json({ error: error.message });
        }
        res.status(500).json({ error: 'Sala não encontrada ou atualização falhou.' });
    }
};

module.exports = { listSalas, deleteSala, createSala, updateSala };