// src/services/horarioEscolaService.js
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

/**
 * Obtém o horário de funcionamento da escola (onde id_docente é null).
 * @returns {Promise<object>}
 */
async function obterHorarioEscola() {
  const horarios = await prisma.horario_letivo.findMany({
    where: { id_docente: null },
    orderBy: { dia_semana: 'asc' }
  });

  if (!horarios || horarios.length === 0) {
    return null;
  }

  // Todos os registos devem ter a mesma data_inicio e data_fim e hora_inicio/hora_fim globais (conforme o requisito)
  const primeiro = horarios[0];

  return {
    data_inicio: primeiro.data_inicio,
    data_fim: primeiro.data_fim,
    hora_inicio: primeiro.hora_inicio ? primeiro.hora_inicio.toISOString().substring(11, 16) : null,
    hora_fim: primeiro.hora_fim ? primeiro.hora_fim.toISOString().substring(11, 16) : null,
    dias_semana: horarios.map(h => h.dia_semana).filter(d => d !== null)
  };
}

/**
 * Atualiza o horário de funcionamento da escola.
 * Remove os antigos e insere os novos registos para cada dia da semana selecionado.
 * 
 * @param {string} data_inicio - Data no formato YYYY-MM-DD
 * @param {string} data_fim - Data no formato YYYY-MM-DD
 * @param {string} hora_inicio - Hora no formato HH:MM
 * @param {string} hora_fim - Hora no formato HH:MM
 * @param {number[]} dias_semana - Array com os dias da semana (ex: [1, 2, 3, 4, 5])
 * @returns {Promise<object>}
 */
async function atualizarHorarioEscola(data_inicio, data_fim, hora_inicio, hora_fim, dias_semana) {
  if (!data_inicio || !data_fim || !hora_inicio || !hora_fim || !Array.isArray(dias_semana)) {
    throw new Error('Parâmetros inválidos. É obrigatório fornecer data_inicio, data_fim, hora_inicio, hora_fim e dias_semana.');
  }

  const dataInicioDate = new Date(data_inicio);
  const dataFimDate = new Date(data_fim);
  const horaInicioTime = new Date(`1970-01-01T${hora_inicio}:00Z`);
  const horaFimTime = new Date(`1970-01-01T${hora_fim}:00Z`);

  await prisma.$transaction(async (tx) => {
    // Apaga os horários letivos globais (da escola)
    await tx.horario_letivo.deleteMany({
      where: { id_docente: null }
    });

    // Se não selecionaram dias, simplesmente fica vazio (sem horário)
    if (dias_semana.length === 0) return;

    // Cria os novos registos, um para cada dia da semana
    const novosRegistos = dias_semana.map(dia => ({
      id_docente: null,
      dia_semana: dia,
      data_inicio: dataInicioDate,
      data_fim: dataFimDate,
      hora_inicio: horaInicioTime,
      hora_fim: horaFimTime
    }));

    await tx.horario_letivo.createMany({
      data: novosRegistos
    });
  });

  return obterHorarioEscola();
}

// ─────────────────────────────────────────────────────────────
// FUNÇÕES DE VALIDAÇÃO
// ─────────────────────────────────────────────────────────────

async function validarHorario(data, horaInicioStr, duracaoMinutos) {
  const escola = await obterHorarioEscola();
  if (!escola) return true;

  const dataAlvo = new Date(data);
  dataAlvo.setHours(0, 0, 0, 0);

  const inicioAno = new Date(escola.data_inicio);
  inicioAno.setHours(0, 0, 0, 0);
  const fimAno = new Date(escola.data_fim);
  fimAno.setHours(0, 0, 0, 0);

  // 1. Validar Ano Letivo
  if (dataAlvo < inicioAno || dataAlvo > fimAno) {
    throw new Error(`A data solicitada está fora do ano letivo configurado (de ${inicioAno.toLocaleDateString('pt-PT')} a ${fimAno.toLocaleDateString('pt-PT')}).`);
  }

  const diaDaSemanaJS = dataAlvo.getDay();
  const [hNova, mNova] = horaInicioStr.split(':').map(Number);
  const novaInicioMin = hNova * 60 + (mNova || 0);
  const novaFimMin = novaInicioMin + duracaoMinutos;

  // EXCEÇÃO: Sábado (6)
  if (diaDaSemanaJS === 6) {
    const sabadoInicio = 8 * 60 + 30; // 08:30
    const sabadoFim = 20 * 60; // 20:00
    if (novaInicioMin < sabadoInicio || novaFimMin > sabadoFim) {
      throw new Error('Ao Sábado, os coachings só são permitidos entre as 08:30 e as 20:00.');
    }
    return true; // Passou a validação de sábado
  }

  // DIAS NORMAIS (0 a 5)
  if (!escola.dias_semana.includes(diaDaSemanaJS)) {
    throw new Error('A escola não está aberta neste dia da semana para coachings.');
  }

  const [hEscFim, mEscFim] = escola.hora_fim.split(':').map(Number);
  const escFimMin = hEscFim * 60 + (mEscFim || 0);
  const limiteFimDia = 22 * 60; // 22:00

  if (novaInicioMin < escFimMin || novaFimMin > limiteFimDia) {
    throw new Error(`Os coachings só podem ser marcados entre as ${escola.hora_fim} e as 22:00.`);
  }

  return true;
}

/**
 * Valida se uma disponibilidade do docente está de acordo com as regras da escola.
 */
async function validarHorarioDisponibilidade(dia_semana, data_especifica, hora_inicio, hora_fim) {
  const escola = await obterHorarioEscola();
  if (!escola) return true;

  let diaDaSemanaJS = null;

  if (data_especifica) {
    const dataAlvo = new Date(data_especifica);
    dataAlvo.setHours(0, 0, 0, 0);
    const inicioAno = new Date(escola.data_inicio);
    inicioAno.setHours(0, 0, 0, 0);
    const fimAno = new Date(escola.data_fim);
    fimAno.setHours(0, 0, 0, 0);

    if (dataAlvo < inicioAno || dataAlvo > fimAno) {
      throw new Error(`A data solicitada está fora do ano letivo configurado (de ${inicioAno.toLocaleDateString('pt-PT')} a ${fimAno.toLocaleDateString('pt-PT')}).`);
    }
    diaDaSemanaJS = dataAlvo.getDay();
  } else if (dia_semana !== undefined && dia_semana !== null) {
    diaDaSemanaJS = parseInt(dia_semana);
  }

  const hNovaIni = hora_inicio instanceof Date ? hora_inicio.getUTCHours() : parseInt(hora_inicio.split(':')[0]);
  const mNovaIni = hora_inicio instanceof Date ? hora_inicio.getUTCMinutes() : parseInt(hora_inicio.split(':')[1]);
  const novaInicioMin = hNovaIni * 60 + mNovaIni;

  const hNovaFim = hora_fim instanceof Date ? hora_fim.getUTCHours() : parseInt(hora_fim.split(':')[0]);
  const mNovaFim = hora_fim instanceof Date ? hora_fim.getUTCMinutes() : parseInt(hora_fim.split(':')[1]);
  const novaFimMin = hNovaFim * 60 + mNovaFim;

  // EXCEÇÃO: Sábado (6)
  if (diaDaSemanaJS === 6) {
    const sabadoInicio = 8 * 60 + 30; // 08:30
    const sabadoFim = 20 * 60; // 20:00
    if (novaInicioMin < sabadoInicio || novaFimMin > sabadoFim) {
      throw new Error('Ao Sábado, as disponibilidades só são permitidas entre as 08:30 e as 20:00.');
    }
    return true;
  }

  // DIAS NORMAIS
  if (diaDaSemanaJS !== null && !escola.dias_semana.includes(diaDaSemanaJS)) {
    throw new Error('A escola não está aberta neste dia da semana para coachings.');
  }

  const [hEscFim, mEscFim] = escola.hora_fim.split(':').map(Number);
  const escFimMin = hEscFim * 60 + (mEscFim || 0);
  const limiteFimDia = 22 * 60; // 22:00

  if (novaInicioMin < escFimMin || novaFimMin > limiteFimDia) {
    throw new Error(`As disponibilidades para coaching só podem ser definidas entre as ${escola.hora_fim} e as 22:00.`);
  }

  return true;
}

module.exports = {
  obterHorarioEscola,
  atualizarHorarioEscola,
  validarHorario,
  validarHorarioDisponibilidade
};
