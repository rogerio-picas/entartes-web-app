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

module.exports = { listSalas, deleteSala };