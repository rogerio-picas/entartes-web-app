const bcrypt = require('bcrypt');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const getUsers = async (options = {}) => {
    const queryOptions = { ...options };
    if (!queryOptions.include && !queryOptions.select) {
        queryOptions.include = {
            aluno: { include: { aluno_modalidade: { include: { modalidade: true } } } },
            docente: { include: { docente_modalidade: { include: { modalidade: true } } } },
            coordenadora: true,
        };
    }
    return await prisma.utilizador.findMany(queryOptions);
};

const getUser = async (options = {}) => {
    const queryOptions = { ...options };
    if (!queryOptions.include && !queryOptions.select) {
        queryOptions.include = {
            aluno: { include: { aluno_modalidade: { include: { modalidade: true } } } },
            docente: { include: { docente_modalidade: { include: { modalidade: true } } } },
            coordenadora: true,
        };
    }
    return await prisma.utilizador.findUnique(queryOptions);
};

const deleteUser = async (id_utilizador) => {
    const userId = parseInt(id_utilizador);

    // Buscar o utilizador para verificar em quais tabelas está
    const utilizador = await prisma.utilizador.findUnique({
        where: { id_utilizador: userId },
        include: {
            aluno: true,
            docente: true,
            coordenadora: true,
        },
    });

    if (!utilizador) {
        throw new Error('Utilizador não encontrado');
    }

    // Remover das tabelas específicas primeiro
    return await prisma.$transaction(async (tx) => {
        if (utilizador.aluno) {
            await tx.aluno.delete({ where: { id_utilizador: userId } });
        }
        if (utilizador.docente) {
            await tx.docente.delete({ where: { id_utilizador: userId } });
        }
        if (utilizador.coordenadora) {
            await tx.coordenadora.delete({ where: { id_utilizador: userId } });
        }

        // Remover da tabela principal
        await tx.utilizador.delete({ where: { id_utilizador: userId } });
    });
};

const criarUtilizador = async (dados) => {
    const {
        codigo_username,
        password,
        id_tipo,
        nome,
        apelido,
        data_nascimento,
        email,
        telemovel,
        nif,
        coaching,
        modalidades,
    } = dados;

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const tipoInt = id_tipo ? parseInt(id_tipo) : null;

    // Verificar duplicados em paralelo antes de tentar inserir, para que a mensagem de erro
    // liste todos os campos em conflito de uma vez (o P2002 do Prisma só reporta um de cada vez)
    const [usernameTaken, emailTaken, nifTaken] = await Promise.all([
        codigo_username ? prisma.utilizador.findFirst({ where: { codigo_username } }) : null,
        email           ? prisma.utilizador.findFirst({ where: { email } })           : null,
        nif             ? prisma.utilizador.findFirst({ where: { nif } })             : null,
    ]);
    const duplicados = [
        usernameTaken && 'nome de utilizador',
        emailTaken    && 'e-mail',
        nifTaken      && 'NIF',
    ].filter(Boolean);
    if (duplicados.length > 0) {
        throw Object.assign(
            new Error(`Já existe um utilizador registado com este(s) campo(s): ${duplicados.join(', ')}.`),
            { code: 'DUPLICATE', fields: duplicados }
        );
    }

    // 3. Iniciar Transação Atómica
    // Garantimos que o utilizador só é criado se o perfil (aluno/docente/coord) também for.
    return await prisma.$transaction(async (tx) => {

        const novoUtilizador = await tx.utilizador.create({
            data: {
                codigo_username: codigo_username,
                password: hashedPassword,
                id_tipo: tipoInt,
                nome: nome || null,
                apelido: apelido || null,
                data_nascimento: data_nascimento ? new Date(data_nascimento) : null,
                email: email || null,
                telemovel: telemovel || null,
                nif: nif || null,
                tentativas_login: 0,
                estado: "ATIVO"
            }
        });

        // Criar o registo na "subclasse" correspondente
        // id_tipo: 1 = Coordenadora, 2 = Docente, 3 = Aluno
        if (tipoInt === 3) { // ALUNO
            await tx.aluno.create({
                data: {
                    id_utilizador: novoUtilizador.id_utilizador,
                    coaching: coaching ?? false,
                ...(modalidades && {
                    aluno_modalidade: {
                        create: (Array.isArray(modalidades) ? modalidades : [modalidades])
                            .map(id => ({ id_modalidade: parseInt(id) }))
                    }
                })
                }
            });
        }
        else if (tipoInt === 2) { // DOCENTE
            await tx.docente.create({
                data: {
                    id_utilizador: novoUtilizador.id_utilizador,
                    estado_atividade: true
                }
            });
        }
        else if (tipoInt === 1) {
            await tx.coordenadora.create({
                data: {
                    id_utilizador: novoUtilizador.id_utilizador,
                    // data_inicio_funcao usa o dbgenerated("CURRENT_DATE") do teu model
                }
            });
        }

        return novoUtilizador;
    });
};

const atualizarUtilizador = async (id_utilizador, dados) => {
    const {
        codigo_username,
        password,
        id_tipo,
        nome,
        apelido,
        data_nascimento,
        email,
        telemovel,
        nif,
        estado,
        coaching,
        modalidades,
    } = dados;

    const userId = parseInt(id_utilizador);

    // Buscar o utilizador atual para verificar mudanças
    const utilizadorAtual = await prisma.utilizador.findUnique({
        where: { id_utilizador: userId },
        include: {
            aluno: true,
            docente: true,
            coordenadora: true,
        },
    });

    if (!utilizadorAtual) {
        throw new Error('Utilizador não encontrado.');
    }

    const dataToUpdate = {};

    if (codigo_username !== undefined) dataToUpdate.codigo_username = codigo_username;
    if (password !== undefined) {
        const salt = await bcrypt.genSalt(10);
        dataToUpdate.password = await bcrypt.hash(password, salt);
    }
    if (id_tipo !== undefined) dataToUpdate.id_tipo = parseInt(id_tipo);
    if (nome !== undefined) dataToUpdate.nome = nome;
    if (apelido !== undefined) dataToUpdate.apelido = apelido;
    if (data_nascimento !== undefined) dataToUpdate.data_nascimento = new Date(data_nascimento);
    if (email !== undefined) dataToUpdate.email = email;
    if (telemovel !== undefined) dataToUpdate.telemovel = telemovel;
    if (nif !== undefined) dataToUpdate.nif = nif;
    if (estado !== undefined) dataToUpdate.estado = estado;

    // Se id_tipo foi alterado, precisamos mover o registro entre tabelas
    const novoTipo = id_tipo !== undefined ? parseInt(id_tipo) : utilizadorAtual.id_tipo;
    const tipoAtual = utilizadorAtual.id_tipo;

    try {
        return await prisma.$transaction(async (tx) => {
            // Atualizar a tabela principal
            const utilizadorAtualizado = await tx.utilizador.update({
                where: { id_utilizador: userId },
                data: dataToUpdate,
            });

            // Lógica de inativação do Docente
            if (estado === 'INATIVO' && utilizadorAtual.estado !== 'INATIVO' && novoTipo === 2) {
                // 1. Cancelar marcações PENDENTES (1) e CONFIRMADAS (3)
                const marcacoesParaCancelar = await tx.marcacao.findMany({
                    where: {
                        id_docente: userId,
                        id_estado: { in: [1, 3] }
                    },
                    include: {
                        aluno_marcacao: {
                            include: { aluno: { include: { utilizador: true } } }
                        }
                    }
                });

                for (const m of marcacoesParaCancelar) {
                    await tx.marcacao.update({
                        where: { id_marcacoes: m.id_marcacoes },
                        data: { id_estado: 5 } // CANCELADA
                    });
                    await tx.marcacao_estado_historico.create({
                        data: {
                            id_marcacoes: m.id_marcacoes,
                            id_estado: 5
                        }
                    });
                    // Notificar alunos
                    for (const am of m.aluno_marcacao) {
                        if (am.aluno && am.aluno.utilizador) {
                            await tx.notificacao.create({
                                data: {
                                    id_user: am.aluno.id_utilizador,
                                    titulo: 'Sessão Cancelada',
                                    mensagem: `A tua sessão agendada com o docente ${utilizadorAtual.nome} foi cancelada devido a indisponibilidade do docente.`,
                                }
                            });
                        }
                    }
                }

                // 2. Apagar disponibilidades
                await tx.disponibilidade.deleteMany({
                    where: { id_docente: userId }
                });

                // 3. Remover de todos os eventos em que o docente está envolvido
                await tx.evento_docente.deleteMany({
                    where: { id_docente: userId }
                });

                // 4. Desativar atividade
                await tx.docente.update({
                    where: { id_utilizador: userId },
                    data: { estado_atividade: false }
                });
            }

            // Lógica de reativação do Docente
            if (estado === 'ATIVO' && utilizadorAtual.estado !== 'ATIVO' && novoTipo === 2) {
                await tx.docente.update({
                    where: { id_utilizador: userId },
                    data: { estado_atividade: true }
                });
            }

            // Atualizar coaching e modalidades no aluno se o tipo é/continua a ser aluno
            if (novoTipo === 3 && novoTipo === tipoAtual && (coaching !== undefined || modalidades !== undefined)) {
                const alunoDataToUpdate = {};
                if (coaching !== undefined) alunoDataToUpdate.coaching = coaching;
                if (modalidades !== undefined) {
                    alunoDataToUpdate.aluno_modalidade = {
                        deleteMany: {}, // Elimina as associações antigas
                        create: (Array.isArray(modalidades) ? modalidades : [modalidades]).map(id => ({ id_modalidade: parseInt(id) }))
                    };
                }
                await tx.aluno.update({
                    where: { id_utilizador: userId },
                    data: alunoDataToUpdate,
                });
            }

            // Se o tipo mudou, gerenciar as tabelas específicas
            if (novoTipo !== tipoAtual) {
                // Remover da tabela antiga
                if (tipoAtual === 3 && utilizadorAtual.aluno) {
                    await tx.aluno.delete({ where: { id_utilizador: userId } });
                } else if (tipoAtual === 2 && utilizadorAtual.docente) {
                    await tx.docente.delete({ where: { id_utilizador: userId } });
                } else if (tipoAtual === 1 && utilizadorAtual.coordenadora) {
                    await tx.coordenadora.delete({ where: { id_utilizador: userId } });
                }

                // Adicionar na nova tabela
                if (novoTipo === 3) {
                    await tx.aluno.create({ 
                        data: { 
                            id_utilizador: userId,
                            coaching: coaching ?? false,
                            ...(modalidades && {
                                aluno_modalidade: {
                                    create: (Array.isArray(modalidades) ? modalidades : [modalidades]).map(id => ({ id_modalidade: parseInt(id) }))
                                }
                            })
                        } 
                    });
                } else if (novoTipo === 2) {
                    await tx.docente.create({ data: { id_utilizador: userId, estado_atividade: true } });
                } else if (novoTipo === 1) {
                    await tx.coordenadora.create({ data: { id_utilizador: userId } });
                }
            }
            // CORREÇÃO: switch duplicado removido — o if/else if acima já trata a criação na nova tabela;
            // o switch ficou por engano após refactor e deixava o bloco if sem fechar, causando SyntaxError.

            return utilizadorAtualizado;
        });
    } catch (error) {
        if (error.code === 'P2002') {
            const campoLabels = {
                nif:              'NIF',
                email:            'endereço de e-mail',
                codigo_username:  'nome de utilizador',
                telemovel:        'número de telemóvel',
            };
            const campo = error.meta?.target?.[0];
            const label = campoLabels[campo] ?? campo ?? 'campo';
            throw new Error(`Já existe um utilizador registado com este ${label}. Por favor, verifique os dados introduzidos.`);
        }
        throw error;
    }
};

module.exports = { criarUtilizador, atualizarUtilizador, getUsers, getUser, deleteUser };