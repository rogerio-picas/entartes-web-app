// src/services/coordenacao.marcacao.service.js
// Módulo da Coordenação — Gestão de Marcações de Coaching
// Toda a lógica de negócio do lado da coordenadora no ciclo de vida das marcações
 
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
 
// ─────────────────────────────────────────────────────────────
// CONSTANTES DE DOMÍNIO
// Espelham as mesmas do marcacao.service.js para consistência
// ─────────────────────────────────────────────────────────────
 
const ESTADO_MARCACAO = {
  PENDENTE: 1,
  EM_VALIDACAO: 2,
  CONFIRMADA: 3,
  CONCLUIDA: 4,
  CANCELADA: 5,
};
 
// ─────────────────────────────────────────────────────────────
// FUNÇÃO AUXILIAR — Enviar notificação interna
// Reutilizável em todas as funções deste service
// ─────────────────────────────────────────────────────────────
 
/**
 * Cria uma notificação na tabela `notificacao` para um utilizador.
 * Usa a transação ativa se fornecida, senão usa o prisma global.
 *
 * @param {number} id_user
 * @param {string} titulo
 * @param {string} mensagem
 * @param {object|null} tx - Transação Prisma ativa (opcional)
 */
async function _notificar(id_user, titulo, mensagem, tx = null) {
  const db = tx || prisma;
  await db.notificacao.create({
    data: { id_user, titulo, mensagem },
  });
}
 
// ─────────────────────────────────────────────────────────────
// FUNÇÃO AUXILIAR — Registar transição de estado no histórico
// ─────────────────────────────────────────────────────────────
 
async function _registarHistorico(id_marcacoes, id_estado, tx = null) {
  const db = tx || prisma;
  await db.marcacao_estado_historico.create({
    data: { id_marcacoes, id_estado },
  });
}
 
// ─────────────────────────────────────────────────────────────
// FUNÇÃO AUXILIAR — Verificar conflito de sala
// Verifica se uma sala está livre num dado intervalo de tempo
// ─────────────────────────────────────────────────────────────
 
async function _verificarSalaLivre(id_sala, data_a_realizar, hora_inicio, duracao_minutos, excluir_id_marcacao = null) {
  const horaInicioDate = new Date(`1970-01-01T${hora_inicio}`);
  const horaFimDate = new Date(horaInicioDate.getTime() + duracao_minutos * 60 * 1000);
 
  const conflito = await prisma.marcacao.findFirst({
    where: {
      id_sala,
      data_a_realizar: new Date(data_a_realizar),
      id_estado: { in: [ESTADO_MARCACAO.EM_VALIDACAO, ESTADO_MARCACAO.CONFIRMADA] },
      // Exclui a própria marcação (útil ao reatribuir sala)
      ...(excluir_id_marcacao && { id_marcacoes: { not: excluir_id_marcacao } }),
      // Sobreposição: a existente começa antes do fim da nova E acaba depois do início da nova
      hora_inicio: { lt: horaFimDate },
    },
  });
 
  return !conflito; // true = livre
}
 
// ─────────────────────────────────────────────────────────────
// 1. listarPedidosPendentes
// ─────────────────────────────────────────────────────────────
/**
 * Lista todas as marcações que precisam de ação da coordenação.
 * Por omissão devolve as PENDENTES e EM_VALIDACAO, mas pode filtrar por estado.
 *
 * Inclui info dos alunos inscritos, docente e modalidade.
 *
 * @param {object} filtros
 * @param {number[]|null} filtros.estados    - Array de IDs de estado (opcional)
 * @param {string|null}   filtros.data_inicio - Filtra a partir desta data (YYYY-MM-DD)
 * @param {string|null}   filtros.data_fim    - Filtra até esta data (YYYY-MM-DD)
 * @returns {Promise<Array>}
 */
async function listarPedidosPendentes({ estados = null, data_inicio = null, data_fim = null } = {}) {
  const estadosFiltro = estados || [ESTADO_MARCACAO.PENDENTE, ESTADO_MARCACAO.EM_VALIDACAO];
 
  const marcacoes = await prisma.marcacao.findMany({
    where: {
      id_estado: { in: estadosFiltro },
      ...(data_inicio && { data_a_realizar: { gte: new Date(data_inicio) } }),
      ...(data_fim && { data_a_realizar: { lte: new Date(data_fim) } }),
    },
    include: {
      docente: {
        include: {
          utilizador: { select: { nome: true, apelido: true } },
        },
      },
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
      participacao_conclusao: { select: { id_aluno: true, id_docente: true } },
    },
    orderBy: { data_criacao: 'asc' }, // FIFO — os mais antigos primeiro
  });

  return marcacoes.map((m) => {
    const conclusoes = m.participacao_conclusao ?? [];
    return {
      id_marcacao: m.id_marcacoes,
      docente: `${m.docente.utilizador.nome} ${m.docente.utilizador.apelido}`,
      id_docente: m.id_docente,
      modalidade: m.modalidade?.nome ?? '—',
      sala_atual: m.sala?.nome ?? 'Por atribuir',
      data: m.data_a_realizar,
      hora_inicio: m.hora_inicio,
      duracao_minutos: m.duracao_minutos,
      numero_alunos_pretendidos: m.numero_alunos_pretendidos,
      estado: m.estado_marcacao?.nome ?? '—',
      id_estado: m.id_estado,
      data_criacao: m.data_criacao,
      alunos: m.aluno_marcacao.map((am) => ({
        id: am.id_aluno,
        nome: `${am.aluno.utilizador.nome} ${am.aluno.utilizador.apelido}`,
        confirmou: am.data_resposta !== null,
      })),
      val_docente: conclusoes.some((p) => p.id_docente === m.id_docente),
      val_aluno:
        m.aluno_marcacao.length > 0 &&
        m.aluno_marcacao.every((am) => conclusoes.some((p) => p.id_aluno === am.id_aluno)),
    };
  });
}
 
// ─────────────────────────────────────────────────────────────
// 2. atribuirSalaEConfirmar
// ─────────────────────────────────────────────────────────────
/**
 * Passo central da coordenação: atribui uma sala à marcação e confirma-a.
 * Só é possível confirmar marcações no estado PENDENTE ou EM_VALIDACAO.
 *
 * Operações realizadas (dentro de uma transação):
 *  1. Verifica que a sala está livre no horário da marcação (RF-COA-02 CA2)
 *  2. Atualiza o estado para CONFIRMADA
 *  3. Regista a transição no histórico (RF-COA-03 CA4)
 *  4. Notifica o docente e todos os alunos inscritos
 *
 * @param {number} id_coordenadora  - ID da coordenadora que está a confirmar
 * @param {number} id_marcacao
 * @param {number} id_sala
 * @returns {Promise<object>} Marcação atualizada
 */
async function atribuirSalaEConfirmar(id_coordenadora, id_marcacao, id_sala) {
  // Carrega a marcação com todos os dados necessários
  const marcacao = await prisma.marcacao.findUnique({
    where: { id_marcacoes: id_marcacao },
    include: {
      aluno_marcacao: { select: { id_aluno: true } },
      docente: { select: { id_utilizador: true } },
      sala: { select: { nome: true } },
    },
  });
 
  if (!marcacao) throw new Error('Marcação não encontrada.');
 
  // Só confirma marcações PENDENTES ou EM_VALIDACAO (RF-COA-03 CA3)
  const estadosPermitidos = [ESTADO_MARCACAO.PENDENTE, ESTADO_MARCACAO.EM_VALIDACAO];
  if (!estadosPermitidos.includes(marcacao.id_estado)) {
    throw new Error('Só é possível confirmar marcações no estado Pendente ou Em Validação.');
  }
 
  // Verifica que a sala existe
  const sala = await prisma.sala.findUnique({ where: { id_sala } });
  if (!sala) throw new Error('Sala não encontrada.');
 
  // Verifica conflito de sala (RF-COA-02 CA5 + RF-COA-05 CA2)
  const salaLivre = await _verificarSalaLivre(
    id_sala,
    marcacao.data_a_realizar,
    // Converte a hora do Prisma para string HH:MM:SS para reutilizar a função auxiliar
    marcacao.hora_inicio.toISOString().substring(11, 19),
    marcacao.duracao_minutos,
    id_marcacao
  );
  if (!salaLivre) {
    throw new Error(`A sala "${sala.nome}" já está ocupada neste horário. Escolhe outra sala.`);
  }
 
  // Tudo válido — executa dentro de transação
  const marcacaoConfirmada = await prisma.$transaction(async (tx) => {
    const atualizada = await tx.marcacao.update({
      where: { id_marcacoes: id_marcacao },
      data: {
        id_sala,
        id_estado: ESTADO_MARCACAO.CONFIRMADA,
      },
    });
 
    // Regista histórico com referência à coordenadora (RF-COA-03 CA4)
    await _registarHistorico(id_marcacao, ESTADO_MARCACAO.CONFIRMADA, tx);
 
    // Notifica o docente
    await _notificar(
      marcacao.docente.id_utilizador,
      'Marcação de Coaching Confirmada',
      `A tua sessão de coaching em ${sala.nome} foi confirmada para ${marcacao.data_a_realizar.toLocaleDateString('pt-PT')}.`,
      tx
    );
 
    // Notifica cada aluno inscrito
    for (const { id_aluno } of marcacao.aluno_marcacao) {
      await _notificar(
        id_aluno,
        'Marcação de Coaching Confirmada',
        `A tua sessão de coaching em ${sala.nome} foi confirmada para ${marcacao.data_a_realizar.toLocaleDateString('pt-PT')}.`,
        tx
      );
    }
 
    return atualizada;
  });
 
  return marcacaoConfirmada;
}
 
// ─────────────────────────────────────────────────────────────
// 3. rejeitarMarcacao
// ─────────────────────────────────────────────────────────────
/**
 * A coordenação rejeita um pedido de marcação, registando o motivo.
 * O estado passa para CANCELADA e todos os intervenientes são notificados.
 *
 * @param {number} id_coordenadora
 * @param {number} id_marcacao
 * @param {string} motivo - Motivo obrigatório da rejeição (para auditoria)
 * @returns {Promise<object>} Marcação atualizada
 */
async function rejeitarMarcacao(id_coordenadora, id_marcacao, motivo) {
  if (!motivo || motivo.trim().length === 0) {
    throw new Error('O motivo da rejeição é obrigatório.');
  }
 
  const marcacao = await prisma.marcacao.findUnique({
    where: { id_marcacoes: id_marcacao },
    include: {
      aluno_marcacao: { select: { id_aluno: true } },
      docente: { select: { id_utilizador: true } },
    },
  });
 
  if (!marcacao) throw new Error('Marcação não encontrada.');
 
  // Só pode rejeitar marcações ainda não confirmadas
  if (marcacao.id_estado === ESTADO_MARCACAO.CONFIRMADA) {
    throw new Error('Marcação já confirmada. Usa a função de cancelamento para sessões confirmadas.');
  }
  if (marcacao.id_estado === ESTADO_MARCACAO.CANCELADA) {
    throw new Error('Esta marcação já foi cancelada.');
  }
 
  const marcacaoRejeitada = await prisma.$transaction(async (tx) => {
    const atualizada = await tx.marcacao.update({
      where: { id_marcacoes: id_marcacao },
      data: { id_estado: ESTADO_MARCACAO.CANCELADA },
    });
 
    await _registarHistorico(id_marcacao, ESTADO_MARCACAO.CANCELADA, tx);
 
    // Notifica docente com motivo
    await _notificar(
      marcacao.docente.id_utilizador,
      'Pedido de Coaching Rejeitado',
      `O pedido de coaching foi rejeitado. Motivo: ${motivo}`,
      tx
    );
 
    // Notifica cada aluno com motivo
    for (const { id_aluno } of marcacao.aluno_marcacao) {
      await _notificar(
        id_aluno,
        'Pedido de Coaching Rejeitado',
        `O teu pedido de coaching foi rejeitado. Motivo: ${motivo}`,
        tx
      );
    }
 
    return atualizada;
  });
 
  return marcacaoRejeitada;
}
 
// ─────────────────────────────────────────────────────────────
// 4. cancelarMarcacaoConfirmada
// ─────────────────────────────────────────────────────────────
/**
 * Cancela uma sessão que já estava CONFIRMADA.
 * Diferente de rejeitar: aqui a sala é libertada e o motivo é obrigatório
 * para efeitos de auditoria (RF-COA-03 CA4).
 *
 * @param {number} id_coordenadora
 * @param {number} id_marcacao
 * @param {string} motivo
 * @returns {Promise<object>}
 */
async function cancelarMarcacaoConfirmada(id_coordenadora, id_marcacao, motivo) {
  if (!motivo || motivo.trim().length === 0) {
    throw new Error('O motivo do cancelamento é obrigatório para auditoria.');
  }
 
  const marcacao = await prisma.marcacao.findUnique({
    where: { id_marcacoes: id_marcacao },
    include: {
      aluno_marcacao: { select: { id_aluno: true } },
      docente: { select: { id_utilizador: true } },
      sala: { select: { nome: true } },
    },
  });
 
  if (!marcacao) throw new Error('Marcação não encontrada.');
  if (marcacao.id_estado !== ESTADO_MARCACAO.CONFIRMADA) {
    throw new Error('Só é possível cancelar sessões no estado Confirmada através desta função.');
  }
 
  const marcacaoCancelada = await prisma.$transaction(async (tx) => {
    // Cancela e liberta a sala (id_sala = null)
    const atualizada = await tx.marcacao.update({
      where: { id_marcacoes: id_marcacao },
      data: {
        id_estado: ESTADO_MARCACAO.CANCELADA,
        id_sala: null, // liberta a sala (RF-COA-02 CA4)
      },
    });
 
    await _registarHistorico(id_marcacao, ESTADO_MARCACAO.CANCELADA, tx);
 
    const nomeSala = marcacao.sala?.nome ?? 'sala';
    const dataFormatada = marcacao.data_a_realizar.toLocaleDateString('pt-PT');
 
    // Notifica docente
    await _notificar(
      marcacao.docente.id_utilizador,
      'Sessão de Coaching Cancelada',
      `A sessão de coaching de ${dataFormatada} em ${nomeSala} foi cancelada. Motivo: ${motivo}`,
      tx
    );
 
    // Notifica alunos
    for (const { id_aluno } of marcacao.aluno_marcacao) {
      await _notificar(
        id_aluno,
        'Sessão de Coaching Cancelada',
        `A tua sessão de coaching de ${dataFormatada} em ${nomeSala} foi cancelada. Motivo: ${motivo}`,
        tx
      );
    }
 
    return atualizada;
  });
 
  return marcacaoCancelada;
}
 
// ─────────────────────────────────────────────────────────────
// 5. reatribuirSala
// ─────────────────────────────────────────────────────────────
/**
 * Permite à coordenação mudar a sala de uma marcação já CONFIRMADA
 * (ex: problema técnico num estúdio).
 * Verifica conflitos antes de alterar.
 *
 * @param {number} id_coordenadora
 * @param {number} id_marcacao
 * @param {number} nova_id_sala
 * @returns {Promise<object>}
 */
async function reatribuirSala(id_coordenadora, id_marcacao, nova_id_sala) {
  const marcacao = await prisma.marcacao.findUnique({
    where: { id_marcacoes: id_marcacao },
    include: {
      aluno_marcacao: { select: { id_aluno: true } },
      docente: { select: { id_utilizador: true } },
    },
  });
 
  if (!marcacao) throw new Error('Marcação não encontrada.');
  if (marcacao.id_estado !== ESTADO_MARCACAO.CONFIRMADA) {
    throw new Error('Só é possível reatribuir sala a marcações Confirmadas.');
  }
 
  const novaSala = await prisma.sala.findUnique({ where: { id_sala: nova_id_sala } });
  if (!novaSala) throw new Error('Nova sala não encontrada.');
 
  // Verifica conflito na nova sala, excluindo a própria marcação
  const salaLivre = await _verificarSalaLivre(
    nova_id_sala,
    marcacao.data_a_realizar,
    marcacao.hora_inicio.toISOString().substring(11, 19),
    marcacao.duracao_minutos,
    id_marcacao
  );
  if (!salaLivre) {
    throw new Error(`A sala "${novaSala.nome}" já está ocupada neste horário.`);
  }
 
  const atualizada = await prisma.$transaction(async (tx) => {
    const marcacaoAtualizada = await tx.marcacao.update({
      where: { id_marcacoes: id_marcacao },
      data: { id_sala: nova_id_sala },
    });
 
    const dataFormatada = marcacao.data_a_realizar.toLocaleDateString('pt-PT');
 
    // Notifica docente e alunos sobre a mudança de sala
    await _notificar(
      marcacao.docente.id_utilizador,
      'Sala Alterada',
      `A sala da sessão de ${dataFormatada} foi alterada para "${novaSala.nome}".`,
      tx
    );
 
    for (const { id_aluno } of marcacao.aluno_marcacao) {
      await _notificar(
        id_aluno,
        'Sala Alterada',
        `A sala da tua sessão de coaching de ${dataFormatada} foi alterada para "${novaSala.nome}".`,
        tx
      );
    }
 
    return marcacaoAtualizada;
  });
 
  return atualizada;
}
 
// ─────────────────────────────────────────────────────────────
// 6. consultarSalasDisponiveis
// ─────────────────────────────────────────────────────────────
/**
 * Devolve todas as salas e indica quais estão livres num dado horário.
 * Útil para a coordenação escolher a sala ao confirmar uma marcação.
 *
 * @param {string} data_a_realizar  - "YYYY-MM-DD"
 * @param {string} hora_inicio      - "HH:MM:SS"
 * @param {number} duracao_minutos
 * @returns {Promise<Array>}
 */
async function consultarSalasDisponiveis(data_a_realizar, hora_inicio, duracao_minutos) {
  const todasAsSalas = await prisma.sala.findMany({
    orderBy: { nome: 'asc' },
  });
 
  const salasComDisponibilidade = await Promise.all(
    todasAsSalas.map(async (sala) => {
      const livre = await _verificarSalaLivre(
        sala.id_sala,
        data_a_realizar,
        hora_inicio,
        duracao_minutos
      );
      return {
        id_sala: sala.id_sala,
        nome: sala.nome,
        descricao: sala.descricao,
        disponivel: livre,
      };
    })
  );
 
  return salasComDisponibilidade;
}
 
// ─────────────────────────────────────────────────────────────
// 7. concluirMarcacao
// ─────────────────────────────────────────────────────────────
/**
 * A coordenação força a conclusão de uma sessão CONFIRMADA.
 * Move o estado para CONCLUIDA e notifica docente e alunos.
 *
 * @param {number} id_coordenadora
 * @param {number} id_marcacao
 * @returns {Promise<object>}
 */
async function concluirMarcacao(id_coordenadora, id_marcacao) {
  const marcacao = await prisma.marcacao.findUnique({
    where: { id_marcacoes: id_marcacao },
    include: {
      aluno_marcacao: { select: { id_aluno: true } },
      docente: { select: { id_utilizador: true } },
    },
  });

  if (!marcacao) throw new Error('Marcação não encontrada.');
  if (marcacao.id_estado !== ESTADO_MARCACAO.CONFIRMADA) {
    throw new Error('Só é possível concluir sessões no estado Confirmada.');
  }

  const marcacaoConcluida = await prisma.$transaction(async (tx) => {
    const atualizada = await tx.marcacao.update({
      where: { id_marcacoes: id_marcacao },
      data: { id_estado: ESTADO_MARCACAO.CONCLUIDA },
    });

    await _registarHistorico(id_marcacao, ESTADO_MARCACAO.CONCLUIDA, tx);

    await _notificar(
      marcacao.docente.id_utilizador,
      'Sessão de Coaching Concluída',
      'A tua sessão de coaching foi marcada como concluída pela coordenação.',
      tx
    );

    for (const { id_aluno } of marcacao.aluno_marcacao) {
      await _notificar(
        id_aluno,
        'Sessão de Coaching Concluída',
        'A tua sessão de coaching foi marcada como concluída pela coordenação.',
        tx
      );
    }

    return atualizada;
  });

  return marcacaoConcluida;
}

// ─────────────────────────────────────────────────────────────
// 8. consultarHistoricoMarcacao
// ─────────────────────────────────────────────────────────────
/**
 * Devolve o histórico completo de transições de estado de uma marcação.
 * Útil para auditoria e controlo interno (RF-COA-03 CA4).
 *
 * @param {number} id_marcacao
 * @returns {Promise<object>} Marcação com histórico de estados
 */
async function consultarHistoricoMarcacao(id_marcacao) {
  const marcacao = await prisma.marcacao.findUnique({
    where: { id_marcacoes: id_marcacao },
    include: {
      docente: {
        include: { utilizador: { select: { nome: true, apelido: true } } },
      },
      modalidade: { select: { nome: true } },
      sala: { select: { nome: true } },
      estado_marcacao: { select: { nome: true } },
      aluno_marcacao: {
        include: {
          aluno: {
            include: { utilizador: { select: { nome: true, apelido: true } } },
          },
        },
      },
      marcacao_estado_historico: {
        include: { estado_marcacao: { select: { nome: true } } },
        orderBy: { data_alteracao: 'asc' },
      },
      participacao_conclusao: {
        include: {
          aluno: { include: { utilizador: { select: { nome: true, apelido: true } } } },
          docente: { include: { utilizador: { select: { nome: true, apelido: true } } } },
        },
      },
    },
  });
 
  if (!marcacao) throw new Error('Marcação não encontrada.');
 
  return {
    id_marcacao: marcacao.id_marcacoes,
    estado_atual: marcacao.estado_marcacao?.nome,
    docente: `${marcacao.docente.utilizador.nome} ${marcacao.docente.utilizador.apelido}`,
    modalidade: marcacao.modalidade?.nome,
    sala: marcacao.sala?.nome ?? 'Por atribuir',
    data: marcacao.data_a_realizar,
    hora_inicio: marcacao.hora_inicio,
    duracao_minutos: marcacao.duracao_minutos,
    data_criacao: marcacao.data_criacao,
    alunos: marcacao.aluno_marcacao.map((am) => ({
      nome: `${am.aluno.utilizador.nome} ${am.aluno.utilizador.apelido}`,
      confirmou_presenca: am.data_resposta !== null,
      data_resposta: am.data_resposta,
    })),
    historico_estados: marcacao.marcacao_estado_historico.map((h) => ({
      estado: h.estado_marcacao?.nome,
      data: h.data_alteracao,
    })),
    dupla_validacao: marcacao.participacao_conclusao.map((p) => ({
      interveniente: p.aluno
        ? `${p.aluno.utilizador.nome} ${p.aluno.utilizador.apelido} (Aluno)`
        : p.docente
        ? `${p.docente.utilizador.nome} ${p.docente.utilizador.apelido} (Docente)`
        : 'Desconhecido',
      confirmou: p.confirmou_conclusao,
      data_confirmacao: p.data_confirmacao,
    })),
  };
}
 
// ─────────────────────────────────────────────────────────────
// EXPORTAÇÕES
// ─────────────────────────────────────────────────────────────
module.exports = {
  listarPedidosPendentes,
  atribuirSalaEConfirmar,
  rejeitarMarcacao,
  cancelarMarcacaoConfirmada,
  concluirMarcacao,
  reatribuirSala,
  consultarSalasDisponiveis,
  consultarHistoricoMarcacao,
  // Exporta constantes para uso nos controllers
  ESTADO_MARCACAO,
};