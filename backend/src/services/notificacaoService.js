const prisma = require('../lib/prisma');

const listNotificacoes = async (id_user) => {
    return await prisma.notificacao.findMany({
        where: { id_user: id_user },
        orderBy: { data_envio: 'desc' }
    });
};

const markAsRead = async (id_notificacao, id_user) => {
    const note = await prisma.notificacao.findUnique({ where: { id_notificacao } });

    if (!note || note.id_user !== id_user) {
        throw new Error('Acesso negado');
    }

    return await prisma.notificacao.update({
        where: { id_notificacao },
        data: { lida: true }
    });
};

module.exports = { listNotificacoes, markAsRead };
