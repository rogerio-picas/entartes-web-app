const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

const login = async (codigo_username, password) => {

    const user = await prisma.utilizador.findUnique({
        where: { codigo_username: codigo_username }
    });

    if (!user) {
        throw new Error("Credenciais inválidas.");
    }

    const passwordMatch = await bcrypt.compare(password, user.password);
    if (!passwordMatch) {
        throw new Error("Credenciais inválidas.");
    }

    const token = jwt.sign(
        { id: user.id_utilizador, role: user.id_tipo },
        process.env.JWT_SECRET,
        { expiresIn: '8h' }
    );

    return {
        token,
        user: {
            id_utilizador: user.id_utilizador,
            nome: user.nome,
            apelido: user.apelido,
            role: user.id_tipo
        }
    };
};

module.exports = { login };