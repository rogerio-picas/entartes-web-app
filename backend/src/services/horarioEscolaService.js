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

/**
 * Função utilitária para verificar se uma data e hora estão dentro do horário da escola.
 */
async function validarHorario(data, horaInicioStr, duracaoMinutos) {
  const escola = await obterHorarioEscola();
  // Se não houver horário da escola definido, não há restrições ativas (ou deveria bloquear? Vamos assumir que não bloqueia se não estiver configurado)
  if (!escola) return true;

  const dataAlvo = new Date(data);
  dataAlvo.setHours(0, 0, 0, 0);

  const inicioAno = new Date(escola.data_inicio);
  inicioAno.setHours(0, 0, 0, 0);

  const fimAno = new Date(escola.data_fim);
  fimAno.setHours(0, 0, 0, 0);

  // 1. Validar se está dentro do ano letivo
  if (dataAlvo < inicioAno || dataAlvo > fimAno) {
    throw new Error(`A data solicitada está fora do ano letivo configurado (de ${inicioAno.toLocaleDateString('pt-PT')} a ${fimAno.toLocaleDateString('pt-PT')}).`);
  }

  // 2. Validar o dia da semana (0=Domingo, 1=Segunda, etc. na BD ou no JS)
  // Assumindo que a BD guarda 0=Domingo, 1=Segunda... (o getDay() do JS devolve assim)
  const diaDaSemanaJS = dataAlvo.getDay();
  // Se a frontend usar 1=Segunda...7=Domingo, precisamos de mapear. Vou assumir o padrão do JS (0-6).
  // Na verdade, vou verificar depois no Frontend como são mapeados os DIAS.
  if (!escola.dias_semana.includes(diaDaSemanaJS)) {
    throw new Error('A escola não está aberta neste dia da semana.');
  }

  // 3. Validar a janela de horas (Deve começar DEPOIS do horário letivo acabar)
  const [hNova, mNova] = horaInicioStr.split(':').map(Number);
  const novaInicioMin = hNova * 60 + (mNova || 0);

  const [hEscFim, mEscFim] = escola.hora_fim.split(':').map(Number);
  const escFimMin = hEscFim * 60 + (mEscFim || 0);

  if (novaInicioMin <= escFimMin) {
    throw new Error(`Os coachings só podem ser marcados após o fim do horário letivo diário da escola (${escola.hora_fim}).`);
  }

  return true;
}

/**
 * Valida se uma disponibilidade do docente está de acordo com as regras da escola.
 */
async function validarHorarioDisponibilidade(dia_semana, data_especifica, hora_inicio, hora_fim) {
  const escola = await obterHorarioEscola();
  if (!escola) return true;

  // 1. Validar horas (ambos os casos) - Só após o fim do horário letivo
  const hNovaIni = hora_inicio instanceof Date ? hora_inicio.getUTCHours() : parseInt(hora_inicio.split(':')[0]);
  const mNovaIni = hora_inicio instanceof Date ? hora_inicio.getUTCMinutes() : parseInt(hora_inicio.split(':')[1]);
  const novaInicioMin = hNovaIni * 60 + mNovaIni;

  const [hEscFim, mEscFim] = escola.hora_fim.split(':').map(Number);
  const escFimMin = hEscFim * 60 + (mEscFim || 0);

  if (novaInicioMin <= escFimMin) {
    throw new Error(`As disponibilidades para coaching só podem ser definidas após o fim do horário letivo diário da escola (${escola.hora_fim}).`);
  }

  // 2. Validar Data Específica vs Ano Letivo
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

    const diaDaSemanaJS = dataAlvo.getDay();
    if (!escola.dias_semana.includes(diaDaSemanaJS)) {
      throw new Error('A escola não está aberta neste dia da semana.');
    }
  }

  // 3. Validar Dia da Semana (recorrente)
  if (dia_semana !== undefined && dia_semana !== null) {
    if (!escola.dias_semana.includes(parseInt(dia_semana))) {
      throw new Error('A escola não está aberta neste dia da semana.');
    }
  }

  return true;
}

module.exports = {
  obterHorarioEscola,
  atualizarHorarioEscola,
  validarHorario,
  validarHorarioDisponibilidade
};
