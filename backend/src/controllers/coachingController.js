
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const createNewCoaching = async (req, res) => {
    try
    {
        const { 
            id_modalidade, 
            data_a_realizar, 
            hora_inicio, 
            duracao_minutos 
        } = req.body;

        const newScheduling = await prisma.marcacao.create({
            data: {
                id_modalidade: parseInt(id_modalidade),
                id_user_criador: req.user.id,
                data_a_realizar: new Date(data_a_realizar),
                hora_inicio: new Date(`1970-01-01T${hora_inicio}Z`),
                duracao_minutos: parseInt(duracao_minutos),
                id_estado: 1
            }
        });

        res.status(201).json({
            message: "Marcação efetuada com sucesso!",
            details: newScheduling
        });
    }
    catch(error)
    {
        console.error("Erro ao criar marcação:", error);
        res.status(500).json({
            message: "Erro ao processar marcação.", error: error.message
        })
    }
};


const getAllCoachings = async (req, res) =>{
    try
    {
        const coachings = await prisma.marcacao.findMany({
            include: {
                estado_marcacao: true, 
                modalidade: true,      
                sala: true,            
                utilizador: {          
                    select: {
                        nome: true,
                        apelido: true
                    }
                }
            },
            orderBy: {
                data_a_realizar: 'desc'
            }
        });

        res.status(200).json(coachings);
    }
    catch (error)
    {
        console.error("Erro na listagem:", error);
        res.status(500).json({ message: "Ocorreu um erro na listagem de coachings", error: error.message});
    }
};


module.exports = { createNewCoaching, getAllCoachings };
