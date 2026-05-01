const horarioService = require('../services/horarioService');

/**
 * GET /api/horario/minhas-aulas
 * Retorna as marcações do utilizador autenticado (aluno ou docente).
 *
 * Para alunos (role 3): marcações em que o aluno está inscrito (aluno_marcacao)
 * Para docentes (role 2): marcações atribuídas ao docente
 * Para coordenadora (role 1): todas as marcações
 */
const getMinhasAulas = async (req, res) => {
    try {
        const { id: id_utilizador, role } = req.user;
        const marcacoes = await horarioService.getMinhasAulas(id_utilizador, role);
        res.status(200).json(marcacoes);
    } catch (error) {
        console.error('Erro ao buscar horário:', error);
        res.status(500).json({ message: 'Erro ao carregar horário.', error: error.message });
    }
};

/**
 * GET /api/horario/minhas-aulas/:id
 * Detalhes completos de uma marcação específica.
 */
const getAulaDetalhe = async (req, res) => {
    try {
        const { id } = req.params;
        const { id: id_utilizador, role } = req.user;
        const marcacao = await horarioService.getAulaDetalhe(id, id_utilizador, role);
        res.status(200).json(marcacao);
    } catch (error) {
        console.error('Erro ao buscar detalhe da aula:', error);
        if (error.message === 'NOT_FOUND') {
            return res.status(404).json({ message: 'Aula não encontrada.' });
        }
        if (error.message === 'FORBIDDEN') {
            return res.status(403).json({ message: 'Acesso negado.' });
        }
        res.status(500).json({ message: 'Erro ao carregar aula.', error: error.message });
    }
};

/**
 * POST /api/horario/inscrever
 * Inscreve o aluno autenticado numa marcação existente.
 * Body: { id_marcacoes: number }
 */
const inscreverEmAula = async (req, res) => {
    try {
        const { id: id_utilizador, role } = req.user;
        const { id_marcacoes } = req.body;
        const inscricao = await horarioService.inscreverEmAula(id_utilizador, role, id_marcacoes);
        res.status(201).json({ message: 'Inscrição realizada com sucesso!', inscricao });
    } catch (error) {
        console.error('Erro ao inscrever em aula:', error);
        if (error.message === 'FORBIDDEN') {
            return res.status(403).json({ message: 'Apenas alunos podem inscrever-se em aulas.' });
        }
        if (error.message === 'NOT_FOUND') {
            return res.status(404).json({ message: 'Aula não encontrada.' });
        }
        if (error.message === 'id_marcacoes é obrigatório.') {
            return res.status(400).json({ message: error.message });
        }
        if (error.message === 'LOTACAO_ESGOTADA') {
            return res.status(400).json({ message: 'Esta aula já atingiu o número máximo de alunos.' });
        }
        if (error.message === 'JA_INSCRITO') {
            return res.status(400).json({ message: 'Já estás inscrito nesta aula.' });
        }
        res.status(500).json({ message: 'Erro ao inscrever.', error: error.message });
    }
};

/**
 * GET /api/horario/disponiveis
 * Lista todas as marcações disponíveis para inscrição (estado pendente/confirmada, no futuro).
 */
const getAulasDisponiveis = async (req, res) => {
    try {
        const { id: id_utilizador, role } = req.user;
        const resultado = await horarioService.getAulasDisponiveis(id_utilizador, role);
        res.status(200).json(resultado);
    } catch (error) {
        console.error('Erro ao listar aulas disponíveis:', error);
        res.status(500).json({ message: 'Erro ao carregar aulas.', error: error.message });
    }
};

module.exports = { getMinhasAulas, getAulaDetalhe, inscreverEmAula, getAulasDisponiveis };