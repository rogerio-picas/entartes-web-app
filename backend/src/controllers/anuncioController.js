// ────────────────────────────────────────────────
// anuncioController.js  (substitui o existente)
// ────────────────────────────────────────────────
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Criar novo anúncio
const createAnuncio = async (req, res) => {
    try {
        const { id_evento, id_grupo, titulo, mensagem } = req.body;
        
        if (!titulo || !mensagem) {
            return res.status(400).json({ error: 'Título e mensagem são obrigatórios' });
        }

        const novo = await prisma.anuncio.create({
            data: {
                id_evento:       id_evento  ? parseInt(id_evento)  : null,
                id_grupo:        id_grupo   ? parseInt(id_grupo)   : null,
                id_coordenadora: req.user.id,
                titulo,
                mensagem,
                data_envio: new Date()
            }
        });

        res.status(201).json(novo);
    } catch (error) {
        res.status(500).json({ error: 'Erro ao criar anúncio' });
    }
};

// Listar todos os anúncios
const getAllAnuncios = async (req, res) => {
    try {
        const anuncios = await prisma.anuncio.findMany({
            include: {
                coordenadora: {
                    select: { utilizador: { select: { nome: true } } }
                },
                evento: { select: { nome_evento: true } },
                grupo: { select: { nome_grupo: true } }
            },
            orderBy: { data_envio: 'desc' }
        });

        res.status(200).json(anuncios);
    } catch (error) {
        res.status(500).json({ error: 'Erro ao listar anúncios' });
    }
};

// Obter anúncio por ID
const getAnuncioById = async (req, res) => {
    try {
        const { id_anuncio } = req.params;

        const anuncio = await prisma.anuncio.findUnique({
            where: { id_anuncio: parseInt(id_anuncio) },
            include: {
                coordenadora: {
                    select: { utilizador: { select: { nome: true } } }
                },
                evento: { select: { nome_evento: true } },
                grupo: { select: { nome_grupo: true } }
            }
        });

        if (!anuncio) {
            return res.status(404).json({ error: 'Anúncio não encontrado' });
        }

        res.status(200).json(anuncio);
    } catch (error) {
        res.status(500).json({ error: 'Erro ao obter anúncio' });
    }
};

// Atualizar anúncio
const updateAnuncio = async (req, res) => {
    try {
        const { id_anuncio } = req.params;
        const { titulo, mensagem } = req.body;

        const anuncio = await prisma.anuncio.findUnique({
            where: { id_anuncio: parseInt(id_anuncio) }
        });

        if (!anuncio) {
            return res.status(404).json({ error: 'Anúncio não encontrado' });
        }

        if (anuncio.id_coordenadora !== req.user.id) {
            return res.status(403).json({ error: 'Sem permissão para atualizar este anúncio' });
        }

        const atualizado = await prisma.anuncio.update({
            where: { id_anuncio: parseInt(id_anuncio) },
            data: {
                titulo: titulo || anuncio.titulo,
                mensagem: mensagem || anuncio.mensagem
            }
        });

        res.status(200).json(atualizado);
    } catch (error) {
        res.status(500).json({ error: 'Erro ao atualizar anúncio' });
    }
};

// Eliminar anúncio
const removeAnuncio = async (req, res) => {
    try {
        const { id_anuncio } = req.params;

        const anuncio = await prisma.anuncio.findUnique({
            where: { id_anuncio: parseInt(id_anuncio) }
        });

        if (!anuncio) {
            return res.status(404).json({ error: 'Anúncio não encontrado' });
        }

        if (anuncio.id_coordenadora !== req.user.id) {
            return res.status(403).json({ error: 'Sem permissão para eliminar este anúncio' });
        }

        await prisma.anuncio.delete({
            where: { id_anuncio: parseInt(id_anuncio) }
        });

        res.status(200).json({ mensagem: 'Anúncio eliminado com sucesso' });
    } catch (error) {
        res.status(500).json({ error: 'Erro ao eliminar anúncio' });
    }
};

// Listar anúncios de um evento
const getAnunciosByEvento = async (req, res) => {
    try {
        const { id_evento } = req.params;

        const anuncios = await prisma.anuncio.findMany({
            where: { id_evento: parseInt(id_evento) },
            include: {
                coordenadora: {
                    select: { utilizador: { select: { nome: true } } }
                }
            },
            orderBy: { data_envio: 'desc' }
        });

        res.status(200).json(anuncios);
    } catch (error) {
        res.status(500).json({ error: 'Erro ao listar anúncios do evento' });
    }
};

// Listar anúncios de um grupo
const getAnunciosByGrupo = async (req, res) => {
    try {
        const { id_grupo } = req.params;

        const anuncios = await prisma.anuncio.findMany({
            where: { id_grupo: parseInt(id_grupo) },
            include: {
                coordenadora: {
                    select: { utilizador: { select: { nome: true } } }
                }
            },
            orderBy: { data_envio: 'desc' }
        });

        res.status(200).json(anuncios);
    } catch (error) {
        res.status(500).json({ error: 'Erro ao listar anúncios do grupo' });
    }
};

module.exports = {
    createAnuncio,
    getAllAnuncios,
    getAnuncioById,
    updateAnuncio,
    removeAnuncio,
    getAnunciosByEvento,
    getAnunciosByGrupo
};

