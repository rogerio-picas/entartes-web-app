const { checkScheduleConflict, checkScheduleConflictUpdate } = require('../services/agendaService');

const createAvailabiliby = async (req, res) =>{

    const { id_utilizador, id_tipo } = req.user;
    const { dia_semana, data_especifica, hora_inicio, hora_fim } = req.body;

    if (id_tipo !== 2) return res.status(403).json({ message: "Apenas docentes podem criar disponibilidades de horário." });
    
    const dateToValidate = data_especifica || new Date(); 
        
    const hasConflict = await checkScheduleConflict(
        id_utilizador, 
        dateToValidate, 
        hora_inicio, 
        hora_fim
    );

    if (hasConflict) {
        return res.status(400).json({ 
            message: "Conflito de horário detectado! Já tens uma marcação ou disponibilidade neste período." 
        });
    }

    try
    {
        const newAvailability = await prisma.dispobilidade.create({
            data: {
                id_docente: id_utilizador,
                dia_semana: dia_semana ? parseInt(dia_semana) : null,
                data_especifica: data_especifica ? new Date(data_especifica) : null,
                // O Prisma/Postgres TIME(6) aceita strings "HH:mm:ss" ou objetos Date
                hora_inicio: new Date(`1970-01-01T${hora_inicio}Z`),
                hora_fim: new Date(`1970-01-01T${hora_fim}Z`)
            }
        });

        res.status(201).json({
            message: "Disponibilidade criada com sucesso!",
            data: newAvailability
        });
    }
    catch (error) {
        console.error("Erro no createAvailability:", error);
        res.status(500).json({ message: "Erro ao criar disponibilidade.", error: error.message });
    }
}

const updateAvailability = async(req, res) => {

    const {id_utilizador, id_tipo} = req.user;
    const { id_disponibilidade } = req.params;
    const { dia_semana, data_especifica, hora_inicio, hora_fim } = req.body;

    if (id_tipo !== 2) return res.status(403).json({ message: "Apenas docentes podem atualizar disponibilidades de horário." });
    
    try
    {
        const existing = await prisma.disponibilidade.findUnique({
            where: { id_disponibilidade: parseInt(id_disponibilidade) }
            });

        if (!existing || existing.id_docente !== id_utilizador) {
            return res.status(404).json({ message: "Disponibilidade não encontrada ou não te pertence." });
        }
        const dateToValidate = data_especifica || existing.data_especifica || new Date();
        const hasConflict = await checkScheduleConflictUpdate(
                id_disponibilidade,
                id_utilizador,     
                dateToValidate, 
                hora_inicio, 
                hora_fim
            );

        if (hasConflict) {
            return res.status(400).json({ message: "O novo horário entra em conflito com outra disponibilidade." });
        }
        
        const update = await prisma.disponibilidade.update({
            where: { id_disponibilidade: parseInt(id_disponibilidade) },
            data: {
                dia_semana: dia_semana !== undefined ? parseInt(dia_semana) : existing.dia_semana,
                data_especifica: data_especifica ? new Date(data_especifica) : existing.data_especifica,
                hora_inicio: new Date(`1970-01-01T${hora_inicio}Z`),
                hora_fim: new Date(`1970-01-01T${hora_fim}Z`)
            }
        });

        res.status(201).json({
            message: "Disponibilidade criada com sucesso!",
            data: newAvailability
        });
    }
    catch (error) {
        console.error("Erro no createAvailability:", error);
        res.status(500).json({ message: "Erro ao criar disponibilidade.", error: error.message });
    }
}

const deleteAvailability = async(req, res) =>{
    const {id_utilizador, id_tipo} = req.user;
    const { id_disponibilidade } = req.params;

    if (id_tipo !== 2) return res.status(403).json({ message: "Apenas docentes podem remover as suas disponibilidades de horário." });

    try
    {
        const existing = await prisma.dispobilidade.findUnique({
            where: {id_disponibilidade: parseInt(id_disponibilidade)},
            include: {marcacao: true}
        });

        if (!existing) {
            return res.status(404).json({ message: "Disponibilidade não encontrada." });
        }

        if (existing.id_docente !== id_utilizador) {
            return res.status(403).json({ message: "Não tens permissão para eliminar esta disponibilidade." });
        }

        if (existing.marcacao) {
            return res.status(400).json({ 
                message: "Não podes eliminar um horário que já tem uma marcação ativa. Deves cancelar a marcação primeiro." 
            });
        }

        await prisma.disponibilidade.delete({
            where: { id_disponibilidade: parseInt(id_disponibilidade) }
        });

        res.status(200).json({ message: "Disponibilidade eliminada com sucesso." });
    }
    catch(error)
    {
        if (error.code === 'P2003') {
            return res.status(400).json({ message: "Erro: Esta disponibilidade está a ser usada noutro registo." });
        }
        res.status(500).json({ message: "Erro ao eliminar disponibilidade.", error: error.message });
    }
};





module.exports = { createAvailabiliby, updateAvailability, deleteAvailability };