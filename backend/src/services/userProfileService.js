const bcrypt = require('bcrypt');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Função para validar email
const validarEmail = (email) => {
    const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return regex.test(email);
};

// Função para validar número de telemóvel (Portugal: 9xxxxxxxx)
const validarTelemovel = (telemovel) => {
    const regex = /^9\d{8}$/;
    return regex.test(telemovel);
};

// Atualizar password do utilizador
const atualizarPassword = async (userId, oldPassword, newPassword) => {
    try {
        // Buscar utilizador
        const utilizador = await prisma.utilizador.findUnique({
            where: { id_utilizador: userId }
        });

        if (!utilizador) {
            throw new Error('Utilizador não encontrado');
        }

        // Verificar se a password antiga está correta
        const isOldPasswordValid = await bcrypt.compare(oldPassword, utilizador.password);
        if (!isOldPasswordValid) {
            throw new Error('Password antiga incorreta');
        }

        // Validar nova password (mínimo 6 caracteres)
        if (!newPassword || newPassword.length < 6) {
            throw new Error('Nova password deve ter pelo menos 6 caracteres');
        }

        // Hash da nova password
        const salt = await bcrypt.genSalt(10);
        const hashedNewPassword = await bcrypt.hash(newPassword, salt);

        // Atualizar password
        await prisma.utilizador.update({
            where: { id_utilizador: userId },
            data: { password: hashedNewPassword }
        });

        return { success: true, message: 'Password atualizada com sucesso' };
    } catch (error) {
        throw new Error(error.message);
    }
};

// Atualizar dados pessoais (email e telemovel)
const atualizarDadosPessoais = async (userId, dados) => {
    try {
        const { email, telemovel } = dados;

        // Buscar utilizador
        const utilizador = await prisma.utilizador.findUnique({
            where: { id_utilizador: userId }
        });

        if (!utilizador) {
            throw new Error('Utilizador não encontrado');
        }

        const updateData = {};

        // Validar e preparar email
        if (email !== undefined) {
            if (!validarEmail(email)) {
                throw new Error('Email inválido');
            }
            // Verificar se email já existe em outro utilizador
            const emailExists = await prisma.utilizador.findFirst({
                where: { email: email, id_utilizador: { not: userId } }
            });
            if (emailExists) {
                throw new Error('Email já está em uso');
            }
            updateData.email = email;
        }

        // Validar e preparar telemovel
        if (telemovel !== undefined) {
            if (!validarTelemovel(telemovel)) {
                throw new Error('Número de telemóvel inválido (deve começar com 9 e ter 9 dígitos)');
            }
            updateData.telemovel = telemovel;
        }

        // Se não há dados para atualizar
        if (Object.keys(updateData).length === 0) {
            throw new Error('Nenhum dado válido para atualizar');
        }

        // Atualizar dados
        await prisma.utilizador.update({
            where: { id_utilizador: userId },
            data: updateData
        });

        return { success: true, message: 'Dados pessoais atualizados com sucesso' };
    } catch (error) {
        throw new Error(error.message);
    }
};

module.exports = {
    atualizarPassword,
    atualizarDadosPessoais
};