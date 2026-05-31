// src/services/marcacao.service.js
// Módulo do Aluno — Marcações (Coaching)
// Lógica de negócio seguindo as convenções do projeto Ent'artes

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// ─────────────────────────────────────────────────────────────
// CONSTANTES DE DOMÍNIO
// ─────────────────────────────────────────────────────────────

// IDs dos estados de marcação (tabela estado_marcacao)
const ESTADO_MARCACAO = {
  PENDENTE: 1,
  EM_VALIDACAO: 2,
  CONFIRMADA: 3,
  CONCLUIDA: 4,
  CANCELADA: 5,
};

const ESTADO_ALUNO_MARCACAO = {
  PENDENTE: 1,
  CONFIRMADO: 2,
  CONCLUIDO: 3,
  RECUSADO: 4,
};

// Durações permitidas (em minutos), conforme RF-COA-06
const DURACOES_PERMITIDAS = [30, 45, 60, 75, 90, 120];

// Prazo de confirmação de presença em grupo (em milissegundos), conforme RF-COA-07
const PRAZO_CONFIRMACAO_GRUPO_MS = 60 * 60 * 1000; // 1 hora

// Prazo de dupla validação pós-aula (em milissegundos), conforme RF-COA-04
const PRAZO_DUPLA_VALIDACAO_MS = 48 * 60 * 60 * 1000; // 48 horas

// ─────────────────────────────────────────────────────────────
// 1. consultarDisponibilidades
// ─────────────────────────────────────────────────────────────
/**
 * Devolve os slots de disponibilidade de todos os docentes ativos,
 * filtrando os que já têm marcação confirmada no mesmo horário.
 *
 * Opcionalmente filtra por modalidade e/ou data.
 *
 * @param {object} filtros
 * @param {number|null} filtros.id_modalidade - ID da modalidade (opcional)
 * @param {string|null} filtros.data          - Data no formato "YYYY-MM-DD" (opcional)
 * @returns {Promise<Array>} Lista de slots disponíveis com info do docente e modalidade
 */
async function consultarDisponibilidades(filtros = {}) {
  const { id_modalidade = null, data = null, id_aluno = null } = filtros;

  let modalidadesAlunoIds = [];
  if (id_aluno) {
    const alunoMods = await prisma.aluno_modalidade.findMany({
      where: { id_utilizador: parseInt(id_aluno) },
      select: { id_modalidade: true }
    });
    modalidadesAlunoIds = alunoMods.map(am => am.id_modalidade);
  }

  // Busca disponibilidades dos docentes ativos, incluindo as suas modalidades
  const disponibilidades = await prisma.disponibilidade.findMany({
    where: {
      docente: {
        estado_atividade: true, // só docentes ativos
        // Se a modalidade foi pedida, filtra docentes que a lecionam
        ...(id_modalidade && {
          docente_modalidade: {
            some: { id_modalidade },
          },
        }),
      },
      // Se a data foi pedida, filtra por data específica ou pelo dia da semana correspondente
      ...(data && {
        OR: [
          { data_especifica: new Date(data) },
          { dia_semana: new Date(`${data.split('T')[0]}T00:00:00.000Z`).getUTCDay() }, // 0=Dom, 1=Seg, …
        ],
      }),
    },
    include: {
      docente: {
        include: {
          utilizador: {
            select: { nome: true, apelido: true },
          },
          docente_modalidade: {
            include: { modalidade: true },
          },
        },
      },
    },
    orderBy: [{ dia_semana: 'asc' }, { hora_inicio: 'asc' }],
  });

  // Para cada slot, subtrai as marcações e os horários letivos para encontrar os blocos realmente livres
  const slotsBrutos = await Promise.all(
    disponibilidades.map(async (disp) => {
      let blocosLivres = [{ start: new Date(disp.hora_inicio), end: new Date(disp.hora_fim) }];

      if (data) {
        const dataRealizarDate = new Date(`${data.split('T')[0]}T00:00:00.000Z`);
        const [ano, mes, dia] = data.split('T')[0].split('-').map(Number);
        const diaSemana = new Date(Date.UTC(ano, mes - 1, dia)).getUTCDay();

        // Obter marcações
        const marcacoesDia = await prisma.marcacao.findMany({
          where: {
            id_docente: disp.id_docente,
            id_estado: {
              in: [ESTADO_MARCACAO.PENDENTE, ESTADO_MARCACAO.EM_VALIDACAO, ESTADO_MARCACAO.CONFIRMADA],
            },
            data_a_realizar: dataRealizarDate,
          },
          select: { hora_inicio: true, duracao_minutos: true },
        });

        // Obter horários letivos (que também bloqueiam a agenda do docente)
        const horariosLetivos = await prisma.horario_letivo.findMany({
          where: {
            id_docente: disp.id_docente,
            dia_semana: diaSemana,
          },
          select: { hora_inicio: true, hora_fim: true },
        });

        // Construir lista de ocupados
        const ocupados = [];
        for (const m of marcacoesDia) {
          const mInicio = new Date(m.hora_inicio);
          const mFim = new Date(mInicio.getTime() + m.duracao_minutos * 60 * 1000);
          ocupados.push({ start: mInicio, end: mFim });
        }
        for (const hl of horariosLetivos) {
          ocupados.push({ start: new Date(hl.hora_inicio), end: new Date(hl.hora_fim) });
        }

        // Se o id_aluno for fornecido, também subtrai as marcações do próprio aluno (noutros docentes)
        if (id_aluno) {
          const marcacoesAluno = await prisma.aluno_marcacao.findMany({
            where: {
              id_aluno: id_aluno,
              id_aluno_estado: { not: ESTADO_ALUNO_MARCACAO.RECUSADO },
              marcacao: {
                data_a_realizar: dataRealizarDate,
                id_estado: { notIn: [ESTADO_MARCACAO.CANCELADA] },
              },
            },
            include: {
              marcacao: { select: { hora_inicio: true, duracao_minutos: true } },
            },
          });

          for (const ma of marcacoesAluno) {
            const mInicio = new Date(ma.marcacao.hora_inicio);
            const mFim = new Date(mInicio.getTime() + ma.marcacao.duracao_minutos * 60 * 1000);
            ocupados.push({ start: mInicio, end: mFim });
          }
        }

        // Subtrair os intervalos ocupados dos blocos livres
        ocupados.sort((a, b) => a.start - b.start);

        for (const occ of ocupados) {
          const novosBlocos = [];
          for (const bloco of blocosLivres) {
            // Se o intervalo ocupado não se sobrepõe ao bloco, mantemos o bloco intacto
            if (occ.end <= bloco.start || occ.start >= bloco.end) {
              novosBlocos.push(bloco);
            } else {
              // Se há sobreposição, cortamos o bloco livre nas partes que não estão ocupadas
              if (occ.start > bloco.start) {
                novosBlocos.push({ start: bloco.start, end: occ.start });
              }
              if (occ.end < bloco.end) {
                novosBlocos.push({ start: occ.end, end: bloco.end });
              }
            }
          }
          blocosLivres = novosBlocos;
        }
      }

      // Mapear cada sub-bloco livre para o formato final esperado pela frontend
      return blocosLivres.map(bloco => ({
        id_disponibilidade: disp.id_disponibilidade,
        id_docente: disp.id_docente,
        nome_docente: `${disp.docente.utilizador.nome} ${disp.docente.utilizador.apelido}`,
        modalidades: disp.docente.docente_modalidade
          .map((dm) => ({
            id: dm.modalidade.id_modalidade,
            nome: dm.modalidade.nome,
          }))
          .filter(mod => !id_aluno || modalidadesAlunoIds.includes(mod.id)),
        dia_semana: disp.dia_semana,
        data_especifica: disp.data_especifica,
        hora_inicio: bloco.start,
        hora_fim: bloco.end,
        disponivel: true,
      }));
    })
  );

  // Juntar todos os sub-blocos e ordenar
  return slotsBrutos.flat().filter(slot => slot.modalidades.length > 0).sort((a, b) => a.hora_inicio - b.hora_inicio);
}

// ─────────────────────────────────────────────────────────────
// 2. solicitarMarcacao
// ─────────────────────────────────────────────────────────────
/**
 * O aluno submete um pedido de sessão de coaching (Solo ou Grupo).
 *
 * Validações aplicadas:
 *  - O aluno tem coaching ativo (campo `coaching` na tabela aluno)
 *  - A duração é uma das permitidas (30, 45, 60, 75, 90, 120 min)
 *  - Não existe marcação sobreposta para o mesmo docente
 *  - O horário não colide com o horário letivo fixo do docente
 *  - Não existe marcação duplicada do mesmo aluno para o mesmo slot
 *  - Se outros_alunos for fornecido, valida-os e adiciona-os
 *
 * @param {number} id_aluno       - ID do aluno que faz o pedido
 * @param {object} dados
 * @param {number} dados.id_docente
 * @param {number} dados.id_modalidade
 * @param {string} dados.data_a_realizar  - "YYYY-MM-DD"
 * @param {string} dados.hora_inicio      - "HH:MM:SS"
 * @param {number} dados.duracao_minutos
 * @param {number} dados.numero_alunos_pretendidos - 1 = Solo, >1 = Grupo
 * @param {Array<number>} [dados.outros_alunos] - IDs dos outros alunos participantes (opcional, para grupo)
 * @returns {Promise<object>} Marcação criada com estado PENDENTE
 */
async function solicitarMarcacao(id_aluno, dados) {
  const {
    id_docente,
    id_modalidade,
    data_a_realizar,
    hora_inicio,
    duracao_minutos,
    numero_alunos_pretendidos = 1,
    outros_alunos = [],
  } = dados;

  // ── Validação 1: o aluno existe e tem coaching ativo
  const aluno = await prisma.aluno.findUnique({
    where: { id_utilizador: id_aluno },
  });
  if (!aluno) throw new Error('Aluno não encontrado.');
  if (!aluno.coaching) throw new Error('O aluno não tem permissão de coaching ativa.');

  // ── Validação Extra: o aluno está inscrito na modalidade
  if (id_modalidade) {
    const alunoMod = await prisma.aluno_modalidade.findFirst({
      where: { id_utilizador: id_aluno, id_modalidade }
    });
    if (!alunoMod) throw new Error('Ação inválida: Não estás associado a esta modalidade.');
  }

  // ── Validação Extra 2: todos os outros alunos têm de possuir a mesma modalidade
  if (id_modalidade && outros_alunos.length > 0) {
    for (const outro_aluno_id of outros_alunos) {
      const outroMod = await prisma.aluno_modalidade.findFirst({
        where: { id_utilizador: outro_aluno_id, id_modalidade }
      });
      if (!outroMod) {
        const outroUser = await prisma.utilizador.findUnique({
          where: { id_utilizador: outro_aluno_id },
          select: { nome: true, apelido: true }
        });
        const nomeCompleto = outroUser ? `${outroUser.nome || ''} ${outroUser.apelido || ''}`.trim() : `ID ${outro_aluno_id}`;
        throw new Error(`Ação inválida: O aluno ${nomeCompleto} não está associado a esta modalidade.`);
      }
    }
  }

  // ── Validação 2: duração permitida (RF-COA-06)
  if (!DURACOES_PERMITIDAS.includes(duracao_minutos)) {
    throw new Error(
      `Duração inválida. Valores permitidos: ${DURACOES_PERMITIDAS.join(', ')} minutos.`
    );
  }

  // ── Validação 3: o docente existe e está ativo (id_modalidade é opcional)
  const whereDocente = {
    id_utilizador: id_docente,
    estado_atividade: true,
  };
  if (id_modalidade) {
    whereDocente.docente_modalidade = { some: { id_modalidade } };
  }
  const docenteAtivo = await prisma.docente.findFirst({ where: whereDocente });

  if (!docenteAtivo) {
    throw new Error('O docente não está ativo ou não leciona a modalidade solicitada.');
  }

  // ── Validação 4: o docente tem uma disponibilidade válida para este pedido
  const horaInicioDate = new Date(`1970-01-01T${hora_inicio}Z`);
  const horaFimDate = new Date(horaInicioDate.getTime() + duracao_minutos * 60 * 1000);
  const [ano, mes, dia] = data_a_realizar.split('T')[0].split('-').map(Number);
  const diaSemana = new Date(Date.UTC(ano, mes - 1, dia)).getUTCDay();
  // Normaliza a data para T00:00:00.000Z (mesmo formato que as disponibilidades guardadas)
  const dataRealizarDate = new Date(`${data_a_realizar.split('T')[0]}T00:00:00.000Z`);

  // ── Validação Extra: Antecedência mínima de 30 minutos para marcações no próprio dia
  const [hora, minuto, segundo = 0] = hora_inicio.split(':').map(Number);
  const dataHoraMarcacao = new Date(ano, mes - 1, dia, hora, minuto, segundo);
  const agora = new Date();

  if (
    dataHoraMarcacao.getFullYear() === agora.getFullYear() &&
    dataHoraMarcacao.getMonth() === agora.getMonth() &&
    dataHoraMarcacao.getDate() === agora.getDate()
  ) {
    const diferencaMinutos = (dataHoraMarcacao.getTime() - agora.getTime()) / (1000 * 60);
    if (diferencaMinutos < 30) {
      throw new Error("Para marcações no próprio dia, o horário de início deve ter pelo menos 30 minutos de antecedência em relação à hora atual.");
    }
  }

  const disponibilidadeValida = await prisma.disponibilidade.findFirst({
    where: {
      id_docente,
      AND: [
        {
          OR: [
            { data_especifica: dataRealizarDate },
            { dia_semana: diaSemana },
          ],
        },
        { hora_inicio: { lte: horaInicioDate } },
        { hora_fim: { gte: horaFimDate } },
      ],
    },
  });

  if (!disponibilidadeValida) {
    throw new Error(
      `O horário pedido (${hora_inicio} + ${duracao_minutos}min) não cabe dentro da disponibilidade do docente.`
    );
  }
  // ── Validação 5: sem pedido sobreposto do mesmo aluno
  const marcacoesAluno = await prisma.aluno_marcacao.findMany({
    where: {
      id_aluno,
      id_aluno_estado: { not: ESTADO_ALUNO_MARCACAO.RECUSADO },
      marcacao: {
        data_a_realizar: dataRealizarDate,
        id_estado: { notIn: [ESTADO_MARCACAO.CANCELADA] },
      },
    },
    include: {
      marcacao: { select: { hora_inicio: true, duracao_minutos: true } },
    },
  });

  for (const ma of marcacoesAluno) {
    const mInicio = new Date(ma.marcacao.hora_inicio);
    const mFim = new Date(mInicio.getTime() + ma.marcacao.duracao_minutos * 60 * 1000);

    if (horaInicioDate < mFim && horaFimDate > mInicio) {
      throw new Error('Já existe um pedido teu para este horário.');
    }
  }

  // ── Validação 6: sem conflito de agenda do docente (RF-COA-05)
  const marcacoesExistentes = await prisma.marcacao.findMany({
    where: {
      id_docente,
      data_a_realizar: dataRealizarDate,
      id_estado: { in: [ESTADO_MARCACAO.PENDENTE, ESTADO_MARCACAO.EM_VALIDACAO, ESTADO_MARCACAO.CONFIRMADA] },
    },
    select: { hora_inicio: true, duracao_minutos: true },
  });

  // Verifica se há sobreposição com alguma marcação existente
  for (const marcacao of marcacoesExistentes) {
    const horaInicioExistente = new Date(marcacao.hora_inicio);
    const horaFimExistente = new Date(horaInicioExistente.getTime() + marcacao.duracao_minutos * 60 * 1000);

    // Sobreposição: nova começa antes da existente acabar E acaba depois da existente começar
    if (horaInicioDate < horaFimExistente && horaFimDate > horaInicioExistente) {
      throw new Error(
        `O docente já tem uma marcação reservada neste horário. Escolhe outro slot disponível.`
      );
    }
  }

  // ── Validação 7: sem conflito com horário letivo fixo do docente (RF-COA-05 CA4)
  const horariosLetivos = await prisma.horario_letivo.findMany({
    where: {
      id_docente,
      dia_semana: diaSemana,
    },
    select: { hora_inicio: true, hora_fim: true },
  });

  for (const horario of horariosLetivos) {
    const horaInicioLetivo = new Date(horario.hora_inicio);
    const horaFimLetivo = new Date(horario.hora_fim);

    // Verifica sobreposição
    if (horaInicioDate < horaFimLetivo && horaFimDate > horaInicioLetivo) {
      throw new Error(
        `O horário coincide com um período letivo fixo do docente. Escolhe outro slot.`
      );
    }
  }

  let resultado;
  try {
    resultado = await prisma.$transaction(async (tx) => {
      // Cria a marcação com estado PENDENTE
      const marcacao = await tx.marcacao.create({
        data: {
          id_docente,
          id_modalidade,
          id_estado: ESTADO_MARCACAO.PENDENTE,
          data_a_realizar: dataRealizarDate,
          hora_inicio: horaInicioDate,
          duracao_minutos,
          numero_alunos_pretendidos,
          id_user_criador: id_aluno,
        },
      });

      // Regista o histórico do estado inicial
      await tx.marcacao_estado_historico.create({
        data: {
          id_marcacoes: marcacao.id_marcacoes,
          id_estado: ESTADO_MARCACAO.PENDENTE,
        },
      });

      // Associa o aluno à marcação como participante
      await tx.aluno_marcacao.create({
        data: {
          id_aluno,
          id_marcacoes: marcacao.id_marcacoes,
          id_aluno_estado: ESTADO_ALUNO_MARCACAO.CONFIRMADO, // ← id 2 para o criador da marcação, já confirmado
        },
      });

      return marcacao;
    });

    // Se outros alunos foram fornecidos, adiciona-os
    if (outros_alunos.length > 0) {
      await adicionarParticipantesGrupo(resultado.id_marcacoes, id_aluno, outros_alunos);
    }

    return resultado;

  } catch (error) {
    throw new Error(`Erro na base de dados ao criar marcação: ${error.message}`);
  }
}

// ─────────────────────────────────────────────────────────────
// 2.1 adicionarParticipantesGrupo
// ─────────────────────────────────────────────────────────────
/**
 * Adiciona outros alunos a uma marcação de grupo existente.
 * Só pode ser chamado pelo aluno que criou a marcação, e apenas se ainda estiver PENDENTE.
 *
 * @param {number} id_marcacao - ID da marcação
 * @param {number} id_aluno_requisitante - ID do aluno que criou a marcação
 * @param {Array<number>} outros_alunos - IDs dos outros alunos a adicionar
 * @returns {Promise<object>} Resultado da adição
 */
async function adicionarParticipantesGrupo(id_marcacao, id_aluno_requisitante, outros_alunos) {
  // Verificar se a marcação existe e foi criada pelo requisitante
  const marcacao = await prisma.marcacao.findUnique({
    where: { id_marcacoes: id_marcacao },
    include: { aluno_marcacao: true },
  });

  if (!marcacao) throw new Error('Marcação não encontrada.');
  if (marcacao.id_user_criador !== id_aluno_requisitante) throw new Error('Só o criador da marcação pode adicionar participantes.');
  if (marcacao.id_estado !== ESTADO_MARCACAO.PENDENTE) throw new Error('Só é possível adicionar participantes a marcações no estado PENDENTE.');

  // Verificar se numero_alunos_pretendidos > 1
  if (marcacao.numero_alunos_pretendidos <= 1) throw new Error('Esta marcação não é para grupo.');

  // Calcular quantos já estão associados
  const participantesAtuais = marcacao.aluno_marcacao.length;
  const totalComNovos = participantesAtuais + outros_alunos.length;

  if (totalComNovos > marcacao.numero_alunos_pretendidos) {
    throw new Error(`Adicionar estes alunos excederia o número pretendido (${marcacao.numero_alunos_pretendidos}).`);
  }

  // Verificar duplicados na lista de novos
  if (new Set(outros_alunos).size !== outros_alunos.length) {
    throw new Error('Há alunos duplicados na lista de novos participantes.');
  }

  // Verificar se algum novo já está associado
  const idsAtuais = marcacao.aluno_marcacao.map(am => am.id_aluno);
  const duplicados = outros_alunos.filter(id => idsAtuais.includes(id));
  if (duplicados.length > 0) {
    throw new Error(`Os alunos ${duplicados.join(', ')} já estão associados a esta marcação.`);
  }

  // Validar cada novo aluno
  for (const id of outros_alunos) {
    const outro_aluno = await prisma.aluno.findUnique({
      where: { id_utilizador: id }
    });
    if (!outro_aluno) throw new Error(`Outro aluno com ID ${id} não encontrado.`);
    if (!outro_aluno.coaching) throw new Error(`Outro aluno com ID ${id} não tem permissão de coaching ativa.`);

    const outroAlunoMod = await prisma.aluno_modalidade.findFirst({
      where: { id_utilizador: id, id_modalidade: marcacao.id_modalidade }
    });
    if (!outroAlunoMod) throw new Error(`Ação inválida: O aluno com ID ${id} não está associado à modalidade da marcação.`);

    // Verificar se o aluno já tem pedido para o mesmo slot
    const conflito = await prisma.aluno_marcacao.findFirst({
      where: {
        id_aluno: id,
        marcacao: {
          id_docente: marcacao.id_docente,
          data_a_realizar: marcacao.data_a_realizar,
          hora_inicio: marcacao.hora_inicio,
          id_estado: { notIn: [ESTADO_MARCACAO.CANCELADA] },
        },
      },
    });
    if (conflito) throw new Error(`O aluno ${id} já tem um pedido para este horário.`);
  }

  // Adicionar os novos participantes
  await prisma.$transaction(async (tx) => {
    for (const id_aluno of outros_alunos) {
      await tx.aluno_marcacao.create({
        data: {
          id_aluno,
          id_marcacoes: id_marcacao,
          id_aluno_estado: ESTADO_ALUNO_MARCACAO.PENDENTE, // ← os convidados começam como PENDENTE
        },
      });
      await tx.notificacao.create({
        data: {
          id_user: id_aluno,
          titulo: "Convite para Sessão de Coaching",
          mensagem: `Foste convidado para participar numa sessão de coaching de grupo PENDENTE para ${marcacao.data_a_realizar.toLocaleDateString('pt-PT')}.`
        }
      });
    }
  });

  return { mensagem: 'Participantes adicionados com sucesso.', total_participantes: totalComNovos };
}

// ─────────────────────────────────────────────────────────────
// 3. listarMeusPedidos
// ─────────────────────────────────────────────────────────────
/**
 * Devolve o histórico de marcações do aluno, com o estado atual e detalhes da sessão.
 *
 * @param {number} id_aluno
 * @param {object} filtros
 * @param {number|null} filtros.id_estado - Filtra por estado (opcional)
 * @returns {Promise<Array>}
 */
async function listarMeusPedidos(id_aluno, { id_estado = null } = {}) {
  const associacoes = await prisma.aluno_marcacao.findMany({
    where: {
      id_aluno,
      // Filtra por estado se pedido
      ...(id_estado && {
        marcacao: { id_estado },
      }),
    },
    include: {
      marcacao: {
        include: {
          docente: {
            include: {
              utilizador: { select: { nome: true, apelido: true } },
            },
          },
          modalidade: { select: { nome: true } },
          sala: { select: { nome: true } },
          estado_marcacao: { select: { nome: true } },
          participacao_conclusao: {
            where: { id_aluno },
            select: { confirmou_conclusao: true }
          },
        },
      },
    },
    orderBy: {
      marcacao: { data_a_realizar: 'asc' },
    },
  });

  // Formata a resposta para o frontend
  return associacoes.map((a) => ({
    id_marcacao: a.marcacao.id_marcacoes,
    docente: `${a.marcacao.docente.utilizador.nome} ${a.marcacao.docente.utilizador.apelido}`,
    modalidade: a.marcacao.modalidade?.nome ?? '—',
    sala: a.marcacao.sala?.nome ?? 'Por atribuir',
    data: a.marcacao.data_a_realizar,
    hora_inicio: a.marcacao.hora_inicio,
    duracao_minutos: a.marcacao.duracao_minutos,
    numero_alunos_pretendidos: a.marcacao.numero_alunos_pretendidos,
    estado: a.marcacao.estado_marcacao?.nome ?? '—',
    id_estado: a.marcacao.id_estado ?? null,
    data_criacao: a.marcacao.data_criacao,
    ja_validou: a.marcacao.participacao_conclusao?.some(p => p.confirmou_conclusao) ?? false,
  }));
}

// ─────────────────────────────────────────────────────────────
// 4. cancelarPedidoPendente
// ─────────────────────────────────────────────────────────────
/**
 * O aluno anula um pedido que ainda está no estado PENDENTE.
 * Só é possível cancelar pedidos que o próprio aluno criou e que ainda não foram validados.
 *
 * @param {number} id_aluno
 * @param {number} id_marcacao
 * @returns {Promise<object>} Marcação atualizada
 */
async function cancelarPedidoPendente(id_aluno, id_marcacao) {
  // Verifica que a marcação existe e pertence ao aluno
  const associacao = await prisma.aluno_marcacao.findFirst({
    where: { id_aluno, id_marcacoes: id_marcacao },
    include: { marcacao: true },
  });

  if (!associacao) throw new Error('Marcação não encontrada ou não pertence ao aluno.');

  // Só permite cancelar se ainda estiver PENDENTE ou EM_VALIDACAO
  if (
    associacao.marcacao.id_estado !== ESTADO_MARCACAO.PENDENTE &&
    associacao.marcacao.id_estado !== ESTADO_MARCACAO.EM_VALIDACAO
  ) {
    throw new Error(
      'Só é possível cancelar pedidos Agendados ou em Validação. Contacta a coordenação para outros casos.'
    );
  }

  // Atualiza o estado e regista no histórico (dentro de transação)
  const marcacaoAtualizada = await prisma.$transaction(async (tx) => {
    const atualizada = await tx.marcacao.update({
      where: { id_marcacoes: id_marcacao },
      data: { id_estado: ESTADO_MARCACAO.CANCELADA },
    });

    await tx.marcacao_estado_historico.create({
      data: {
        id_marcacoes: id_marcacao,
        id_estado: ESTADO_MARCACAO.CANCELADA,
      },
    });

    return atualizada;
  });

  return marcacaoAtualizada;
}

// ─────────────────────────────────────────────────────────────
// 5. confirmarPresencaGrupo
// ─────────────────────────────────────────────────────────────
/**
 * O aluno convidado para uma sessão de grupo confirma (ou recusa) a sua participação.
 * Se não confirmar dentro de 1 hora, a função `verificarExpiracaoGrupo` trata do cancelamento.
 *
 * @param {number} id_aluno
 * @param {number} id_marcacao
 * @param {boolean} aceitar - true = confirma presença, false = recusa
 * @returns {Promise<object>} Resultado da confirmação
 */
async function confirmarPresencaGrupo(id_aluno, id_marcacao, aceitar) {
  // Procura a associação do aluno a esta marcação de grupo
  const associacao = await prisma.aluno_marcacao.findFirst({
    where: { id_aluno, id_marcacoes: id_marcacao },
    include: {
      marcacao: true,
    },
  });

  if (!associacao) throw new Error('Convite não encontrado para este aluno.');

  // Verifica que a marcação ainda está PENDENTE (aceitações só fazem sentido neste estado)
  if (associacao.marcacao.id_estado !== ESTADO_MARCACAO.PENDENTE) {
    throw new Error('Esta marcação já não está disponível para confirmação.');
  }

  // Verifica se o prazo de 1 hora ainda não expirou (RF-COA-07 CA2)
  const agora = new Date();
  const dataCriacao = new Date(associacao.marcacao.data_criacao);
  const tempoDecorrido = agora - dataCriacao;

  if (tempoDecorrido > PRAZO_CONFIRMACAO_GRUPO_MS) {
    // Prazo expirado — cancela automaticamente
    await _cancelarMarcacaoPorExpiracao(id_marcacao);
    throw new Error('O prazo de confirmação de 1 hora expirou. A inscrição foi anulada automaticamente.');
  }

  if (!aceitar) {
    await prisma.aluno_marcacao.updateMany({
      where: { id_aluno, id_marcacoes: id_marcacao },
      data: {
        id_aluno_estado: ESTADO_ALUNO_MARCACAO.RECUSADO,
        data_resposta: new Date(),
      },
    });
    await _cancelarMarcacaoPorExpiracao(id_marcacao);
    return { mensagem: 'Participação recusada. A sessão de grupo foi cancelada.' };
  }
  // ← sem "else"! O return acima já garante que só chegamos aqui se aceitar = true

  await prisma.aluno_marcacao.updateMany({
    where: { id_aluno, id_marcacoes: id_marcacao },
    data: {
      id_aluno_estado: ESTADO_ALUNO_MARCACAO.CONFIRMADO,
      data_resposta: new Date(),
    },
  });

  const todosOsParticipantes = await prisma.aluno_marcacao.findMany({
    where: { id_marcacoes: id_marcacao },
  });

  const todosConfirmaram = todosOsParticipantes.every(
    (p) => p.id_aluno_estado === ESTADO_ALUNO_MARCACAO.CONFIRMADO
  );

  return {
    mensagem: 'Presença confirmada com sucesso.',
    todos_confirmaram: todosConfirmaram,
    total_participantes: todosOsParticipantes.length,
    confirmados: todosOsParticipantes.filter(
      (p) => p.id_aluno_estado === ESTADO_ALUNO_MARCACAO.CONFIRMADO
    ).length,
    pendentes: todosOsParticipantes.filter(
      (p) => p.id_aluno_estado === ESTADO_ALUNO_MARCACAO.PENDENTE
    ).length,
  };
}

// ─────────────────────────────────────────────────────────────
// 6. validarConclusaoSessao
// ─────────────────────────────────────────────────────────────
/**
 * O aluno (ou encarregado de educação) realiza a 1.ª parte da dupla validação pós-aula.
 * Após esta validação + a do docente, o estado passa automaticamente para CONCLUÍDA.
 *
 * Conforme RF-COA-04: a sessão fica disponível para faturação só após AMBAS as validações.
 *
 * @param {number} id_aluno
 * @param {number} id_marcacao
 * @returns {Promise<object>} Resultado com o estado atual da dupla validação
 */
async function validarConclusaoSessao(id_aluno, id_marcacao) {
  // Procura o registo de participação/conclusão do aluno para esta marcação
  let participacao = await prisma.participacao_conclusao.findFirst({
    where: { id_marcacoes: id_marcacao, id_aluno },
  });

  // Se ainda não existe o registo, cria-o
  if (!participacao) {
    // Confirma que a marcação existe e está CONFIRMADA
    const marcacao = await prisma.marcacao.findUnique({
      where: { id_marcacoes: id_marcacao },
    });
    if (!marcacao) throw new Error('Marcação não encontrada.');
    if (marcacao.id_estado !== ESTADO_MARCACAO.CONFIRMADA) {
      throw new Error('Só é possível validar sessões no estado Confirmada.');
    }

    // Verifica prazo de 48 horas (RF-COA-04)
    const agora = new Date();
    // Nota: usamos data_a_realizar + hora_inicio como referência temporal da aula
    const dataHoraAula = new Date(marcacao.data_a_realizar);
    if (agora - dataHoraAula > PRAZO_DUPLA_VALIDACAO_MS) {
      throw new Error('O prazo de 48 horas para validação da sessão já expirou.');
    }

    participacao = await prisma.participacao_conclusao.create({
      data: {
        id_marcacoes: id_marcacao,
        id_aluno,
        id_docente: null,       // ← explícito: este registo é do aluno, nunca do docente
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

  // Verifica se o docente também já validou
  const validacaoDocente = await prisma.participacao_conclusao.findFirst({
    where: {
      id_marcacoes: id_marcacao,
      id_docente: { not: null },
      id_aluno: null,          // ← garante que é um registo de docente, não de aluno
      confirmou_conclusao: true,
    },
  });

  // Se AMBOS validaram, passa o estado para CONCLUÍDA automaticamente (RF-COA-04 CA2)
  if (validacaoDocente) {
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
    mensagem: 'A tua validação foi registada. Aguarda a confirmação do docente.',
    estado: 'Confirmada',
    dupla_validacao_completa: false,
  };
}

// ─────────────────────────────────────────────────────────────
// FUNÇÃO AUXILIAR (interna) — Cancelamento por expiração
// ─────────────────────────────────────────────────────────────
/**
 * Cancela uma marcação por expiração de prazo ou recusa de participante.
 * Usada internamente por confirmarPresencaGrupo e pode ser chamada por um job agendado.
 *
 * @param {number} id_marcacao
 */
async function _cancelarMarcacaoPorExpiracao(id_marcacao) {
  await prisma.$transaction(async (tx) => {
    await tx.marcacao.update({
      where: { id_marcacoes: id_marcacao },
      data: { id_estado: ESTADO_MARCACAO.CANCELADA },
    });
    await tx.marcacao_estado_historico.create({
      data: {
        id_marcacoes: id_marcacao,
        id_estado: ESTADO_MARCACAO.CANCELADA,
      },
    });
  });
}

// ─────────────────────────────────────────────────────────────
// EXPORTAÇÕES
// ─────────────────────────────────────────────────────────────
const listarColegas = async (id_aluno_atual, id_modalidade = null) => {
  const where = {
    id_tipo: 3, // Aluno
    id_utilizador: { not: id_aluno_atual }
  };

  if (id_modalidade) {
    where.aluno = {
      aluno_modalidade: {
        some: {
          id_modalidade: parseInt(id_modalidade)
        }
      }
    };
  }

  return await prisma.utilizador.findMany({
    where,
    select: {
      id_utilizador: true,
      nome: true,
      apelido: true,
    },
    orderBy: { nome: 'asc' }
  });
};

module.exports = {
  consultarDisponibilidades,
  solicitarMarcacao,
  adicionarParticipantesGrupo,
  listarMeusPedidos,
  cancelarPedidoPendente,
  confirmarPresencaGrupo,
  validarConclusaoSessao,
  listarColegas,
  _cancelarMarcacaoPorExpiracao,
  ESTADO_MARCACAO,
  ESTADO_ALUNO_MARCACAO,
};