const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

/**
 * Retorna as marcações do utilizador autenticado conforme o seu role.
 * - role 3 (Aluno): marcações em que o aluno está inscrito via aluno_marcacao
 * - role 2 (Docente): marcações atribuídas ao docente
 * - role 1 (Coordenadora): todas as marcações
 */
const getMinhasAulas = async (id_utilizador, role) => {
    if (role === 3) {
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

        return alunoMarcacoes
            .filter(am => am.marcacao)
            .map(am => am.marcacao);

    } else if (role === 2) {
        return await prisma.marcacao.findMany({
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
        // Coordenadora: todas as marcações
        return await prisma.marcacao.findMany({
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
};

/**
 * Retorna os detalhes completos de uma marcação específica.
 * Lança erro se não encontrada ou se o aluno não tiver permissão.
 */
const getAulaDetalhe = async (id_marcacao, id_utilizador, role) => {
    const marcacao = await prisma.marcacao.findUnique({
        where: { id_marcacoes: parseInt(id_marcacao) },
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
        throw new Error('NOT_FOUND');
    }

    // Verificar permissão: aluno só pode ver as suas próprias marcações
    if (role === 3) {
        const pertence = marcacao.aluno_marcacao.some(am => am.id_aluno === id_utilizador);
        if (!pertence) {
            throw new Error('FORBIDDEN');
        }
    }

    return marcacao;
};

/**
 * Inscreve um aluno (role 3) numa marcação existente.
 * Lança erro para validações de negócio (role, aula não encontrada, limite, já inscrito).
 */
const inscreverEmAula = async (id_utilizador, role, id_marcacoes) => {
    if (role !== 3) {
        throw new Error('FORBIDDEN');
    }

    if (!id_marcacoes) {
        throw new Error('id_marcacoes é obrigatório.');
    }

    const marcacao = await prisma.marcacao.findUnique({
        where: { id_marcacoes: parseInt(id_marcacoes) },
        include: { aluno_marcacao: true }
    });

    if (!marcacao) {
        throw new Error('NOT_FOUND');
    }

    if (marcacao.numero_alunos_pretendidos !== null &&
        marcacao.aluno_marcacao.length >= marcacao.numero_alunos_pretendidos) {
        throw new Error('LOTACAO_ESGOTADA');
    }

    const jaInscrito = marcacao.aluno_marcacao.some(am => am.id_aluno === id_utilizador);
    if (jaInscrito) {
        throw new Error('JA_INSCRITO');
    }

    return await prisma.aluno_marcacao.create({
        data: {
            id_aluno: id_utilizador,
            id_marcacoes: parseInt(id_marcacoes),
            data_resposta: new Date()
        }
    });
};

/**
 * Lista todas as marcações disponíveis para inscrição (estado pendente/confirmada, no futuro).
 * Para alunos, enriquece com campos ja_inscrito e vagas_disponiveis.
 */
const getAulasDisponiveis = async (id_utilizador, role) => {
    const agora = new Date();

    const marcacoes = await prisma.marcacao.findMany({
        where: {
            data_a_realizar: { gte: agora },
            id_estado: { in: [1, 3] } // Pendente ou Confirmada
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

    return marcacoes.map(m => ({
        ...m,
        ja_inscrito: role === 3
            ? m.aluno_marcacao.some(am => am.id_aluno === id_utilizador)
            : false,
        vagas_disponiveis: m.numero_alunos_pretendidos !== null
            ? m.numero_alunos_pretendidos - m.aluno_marcacao.length
            : null
    }));
};

module.exports = { getMinhasAulas, getAulaDetalhe, inscreverEmAula, getAulasDisponiveis };
