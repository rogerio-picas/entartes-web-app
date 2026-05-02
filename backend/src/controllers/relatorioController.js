// src/controllers/relatorio.controller.js
// Módulo de Relatórios — Controller
// Responsabilidade única: ler o req, chamar o service, devolver o res.
// Nenhuma lógica de negócio ou acesso directo ao Prisma aqui.

const relatorioService = require('../services/relatorioService');

// ─────────────────────────────────────────────────────────────
// 1. getSessoesRelatorio
// ─────────────────────────────────────────────────────────────
/**
 * GET /api/relatorio/sessoes?from=YYYY-MM-DD&to=YYYY-MM-DD
 * Devolve todas as sessões concluídas no intervalo pedido.
 */
const getSessoesRelatorio = async (req, res) => {
  try {
    const { from, to } = req.query;

    if (!from || !to) {
      return res.status(400).json({ error: 'Os parâmetros "from" e "to" são obrigatórios.' });
    }

    const sessoes = await relatorioService.obterSessoes(from, to);
    res.json(sessoes);

  } catch (error) {
    console.error('getSessoesRelatorio:', error);
    res.status(500).json({ error: 'Erro interno do servidor.' });
  }
};

// ─────────────────────────────────────────────────────────────
// 2. getHorasDocente
// ─────────────────────────────────────────────────────────────
/**
 * GET /api/relatorio/horas-docente?data_inicio=YYYY-MM-DD&data_fim=YYYY-MM-DD
 * Devolve o total de sessões e minutos por docente (filtro de datas opcional).
 */
const getHorasDocente = async (req, res) => {
  try {
    const { data_inicio, data_fim } = req.query;

    const resultado = await relatorioService.obterHorasPorDocente(data_inicio, data_fim);
    res.json(resultado);

  } catch (error) {
    console.error('getHorasDocente:', error);
    res.status(500).json({ error: 'Erro interno do servidor.' });
  }
};

// ─────────────────────────────────────────────────────────────
// 3. getAlunosRelatorio
// ─────────────────────────────────────────────────────────────
/**
 * GET /api/relatorio/alunos?data_inicio=YYYY-MM-DD&data_fim=YYYY-MM-DD
 * Devolve o total de sessões e minutos por aluno (filtro de datas opcional).
 */
const getAlunosRelatorio = async (req, res) => {
  try {
    const { data_inicio, data_fim } = req.query;

    const resultado = await relatorioService.obterRelatorioAlunos(data_inicio, data_fim);
    res.json(resultado);

  } catch (error) {
    console.error('getAlunosRelatorio:', error);
    res.status(500).json({ error: 'Erro interno do servidor.' });
  }
};

// ─────────────────────────────────────────────────────────────
// 4. getDocentesRelatorio
// ─────────────────────────────────────────────────────────────
/**
 * GET /api/relatorio/docentes
 * Devolve o histórico completo de sessões concluídas por docente (sem filtro de datas).
 */
const getDocentesRelatorio = async (req, res) => {
  try {
    const resultado = await relatorioService.obterRelatorioDocentes();
    res.json(resultado);

  } catch (error) {
    console.error('getDocentesRelatorio:', error);
    res.status(500).json({ error: 'Erro interno do servidor.' });
  }
};

// ─────────────────────────────────────────────────────────────
// 5. exportCSV
// ─────────────────────────────────────────────────────────────
/**
 * GET /api/relatorio/export-csv?from=YYYY-MM-DD&to=YYYY-MM-DD
 * Devolve um ficheiro CSV com as sessões concluídas no intervalo pedido.
 */
const exportCSV = async (req, res) => {
  try {
    const { from, to } = req.query;

    if (!from || !to) {
      return res.status(400).json({ error: 'Os parâmetros "from" e "to" são obrigatórios.' });
    }

    const csv = await relatorioService.gerarDadosCSV(from, to);

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="sessoes.csv"');
    res.send(csv);

  } catch (error) {
    console.error('exportCSV:', error);
    res.status(500).json({ error: 'Falha na exportação CSV.' });
  }
};

// ─────────────────────────────────────────────────────────────
// EXPORTAÇÕES
// ─────────────────────────────────────────────────────────────
module.exports = {
  getSessoesRelatorio,
  getHorasDocente,
  getAlunosRelatorio,
  getDocentesRelatorio,
  exportCSV,
};
