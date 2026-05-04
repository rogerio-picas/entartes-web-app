const jwt = require('jsonwebtoken');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const tokenValidation = async (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) return res.status(401).json({ message: "Acesso negado. É necessária autenticação." });

    try {
        const verified = jwt.verify(token, process.env.JWT_SECRET);

        //busca e compara na BD a role atual do utilizador com o id do token
        const userReal = await prisma.utilizador.findUnique({
            where: { id_utilizador: verified.id },
            select: { id_tipo: true, password: true }
        });
        //se o utilizador nao existir na BD:
        if (!userReal) {
            return res.status(401).json({ message: "Utilizador nao encontrado" });
        }
        //se a role da BD for diferente da role do token:
        if (userReal.id_tipo !== verified.role) {
            return res.status(401).json({ message: "Permissões alteradas. Faça login novamente." });
        }
        // se a password foi alterada após a emissão do token:
        if (verified.pwf && userReal.password.slice(-8) !== verified.pwf) {
            return res.status(401).json({ message: "Password alterada. Faça login novamente." });
        }

        req.user = verified;

        next();
    }
    catch (error) {
        res.status(401).json({ message: "Token inválido ou sessão expirada.", error: error.message });
    }
};

module.exports = tokenValidation;