const bcrypt = require('bcryptjs');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const userService = require('../services/userService');

const getUsers = async (req, res) => {
    try {
        const users = await prisma.utilizador.findMany({
            select: {
                id_utilizador: true,
                codigo_username: true,
                nome: true,
                apelido: true,
                email: true,
                telemovel: true,
                data_nascimento: true,
                nif: true,
                estado: true,
            },
        });
        res.status(200).json(users);
    } catch (error) {
        res.status(500).json({ message: 'Erro ao encontrar utilizador.', error: error.message });
    }
};

const getUser = async (req, res) => {
    try {
        const { id_utilizador } = req.params;
        const id_utilizador_int = parseInt(id_utilizador);

        if (isNaN(id_utilizador_int)) {
            return res.status(400).json({ message: 'O ID fornecido não possui um formato válido.' });
        }

        const user = await prisma.utilizador.findUnique({
            where: { id_utilizador: id_utilizador_int },
            select: {
                id_utilizador: true,
                codigo_username: true,
                nome: true,
                apelido: true,
                email: true,
                telemovel: true,
                data_nascimento: true,
                nif: true,
                estado: true,
                tipo_utilizador: true,
            },
        });

        if (!user) {
            return res.status(404).json({ message: 'Utilizador não encontrado' });
        }

        res.status(200).json(user);
    } catch (error) {
        res.status(500).json({ message: 'Erro ao obter o utilizador', error: error.message });
    }
};

const createUser = async (req, res) => {
    try {
        const { codigo_username, password, id_tipo, email } = req.body;

        if (!codigo_username || !password || !id_tipo || !email) {
            return res.status(400).json({
                error: "Dados insuficientes. 'codigo_username', 'email', 'password' e 'id_tipo' são obrigatórios.",
            });
        }

        const novoUtilizador = await userService.criarUtilizador(req.body);

        return res.status(201).json({
            status: 'Success',
            message: 'Utilizador criado com sucesso.',
            data: {
                id_utilizador: novoUtilizador.id_utilizador,
                codigo_username: novoUtilizador.codigo_username,
                id_tipo: novoUtilizador.id_tipo,
                email: novoUtilizador.email,
            },
        });
    } catch (error) {
        console.error('Erro no Controller [createUser]:', error);
        if (error.code === 'P2002') {
            return res.status(400).json({ error: 'Erro de duplicação: O nome de utilizador, email ou NIF já existe.' });
        }
        return res.status(400).json({ error: 'Não foi possível criar o utilizador.', detalhe: error.message });
    }
};

const updateUser = async (req, res) => {
    try {
        const { id_utilizador } = req.params;
        const userId = parseInt(id_utilizador);

        if (req.user.id !== userId && req.user.role !== 1) {
            return res.status(403).json({ message: 'Sem permissão para editar este perfil.' });
        }

        const {
            nome,
            apelido,
            email,
            telemovel,
            data_nascimento,
            nif,
            password_atual,
            password: nova_password,
        } = req.body;

        const dataToUpdate = {};

        if (nome !== undefined)            dataToUpdate.nome = nome || null;
        if (apelido !== undefined)         dataToUpdate.apelido = apelido || null;
        if (email !== undefined)           dataToUpdate.email = email || null;
        if (telemovel !== undefined)       dataToUpdate.telemovel = telemovel || null;
        if (nif !== undefined)             dataToUpdate.nif = nif || null;
        if (data_nascimento !== undefined) {
            dataToUpdate.data_nascimento = data_nascimento ? new Date(data_nascimento) : null;
        }

        if (nova_password) {
            if (!password_atual) {
                return res.status(400).json({ message: 'A password atual é obrigatória para alterar a password.' });
            }

            const userRecord = await prisma.utilizador.findUnique({
                where: { id_utilizador: userId },
                select: { password: true },
            });

            if (!userRecord) {
                return res.status(404).json({ message: 'Utilizador não encontrado.' });
            }

            const match = await bcrypt.compare(password_atual, userRecord.password);
            if (!match) {
                return res.status(400).json({ message: 'A password atual está incorreta.' });
            }

            if (nova_password.length < 8) {
                return res.status(400).json({ message: 'A nova password deve ter pelo menos 8 caracteres.' });
            }

            const salt = await bcrypt.genSalt(10);
            dataToUpdate.password = await bcrypt.hash(nova_password, salt);
        }

        if (Object.keys(dataToUpdate).length === 0) {
            return res.status(400).json({ message: 'Nenhum campo para atualizar.' });
        }

        if (dataToUpdate.email) {
            const emailConflict = await prisma.utilizador.findFirst({
                where: { email: dataToUpdate.email, NOT: { id_utilizador: userId } },
            });
            if (emailConflict) {
                return res.status(400).json({ message: 'Este email já está em uso por outro utilizador.' });
            }
        }

        if (dataToUpdate.nif) {
            const nifConflict = await prisma.utilizador.findFirst({
                where: { nif: dataToUpdate.nif, NOT: { id_utilizador: userId } },
            });
            if (nifConflict) {
                return res.status(400).json({ message: 'Este NIF já está registado.' });
            }
        }

        const updatedUser = await prisma.utilizador.update({
            where: { id_utilizador: userId },
            data: dataToUpdate,
            select: {
                id_utilizador: true,
                nome: true,
                apelido: true,
                email: true,
                telemovel: true,
                data_nascimento: true,
                nif: true,
            },
        });

        res.status(200).json({
            message: nova_password ? 'Password alterada com sucesso.' : 'Dados atualizados com sucesso.',
            user: updatedUser,
        });
    } catch (error) {
        console.error('Erro no updateUser:', error);
        if (error.code === 'P2002') {
            return res.status(400).json({ message: 'Email ou NIF já existente.' });
        }
        res.status(500).json({ message: 'Erro ao atualizar utilizador.', error: error.message });
    }
};

const deleteUser = async (req, res) => {
    try {
        const { id_utilizador } = req.params;
        await prisma.utilizador.delete({ where: { id_utilizador: parseInt(id_utilizador) } });
        res.status(200).json({ message: 'Utilizador removido com sucesso' });
    } catch (error) {
        res.status(500).json({ message: 'Erro ao eliminar utilizador', error: error.message });
    }
};

module.exports = { getUsers, getUser, createUser, updateUser, deleteUser };