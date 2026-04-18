const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

/**
 * GET /api/aulas
 * Lista todas as marcações com docente, modalidade, sala e estado.
 * Filtra apenas as marcações com data_a_realizar nas próximas 48h (para confirmação).
 * Acesso: coordenadora (role 1)
 */
const getAulasParaConfirmar = async (req, res) => {
    try {
        const agora = new Date();
        const limite48h = new Date(agora.getTime() + 48 * 60 * 60 * 1000);

        const marcacoes = await prisma.marcacao.findMany({
            where: {
                data_a_realizar: {
                    gte: agora,
                    lte: limite48h
                }
            },
            include: {
                estado_marcacao: true,
                modalidade: true,
                sala: true,
                docente: {
                    include: {
                        utilizador: {
                            select: { nome: true, apelido: true }
                        }
                    }
                },
                aluno_marcacao: {
                    include: {
                        aluno: {
                            include: {
                                utilizador: {
                                    select: { nome: true, apelido: true }
                                }
                            }
                        }
                    }
                }
            },
            orderBy: [
                { data_a_realizar: 'asc' },
                { hora_inicio: 'asc' }
            ]
        });

        res.status(200).json(marcacoes);
    } catch (error) {
        console.error('Erro ao listar aulas para confirmar:', error);
        res.status(500).json({ message: 'Erro ao listar aulas.', error: error.message });
    }
};

/**
 * GET /api/aulas/todas
 * Lista todas as marcações sem filtro de data.
 * Acesso: coordenadora (role 1)
 */
const getAllAulas = async (req, res) => {
    try {
        const marcacoes = await prisma.marcacao.findMany({
            include: {
                estado_marcacao: true,
                modalidade: true,
                sala: true,
                docente: {
                    include: {
                        utilizador: {
                            select: { nome: true, apelido: true }
                        }
                    }
                },
                aluno_marcacao: {
                    include: {
                        aluno: {
                            include: {
                                utilizador: {
                                    select: { nome: true, apelido: true }
                                }
                            }
                        }
                    }
                }
            },
            orderBy: [
                { data_a_realizar: 'desc' },
                { hora_inicio: 'asc' }
            ]
        });

        res.status(200).json(marcacoes);
    } catch (error) {
        console.error('Erro ao listar todas as aulas:', error);
        res.status(500).json({ message: 'Erro ao listar aulas.', error: error.message });
    }
};

/**
 * PATCH /api/aulas/:id/estado
 * Atualiza o estado de uma marcação e regista no histórico.
 * Body: { id_estado: number }
 * Acesso: coordenadora (role 1) ou docente da marcação (role 2)
 *
 * Estados esperados na tabela estado_marcacao:
 *   1 = Pendente
 *   2 = Confirmada
 *   3 = Cancelada
 *   4 = Concluída
 */
const updateEstadoAula = async (req, res) => {
    try {
        const { id } = req.params;
        const { id_estado } = req.body;

        if (!id_estado) {
            return res.status(400).json({ message: 'id_estado é obrigatório.' });
        }

        const marcacaoId = parseInt(id);

        // Verificar se a marcação existe
        const existing = await prisma.marcacao.findUnique({
            where: { id_marcacoes: marcacaoId }
        });

        if (!existing) {
            return res.status(404).json({ message: 'Marcação não encontrada.' });
        }

        // Atualizar estado + registar no histórico (transação atómica)
        const [marcacaoAtualizada] = await prisma.$transaction([
            prisma.marcacao.update({
                where: { id_marcacoes: marcacaoId },
                data: { id_estado: parseInt(id_estado) },
                include: {
                    estado_marcacao: true,
                    modalidade: true,
                    sala: true,
                    docente: {
                        include: {
                            utilizador: {
                                select: { nome: true, apelido: true }
                            }
                        }
                    }
                }
            }),
            prisma.marcacao_estado_historico.create({
                data: {
                    id_marcacoes: marcacaoId,
                    id_estado: parseInt(id_estado),
                    data_alteracao: new Date()
                }
            })
        ]);

        res.status(200).json({
            message: 'Estado atualizado com sucesso.',
            marcacao: marcacaoAtualizada
        });
    } catch (error) {
        console.error('Erro ao atualizar estado da aula:', error);
        res.status(500).json({ message: 'Erro ao atualizar estado.', error: error.message });
    }
};

module.exports = { getAulasParaConfirmar, getAllAulas, updateEstadoAula };