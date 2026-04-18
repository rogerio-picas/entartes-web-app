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
  const horaInicioDate = new Date(`1970-01-01T${hora_inicio}Z`);
  const horaFimDate = new Date(`1970-01-01T${hora_fim}Z`);

  const whereCondition = {
    id_docente,
    dia_semana: dia_semana ?? undefined,
    data_especifica: data_especifica ? new Date(data_especifica) : undefined,
    AND: [
      { hora_inicio: { lt: horaFimDate } },
      { hora_fim: { gt: horaInicioDate } },
    ],
  };

  // Se é uma atualização, excluir a disponibilidade atual da verificação
  if (id_disponibilidade_atual) {
    whereCondition.id_disponibilidade = { not: id_disponibilidade_atual };
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

  // Validações
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

  // Verificar se existe e pertence ao docente
  const existente = await verificarPropriedade(id_disponibilidade, id_docente);

  // Preparar dados finais (merge com existentes)
  const horaInicio = hora_inicio 
    ? new Date(`1970-01-01T${hora_inicio}Z`) 
    : existente.hora_inicio;
  const horaFim = hora_fim 
    ? new Date(`1970-01-01T${hora_fim}Z`) 
    : existente.hora_fim;
  const diaSemana = dia_semana !== undefined 
    ? parseInt(dia_semana) 
    : existente.dia_semana;
  const dataEspecifica = data_especifica 
    ? new Date(data_especifica) 
    : existente.data_especifica;

  // Verificar sobreposição (excluindo a disponibilidade atual)
  await verificarSobreposicao(
    id_docente,
    diaSemana,
    dataEspecifica,
    hora_inicio || existente.hora_inicio,
    hora_fim || existente.hora_fim,
    parseInt(id_disponibilidade)
  );

  // Atualizar
  const disponibilidadeAtualizada = await prisma.disponibilidade.update({
    where: { id_disponibilidade: parseInt(id_disponibilidade) },
    data: {
      dia_semana: diaSemana,
      data_especifica: dataEspecifica,
      hora_inicio: horaInicio,
      hora_fim: horaFim,
    },
  });

  return disponibilidadeAtualizada;
};

/**
 * ELIMINAR - Remove uma disponibilidade
 */
const eliminarDisponibilidade = async (id_disponibilidade, id_docente) => {
  // Verificar se existe e tem marcações ativas
  await verificarMarcacoesAtivas(id_disponibilidade);

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
