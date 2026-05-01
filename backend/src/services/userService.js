const bcrypt = require('bcrypt');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const getUsers = async (options) => {
    return await prisma.utilizador.findMany(options);
};

const getUser = async (options) => {
    return await prisma.utilizador.findUnique(options);
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
    } = dados;

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const tipoInt = id_tipo ? parseInt(id_tipo) : null;

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

    return await prisma.$transaction(async (tx) => {
        // Atualizar a tabela principal
        const utilizadorAtualizado = await tx.utilizador.update({
            where: { id_utilizador: userId },
            data: dataToUpdate,
        });

        // Atualizar coaching no aluno se o tipo é/continua a ser aluno
        if (novoTipo === 3 && coaching !== undefined && novoTipo === tipoAtual) {
            await tx.aluno.update({
                where: { id_utilizador: userId },
                data: { coaching },
            });
        }

        // Se o tipo mudou, gerenciar as tabelas específicas
        if (novoTipo !== tipoAtual) {
            // Remover da tabela antiga
            if (tipoAtual === 3 && utilizadorAtual.aluno) { // Era aluno
                await tx.aluno.delete({
                    where: { id_utilizador: userId },
                });
            } else if (tipoAtual === 2 && utilizadorAtual.docente) { // Era docente
                await tx.docente.delete({
                    where: { id_utilizador: userId },
                });
            } else if (tipoAtual === 1 && utilizadorAtual.coordenadora) { // Era coordenadora
                await tx.coordenadora.delete({
                    where: { id_utilizador: userId },
                });
            }

            // Adicionar na nova tabela
            switch (novoTipo) {
                case 3: // Novo aluno
                    await tx.aluno.create({
                        data: { id_utilizador: userId },
                    });
                    break;
                case 2: // Novo docente
                    await tx.docente.create({
                        data: {
                            id_utilizador: userId,
                            estado_atividade: true,
                        },
                    });
                    break;
                case 1: // Nova coordenadora
                    await tx.coordenadora.create({
                        data: { id_utilizador: userId },
                    });
                    break;
                default:
                    // Outros tipos não têm tabelas específicas
                    break;
            }
        }

        return utilizadorAtualizado;
    });
};

module.exports = { criarUtilizador, atualizarUtilizador, getUsers, getUser, deleteUser };