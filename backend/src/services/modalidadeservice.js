// src/services/modalidade.service.js
// Gestão de Modalidades — apenas a coordenadora pode criar/editar/eliminar
// Docentes e alunos podem listar (para uso nos formulários de marcação)

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// ─────────────────────────────────────────────────────────────
// 1. listarModalidades
// ─────────────────────────────────────────────────────────────
/**
 * Lista todas as modalidades existentes.
 * Acessível a todos os perfis autenticados (docentes precisam para as disponibilidades,
 * alunos precisam para as marcações).
 * Inclui opcionalmente os docentes que lecionam cada modalidade.
 *
 * @param {boolean} comDocentes - Se true, inclui a lista de docentes por modalidade
 * @returns {Promise<Array>}
 */
const listarModalidades = async (id_docente = null, comDocentes = false) => {
  const where = {};
  if (id_docente) {
    where.docente_modalidade = {
      some: { id_docente: parseInt(id_docente) }
    };
  }

  const modalidades = await prisma.modalidade.findMany({
    where,
    include: comDocentes
      ? {
        docente_modalidade: {
          include: {
            docente: {
              include: {
                utilizador: { select: { nome: true, apelido: true, codigo_username: true } },
              },
            },
          },
        },
      }
      : undefined,
    orderBy: { nome: 'asc' },
  });

  if (!comDocentes) return modalidades;

  // Formata para simplificar o consumo no frontend
  return modalidades.map((m) => ({
    ...m,
    docente_modalidade: m.docente_modalidade.map((dm) => ({
      id_docente: dm.id_docente,
      nome: dm.docente.utilizador.nome,
      apelido: dm.docente.utilizador.apelido,
      codigo_username: dm.docente.utilizador.codigo_username,
    })),
  }));
};

// ─────────────────────────────────────────────────────────────
// 2. obterModalidade
// ─────────────────────────────────────────────────────────────
/**
 * Devolve uma modalidade específica pelo ID.
 *
 * @param {number} id_modalidade
 * @returns {Promise<object>}
 */
const obterModalidade = async (id_modalidade, comDocentes = false) => {
  const modalidade = await prisma.modalidade.findUnique({
    where: { id_modalidade: parseInt(id_modalidade) },
    include: comDocentes ? {
      docente_modalidade: {
        include: {
          docente: {
            include: {
              utilizador: { select: { nome: true, apelido: true, codigo_username: true } },
            },
          },
        },
      },
    } : undefined,
  });

  if (!modalidade) throw new Error('Modalidade não encontrada.');

  if (!comDocentes) return modalidade;

  return {
    ...modalidade,
    docente_modalidade: modalidade.docente_modalidade.map((dm) => ({
      id_docente: dm.id_docente,
      nome: dm.docente.utilizador.nome,
      apelido: dm.docente.utilizador.apelido,
      codigo_username: dm.docente.utilizador.codigo_username,
    })),
  };
};

// ─────────────────────────────────────────────────────────────
// 3. criarModalidade
// ─────────────────────────────────────────────────────────────
/**
 * Cria uma nova modalidade. Só a coordenadora pode usar esta função.
 * Valida que não existe já uma modalidade com o mesmo nome.
 *
 * @param {string} nome
 * @returns {Promise<object>} Modalidade criada
 */
const criarModalidade = async (nome) => {
  if (!nome || nome.trim().length === 0) {
    throw new Error('O nome da modalidade é obrigatório.');
  }

  const nomeLimpo = nome.trim();

  // Verifica duplicado (case-insensitive)
  const existente = await prisma.modalidade.findFirst({
    where: { nome: { equals: nomeLimpo, mode: 'insensitive' } },
  });

  if (existente) {
    throw new Error(`Já existe uma modalidade com o nome "${nomeLimpo}".`);
  }

  return await prisma.modalidade.create({
    data: { nome: nomeLimpo },
  });
};

// ─────────────────────────────────────────────────────────────
// 4. editarModalidade
// ─────────────────────────────────────────────────────────────
/**
 * Edita o nome de uma modalidade existente.
 * Valida que o novo nome não está já em uso por outra modalidade.
 *
 * @param {number} id_modalidade
 * @param {string} nome
 * @returns {Promise<object>} Modalidade atualizada
 */
const editarModalidade = async (id_modalidade, nome) => {
  if (!nome || nome.trim().length === 0) {
    throw new Error('O nome da modalidade é obrigatório.');
  }

  const nomeLimpo = nome.trim();
  const id = parseInt(id_modalidade);

  // Verifica que a modalidade existe
  const existente = await prisma.modalidade.findUnique({ where: { id_modalidade: id } });
  if (!existente) throw new Error('Modalidade não encontrada.');

  // Verifica duplicado noutras modalidades (exclui a atual)
  const duplicado = await prisma.modalidade.findFirst({
    where: {
      nome: { equals: nomeLimpo, mode: 'insensitive' },
      id_modalidade: { not: id },
    },
  });

  if (duplicado) {
    throw new Error(`Já existe outra modalidade com o nome "${nomeLimpo}".`);
  }

  return await prisma.modalidade.update({
    where: { id_modalidade: id },
    data: { nome: nomeLimpo },
  });
};

// ─────────────────────────────────────────────────────────────
// 5. eliminarModalidade
// ─────────────────────────────────────────────────────────────
/**
 * Elimina uma modalidade.
 * Não permite eliminar se existirem marcações ativas ou docentes associados.
 *
 * @param {number} id_modalidade
 * @returns {Promise<object>}
 */
const eliminarModalidade = async (id_modalidade) => {
  const id = parseInt(id_modalidade);

  const modalidade = await prisma.modalidade.findUnique({
    where: { id_modalidade: id },
    include: {
      docente_modalidade: true,
      marcacao: {
        where: {
          id_estado: { in: [1, 2, 3] }, // Pendente, Em Validação, Confirmada
        },
      },
    },
  });

  if (!modalidade) throw new Error('Modalidade não encontrada.');

  // Não permite eliminar se tiver marcações ativas
  if (modalidade.marcacao.length > 0) {
    throw new Error(
      `Não é possível eliminar "${modalidade.nome}": existem ${modalidade.marcacao.length} marcação(ões) ativa(s) associada(s).`
    );
  }

  // Avisa se tiver docentes associados mas permite eliminar (remove as associações também)
  if (modalidade.docente_modalidade.length > 0) {
    // Remove primeiro as associações docente_modalidade em cascata
    await prisma.docente_modalidade.deleteMany({
      where: { id_modalidade: id },
    });
  }

  await prisma.modalidade.delete({ where: { id_modalidade: id } });

  return { mensagem: `Modalidade "${modalidade.nome}" eliminada com sucesso.` };
};

// ─────────────────────────────────────────────────────────────
// 6. associarDocente / desassociarDocente
// ─────────────────────────────────────────────────────────────
/**
 * Associa um docente a uma modalidade (define que ele pode lecionar essa modalidade).
 * A coordenadora faz esta gestão.
 *
 * @param {number} id_modalidade
 * @param {number} id_docente
 * @returns {Promise<object>}
 */
const associarDocente = async (id_modalidade, id_docente) => {
  const id = parseInt(id_modalidade);
  const idDocente = parseInt(id_docente);

  // Verifica que a modalidade existe
  const modalidade = await prisma.modalidade.findUnique({ where: { id_modalidade: id } });
  if (!modalidade) throw new Error('Modalidade não encontrada.');

  // Verifica que o docente existe
  const docente = await prisma.docente.findUnique({
    where: { id_utilizador: idDocente },
    include: {
      utilizador: { select: { nome: true, apelido: true, codigo_username: true } }
    }
  });
  if (!docente) throw new Error('Docente não encontrado.');

  // Verifica se já está associado
  const jaAssociado = await prisma.docente_modalidade.findUnique({
    where: { id_docente_id_modalidade: { id_docente: idDocente, id_modalidade: id } },
  });
  if (jaAssociado) throw new Error('Este docente já está associado a esta modalidade.');

  await prisma.docente_modalidade.create({
    data: { id_docente: idDocente, id_modalidade: id },
  });

  return {
    id_docente: docente.id_utilizador,
    nome: docente.utilizador.nome,
    apelido: docente.utilizador.apelido,
    codigo_username: docente.utilizador.codigo_username,
  };
};

/**
 * Remove a associação entre um docente e uma modalidade.
 *
 * @param {number} id_modalidade
 * @param {number} id_docente
 * @returns {Promise<object>}
 */
const desassociarDocente = async (id_modalidade, id_docente) => {
  const id = parseInt(id_modalidade);
  const idDocente = parseInt(id_docente);

  const associacao = await prisma.docente_modalidade.findUnique({
    where: { id_docente_id_modalidade: { id_docente: idDocente, id_modalidade: id } },
  });
  if (!associacao) throw new Error('Associação não encontrada.');

  await prisma.docente_modalidade.delete({
    where: { id_docente_id_modalidade: { id_docente: idDocente, id_modalidade: id } },
  });

  return { mensagem: 'Docente removido da modalidade com sucesso.' };
};

// ─────────────────────────────────────────────────────────────
// EXPORTAÇÕES
// ─────────────────────────────────────────────────────────────
module.exports = {
  listarModalidades,
  obterModalidade,
  criarModalidade,
  editarModalidade,
  eliminarModalidade,
  associarDocente,
  desassociarDocente,
};
