const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const listSalas = async (req, res) => {
    try {
        const rooms = await prisma.sala.findMany({ orderBy: { nome: 'asc' } });
        res.json(rooms)
    } catch (error) {
        res.status(500).json({ error: 'Internal server error' })
    }
}

const deleteSala = async (req, res) => {
    try {
        const id = parseInt(req.params.id)
        await prisma.sala.delete({ where: { id_sala: id } });
        res.json({ message: 'Room removed' });
    } catch (error) {
        res.status(500).json({ error: 'Conflict: Room might be linked to existing bookings' })
    }
}

const createSala = async (req, res) => {
    try {
        const { nome, descricao } = req.body;
        if (!nome) {
            return res.status(400).json({ error: 'Nome da sala é obrigatório' });
        }
        const existing = await prisma.sala.findFirst({
            where: { nome: { equals: nome, mode: 'insensitive' } }
        });
        if (existing) {
            return res.status(400).json({ error: 'Já existe uma sala com esse nome' });
        }

        const newRoom = await prisma.sala.create({
            data: { nome, descricao }
        });
        res.status(201).json(newRoom);
    } catch (error) {
        console.error('[salaController.createSala]', error);
        res.status(500).json({ error: 'Internal server error' });
    }
}

const updateSala = async (req, res) => {
    try {
        const id = parseInt(req.params.id);
        const { nome, descricao } = req.body;
        if (nome) {
            const existing = await prisma.sala.findFirst({
                where: {
                    nome: { equals: nome, mode: 'insensitive' },
                    NOT: { id_sala: id }
                }
            });
            if (existing) {
                return res.status(400).json({ error: 'Já existe uma outra sala com esse nome' });
            }
        }

        const updatedRoom = await prisma.sala.update({
            where: { id_sala: id },
            data: { nome, descricao }
        });
        res.json(updatedRoom);
    } catch (error) {
        console.error('[salaController.updateSala]', error);
        res.status(500).json({ error: 'Room not found or update failed' });
    }
}

module.exports = { listSalas, deleteSala, createSala, updateSala };