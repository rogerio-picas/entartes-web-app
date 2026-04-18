const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

/**
 * GET /api/horario/minhas-aulas
 * Retorna as marcações do utilizador autenticado (aluno ou docente).
 *
 * Para alunos (role 3): marcações em que o aluno está inscrito (aluno_marcacao)
 * Para docentes (role 2): marcações atribuídas ao docente
 * Para coordenadora (role 1): todas as marcações
 */
const getMinhasAulas = async (req, res) => {
    try {
        const { id: id_utilizador, role } = req.user;

        let marcacoes = [];

        if (role === 3) {
            // Aluno: busca marcações via aluno_marcacao
            const alunoMarcacoes = await prisma.aluno_marcacao.findMany({
                where: { id_aluno: id_utilizador },
                include: {
                    marcacao: {
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
                    }
                },
                orderBy: {
                    marcacao: { data_a_realizar: 'asc' }
                }
            });

            marcacoes = alunoMarcacoes
                .filter(am => am.marcacao)
                .map(am => am.marcacao);

        } else if (role === 2) {
            // Docente: marcações atribuídas
            marcacoes = await prisma.marcacao.findMany({
                where: { id_docente: id_utilizador },
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
                                    utilizador: { select: { nome: true, apelido: true } }
                                }
                            }
                        }
                    }
                },
                orderBy: { data_a_realizar: 'asc' }
            });

        } else {
            // Coordenadora: todas
            marcacoes = await prisma.marcacao.findMany({
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
                                    utilizador: { select: { nome: true, apelido: true } }
                                }
                            }
                        }
                    }
                },
                orderBy: { data_a_realizar: 'asc' }
            });
        }

        res.status(200).json(marcacoes);
    } catch (error) {
        console.error('Erro ao buscar horário:', error);
        res.status(500).json({ message: 'Erro ao carregar horário.', error: error.message });
    }
};

/**
 * GET /api/horario/minhas-aulas/:id
 * Detalhes completos de uma marcação específica.
 */
const getAulaDetalhe = async (req, res) => {
    try {
        const { id } = req.params;
        const { id: id_utilizador, role } = req.user;

        const marcacao = await prisma.marcacao.findUnique({
            where: { id_marcacoes: parseInt(id) },
            include: {
                estado_marcacao: true,
                modalidade: true,
                sala: true,
                docente: {
                    include: {
                        utilizador: {
                            select: { nome: true, apelido: true, email: true, telemovel: true }
                        }
                    }
                },
                aluno_marcacao: {
                    include: {
                        aluno: {
                            include: {
                                utilizador: { select: { nome: true, apelido: true, email: true } }
                            }
                        }
                    }
                },
                marcacao_estado_historico: {
                    include: { estado_marcacao: true },
                    orderBy: { data_alteracao: 'desc' }
                }
            }
        });

        if (!marcacao) {
            return res.status(404).json({ message: 'Aula não encontrada.' });
        }

        // Verificar permissão: aluno só pode ver as suas próprias marcações
        if (role === 3) {
            const pertence = marcacao.aluno_marcacao.some(am => am.id_aluno === id_utilizador);
            if (!pertence) {
                return res.status(403).json({ message: 'Acesso negado.' });
            }
        }

        res.status(200).json(marcacao);
    } catch (error) {
        console.error('Erro ao buscar detalhe da aula:', error);
        res.status(500).json({ message: 'Erro ao carregar aula.', error: error.message });
    }
};

/**
 * POST /api/horario/inscrever
 * Inscreve o aluno autenticado numa marcação existente.
 * Body: { id_marcacoes: number }
 */
const inscreverEmAula = async (req, res) => {
    try {
        const { id: id_utilizador, role } = req.user;
        const { id_marcacoes } = req.body;

        if (role !== 3) {
            return res.status(403).json({ message: 'Apenas alunos podem inscrever-se em aulas.' });
        }

        if (!id_marcacoes) {
            return res.status(400).json({ message: 'id_marcacoes é obrigatório.' });
        }

        const marcacao = await prisma.marcacao.findUnique({
            where: { id_marcacoes: parseInt(id_marcacoes) },
            include: { aluno_marcacao: true }
        });

        if (!marcacao) {
            return res.status(404).json({ message: 'Aula não encontrada.' });
        }

        // Verificar limite de alunos
        if (marcacao.numero_alunos_pretendidos !== null &&
            marcacao.aluno_marcacao.length >= marcacao.numero_alunos_pretendidos) {
            return res.status(400).json({ message: 'Esta aula já atingiu o número máximo de alunos.' });
        }

        // Verificar se já está inscrito
        const jaInscrito = marcacao.aluno_marcacao.some(am => am.id_aluno === id_utilizador);
        if (jaInscrito) {
            return res.status(400).json({ message: 'Já estás inscrito nesta aula.' });
        }

        const inscricao = await prisma.aluno_marcacao.create({
            data: {
                id_aluno: id_utilizador,
                id_marcacoes: parseInt(id_marcacoes),
                data_resposta: new Date()
            }
        });

        res.status(201).json({ message: 'Inscrição realizada com sucesso!', inscricao });
    } catch (error) {
        console.error('Erro ao inscrever em aula:', error);
        res.status(500).json({ message: 'Erro ao inscrever.', error: error.message });
    }
};

/**
 * GET /api/horario/disponiveis
 * Lista todas as marcações disponíveis para inscrição (estado pendente/confirmada, no futuro).
 */
const getAulasDisponiveis = async (req, res) => {
    try {
        const { id: id_utilizador, role } = req.user;

        const agora = new Date();

        const marcacoes = await prisma.marcacao.findMany({
            where: {
                data_a_realizar: { gte: agora },
                id_estado: { in: [1, 2] } // Pendente ou Confirmada
            },
            include: {
                estado_marcacao: true,
                modalidade: true,
                sala: true,
                docente: {
                    include: {
                        utilizador: { select: { nome: true, apelido: true } }
                    }
                },
                aluno_marcacao: true
            },
            orderBy: { data_a_realizar: 'asc' }
        });

        // Para alunos, marcar quais já estão inscritos
        const resultado = marcacoes.map(m => ({
            ...m,
            ja_inscrito: role === 3
                ? m.aluno_marcacao.some(am => am.id_aluno === id_utilizador)
                : false,
            vagas_disponiveis: m.numero_alunos_pretendidos !== null
                ? m.numero_alunos_pretendidos - m.aluno_marcacao.length
                : null
        }));

        res.status(200).json(resultado);
    } catch (error) {
        console.error('Erro ao listar aulas disponíveis:', error);
        res.status(500).json({ message: 'Erro ao carregar aulas.', error: error.message });
    }
};

module.exports = { getMinhasAulas, getAulaDetalhe, inscreverEmAula, getAulasDisponiveis };