const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const createAnuncio = async (req, res) => {
    try {
        const { id_evento, id_grupo, titulo, mensagem } = req.body
        const novo = await prisma.anuncio.create({
            data: {
                id_evento: id_evento ? parseInt(id_evento) : null,
                id_grupo: id_grupo ? parseInt(id_grupo) : null,
                id_coordenadora: req.user.id,
                titulo,
                mensagem,
                data_envio: new Date()
            }
        })
        res.status(201).json(novo)
    } catch (error) {
        res.status(500).json({ error: 'Failed to post announcement' })
    }
}

module.exports = { createAnuncio };

