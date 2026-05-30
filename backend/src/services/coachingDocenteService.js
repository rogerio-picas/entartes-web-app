const prisma = require('../lib/prisma');

const ESTADO_MARCACAO = {
  PENDENTE: 1,
  EM_VALIDACAO: 2,
  CONFIRMADA: 3,
  CONCLUIDA: 4,
  CANCELADA: 5,
};

// Prazo de dupla validação pós-aula (em milissegundos)
const PRAZO_DUPLA_VALIDACAO_MS = 48 * 60 * 60 * 1000; // 48 horas

async function listarMinhasAulas(id_docente, { id_estado = null } = {}) {
  const marcacoes = await prisma.marcacao.findMany({
    where: {
      id_docente,
      ...(id_estado && { id_estado: Number(id_estado) }),
    },
    include: {
      modalidade: { select: { nome: true } },
      sala: { select: { nome: true } },
      estado_marcacao: { select: { nome: true } },
      aluno_marcacao: {
        include: {
          aluno: {
            include: {
              utilizador: { select: { nome: true, apelido: true } },
            },
          },
        },
      },
      participacao_conclusao: {
        where: { id_docente },
        select: { confirmou_conclusao: true }
      },
    },
    orderBy: [
      { data_a_realizar: 'asc' },
      { hora_inicio: 'asc' },
    ],
  });

  return marcacoes.map((m) => ({
    id_marcacao: m.id_marcacoes,
    modalidade: m.modalidade?.nome ?? '—',
    sala: m.sala?.nome ?? 'Por atribuir',
    data: m.data_a_realizar,
    hora_inicio: m.hora_inicio,
    duracao_minutos: m.duracao_minutos,
    numero_alunos_pretendidos: m.numero_alunos_pretendidos,
    estado: m.estado_marcacao?.nome ?? '—',
    id_estado: m.id_estado,
    ja_validou: m.participacao_conclusao?.some(p => p.confirmou_conclusao) ?? false,
    alunos: m.aluno_marcacao.map((am) => ({
      id_aluno: am.id_aluno,
      nome: `${am.aluno.utilizador.nome} ${am.aluno.utilizador.apelido}`,
      confirmou_presenca: am.data_resposta !== null
    }))
  }));
}

async function validarConclusaoSessao(id_docente, id_marcacao) {
  const marcacao = await prisma.marcacao.findUnique({
    where: { id_marcacoes: id_marcacao },
  });

  if (!marcacao) throw new Error('Marcação não encontrada.');
  if (marcacao.id_docente !== id_docente) throw new Error('A marcação não pertence a este docente.');
  if (marcacao.id_estado !== ESTADO_MARCACAO.CONFIRMADA) {
    throw new Error('Só é possível validar sessões no estado Confirmada.');
  }

  // Verifica prazo de 48 horas à semelhança do serviço do aluno
  const agora = new Date();
  const dataHoraAula = new Date(marcacao.data_a_realizar);
  if (agora - dataHoraAula > PRAZO_DUPLA_VALIDACAO_MS) {
    throw new Error('O prazo de 48 horas para validação da sessão já expirou.');
  }

  let participacao = await prisma.participacao_conclusao.findFirst({
    where: { id_marcacoes: id_marcacao, id_docente, id_aluno: null },
  });

  if (!participacao) {
    participacao = await prisma.participacao_conclusao.create({
      data: {
        id_marcacoes: id_marcacao,
        id_docente,
        id_aluno: null,        // ← explícito: este registo é do docente, nunca do aluno
        confirmou_conclusao: true,
        data_confirmacao: new Date(),
      },
    });
  } else {
    participacao = await prisma.participacao_conclusao.update({
      where: { id_participacao_conclusao: participacao.id_participacao_conclusao },
      data: { confirmou_conclusao: true, data_confirmacao: new Date() },
    });
  }

  // Verifica se pelo menos um aluno já validou a sessão
  const validacaoAluno = await prisma.participacao_conclusao.findFirst({
    where: {
      id_marcacoes: id_marcacao,
      id_aluno: { not: null },
      id_docente: null,        // ← garante que é um registo de aluno, não de docente
      confirmou_conclusao: true,
    },
  });

  // Diagnóstico — remover após confirmar que o bug está resolvido
  const todosRegistos = await prisma.participacao_conclusao.findMany({ where: { id_marcacoes: id_marcacao } });

  if (validacaoAluno) {
    await prisma.$transaction(async (tx) => {
      await tx.marcacao.update({
        where: { id_marcacoes: id_marcacao },
        data: { id_estado: ESTADO_MARCACAO.CONCLUIDA },
      });
      await tx.marcacao_estado_historico.create({
        data: {
          id_marcacoes: id_marcacao,
          id_estado: ESTADO_MARCACAO.CONCLUIDA,
        },
      });
    });

    return {
      mensagem: 'Sessão concluída com sucesso! Ambas as validações foram registadas.',
      estado: 'Concluída',
      dupla_validacao_completa: true,
    };
  }

  return {
    mensagem: 'A tua validação foi registada. Aguarda a confirmação do aluno para concluir a sessão.',
    estado: 'Confirmada',
    dupla_validacao_completa: false,
  };
}

async function cancelarMarcacao(id_docente, id_marcacao, motivo) {

  const marcacao = await prisma.marcacao.findUnique({
    where: { id_marcacoes: id_marcacao },
    include: { aluno_marcacao: true },
  });

  if (!marcacao) throw new Error('Marcação não encontrada.');
  if (marcacao.id_docente !== id_docente) throw new Error('A marcação não pertence a este docente.');

  if (marcacao.id_estado === ESTADO_MARCACAO.CANCELADA || marcacao.id_estado === ESTADO_MARCACAO.CONCLUIDA) {
    throw new Error('Não é possível cancelar uma marcação que já está concluída ou cancelada.');
  }

  const atualizada = await prisma.$transaction(async (tx) => {
    const upd = await tx.marcacao.update({
      where: { id_marcacoes: id_marcacao },
      data: { id_estado: ESTADO_MARCACAO.CANCELADA, id_sala: null },
    });

    await tx.marcacao_estado_historico.create({
      data: { id_marcacoes: id_marcacao, id_estado: ESTADO_MARCACAO.CANCELADA },
    });

    // Notifica os alunos do cancelamento
    const dataFormatada = marcacao.data_a_realizar.toLocaleDateString('pt-PT');
    for (const am of marcacao.aluno_marcacao) {
      const motivoTexto = motivo && motivo.trim() !== '' ? ` Motivo: ${motivo}` : '';
      await tx.notificacao.create({
        data: {
          id_user: am.id_aluno,
          titulo: 'Sessão de Coaching Cancelada',
          mensagem: `O teu docente cancelou a sessão de ${dataFormatada}.${motivoTexto}`,
        },
      });
    }

    return upd;
  });

  return atualizada;
}

module.exports = {
  listarMinhasAulas,
  validarConclusaoSessao,
  cancelarMarcacao,
};