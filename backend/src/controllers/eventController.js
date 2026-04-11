const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const getEvents = async (req, res) => {
    try
    {
        const events = await prisma.evento.findMany({
            include: {
                utilizador: {
                    select: {nome : true}
                }
            }
        });

        res.status(200).json(events);

    }
    catch(error)
    {
        res.status(500).json({message: "Erro ao listar eventos", error: error.message});
    }
};

const createEvent = async (req, res) => {
    try
    {
        const {nome, descricao, data_de_realizacao} = req.body;
        const newEvent = await prisma.evento.create({
            data: {
                nome,
                descricao,
                data_de_realizacao,
            }
        });
        res.status(200).json(newEvent);

    }
    catch(error)
    {
        res.status(500).json({message: "Erro ao criar evento.", error: error.message});
    }
}

module.exports = { getEvents, createEvent };