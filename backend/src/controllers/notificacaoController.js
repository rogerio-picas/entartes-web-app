const notificacaoService = require('../services/notificacaoService');

const listNotificacoes = async (req, res) => {
    try {
        const list = await notificacaoService.listNotificacoes(req.user.id);
        res.json(list);
    } catch (error) {
        res.status(500).json({ error: 'Erro interno do servidor.' });
    }
}

const markAsRead = async (req, res) => {
    try {
        const id = parseInt(req.params.id);
        if (isNaN(id)) {
            return res.status(400).json({ error: 'ID inválido' });
        }

        const updated = await notificacaoService.markAsRead(id, req.user.id);
        res.json(updated);
    } catch (error) {
        if (error.message === 'Acesso negado') {
            return res.status(403).json({ error: 'Acesso negado' });
        }
        res.status(500).json({ error: 'Erro interno do servidor.' });
    }
}

module.exports = { listNotificacoes, markAsRead };