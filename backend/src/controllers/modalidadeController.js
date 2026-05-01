const modalidadeService = require('../services/modalidadeService');

const listModalidades = async (req, res) => {
    try {
        const { id_docente, docentes } = req.query;
        const incluirDocentes = docentes === 'true';

        const resultado = await modalidadeService.listarModalidades(id_docente, incluirDocentes);
        res.json(resultado);
    } catch (error) {
        res.status(500).json({ error: 'Internal server error' });
    }
};

const getModalidade = async (req, res) => {
    try {
        // CORREÇÃO: ID do parâmetro não era validado antes de chamar o serviço
        const id = parseInt(req.params.id);
        if (isNaN(id)) return res.status(400).json({ error: 'ID da modalidade inválido' });

        const incluirDocentes = req.query.docentes === 'true';
        const resultado = await modalidadeService.obterModalidade(id, incluirDocentes);
        res.json(resultado);
    } catch (error) {
        if (error.message === 'Modalidade não encontrada.') {
            res.status(404).json({ error: 'Modalidade não encontrada' });
        } else {
            res.status(500).json({ error: 'Internal server error' });
        }
    }
};

const createModalidade = async (req, res) => {
    try {
        const { nome } = req.body;

        const modalidade = await modalidadeService.criarModalidade(nome);
        res.status(201).json(modalidade);
    } catch (error) {
        if (error.message.includes('obrigatório') || error.message.includes('Já existe')) {
            res.status(400).json({ error: error.message });
        } else {
            res.status(500).json({ error: 'Internal server error' });
        }
    }
};

const updateModalidade = async (req, res) => {
    try {
        // CORREÇÃO: ID do parâmetro não era validado antes de chamar o serviço
        const id = parseInt(req.params.id);
        if (isNaN(id)) return res.status(400).json({ error: 'ID da modalidade inválido' });

        const { nome } = req.body;

        const modalidade = await modalidadeService.editarModalidade(id, nome);
        res.json(modalidade);
    } catch (error) {
        if (error.message.includes('não encontrada')) {
            res.status(404).json({ error: error.message });
        } else if (error.message.includes('obrigatório') || error.message.includes('Já existe')) {
            res.status(400).json({ error: error.message });
        } else {
            res.status(500).json({ error: 'Internal server error' });
        }
    }
};

const deleteModalidade = async (req, res) => {
    try {
        // CORREÇÃO: ID do parâmetro não era validado antes de chamar o serviço
        const id = parseInt(req.params.id);
        if (isNaN(id)) return res.status(400).json({ error: 'ID da modalidade inválido' });

        const resultado = await modalidadeService.eliminarModalidade(id);
        res.json(resultado);
    } catch (error) {
        if (error.message.includes('não encontrada')) {
            res.status(404).json({ error: error.message });
        } else if (error.message.includes('Não é possível')) {
            res.status(409).json({ error: error.message });
        } else {
            res.status(500).json({ error: 'Internal server error' });
        }
    }
};

const associarDocente = async (req, res) => {
    try {
        // CORREÇÃO: ID da modalidade não era validado antes de chamar o serviço
        const id_modalidade = parseInt(req.params.id);
        if (isNaN(id_modalidade)) return res.status(400).json({ error: 'ID da modalidade inválido' });

        const { id_docente } = req.body;
        if (!id_docente) return res.status(400).json({ error: 'O campo "id_docente" é obrigatório' });

        const docente = await modalidadeService.associarDocente(id_modalidade, id_docente);
        res.status(201).json(docente);
    } catch (error) {
        if (error.message.includes('não encontrada') || error.message.includes('não encontrado')) {
            res.status(404).json({ error: error.message });
        } else if (error.message.includes('já está associado')) {
            res.status(409).json({ error: error.message });
        } else if (error.message.includes('em falta')) {
            // Inconsistência nos dados: utilizador tem id_tipo=2 mas não tem perfil de docente
            res.status(422).json({ error: error.message });
        } else {
            res.status(500).json({ error: 'Internal server error' });
        }
    }
};

const desassociarDocente = async (req, res) => {
    try {
        // CORREÇÃO: IDs dos parâmetros não eram validados antes de chamar o serviço
        const id_modalidade = parseInt(req.params.id);
        const id_docente    = parseInt(req.params.id_docente);
        if (isNaN(id_modalidade)) return res.status(400).json({ error: 'ID da modalidade inválido' });
        if (isNaN(id_docente))    return res.status(400).json({ error: 'ID do docente inválido' });

        const resultado = await modalidadeService.desassociarDocente(id_modalidade, id_docente);
        res.json(resultado);
    } catch (error) {
        if (error.message.includes('não encontrada') || error.message.includes('Associação não encontrada')) {
            res.status(404).json({ error: error.message });
        } else {
            res.status(500).json({ error: 'Internal server error' });
        }
    }
};

module.exports = { listModalidades, getModalidade, createModalidade, updateModalidade, deleteModalidade, associarDocente, desassociarDocente };
