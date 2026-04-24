const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const mapDocentes = (docente_modalidade) =>
    docente_modalidade.map(dm => ({
        id_docente: dm.id_docente,
        nome: dm.docente.utilizador.nome,
        apelido: dm.docente.utilizador.apelido,
        codigo_username: dm.docente.utilizador.codigo_username,
    }));

const listModalidades = async (req, res) => {
    try {
        const { id_docente, docentes } = req.query;
        const incluirDocentes = docentes === 'true';

        const where = {};
        if (id_docente) {
            where.docente_modalidade = {
                some: { id_docente: parseInt(id_docente) }
            };
        }

        const modalidades = await prisma.modalidade.findMany({
            where,
            include: incluirDocentes ? {
                docente_modalidade: {
                    include: {
                        docente: {
                            include: {
                                utilizador: { select: { nome: true, apelido: true, codigo_username: true } }
                            }
                        }
                    }
                }
            } : undefined,
            orderBy: { nome: 'asc' }
        });

        const resultado = incluirDocentes
            ? modalidades.map(m => ({ ...m, docente_modalidade: mapDocentes(m.docente_modalidade || []) }))
            : modalidades;

        res.json(resultado);
    } catch (error) {
        res.status(500).json({ error: 'Internal server error' });
    }
};

const getModalidade = async (req, res) => {
    try {
        const id = parseInt(req.params.id);
        const incluirDocentes = req.query.docentes === 'true';

        const modalidade = await prisma.modalidade.findUnique({
            where: { id_modalidade: id },
            include: incluirDocentes ? {
                docente_modalidade: {
                    include: {
                        docente: {
                            include: {
                                utilizador: { select: { nome: true, apelido: true, codigo_username: true } }
                            }
                        }
                    }
                }
            } : undefined
        });

        if (!modalidade) return res.status(404).json({ error: 'Modalidade não encontrada' });

        const resultado = incluirDocentes
            ? { ...modalidade, docente_modalidade: mapDocentes(modalidade.docente_modalidade || []) }
            : modalidade;

        res.json(resultado);
    } catch (error) {
        res.status(500).json({ error: 'Internal server error' });
    }
};

const createModalidade = async (req, res) => {
    try {
        const { nome } = req.body;

        if (!nome) return res.status(400).json({ error: 'O campo "nome" é obrigatório' });

        const modalidade = await prisma.modalidade.create({ data: { nome } });
        res.status(201).json(modalidade);
    } catch (error) {
        res.status(500).json({ error: 'Internal server error' });
    }
};

const updateModalidade = async (req, res) => {
    try {
        const id = parseInt(req.params.id);
        const { nome } = req.body;

        if (!nome) return res.status(400).json({ error: 'O campo "nome" é obrigatório' });

        const existing = await prisma.modalidade.findUnique({ where: { id_modalidade: id } });
        if (!existing) return res.status(404).json({ error: 'Modalidade não encontrada' });

        const modalidade = await prisma.modalidade.update({
            where: { id_modalidade: id },
            data: { nome }
        });

        res.json(modalidade);
    } catch (error) {
        res.status(500).json({ error: 'Internal server error' });
    }
};

const deleteModalidade = async (req, res) => {
    try {
        const id = parseInt(req.params.id);

        const existing = await prisma.modalidade.findUnique({
            where: { id_modalidade: id },
            include: { _count: { select: { docente_modalidade: true } } }
        });
        if (!existing) return res.status(404).json({ error: 'Modalidade não encontrada' });

        if (existing._count.docente_modalidade > 0) {
            return res.status(409).json({ error: 'Não é possível eliminar uma modalidade com docentes associados' });
        }

        await prisma.modalidade.delete({ where: { id_modalidade: id } });
        res.json({ message: 'Modalidade eliminada com sucesso' });
    } catch (error) {
        res.status(500).json({ error: 'Internal server error' });
    }
};

const associarDocente = async (req, res) => {
    try {
        const id_modalidade = parseInt(req.params.id);
        const { id_docente } = req.body;

        if (!id_docente) return res.status(400).json({ error: 'O campo "id_docente" é obrigatório' });

        const modalidade = await prisma.modalidade.findUnique({ where: { id_modalidade } });
        if (!modalidade) return res.status(404).json({ error: 'Modalidade não encontrada' });

        const docente = await prisma.docente.findUnique({ where: { id_utilizador: parseInt(id_docente) } });
        if (!docente) return res.status(404).json({ error: 'Docente não encontrado' });

        const jaAssociado = await prisma.docente_modalidade.findUnique({
            where: { id_docente_id_modalidade: { id_docente: parseInt(id_docente), id_modalidade } }
        });
        if (jaAssociado) return res.status(409).json({ error: 'Docente já está associado a esta modalidade' });

        const associacao = await prisma.docente_modalidade.create({
            data: { id_docente: parseInt(id_docente), id_modalidade },
            include: {
                docente: {
                    include: {
                        utilizador: { select: { nome: true, apelido: true, codigo_username: true } }
                    }
                }
            }
        });

        res.status(201).json(mapDocentes([associacao])[0]);
    } catch (error) {
        res.status(500).json({ error: 'Internal server error' });
    }
};

const desassociarDocente = async (req, res) => {
    try {
        const id_modalidade = parseInt(req.params.id);
        const id_docente = parseInt(req.params.id_docente);

        const modalidade = await prisma.modalidade.findUnique({ where: { id_modalidade } });
        if (!modalidade) return res.status(404).json({ error: 'Modalidade não encontrada' });

        const docente = await prisma.docente.findUnique({ where: { id_utilizador: id_docente } });
        if (!docente) return res.status(404).json({ error: 'Docente não encontrado' });

        const associacao = await prisma.docente_modalidade.findUnique({
            where: { id_docente_id_modalidade: { id_docente, id_modalidade } }
        });
        if (!associacao) return res.status(404).json({ error: 'Docente não está associado a esta modalidade' });

        await prisma.docente_modalidade.delete({
            where: { id_docente_id_modalidade: { id_docente, id_modalidade } }
        });

        res.json({ message: 'Docente desassociado da modalidade com sucesso' });
    } catch (error) {
        res.status(500).json({ error: 'Internal server error' });
    }
};

module.exports = { listModalidades, getModalidade, createModalidade, updateModalidade, deleteModalidade, associarDocente, desassociarDocente };
