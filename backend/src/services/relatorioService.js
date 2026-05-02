// src/services/relatorioService.js
// Módulo de Relatórios — Lógica de negócio
// Segue as convenções do projecto Ent'artes: todo o acesso ao Prisma fica aqui.

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// ID do estado "Concluída" na tabela estado_marcacao
const ESTADO_CONCLUIDA = 4;

// ─────────────────────────────────────────────────────────────
// AUXILIAR — constrói o filtro de datas para as queries
// ─────────────────────────────────────────────────────────────
/**
 * Recebe duas strings de data opcionais e devolve um objecto
 * pronto a usar no campo `data_a_realizar` do Prisma.
 *
 * @param {string|undefined} data_inicio - Data de início no formato "YYYY-MM-DD"
 * @param {string|undefined} data_fim    - Data de fim no formato "YYYY-MM-DD"
 * @returns {object|undefined} Filtro Prisma ou undefined se nenhuma data for dada
 */
function _construirFiltroDatas(data_inicio, data_fim) {
  const filtro = {};
  if (data_inicio) filtro.gte = new Date(data_inicio);
  if (data_fim)    filtro.lte = new Date(data_fim);
  return Object.keys(filtro).length ? filtro : undefined;
}

// ─────────────────────────────────────────────────────────────
// 1. obterSessoes
// ─────────────────────────────────────────────────────────────
/**
 * Devolve todas as sessões concluídas dentro de um intervalo de datas obrigatório.
 * Inclui informação do docente, modalidade, sala e alunos participantes.
 *
 * @param {string} from - Data de início (obrigatória), formato "YYYY-MM-DD"
 * @param {string} to   - Data de fim (obrigatória), formato "YYYY-MM-DD"
 * @returns {Promise<Array>} Lista de marcações concluídas com relações incluídas
 */
async function obterSessoes(from, to) {
  return prisma.marcacao.findMany({
    where: {
      id_estado: ESTADO_CONCLUIDA,
      data_a_realizar: {
        gte: new Date(from),
        lte: new Date(to),
      },
    },
    include: {
      docente: true,
      modalidade: true,
      sala: true,
      aluno_marcacao: {
        include: { aluno: true },
      },
    },
  });
}

// ─────────────────────────────────────────────────────────────
// 2. obterHorasPorDocente
// ─────────────────────────────────────────────────────────────
/**
 * Agrega as sessões concluídas por docente, devolvendo o total de sessões
 * e de minutos leccionados. Filtra por datas, se fornecidas.
 *
 * @param {string|undefined} data_inicio
 * @param {string|undefined} data_fim
 * @returns {Promise<Array>} Lista de docentes com totais agregados
 */
async function obterHorasPorDocente(data_inicio, data_fim) {
  const filtroDatas = _construirFiltroDatas(data_inicio, data_fim);

  const docentes = await prisma.docente.findMany({
    include: {
      utilizador: { select: { nome: true, apelido: true } },
      marcacao: {
        where: {
          id_estado: ESTADO_CONCLUIDA,
          ...(filtroDatas && { data_a_realizar: filtroDatas }),
        },
        include: {
          modalidade: { select: { nome: true } },
        },
      },
    },
  });

  return docentes
    .filter((d) => d.marcacao.length > 0)
    .map((d) => ({
      id_docente: d.id_utilizador,
      nome: `${d.utilizador?.nome ?? ''} ${d.utilizador?.apelido ?? ''}`.trim(),
      modalidades: [
        ...new Set(d.marcacao.map((m) => m.modalidade?.nome).filter(Boolean)),
      ],
      totalSessoes: d.marcacao.length,
      totalMinutos: d.marcacao.reduce((soma, m) => soma + (m.duracao_minutos ?? 0), 0),
    }));
}

// ─────────────────────────────────────────────────────────────
// 3. obterRelatorioAlunos
// ─────────────────────────────────────────────────────────────
/**
 * Agrega as sessões concluídas por aluno. Filtra por datas, se fornecidas.
 *
 * @param {string|undefined} data_inicio
 * @param {string|undefined} data_fim
 * @returns {Promise<Array>} Lista de alunos com totais de sessões e minutos
 */
async function obterRelatorioAlunos(data_inicio, data_fim) {
  const filtroDatas = _construirFiltroDatas(data_inicio, data_fim);

  const alunos = await prisma.aluno.findMany({
    include: {
      utilizador: { select: { nome: true, apelido: true } },
      aluno_marcacao: {
        where: {
          marcacao: {
            id_estado: ESTADO_CONCLUIDA,
            ...(filtroDatas && { data_a_realizar: filtroDatas }),
          },
        },
        include: {
          marcacao: {
            include: { modalidade: { select: { nome: true } } },
          },
        },
      },
    },
  });

  return alunos
    .filter((a) => a.aluno_marcacao.length > 0)
    .map((a) => ({
      id: a.id_utilizador,
      nome: `${a.utilizador?.nome ?? ''} ${a.utilizador?.apelido ?? ''}`.trim(),
      modalidades: [
        ...new Set(
          a.aluno_marcacao.map((am) => am.marcacao?.modalidade?.nome).filter(Boolean)
        ),
      ],
      totalSessoes: a.aluno_marcacao.length,
      totalMinutos: a.aluno_marcacao.reduce(
        (soma, am) => soma + (am.marcacao?.duracao_minutos ?? 0),
        0
      ),
    }));
}

// ─────────────────────────────────────────────────────────────
// 4. obterRelatorioDocentes
// ─────────────────────────────────────────────────────────────
/**
 * Semelhante a obterHorasPorDocente mas sem filtro de datas —
 * devolve o histórico completo de todos os docentes com sessões concluídas.
 *
 * @returns {Promise<Array>}
 */
async function obterRelatorioDocentes() {
  const docentes = await prisma.docente.findMany({
    include: {
      utilizador: { select: { nome: true, apelido: true } },
      marcacao: {
        where: { id_estado: ESTADO_CONCLUIDA },
        include: { modalidade: { select: { nome: true } } },
      },
    },
  });

  return docentes
    .filter((d) => d.marcacao.length > 0)
    .map((d) => ({
      id: d.id_utilizador,
      nome: `${d.utilizador?.nome ?? ''} ${d.utilizador?.apelido ?? ''}`.trim(),
      modalidades: [
        ...new Set(d.marcacao.map((m) => m.modalidade?.nome).filter(Boolean)),
      ],
      totalSessoes: d.marcacao.length,
      totalMinutos: d.marcacao.reduce((soma, m) => soma + (m.duracao_minutos ?? 0), 0),
    }));
}

// ─────────────────────────────────────────────────────────────
// 5. gerarDadosCSV
// ─────────────────────────────────────────────────────────────
/**
 * Obtém as sessões concluídas e formata-as como string CSV,
 * pronta a ser enviada pelo controller com os headers adequados.
 *
 * @param {string} from - Data de início (obrigatória)
 * @param {string} to   - Data de fim (obrigatória)
 * @returns {Promise<string>} Conteúdo CSV como string
 */
async function gerarDadosCSV(from, to) {
  const sessoes = await prisma.marcacao.findMany({
    where: {
      id_estado: ESTADO_CONCLUIDA,
      data_a_realizar: {
        gte: new Date(from),
        lte: new Date(to),
      },
    },
    include: {
      docente: true,
      modalidade: true,
      sala: true,
    },
  });

  const linhas = sessoes.map((s) => ({
    id:           s.id_marcacoes,
    data:         s.data_a_realizar?.toISOString().split('T')[0] ?? 'N/A',
    hora:         s.hora_inicio,
    duracao_min:  s.duracao_minutos,
    docente:      s.docente?.id_utilizador ?? 'N/A',
    modalidade:   s.modalidade?.nome ?? 'N/A',
    sala:         s.sala?.nome ?? 'N/A',
  }));

  const cabecalho = Object.keys(linhas[0] ?? {}).join(',');
  const corpo = linhas.map((l) => Object.values(l).join(','));

  return [cabecalho, ...corpo].join('\n');
}

// ─────────────────────────────────────────────────────────────
// EXPORTAÇÕES
// ─────────────────────────────────────────────────────────────
module.exports = {
  obterSessoes,
  obterHorasPorDocente,
  obterRelatorioAlunos,
  obterRelatorioDocentes,
  gerarDadosCSV,
};