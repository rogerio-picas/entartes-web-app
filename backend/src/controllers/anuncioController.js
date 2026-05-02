// src/controllers/anuncio.controller.js
// Módulo de Anúncios — Controller
// Responsabilidade única: ler o req, chamar o service, devolver o res.
// Nenhuma lógica de negócio ou acesso directo ao Prisma aqui.

const anuncioService = require('../services/anuncioService');

// ─────────────────────────────────────────────────────────────
// AUXILIAR — converte erros de negócio em respostas HTTP
// ─────────────────────────────────────────────────────────────
/**
 * Centraliza o tratamento de erros dos handlers.
 * Erros conhecidos (ex: "não encontrado", "sem permissão") devolvem
 * o código HTTP apropriado; erros inesperados devolvem 500.
 *
 * @param {Error} error
 * @param {object} res - objecto Response do Express
 */
function _tratarErro(error, res) {
  const mensagem = error.message ?? 'Erro interno do servidor.';

  if (mensagem.includes('não encontrado') || mensagem.includes('não encontrada')) {
    return res.status(404).json({ error: mensagem });
  }
  if (mensagem.includes('Sem permissão') || mensagem.includes('obrigatórios')) {
    return res.status(403).json({ error: mensagem });
  }
  if (mensagem.includes('obrigatório') || mensagem.includes('obrigatórios')) {
    return res.status(400).json({ error: mensagem });
  }

  console.error('[anuncio.controller]', error);
  res.status(500).json({ error: 'Erro interno do servidor.' });
}

// ─────────────────────────────────────────────────────────────
// CRUD BÁSICO
// ─────────────────────────────────────────────────────────────

// POST /api/anuncios
const createAnuncio = async (req, res) => {
    try {
        const { id_evento, id_grupo, titulo, mensagem } = req.body;

        if (!titulo || !mensagem) {
            return res.status(400).json({ error: 'Título e mensagem são obrigatórios' });
        }

        // CORREÇÃO: parseInt sem verificação de isNaN podia passar NaN silenciosamente ao Prisma
        const eventoId = id_evento ? parseInt(id_evento) : null;
        const grupoId  = id_grupo  ? parseInt(id_grupo)  : null;
        if (id_evento && isNaN(eventoId)) return res.status(400).json({ error: 'id_evento inválido' });
        if (id_grupo  && isNaN(grupoId))  return res.status(400).json({ error: 'id_grupo inválido' });

        const novo = await prisma.anuncio.create({
            data: {
                id_evento:       eventoId,
                id_grupo:        grupoId,
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

// GET /api/anuncios
const getAllAnuncios = async (req, res) => {
  try {
    const anuncios = await anuncioService.listarTodosAnuncios();
    res.status(200).json(anuncios);
  } catch (error) {
    _tratarErro(error, res);
  }
};

// GET /api/anuncios/:id_anuncio
const getAnuncioById = async (req, res) => {
    try {
        const { id_anuncio } = req.params;

        // CORREÇÃO: ID do parâmetro não era validado antes de consultar a base de dados
        const id = parseInt(id_anuncio);
        if (isNaN(id)) return res.status(400).json({ error: 'id_anuncio inválido' });

        const anuncio = await prisma.anuncio.findUnique({
            where: { id_anuncio: id },
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

// PUT /api/anuncios/:id_anuncio
const updateAnuncio = async (req, res) => {
    try {
        const { id_anuncio } = req.params;
        const { titulo, mensagem } = req.body;

        // CORREÇÃO: ID não era validado e não se verificava se havia pelo menos um campo para atualizar
        const id = parseInt(id_anuncio);
        if (isNaN(id)) return res.status(400).json({ error: 'id_anuncio inválido' });
        if (!titulo && !mensagem) return res.status(400).json({ error: 'Forneça pelo menos título ou mensagem para atualizar' });

        const anuncio = await prisma.anuncio.findUnique({
            where: { id_anuncio: id }
        });

        if (!anuncio) {
            return res.status(404).json({ error: 'Anúncio não encontrado' });
        }

        if (anuncio.id_coordenadora !== req.user.id) {
            return res.status(403).json({ error: 'Sem permissão para atualizar este anúncio' });
        }

        const atualizado = await prisma.anuncio.update({
            where: { id_anuncio: id },
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

// DELETE /api/anuncios/:id_anuncio
const removeAnuncio = async (req, res) => {
    try {
        const { id_anuncio } = req.params;

        // CORREÇÃO: ID do parâmetro não era validado antes de consultar a base de dados
        const id = parseInt(id_anuncio);
        if (isNaN(id)) return res.status(400).json({ error: 'id_anuncio inválido' });

        const anuncio = await prisma.anuncio.findUnique({
            where: { id_anuncio: id }
        });

        if (!anuncio) {
            return res.status(404).json({ error: 'Anúncio não encontrado' });
        }

        if (anuncio.id_coordenadora !== req.user.id) {
            return res.status(403).json({ error: 'Sem permissão para eliminar este anúncio' });
        }

        await prisma.anuncio.delete({
            where: { id_anuncio: id }
        });

        res.status(200).json({ mensagem: 'Anúncio eliminado com sucesso' });
    } catch (error) {
        res.status(500).json({ error: 'Erro ao eliminar anúncio' });
    }
};

// ─────────────────────────────────────────────────────────────
// PUBLICAÇÃO COM NOTIFICAÇÕES
// ─────────────────────────────────────────────────────────────

// POST /api/anuncios/evento/:id_evento
const publicarNoEvento = async (req, res) => {
  try {
    const { titulo, mensagem } = req.body;
    const novo = await anuncioService.publicarAnuncioNoEvento(
      req.params.id_evento,
      req.user.id,
      { titulo, mensagem }
    );
    res.status(201).json(novo);
  } catch (error) {
    _tratarErro(error, res);
  }
};

// POST /api/anuncios/grupo/:id_grupo
const publicarNoGrupo = async (req, res) => {
  try {
    const { titulo, mensagem } = req.body;
    const novo = await anuncioService.publicarAnuncioNoGrupo(
      req.params.id_grupo,
      req.user.id,
      { titulo, mensagem }
    );
    res.status(201).json(novo);
  } catch (error) {
    _tratarErro(error, res);
  }
};

// ─────────────────────────────────────────────────────────────
// LISTAGENS FILTRADAS
// ─────────────────────────────────────────────────────────────

// GET /api/anuncios/evento/:id_evento
const getAnunciosByEvento = async (req, res) => {
    try {
        const { id_evento } = req.params;

        // CORREÇÃO: ID do parâmetro não era validado antes de consultar a base de dados
        const id = parseInt(id_evento);
        if (isNaN(id)) return res.status(400).json({ error: 'id_evento inválido' });

        const anuncios = await prisma.anuncio.findMany({
            where: { id_evento: id },
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

// GET /api/anuncios/grupo/:id_grupo
const getAnunciosByGrupo = async (req, res) => {
    try {
        const { id_grupo } = req.params;

        // CORREÇÃO: ID do parâmetro não era validado antes de consultar a base de dados
        const id = parseInt(id_grupo);
        if (isNaN(id)) return res.status(400).json({ error: 'id_grupo inválido' });

        const anuncios = await prisma.anuncio.findMany({
            where: { id_grupo: id },
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

// ─────────────────────────────────────────────────────────────
// EXPORTAÇÕES
// ─────────────────────────────────────────────────────────────
module.exports = {
  createAnuncio,
  getAllAnuncios,
  getAnuncioById,
  updateAnuncio,
  removeAnuncio,
  publicarNoEvento,
  publicarNoGrupo,
  getAnunciosByEvento,
  getAnunciosByGrupo,
};