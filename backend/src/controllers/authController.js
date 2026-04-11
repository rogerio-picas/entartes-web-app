const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

const login = async (req, res) => {
    try
    {
        const {codigo_username, pass} = req.body;

        const user = await prisma.utilizador.findUnique({
            where: { codigo_username }
        });
        
        if(!user) return res.status(401).json({message: "Credenciais inválidas."});

        const passwordMatch = await bcrypt.compare(pass, user.pass);
        if(!passwordMatch) return res.status(401).json({ message: "Credenciais inválidas."});

        const token = jwt.sign(
            {id: user.id_utilizador, role: user.id_tipo},
            process.env.JWT_SECRET,
            {expiresIn: '8h'}
        );

        res.status(200).json({
            message: "Login efetuado com sucesso.",
            token,
            user: {nomes: user.nome, role: user.id_tipo}
        });
    }
    catch(error){
        res.status(500).json({ message: "Erro no servidor", error: error.message});
    }
};

module.exports = { login };