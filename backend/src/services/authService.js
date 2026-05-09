const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

// Hash "falso" pré-calculado com salt round 10 para prevenção de timing attacks
// Representa o hash da string "dummy_password"
const DUMMY_HASH = '$2a$10$C.Qh.s3hZ9M4yB3s/yYl2e1/C1P2wX8g0E9H/Z8A.P3E/E8P.1Vti';

const login = async (codigo_username, password) => {

    if (typeof codigo_username !== 'string' || typeof password !== 'string')
        throw new Error("Formato inválido de entrada. Campos devem ser strings.");

    const usernameLimpo = codigo_username.trim().toLowerCase();

    const user = await prisma.utilizador.findUnique({
        where: { codigo_username: usernameLimpo },
        select: {
            id_utilizador: true,
            nome: true,
            apelido: true,
            password: true,
            estado: true,
            id_tipo: true,
            tentativas_login: true
        },
    });

    if (!user) {
        // Mesmo não encontrando o utilizador, executamos o bcrypt para demorar o mesmo tempo
        await bcrypt.compare(password, DUMMY_HASH);
        throw new Error("Credenciais inválidas.");
    }

    if (user.tentativas_login >= 10) {
        throw new Error("Conta bloqueada por excesso de tentativas.");
    }

    const passwordMatch = await bcrypt.compare(password, user.password);

    if (!passwordMatch) {
        await prisma.utilizador.update({
            where: { id_utilizador: user.id_utilizador },
            data: { tentativas_login: { increment: 1 } }
        });

        throw new Error("Credenciais inválidas.");
    }

    if (user.estado !== 'ATIVO') throw new Error("Conta suspensa ou inativa.");

    if (user.tentativas_login > 0) {
        await prisma.utilizador.update({
            where: { id_utilizador: user.id_utilizador },
            data: { tentativas_login: 0 }
        });
    }

    const token = jwt.sign(
        { id: user.id_utilizador, role: user.id_tipo, pwf: user.password.slice(-8) },
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