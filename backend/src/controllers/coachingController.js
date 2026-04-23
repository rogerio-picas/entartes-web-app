
// const { PrismaClient } = require('@prisma/client');
// const prisma = new PrismaClient();

// const createNewCoaching = async (req, res) => {
//     try {
//         const {
//             id_modalidade,
//             id_sala,
//             data_a_realizar,
//             hora_inicio,
//             duracao_minutos
//         } = req.body;

//         const roomConflict = await prisma.marcacao.findFirst({
//             where: {
//                 id_sala: parseInt(id_sala),
//                 data_a_realizar: new Date(data_a_realizar),
//                 hora_inicio: new Date(`1970-01-01T${hora_inicio}Z`)
//             }
//         });

//         if (roomConflict) return res.status(400).json({ message: "Sala ocupada neste horário!" });

//         const newScheduling = await prisma.marcacao.create({
//             data: {
//                 id_modalidade: parseInt(id_modalidade),
//                 id_sala: parseInt(id_sala),
//                 id_user_criador: req.user.id,
//                 data_a_realizar: new Date(data_a_realizar),
//                 hora_inicio: new Date(`1970-01-01T${hora_inicio}Z`),
//                 duracao_minutos: parseInt(duracao_minutos),
//                 id_estado: 1
//             }
//         });

//         res.status(201).json({
//             message: "Marcação efetuada com sucesso!",
//             details: newScheduling
//         });
//     }
//     catch (error) {
//         console.error("Erro ao criar marcação:", error);
//         res.status(500).json({
//             message: "Erro ao processar marcação.", error: error.message
//         })
//     }
// };

// const getAllCoachings = async (req, res) => {
//     try {
//         const coachings = await prisma.marcacao.findMany({
//             include: {
//                 estado_marcacao: true,
//                 modalidade: true,
//                 sala: true,
//                 utilizador: {
//                     select: {
//                         nome: true,
//                         apelido: true
//                     }
//                 }
//             },
//             orderBy: {
//                 data_a_realizar: 'desc'
//             }
//         });

//         res.status(200).json(coachings);
//     }
//     catch (error) {
//         console.error("Erro na listagem:", error);
//         res.status(500).json({ message: "Ocorreu um erro na listagem de coachings", error: error.message });
//     }
// };

// const getCoachingById = async (req, res) => {
//     try {
//         const { id_utilizador } = req.params;
//         const coaching = await prisma.marcacao.findUnique({
//             where: { id_marcacoes: parseInt(id_utilizador) },
//             include: {
//                 estado_marcacao: true,
//                 modalidade: true,
//                 sala: true,
//                 utilizador: {
//                     select: {
//                         nome: true,
//                         apelido: true
//                     }
//                 }
//             }
//         });

//         if (!coaching) {
//             return res.status(404).json({ message: "Coaching não encontrado." });
//         }

//         res.status(200).json(coaching);
//     }
//     catch (error) {
//         console.error("Erro na consulta:", error);
//         res.status(500).json({ message: "Ocorreu um erro na consulta do coaching", error: error.message });
//     }
// };

// const deleteCoaching = async (req, res) => {
//     try {
//         const { id_utilizador } = req.params;
//         const deletedCoaching = await prisma.marcacao.delete({
//             where: { id_marcacoes: parseInt(id_utilizador) },
//             include: {
//                 estado_marcacao: true,
//                 modalidade: true,
//                 sala: true
//             }
//         });

//         res.status(200).json({
//             message: "Coaching eliminado com sucesso!",
//             details: deletedCoaching
//         });
//     }
//     catch (error) {
//         console.error("Erro na eliminação:", error);
//         res.status(500).json({ message: "Ocorreu um erro na eliminação do coaching", error: error.message });
//     }
// };

// const updateCoaching = async (req, res) => {
//     try {
//         const { id_utilizador } = req.params;
//         const {
//             id_modalidade,
//             data_a_realizar,
//             hora_inicio,
//             duracao_minutos
//         } = req.body;

//         const updatedCoaching = await prisma.marcacao.update({
//             where: { id_marcacoes: parseInt(id_utilizador) },
//             data: {
//                 id_modalidade: parseInt(id_modalidade),
//                 data_a_realizar: new Date(data_a_realizar),
//                 hora_inicio: new Date(`1970-01-01T${hora_inicio}Z`),
//                 duracao_minutos: parseInt(duracao_minutos)
//             }
//         });

//         res.status(200).json({
//             message: "Coaching atualizado com sucesso!",
//             details: updatedCoaching
//         });
//     }
//     catch (error) {
//         console.error("Erro na atualização:", error);
//         res.status(500).json({ message: "Ocorreu um erro na atualização do coaching", error: error.message });
//     }
// };

// // FUNCOES ALUNO E DOCENTE - COACHINGS --------------------------------------------
// const getMyCoachings = async (req, res) => {
//     try {
//         const { id: id_utilizador, role: id_tipo } = req.user;

//         let queryFilter = {};

//         if (id_tipo == 1) queryFilter = { id_user_criador: id_utilizador };
//         else if (id_tipo == 2) queryFilter = { id_docente: id_utilizador };
//         else if (id_tipo == 3) queryFilter = {};
//         else return res.status(403).json({ message: "Tipo de utilizador inválido!" });

//         const marcacao = await prisma.marcacao.findMany({
//             where: queryFilter,
//             include: {
//                 modalidade: true,
//                 estado_marcacao: true,
//                 utilizador: {
//                     select: { nome: true, apelido: true, email: true }
//                 }
//             }
//         });

//         res.status(200).json(marcacao);

//     }
//     catch (error) {
//         res.status(500).json({ message: "Erro ao carregar coachings.", error: error.message });
//     }

// };



// module.exports = { createNewCoaching, getAllCoachings, getCoachingById, deleteCoaching, updateCoaching, getMyCoachings };
