const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const listNotificacoes = async (req, res) => {
    try {
        const list = await prisma.notificacao.findMany({
            where: { id_user: req.user.id },
            orderBy: { data_envio: 'desc' }
        })
        res.json(list)
    } catch (error) {
        res.status(500).json({ error: 'Internal server error' })
    }
}

const markAsRead = async (req, res) => {
    try {
        const id = parseInt(req.params.id)
        const note = await prisma.notificacao.findUnique({ where: { id_notificacao: id } })
        if (!note || note.id_user !== req.user.id) return res.status(403).json({ error: 'Unauthorized' })

        const updated = await prisma.notificacao.update({
            where: { id_notificacao: id },
            data: { lida: true }
        })
        res.json(updated)
    } catch (error) {
        res.status(500).json({ error: 'Internal server error' })
    }
}

module.exports = { listNotificacoes, markAsRead };