const authService = require('../services/authService');

const login = async (req, res) => {
    try {
        const { codigo_username, password } = req.body;
        
        console.log("Tentativa de login para utilizador:", codigo_username);

        // Chama o serviço que contém a lógica de negócio (Prisma, bcrypt, JWT)
        const result = await authService.login(codigo_username, password);

        // Se o serviço não lançar erro, o login foi um sucesso
        res.status(200).json({
            message: "Login efetuado com sucesso.",
            token: result.token,
            user: {
                nome: result.user.nome,
                role: result.user.role
            }
        });

    } catch (error) {
        // Captura os "throws" do service (ex: "Credenciais inválidas")
        console.error("Erro no processo de login:", error.message);
        
        // Devolvemos 401 para erros de credenciais e 500 para erros inesperados
        const statusCode = error.message === "Credenciais inválidas." ? 401 : 500;
        
        res.status(statusCode).json({ 
            message: error.message || "Erro interno no servidor." 
        });
    }
};

module.exports = { login };