const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

const login = async (req, res) => {
    try
    {
        const {codigo_username, password} = req.body;
        console.log("Dados recebidos no Backend:", req.body);

        const user = await prisma.utilizador.findUnique({
            where: { codigo_username: codigo_username }
        });

        if(!user) return res.status(401).json({message: "Credenciais inválidas."});


        const passwordMatch = await bcrypt.compare(password, user.password);
        if(!passwordMatch) return res.status(401).json({ message: "Credenciais inválidas."});

        const token = jwt.sign(
            { id: user.id_utilizador, role: user.id_tipo },
            process.env.JWT_SECRET,
            { expiresIn: '8h' }
        );
        
    
        console.log("Password vinda do form:", password);
        console.log("Password (hash) vinda da BD:", user.password); // Ou user.pass?

        res.status(200).json({
            message: "Login efetuado com sucesso.",
            token,
            user: {nomes: user.nome, role: user.id_tipo}
        });
    }
    catch(error){
        console.log("======= ERRO DETETADO NO LOGIN =======");
        console.error(error); 
        console.log("======================================")
        res.status(500).json({ message: "Erro no servidor", error: error.message});
    }
};

module.exports = { login };