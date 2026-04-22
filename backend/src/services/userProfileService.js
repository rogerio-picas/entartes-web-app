const bcrypt = require('bcrypt'); // Use 'bcrypt' para performance (C++) ou 'bcryptjs' para portabilidade (JS puro)
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Helpers de validação centralizados
const regexEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const regex = /^[239]\d{8}$/;

/**
 * Atualiza a password com verificação prévia
 */
const atualizarPassword = async (id_utilizador, oldPassword, newPassword) => {
    if (!newPassword || newPassword.length < 6) {
        throw new Error('A nova password deve ter pelo menos 6 caracteres.');
    }

    // Otimização: Selecionamos apenas o campo necessário
    const user = await prisma.utilizador.findUnique({
        where: { id_utilizador },
        select: { password: true },
    });

    if (!user) throw new Error('Utilizador não encontrado.');

    const match = await bcrypt.compare(oldPassword, user.password);
    if (!match) throw new Error('A password atual está incorreta.');

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(newPassword, salt);

    await prisma.utilizador.update({
        where: { id_utilizador },
        data: { password: hashedPassword },
    });

    return { success: true, message: 'Password atualizada com sucesso.' };
};

/**
 * Atualiza dados pessoais (nome, apelido, email, telemovel)
 */
const atualizarDadosPessoais = async (id_utilizador, dados) => {
    const { nome, apelido, email, telemovel } = dados;
    const dataToUpdate = {};

    // 1. Validação de Email
    if (email !== undefined) {
        if (!regexEmail.test(email)) throw new Error('Email inválido.');
        
        const emailExists = await prisma.utilizador.findFirst({
            where: { email, id_utilizador: { not: id_utilizador } }
        });
        if (emailExists) throw new Error('Este email já está em uso.');
        dataToUpdate.email = email;
    }

    // 2. Validação de Telemóvel (limpa espaços antes de validar)
    if (telemovel !== undefined) {
        const telemovelLimpo = telemovel.replace(/\s/g, '');
        if (!regexTelemovel.test(telemovelLimpo)) {
            throw new Error('Telemóvel inválido (deve ter 9 dígitos e começar por 9).');
        }
        dataToUpdate.telemovel = telemovelLimpo;
    }

    // 3. Outros campos
    if (nome !== undefined) dataToUpdate.nome = nome;
    if (apelido !== undefined) dataToUpdate.apelido = apelido;

    if (Object.keys(dataToUpdate).length === 0) {
        throw new Error('Nenhum dado válido para atualizar.');
    }

    const updatedUser = await prisma.utilizador.update({
        where: { id_utilizador },
        data: dataToUpdate,
        select: { // Não devolvemos a password no retorno
            id_utilizador: true,
            nome: true,
            apelido: true,
            email: true,
            telemovel: true,
        },
    });

    return { success: true, message: 'Dados atualizados.', user: updatedUser };
};

module.exports = { atualizarPassword, atualizarDadosPessoais };