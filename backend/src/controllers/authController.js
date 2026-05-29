const authService = require('../services/authService');
const userService = require('../services/userService');

const login = async (req, res) => {
    try {
        const { codigo_username, password } = req.body;

        // CORREÇÃO: campos obrigatórios não eram validados antes de chamar o serviço
        if (!codigo_username || !password) {
            return res.status(400).json({ message: "codigo_username e password são obrigatórios." });
        }

        const result = await authService.login(codigo_username, password);

        res.status(200).json({
            message: "Login efetuado com sucesso.",
            token: result.token,
            user: {
                id_utilizador: result.user.id_utilizador,
                nome: result.user.nome,
                apelido: result.user.apelido,
                role: result.user.role
            }
        });

    } catch (error) {
        const statusCode = error.message === "Credenciais inválidas." ? 401 : 500;
        res.status(statusCode).json({
            message: error.message || "Erro interno no servidor."
        });
    }
};

/**
 * GET /api/auth/me
 * Retorna os dados completos do utilizador autenticado a partir do token.
 * Qualquer role pode usar este endpoint — não precisa de ID na URL.
 */
const getMe = async (req, res) => {
    try {
        const id = req.user.id;

        const user = await userService.getUser({
            where: { id_utilizador: id },
            select: {
                id_utilizador: true,
                nome: true,
                apelido: true,
                email: true,
                telemovel: true,
                data_nascimento: true,
                nif: true,
                codigo_username: true,
                id_tipo: true,
                estado: true,
                aluno: { include: { aluno_modalidade: { include: { modalidade: true } } } },
                docente: { include: { docente_modalidade: { include: { modalidade: true } } } },
                coordenadora: true,
            }
        });

        if (!user) {
            return res.status(404).json({ message: 'Utilizador não encontrado.' });
        }

        delete user.password;

        res.status(200).json(user);
    } catch (error) {
        res.status(500).json({ message: 'Erro ao obter dados do utilizador.', error: error.message });
    }
};

module.exports = { login, getMe };