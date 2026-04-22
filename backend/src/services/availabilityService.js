const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

/**
 * Validações e lógica de negócio para Disponibilidades
 */

/**
 * Valida se o utilizador é docente
 */
const validarDocente = (id_tipo) => {
  if (id_tipo !== 2) {
    throw new Error("Apenas docentes podem gerir disponibilidades de horário.");
  }
};

/**
 * Valida parâmetros obrigatórios para criar disponibilidade
 */
const validarParametrosCreate = (dia_semana, data_especifica, hora_inicio, hora_fim) => {
  if (!dia_semana && !data_especifica) {
    throw new Error("É obrigatório definir dia_semana ou data_especifica.");
  }

  if (!hora_inicio || !hora_fim) {
    throw new Error("Horários de início e fim são obrigatórios.");
  }
};

/**
 * Verifica sobreposição de horários com outras disponibilidades
 */
const verificarSobreposicao = async (id_docente, dia_semana, data_especifica, hora_inicio, hora_fim, id_disponibilidade_atual = null) => {
  
  // Função auxiliar para garantir que temos um objeto Date válido para o tipo TIME
  const formatarHora = (hora) => {
    // Se a hora já for uma string ISO completa (contém 'T'), extraímos apenas a parte do tempo
    const timePart = hora.includes('T') ? hora.split('T')[1].split('.')[0] : hora;
    const finalDate = new Date(`1970-01-01T${timePart.replace('Z', '')}Z`);
    
    if (isNaN(finalDate.getTime())) throw new Error(`Hora inválida: ${hora}`);
    return finalDate;
  };

  const horaInicioDate = formatarHora(hora_inicio);
  const horaFimDate = formatarHora(hora_fim);

  const whereCondition = {
    id_docente: parseInt(id_docente),
    // Se for null ou undefined, o Prisma deve procurar especificamente por registros onde é NULL
    dia_semana: dia_semana !== null && dia_semana !== undefined ? parseInt(dia_semana) : null,
    data_especifica: data_especifica ? new Date(data_especifica) : null,
    AND: [
      { hora_inicio: { lt: horaFimDate } },
      { hora_fim: { gt: horaInicioDate } },
    ],
  };

  if (id_disponibilidade_atual) {
    whereCondition.id_disponibilidade = { not: parseInt(id_disponibilidade_atual) };
  }

  const sobrepostas = await prisma.disponibilidade.findMany({
    where: whereCondition,
  });

  if (sobrepostas.length > 0) {
    throw new Error("Já existe uma disponibilidade sobreposta neste intervalo.");
  }
};

/**
 * Verifica se a disponibilidade pertence ao docente
 */
const verificarPropriedade = async (id_disponibilidade, id_docente) => {
  const disponibilidade = await prisma.disponibilidade.findFirst({
    where: {
      id_disponibilidade: parseInt(id_disponibilidade),
      id_docente,
    },
  });

  if (!disponibilidade) {
    throw new Error("Disponibilidade não encontrada ou sem permissão.");
  }

  return disponibilidade;
};

/**
 * Verifica se existem marcações ativas associadas
 */
const verificarMarcacoesAtivas = async (id_disponibilidade) => {
  const disponibilidade = await prisma.disponibilidade.findUnique({
    where: { id_disponibilidade: parseInt(id_disponibilidade) },
    include: { marcacao: true },
  });

  if (!disponibilidade) {
    throw new Error("Disponibilidade não encontrada.");
  }

  if (disponibilidade.marcacao && disponibilidade.marcacao.length > 0) {
    throw new Error("Não é possível eliminar um horário que já tem uma marcação ativa. Deves cancelar a marcação primeiro.");
  }

  return disponibilidade;
};

/**
 * CRIAR - Cria uma nova disponibilidade
 */
const criarDisponibilidade = async (id_docente, dados) => {
  const { dia_semana, data_especifica, hora_inicio, hora_fim } = dados;
  // const {id_tipo} = req.user.id_tipo;
  // // Validações
  // validarDocente(id_tipo);
  validarParametrosCreate(dia_semana, data_especifica, hora_inicio, hora_fim);

  // Verificar sobreposição
  await verificarSobreposicao(id_docente, dia_semana, data_especifica, hora_inicio, hora_fim);

  // Criar
  const novaDisponibilidade = await prisma.disponibilidade.create({
    data: {
      id_docente,
      dia_semana: dia_semana ? parseInt(dia_semana) : null,
      data_especifica: data_especifica ? new Date(data_especifica) : null,
      hora_inicio: new Date(`1970-01-01T${hora_inicio}Z`),
      hora_fim: new Date(`1970-01-01T${hora_fim}Z`),
    },
  });

  return novaDisponibilidade;
};

/**
 * LISTAR - Lista todas as disponibilidades de um docente
 */
const listarDisponibilidades = async (id_docente) => {
  const disponibilidades = await prisma.disponibilidade.findMany({
    where: { id_docente },
    orderBy: [
      { dia_semana: "asc" },
      { data_especifica: "asc" },
      { hora_inicio: "asc" },
    ],
  });

  return disponibilidades;
};

/**
 * OBTER - Obtém uma disponibilidade específica
 */
const obterDisponibilidade = async (id_disponibilidade, id_docente) => {
  return await verificarPropriedade(id_disponibilidade, id_docente);
};

/**
 * ATUALIZAR - Atualiza uma disponibilidade existente
 */
const atualizarDisponibilidade = async (id_disponibilidade, id_docente, dados) => {
  const { dia_semana, data_especifica, hora_inicio, hora_fim } = dados;

  // 1. Verificar se existe e pertence ao docente
  const existente = await verificarPropriedade(id_disponibilidade, id_docente);

  // Função Auxiliar Interna para limpar o formato da hora
  const parseHoraTime = (valor) => {
    if (!valor) return null;
    // Se vier uma string ISO completa, extraímos apenas a parte do tempo (HH:mm:ss)
    const extrairTempo = valor.toString().includes('T') 
      ? valor.toString().split('T')[1].split('.')[0] 
      : valor;
    
    const d = new Date(`1970-01-01T${extrairTempo.replace('Z', '')}Z`);
    return isNaN(d.getTime()) ? null : d;
  };

  // 2. Preparar dados finais com lógica de limpeza
  const novaHoraInicio = hora_inicio ? parseHoraTime(hora_inicio) : existente.hora_inicio;
  const novaHoraFim = hora_fim ? parseHoraTime(hora_fim) : existente.hora_fim;
  
  // Garantir que diaSemana é um número ou null (evitar NaN)
  const diaSemana = dia_semana !== undefined 
    ? (dia_semana === null ? null : parseInt(dia_semana)) 
    : existente.dia_semana;

  const dataEspecifica = data_especifica !== undefined
    ? (data_especifica === null ? null : new Date(data_especifica))
    : existente.data_especifica;

  // 3. Verificar sobreposição
  // Passamos as horas já formatadas para o verificador
  await verificarSobreposicao(
    id_docente,
    diaSemana,
    dataEspecifica,
    novaHoraInicio, // Agora passamos o objeto Date válido
    novaHoraFim,
    parseInt(id_disponibilidade)
  );

  // 4. Atualizar
  return await prisma.disponibilidade.update({
    where: { id_disponibilidade: parseInt(id_disponibilidade) },
    data: {
      dia_semana: diaSemana,
      data_especifica: dataEspecifica,
      hora_inicio: novaHoraInicio,
      hora_fim: novaHoraFim,
    },
  });
};

/**
 * ELIMINAR - Remove uma disponibilidade
 */
const eliminarDisponibilidade = async (id_disponibilidade, id_docente) => {
  // Verificar se existe e tem marcações ativas
  // await verificarMarcacoesAtivas(id_disponibilidade);

  // Verificar se pertence ao docente
  await verificarPropriedade(id_disponibilidade, id_docente);

  // Eliminar
  await prisma.disponibilidade.delete({
    where: { id_disponibilidade: parseInt(id_disponibilidade) },
  });

  return { message: "Disponibilidade eliminada com sucesso." };
};

module.exports = {
  validarDocente,
  validarParametrosCreate,
  verificarSobreposicao,
  verificarPropriedade,
  verificarMarcacoesAtivas,
  criarDisponibilidade,
  listarDisponibilidades,
  obterDisponibilidade,
  atualizarDisponibilidade,
  eliminarDisponibilidade,
};
