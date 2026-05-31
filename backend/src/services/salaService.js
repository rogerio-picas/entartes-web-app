
const prisma = require('../prismaClient');

/**
 * Lista todas as salas ordenadas por nome
 */
const listSalas = async () => {
    return await prisma.sala.findMany({ orderBy: { nome: 'asc' } });
};

/**
 * Elimina uma sala pelo ID
 */
const deleteSala = async (id) => {
    return await prisma.sala.delete({ where: { id_sala: id } });
};

/**
 * Cria uma nova sala
 */
const createSala = async (nome, descricao) => {
    if (!nome) {
        throw new Error('Nome da sala é obrigatório');
    }

    const existing = await prisma.sala.findFirst({
        where: { nome: { equals: nome, mode: 'insensitive' } }
    });

    if (existing) {
        throw new Error('Já existe uma sala com esse nome');
    }

    return await prisma.sala.create({
        data: { nome, descricao }
    });
};

/**
 * Atualiza uma sala existente
 */
const updateSala = async (id, nome, descricao) => {
    if (nome) {
        const existing = await prisma.sala.findFirst({
            where: {
                nome: { equals: nome, mode: 'insensitive' },
                NOT: { id_sala: id }
            }
        });

        if (existing) {
            throw new Error('Já existe uma outra sala com esse nome');
        }
    }

    return await prisma.sala.update({
        where: { id_sala: id },
        data: { nome, descricao }
    });
};

module.exports = { listSalas, deleteSala, createSala, updateSala };
