
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const checkScheduleConflict = async (id_docente, data, hora_inicio, hora_fim) => {
    const dataObject = new Date(data);
    dataObject.setUTCHours(0, 0, 0, 0); // Normaliza para o início do dia
    
    const diaSemana = dataObject.getDay(); 

    // IMPORTANTE: O NeonDB/Prisma para campos TIME espera a data base 1970-01-01
    // Vamos converter as strings "HH:mm" que vêm do frontend para objetos Date compatíveis
    const baseDate = "1970-01-01T";
    const h_inicio = new Date(`${baseDate}${hora_inicio}Z`);
    const h_fim = new Date(`${baseDate}${hora_fim}Z`);

    const conflito = await prisma.disponibilidade.findFirst({
        where: {
            id_docente: id_docente,
            OR: [
                { data_especifica: dataObject },
                { dia_semana: diaSemana }
            ],
            // Comparação de horários (Overlap Logic)
            AND: [
                { hora_inicio: { lt: h_fim } },
                { hora_fim: { gt: h_inicio } }
            ]
        }
    });

    return !!conflito;
};

const checkScheduleConflictUpdate = async (id_docente, data, hora_inicio, hora_fim) => {
    const dataObject = new Date(data);
    dataObject.setUTCHours(0, 0, 0, 0); // Normaliza para o início do dia
    
    const diaSemana = dataObject.getDay(); 

    // IMPORTANTE: O NeonDB/Prisma para campos TIME espera a data base 1970-01-01
    // Vamos converter as strings "HH:mm" que vêm do frontend para objetos Date compatíveis
    const baseDate = "1970-01-01T";
    const h_inicio = new Date(`${baseDate}${hora_inicio}Z`);
    const h_fim = new Date(`${baseDate}${hora_fim}Z`);

    const conflito = await prisma.disponibilidade.findFirst({
        where: {
            id_disponibilidade: { not: id_disponibilidade },
            id_docente: id_docente,
            OR: [
                { data_especifica: dataObject },
                { dia_semana: diaSemana }
            ],
            // Comparação de horários (Overlap Logic)
            AND: [
                { hora_inicio: { lt: h_fim } },
                { hora_fim: { gt: h_inicio } }
            ]
        }
    });

    return !!conflito;
};

module.exports = { checkScheduleConflict, checkScheduleConflictUpdate };