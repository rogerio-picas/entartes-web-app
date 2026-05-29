// tests/services/coachingAlunoService.test.js  
// Testes Unitários — Módulo de Marcações (Coaching)
// Framework: Jest  |  Mocking: jest.mock()
//
// Como correr:
//   npm install --save-dev jest
//   npx jest coachingAlunoService.test.js 
//
// NOTA: O Prisma Client é completamente substituído por mocks.
//       Nenhuma ligação real à base de dados é efectuada.

// ─────────────────────────────────────────────────────────────
// MOCK DO PRISMA CLIENT
// Tem de ser declarado ANTES de qualquer require() do serviço,
// porque o Jest eleva (hoists) os jest.mock() para o topo do ficheiro.
// ─────────────────────────────────────────────────────────────
jest.mock('@prisma/client', () => {
  // Objecto que simula todas as tabelas (models) que o serviço usa.
  // Cada método (findMany, findFirst, findUnique, create, update, updateMany)
  // é um jest.fn() — uma função de imitação que podemos controlar nos testes.
  const mockPrisma = {
    disponibilidade: {
      findMany: jest.fn(),
      findFirst: jest.fn(),
    },
    marcacao: {
      findMany: jest.fn(),
      findFirst: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    aluno: {
      findUnique: jest.fn(),
    },
    docente: {
      findFirst: jest.fn(),
    },
    aluno_modalidade: {
      findMany: jest.fn(),
      findFirst: jest.fn(),
    },
    aluno_marcacao: {
      findMany: jest.fn(),
      findFirst: jest.fn(),
      create: jest.fn(),
      updateMany: jest.fn(),
    },
    marcacao_estado_historico: {
      create: jest.fn(),
    },
    participacao_conclusao: {
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    notificacao: {
      create: jest.fn(),
    },
    horario_letivo: {
      findMany: jest.fn(),
    },
    utilizador: {
      findMany: jest.fn(),
    },
    // $transaction simula uma transacção Prisma:
    // executa o callback passado, entregando o próprio mockPrisma como "tx"
    $transaction: jest.fn(async (callback) => callback(mockPrisma)),
  };

  return {
    // O PrismaClient é uma classe — simulamos o construtor para devolver o nosso mock
    PrismaClient: jest.fn(() => mockPrisma),
  };
});

// ─────────────────────────────────────────────────────────────
// IMPORTAÇÕES
// ─────────────────────────────────────────────────────────────
const { PrismaClient } = require('@prisma/client');
// Instanciamos o mock para aceder directamente nos testes
const prisma = new PrismaClient();

// Importamos o serviço — já vai usar o Prisma mockado
const {
  consultarDisponibilidades,
  solicitarMarcacao,
  adicionarParticipantesGrupo,
  listarMeusPedidos,
  cancelarPedidoPendente,
  confirmarPresencaGrupo,
  validarConclusaoSessao,
  listarColegas,
  ESTADO_MARCACAO,
  ESTADO_ALUNO_MARCACAO,
} = require('../../services/coachingAlunoService');

// ─────────────────────────────────────────────────────────────
// DADOS DE TESTE REUTILIZÁVEIS (fixtures)
// ─────────────────────────────────────────────────────────────

// Uma disponibilidade típica de docente
const disponibilidadeFixture = {
  id_disponibilidade: 1,
  id_docente: 10,
  dia_semana: 2,           // Terça-feira
  data_especifica: null,
  hora_inicio: new Date('1970-01-01T09:00:00Z'),
  hora_fim: new Date('1970-01-01T17:00:00Z'),
  docente: {
    estado_atividade: true,
    utilizador: { nome: 'João', apelido: 'Silva' },
    docente_modalidade: [
      { modalidade: { id_modalidade: 5, nome: 'Dança Contemporânea' } },
    ],
  },
};

// Um aluno com coaching activo
const alunoFixture = {
  id_utilizador: 1,
  coaching: true,
};

// Um docente activo
const docenteFixture = {
  id_utilizador: 10,
  estado_atividade: true,
};

// Dados base para solicitar uma marcação
const dadosMarcacao = {
  id_docente: 10,
  id_modalidade: 5,
  data_a_realizar: '2025-06-10',
  hora_inicio: '10:00:00',
  duracao_minutos: 60,
  numero_alunos_pretendidos: 1,
  outros_alunos: [],
};

// Uma marcação criada (estado PENDENTE)
const marcacaoFixture = {
  id_marcacoes: 100,
  id_docente: 10,
  id_modalidade: 5,
  id_estado: ESTADO_MARCACAO.PENDENTE,
  data_a_realizar: new Date('2025-06-10T00:00:00.000Z'),
  hora_inicio: new Date('1970-01-01T10:00:00Z'),
  duracao_minutos: 60,
  numero_alunos_pretendidos: 1,
  id_user_criador: 1,
  data_criacao: new Date(Date.now() - 5 * 60 * 1000), // criada há 5 minutos
};

// ─────────────────────────────────────────────────────────────
// SETUP — Limpa todos os mocks antes de cada teste
// ─────────────────────────────────────────────────────────────
beforeEach(() => {
  jest.clearAllMocks();
  prisma.aluno_modalidade.findFirst.mockResolvedValue({ id_modalidade: 5 });
  prisma.aluno_modalidade.findMany.mockResolvedValue([{ id_modalidade: 5 }]);
});

// ═════════════════════════════════════════════════════════════
// 1. consultarDisponibilidades
// ═════════════════════════════════════════════════════════════
describe('consultarDisponibilidades', () => {

  test('devolve lista de slots disponíveis quando não há conflitos', async () => {
    // Arrange — o Prisma devolve uma disponibilidade e nenhum conflito
    prisma.disponibilidade.findMany.mockResolvedValue([disponibilidadeFixture]);
    prisma.marcacao.findFirst.mockResolvedValue(null); // sem conflito

    // Act
    const resultado = await consultarDisponibilidades({ data: '2025-06-10' });

    // Assert
    expect(resultado).toHaveLength(1);
    expect(resultado[0].disponivel).toBe(true);
    expect(resultado[0].nome_docente).toBe('João Silva');
    expect(resultado[0].modalidades[0].nome).toBe('Dança Contemporânea');
  });

  test('filtra slots com conflito (marcação já existente no mesmo horário)', async () => {
    // Arrange — existe uma marcação confirmada que ocupa o slot
    prisma.disponibilidade.findMany.mockResolvedValue([disponibilidadeFixture]);
    prisma.marcacao.findFirst.mockResolvedValue({ id_marcacoes: 99 }); // conflito!

    // Act
    const resultado = await consultarDisponibilidades({ data: '2025-06-10' });

    // Assert — slot com conflito é excluído do resultado
    expect(resultado).toHaveLength(0);
  });

  test('devolve array vazio quando não há disponibilidades', async () => {
    prisma.disponibilidade.findMany.mockResolvedValue([]);

    const resultado = await consultarDisponibilidades();

    expect(resultado).toEqual([]);
  });

  test('filtra por modalidade quando id_modalidade é fornecido', async () => {
    prisma.disponibilidade.findMany.mockResolvedValue([disponibilidadeFixture]);
    prisma.marcacao.findFirst.mockResolvedValue(null);

    await consultarDisponibilidades({ id_modalidade: 5, data: '2025-06-10' });

    // Verifica que a query ao Prisma incluiu o filtro de modalidade
    expect(prisma.disponibilidade.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          docente: expect.objectContaining({
            docente_modalidade: expect.objectContaining({
              some: { id_modalidade: 5 },
            }),
          }),
        }),
      })
    );
  });
});

// ═════════════════════════════════════════════════════════════
// 2. solicitarMarcacao
// ═════════════════════════════════════════════════════════════
describe('solicitarMarcacao', () => {

  // Helper — configura todos os mocks para o "caminho feliz"
  function setupCaminhoFeliz() {
    prisma.aluno.findUnique.mockResolvedValue(alunoFixture);
    prisma.docente.findFirst.mockResolvedValue(docenteFixture);
    prisma.disponibilidade.findFirst.mockResolvedValue(disponibilidadeFixture);
    prisma.aluno_marcacao.findFirst.mockResolvedValue(null);   // sem duplicado
    prisma.marcacao.findMany.mockResolvedValue([]);             // sem conflito de agenda
    prisma.horario_letivo.findMany.mockResolvedValue([]);      // sem conflito letivo
    prisma.marcacao.create.mockResolvedValue(marcacaoFixture);
    prisma.marcacao_estado_historico.create.mockResolvedValue({});
    prisma.aluno_marcacao.create.mockResolvedValue({});
  }

  test('cria marcação com sucesso no caminho feliz', async () => {
    setupCaminhoFeliz();

    const resultado = await solicitarMarcacao(1, dadosMarcacao);

    expect(resultado).toMatchObject({ id_marcacoes: 100 });
    expect(prisma.marcacao.create).toHaveBeenCalledTimes(1);
    expect(prisma.marcacao_estado_historico.create).toHaveBeenCalledTimes(1);
    expect(prisma.aluno_marcacao.create).toHaveBeenCalledTimes(1);
  });

  test('lança erro se o aluno não for encontrado', async () => {
    prisma.aluno.findUnique.mockResolvedValue(null);

    await expect(solicitarMarcacao(999, dadosMarcacao))
      .rejects.toThrow('Aluno não encontrado.');
  });

  test('lança erro se o aluno não tiver coaching activo', async () => {
    prisma.aluno.findUnique.mockResolvedValue({ ...alunoFixture, coaching: false });

    await expect(solicitarMarcacao(1, dadosMarcacao))
      .rejects.toThrow('O aluno não tem permissão de coaching ativa.');
  });

  test('lança erro para duração inválida', async () => {
    prisma.aluno.findUnique.mockResolvedValue(alunoFixture);

    const dadosInvalidos = { ...dadosMarcacao, duracao_minutos: 50 }; // 50 não é permitido

    await expect(solicitarMarcacao(1, dadosInvalidos))
      .rejects.toThrow('Duração inválida');
  });

  test.each([30, 45, 60, 75, 90, 120])(
    'aceita duração de %d minutos (duração válida)',
    async (duracao) => {
      setupCaminhoFeliz();

      const dadosComDuracao = { ...dadosMarcacao, duracao_minutos: duracao };
      const resultado = await solicitarMarcacao(1, dadosComDuracao);

      expect(resultado).toBeDefined();
    }
  );

  test('lança erro se o docente não estiver activo', async () => {
    prisma.aluno.findUnique.mockResolvedValue(alunoFixture);
    prisma.docente.findFirst.mockResolvedValue(null); // docente não encontrado/inactivo

    await expect(solicitarMarcacao(1, dadosMarcacao))
      .rejects.toThrow('O docente não está ativo ou não leciona a modalidade solicitada.');
  });

  test('lança erro se o horário não couber na disponibilidade do docente', async () => {
    prisma.aluno.findUnique.mockResolvedValue(alunoFixture);
    prisma.docente.findFirst.mockResolvedValue(docenteFixture);
    prisma.disponibilidade.findFirst.mockResolvedValue(null); // sem disponibilidade válida

    await expect(solicitarMarcacao(1, dadosMarcacao))
      .rejects.toThrow('O horário pedido');
  });

  test('lança erro se já existir pedido duplicado do mesmo aluno', async () => {
    prisma.aluno.findUnique.mockResolvedValue(alunoFixture);
    prisma.docente.findFirst.mockResolvedValue(docenteFixture);
    prisma.disponibilidade.findFirst.mockResolvedValue(disponibilidadeFixture);
    prisma.aluno_marcacao.findFirst.mockResolvedValue({ id_aluno: 1 }); // duplicado!

    await expect(solicitarMarcacao(1, dadosMarcacao))
      .rejects.toThrow('Já existe um pedido teu para este horário.');
  });

  test('lança erro se o docente já tiver marcação a sobrepor-se', async () => {
    prisma.aluno.findUnique.mockResolvedValue(alunoFixture);
    prisma.docente.findFirst.mockResolvedValue(docenteFixture);
    prisma.disponibilidade.findFirst.mockResolvedValue(disponibilidadeFixture);
    prisma.aluno_marcacao.findFirst.mockResolvedValue(null);

    // Marcação existente das 09:30 às 10:30 — sobrepõe-se com as 10:00
    prisma.marcacao.findMany.mockResolvedValue([
      {
        hora_inicio: new Date('1970-01-01T09:30:00Z'),
        duracao_minutos: 60,
      },
    ]);

    await expect(solicitarMarcacao(1, dadosMarcacao))
      .rejects.toThrow('O docente já tem uma marcação reservada neste horário.');
  });

  test('lança erro se o horário coincidir com horário letivo fixo', async () => {
    prisma.aluno.findUnique.mockResolvedValue(alunoFixture);
    prisma.docente.findFirst.mockResolvedValue(docenteFixture);
    prisma.disponibilidade.findFirst.mockResolvedValue(disponibilidadeFixture);
    prisma.aluno_marcacao.findFirst.mockResolvedValue(null);
    prisma.marcacao.findMany.mockResolvedValue([]); // sem conflito de agenda

    // Horário letivo das 09:00 às 11:00 — sobrepõe-se com as 10:00
    prisma.horario_letivo.findMany.mockResolvedValue([
      {
        hora_inicio: new Date('1970-01-01T09:00:00Z'),
        hora_fim: new Date('1970-01-01T11:00:00Z'),
      },
    ]);

    await expect(solicitarMarcacao(1, dadosMarcacao))
      .rejects.toThrow('O horário coincide com um período letivo fixo do docente.');
  });

  test('adiciona participantes de grupo se outros_alunos for fornecido', async () => {
    setupCaminhoFeliz();
    // Configura o mock para suportar a adição de participantes de grupo
    prisma.marcacao.findUnique.mockResolvedValue({
      ...marcacaoFixture,
      numero_alunos_pretendidos: 2,
      aluno_marcacao: [{ id_aluno: 1 }],
    });
    prisma.aluno.findUnique.mockResolvedValue(alunoFixture);
    prisma.aluno_marcacao.findFirst.mockResolvedValue(null);
    prisma.notificacao.create.mockResolvedValue({});

    const dadosGrupo = { ...dadosMarcacao, numero_alunos_pretendidos: 2, outros_alunos: [2] };
    const resultado = await solicitarMarcacao(1, dadosGrupo);

    expect(resultado).toBeDefined();
    // Verifica que o sistema tentou criar o aluno_marcacao para o participante extra
    expect(prisma.aluno_marcacao.create).toHaveBeenCalledTimes(2); // 1 criador + 1 convidado
  });
});

// ═════════════════════════════════════════════════════════════
// 3. adicionarParticipantesGrupo
// ═════════════════════════════════════════════════════════════
describe('adicionarParticipantesGrupo', () => {

  const marcacaoGrupoFixture = {
    ...marcacaoFixture,
    numero_alunos_pretendidos: 3,
    id_user_criador: 1,
    id_estado: ESTADO_MARCACAO.PENDENTE,
    aluno_marcacao: [{ id_aluno: 1 }], // apenas o criador por agora
  };

  test('adiciona participantes com sucesso', async () => {
    prisma.marcacao.findUnique.mockResolvedValue(marcacaoGrupoFixture);
    prisma.aluno.findUnique.mockResolvedValue(alunoFixture);
    prisma.aluno_marcacao.findFirst.mockResolvedValue(null); // sem conflito
    prisma.aluno_marcacao.create.mockResolvedValue({});
    prisma.notificacao.create.mockResolvedValue({});

    const resultado = await adicionarParticipantesGrupo(100, 1, [2]);

    expect(resultado.mensagem).toBe('Participantes adicionados com sucesso.');
    expect(resultado.total_participantes).toBe(2);
    expect(prisma.notificacao.create).toHaveBeenCalledTimes(1);
  });

  test('lança erro se a marcação não existir', async () => {
    prisma.marcacao.findUnique.mockResolvedValue(null);

    await expect(adicionarParticipantesGrupo(999, 1, [2]))
      .rejects.toThrow('Marcação não encontrada.');
  });

  test('lança erro se o requisitante não for o criador', async () => {
    prisma.marcacao.findUnique.mockResolvedValue(marcacaoGrupoFixture);

    // Aluno 99 tenta adicionar participantes, mas o criador é o aluno 1
    await expect(adicionarParticipantesGrupo(100, 99, [2]))
      .rejects.toThrow('Só o criador da marcação pode adicionar participantes.');
  });

  test('lança erro se a marcação não estiver no estado PENDENTE', async () => {
    prisma.marcacao.findUnique.mockResolvedValue({
      ...marcacaoGrupoFixture,
      id_estado: ESTADO_MARCACAO.CONFIRMADA, // estado inválido para esta operação
    });

    await expect(adicionarParticipantesGrupo(100, 1, [2]))
      .rejects.toThrow('Só é possível adicionar participantes a marcações no estado PENDENTE.');
  });

  test('lança erro se a marcação não for de grupo', async () => {
    prisma.marcacao.findUnique.mockResolvedValue({
      ...marcacaoGrupoFixture,
      numero_alunos_pretendidos: 1, // sessão individual!
    });

    await expect(adicionarParticipantesGrupo(100, 1, [2]))
      .rejects.toThrow('Esta marcação não é para grupo.');
  });

  test('lança erro se adicionar exceder o número pretendido', async () => {
    prisma.marcacao.findUnique.mockResolvedValue({
      ...marcacaoGrupoFixture,
      numero_alunos_pretendidos: 2, // máximo 2, já tem 1 (o criador)
      aluno_marcacao: [{ id_aluno: 1 }],
    });

    // Tenta adicionar 2 alunos — ficaria com 3 (excede o máximo de 2)
    await expect(adicionarParticipantesGrupo(100, 1, [2, 3]))
      .rejects.toThrow('excederia o número pretendido');
  });

  test('lança erro se houver IDs duplicados na lista de novos', async () => {
    prisma.marcacao.findUnique.mockResolvedValue(marcacaoGrupoFixture);

    // IDs 2 e 2 são duplicados
    await expect(adicionarParticipantesGrupo(100, 1, [2, 2]))
      .rejects.toThrow('Há alunos duplicados na lista de novos participantes.');
  });

  test('lança erro se um novo aluno já estiver associado', async () => {
    prisma.marcacao.findUnique.mockResolvedValue({
      ...marcacaoGrupoFixture,
      aluno_marcacao: [{ id_aluno: 1 }, { id_aluno: 2 }], // aluno 2 já está associado
    });

    await expect(adicionarParticipantesGrupo(100, 1, [2]))
      .rejects.toThrow('já estão associados');
  });

  test('lança erro se um novo aluno não tiver coaching activo', async () => {
    prisma.marcacao.findUnique.mockResolvedValue(marcacaoGrupoFixture);
    prisma.aluno.findUnique.mockResolvedValue({ ...alunoFixture, coaching: false });

    await expect(adicionarParticipantesGrupo(100, 1, [2]))
      .rejects.toThrow('não tem permissão de coaching ativa');
  });

  test('lança erro se um novo aluno já tiver conflito de horário', async () => {
    prisma.marcacao.findUnique.mockResolvedValue(marcacaoGrupoFixture);
    prisma.aluno.findUnique.mockResolvedValue(alunoFixture);
    prisma.aluno_marcacao.findFirst.mockResolvedValue({ id_aluno: 2 }); // conflito!

    await expect(adicionarParticipantesGrupo(100, 1, [2]))
      .rejects.toThrow('já tem um pedido para este horário');
  });
});

// ═════════════════════════════════════════════════════════════
// 4. listarMeusPedidos
// ═════════════════════════════════════════════════════════════
describe('listarMeusPedidos', () => {

  // Fixture de uma associação aluno_marcacao completa (como o Prisma devolveria)
  const associacaoFixture = {
    marcacao: {
      id_marcacoes: 100,
      id_estado: ESTADO_MARCACAO.CONFIRMADA,
      data_a_realizar: new Date('2025-06-10'),
      hora_inicio: new Date('1970-01-01T10:00:00Z'),
      duracao_minutos: 60,
      numero_alunos_pretendidos: 1,
      data_criacao: new Date(),
      docente: {
        utilizador: { nome: 'João', apelido: 'Silva' },
      },
      modalidade: { nome: 'Dança Contemporânea' },
      sala: { nome: 'Sala A' },
      estado_marcacao: { nome: 'Confirmada' },
      participacao_conclusao: [],
    },
  };

  test('devolve lista formatada de marcações do aluno', async () => {
    prisma.aluno_marcacao.findMany.mockResolvedValue([associacaoFixture]);

    const resultado = await listarMeusPedidos(1);

    expect(resultado).toHaveLength(1);
    expect(resultado[0]).toMatchObject({
      id_marcacao: 100,
      docente: 'João Silva',
      modalidade: 'Dança Contemporânea',
      sala: 'Sala A',
      estado: 'Confirmada',
      ja_validou: false,
    });
  });

  test('devolve array vazio se o aluno não tiver marcações', async () => {
    prisma.aluno_marcacao.findMany.mockResolvedValue([]);

    const resultado = await listarMeusPedidos(1);

    expect(resultado).toEqual([]);
  });

  test('usa "Por atribuir" quando sala é nula', async () => {
    const semSala = {
      marcacao: { ...associacaoFixture.marcacao, sala: null },
    };
    prisma.aluno_marcacao.findMany.mockResolvedValue([semSala]);

    const resultado = await listarMeusPedidos(1);

    expect(resultado[0].sala).toBe('Por atribuir');
  });

  test('usa "—" quando modalidade é nula', async () => {
    const semModalidade = {
      marcacao: { ...associacaoFixture.marcacao, modalidade: null },
    };
    prisma.aluno_marcacao.findMany.mockResolvedValue([semModalidade]);

    const resultado = await listarMeusPedidos(1);

    expect(resultado[0].modalidade).toBe('—');
  });

  test('filtra por estado quando id_estado é fornecido', async () => {
    prisma.aluno_marcacao.findMany.mockResolvedValue([]);

    await listarMeusPedidos(1, { id_estado: ESTADO_MARCACAO.CONFIRMADA });

    expect(prisma.aluno_marcacao.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          marcacao: { id_estado: ESTADO_MARCACAO.CONFIRMADA },
        }),
      })
    );
  });

  test('marca ja_validou como true quando aluno já confirmou conclusão', async () => {
    const comValidacao = {
      marcacao: {
        ...associacaoFixture.marcacao,
        participacao_conclusao: [{ confirmou_conclusao: true }],
      },
    };
    prisma.aluno_marcacao.findMany.mockResolvedValue([comValidacao]);

    const resultado = await listarMeusPedidos(1);

    expect(resultado[0].ja_validou).toBe(true);
  });
});

// ═════════════════════════════════════════════════════════════
// 5. cancelarPedidoPendente
// ═════════════════════════════════════════════════════════════
describe('cancelarPedidoPendente', () => {

  test('cancela marcação PENDENTE com sucesso', async () => {
    prisma.aluno_marcacao.findFirst.mockResolvedValue({
      id_aluno: 1,
      id_marcacoes: 100,
      marcacao: { ...marcacaoFixture, id_estado: ESTADO_MARCACAO.PENDENTE },
    });
    prisma.marcacao.update.mockResolvedValue({ ...marcacaoFixture, id_estado: ESTADO_MARCACAO.CANCELADA });
    prisma.marcacao_estado_historico.create.mockResolvedValue({});

    const resultado = await cancelarPedidoPendente(1, 100);

    expect(resultado.id_estado).toBe(ESTADO_MARCACAO.CANCELADA);
    expect(prisma.marcacao.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: { id_estado: ESTADO_MARCACAO.CANCELADA },
      })
    );
  });

  test('cancela marcação EM_VALIDACAO com sucesso', async () => {
    prisma.aluno_marcacao.findFirst.mockResolvedValue({
      id_aluno: 1,
      id_marcacoes: 100,
      marcacao: { ...marcacaoFixture, id_estado: ESTADO_MARCACAO.EM_VALIDACAO },
    });
    prisma.marcacao.update.mockResolvedValue({ ...marcacaoFixture, id_estado: ESTADO_MARCACAO.CANCELADA });
    prisma.marcacao_estado_historico.create.mockResolvedValue({});

    const resultado = await cancelarPedidoPendente(1, 100);

    expect(resultado.id_estado).toBe(ESTADO_MARCACAO.CANCELADA);
  });

  test('lança erro se a marcação não pertencer ao aluno', async () => {
    prisma.aluno_marcacao.findFirst.mockResolvedValue(null);

    await expect(cancelarPedidoPendente(99, 100))
      .rejects.toThrow('Marcação não encontrada ou não pertence ao aluno.');
  });

  test('lança erro se a marcação já estiver CONFIRMADA', async () => {
    prisma.aluno_marcacao.findFirst.mockResolvedValue({
      id_aluno: 1,
      id_marcacoes: 100,
      marcacao: { ...marcacaoFixture, id_estado: ESTADO_MARCACAO.CONFIRMADA },
    });

    await expect(cancelarPedidoPendente(1, 100))
      .rejects.toThrow('Só é possível cancelar pedidos Agendados ou em Validação.');
  });

  test('lança erro se a marcação já estiver CONCLUIDA', async () => {
    prisma.aluno_marcacao.findFirst.mockResolvedValue({
      id_aluno: 1,
      id_marcacoes: 100,
      marcacao: { ...marcacaoFixture, id_estado: ESTADO_MARCACAO.CONCLUIDA },
    });

    await expect(cancelarPedidoPendente(1, 100))
      .rejects.toThrow('Só é possível cancelar pedidos Agendados ou em Validação.');
  });

  test('regista o estado CANCELADA no histórico', async () => {
    prisma.aluno_marcacao.findFirst.mockResolvedValue({
      id_aluno: 1,
      id_marcacoes: 100,
      marcacao: { ...marcacaoFixture, id_estado: ESTADO_MARCACAO.PENDENTE },
    });
    prisma.marcacao.update.mockResolvedValue({});
    prisma.marcacao_estado_historico.create.mockResolvedValue({});

    await cancelarPedidoPendente(1, 100);

    expect(prisma.marcacao_estado_historico.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ id_estado: ESTADO_MARCACAO.CANCELADA }),
      })
    );
  });
});

// ═════════════════════════════════════════════════════════════
// 6. confirmarPresencaGrupo
// ═════════════════════════════════════════════════════════════
describe('confirmarPresencaGrupo', () => {

  // Associação base — convite dentro do prazo (criado há 5 minutos)
  const associacaoGrupoFixture = {
    id_aluno: 2,
    id_marcacoes: 100,
    id_aluno_estado: ESTADO_ALUNO_MARCACAO.PENDENTE,
    marcacao: {
      ...marcacaoFixture,
      data_criacao: new Date(Date.now() - 5 * 60 * 1000), // 5 minutos atrás
    },
  };

  test('confirma presença com sucesso quando dentro do prazo', async () => {
    prisma.aluno_marcacao.findFirst.mockResolvedValue(associacaoGrupoFixture);
    prisma.aluno_marcacao.updateMany.mockResolvedValue({});
    prisma.aluno_marcacao.findMany.mockResolvedValue([
      { id_aluno_estado: ESTADO_ALUNO_MARCACAO.CONFIRMADO },
      { id_aluno_estado: ESTADO_ALUNO_MARCACAO.CONFIRMADO },
    ]);

    const resultado = await confirmarPresencaGrupo(2, 100, true);

    expect(resultado.mensagem).toBe('Presença confirmada com sucesso.');
    expect(resultado.todos_confirmaram).toBe(true);
    expect(resultado.confirmados).toBe(2);
  });

  test('lança erro se o convite não existir para o aluno', async () => {
    prisma.aluno_marcacao.findFirst.mockResolvedValue(null);

    await expect(confirmarPresencaGrupo(99, 100, true))
      .rejects.toThrow('Convite não encontrado para este aluno.');
  });

  test('lança erro se a marcação não estiver PENDENTE', async () => {
    prisma.aluno_marcacao.findFirst.mockResolvedValue({
      ...associacaoGrupoFixture,
      marcacao: { ...marcacaoFixture, id_estado: ESTADO_MARCACAO.CANCELADA },
    });

    await expect(confirmarPresencaGrupo(2, 100, true))
      .rejects.toThrow('Esta marcação já não está disponível para confirmação.');
  });

  test('cancela automaticamente quando o prazo de 1 hora expirou', async () => {
    // Criada há 2 horas — prazo expirado
    prisma.aluno_marcacao.findFirst.mockResolvedValue({
      ...associacaoGrupoFixture,
      marcacao: {
        ...marcacaoFixture,
        data_criacao: new Date(Date.now() - 2 * 60 * 60 * 1000),
      },
    });
    prisma.marcacao.update.mockResolvedValue({});
    prisma.marcacao_estado_historico.create.mockResolvedValue({});

    await expect(confirmarPresencaGrupo(2, 100, true))
      .rejects.toThrow('O prazo de confirmação de 1 hora expirou.');

    // Confirma que a marcação foi cancelada automaticamente
    expect(prisma.marcacao.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: { id_estado: ESTADO_MARCACAO.CANCELADA },
      })
    );
  });

  test('recusa participação e cancela a sessão de grupo', async () => {
    prisma.aluno_marcacao.findFirst.mockResolvedValue(associacaoGrupoFixture);
    prisma.aluno_marcacao.updateMany.mockResolvedValue({});
    prisma.marcacao.update.mockResolvedValue({});
    prisma.marcacao_estado_historico.create.mockResolvedValue({});

    const resultado = await confirmarPresencaGrupo(2, 100, false);

    expect(resultado.mensagem).toBe('Participação recusada. A sessão de grupo foi cancelada.');
    expect(prisma.aluno_marcacao.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ id_aluno_estado: ESTADO_ALUNO_MARCACAO.RECUSADO }),
      })
    );
  });

  test('informa quantos participantes ainda estão pendentes', async () => {
    prisma.aluno_marcacao.findFirst.mockResolvedValue(associacaoGrupoFixture);
    prisma.aluno_marcacao.updateMany.mockResolvedValue({});
    prisma.aluno_marcacao.findMany.mockResolvedValue([
      { id_aluno_estado: ESTADO_ALUNO_MARCACAO.CONFIRMADO }, // aluno 1 confirmou
      { id_aluno_estado: ESTADO_ALUNO_MARCACAO.PENDENTE },   // aluno 3 ainda pendente
    ]);

    const resultado = await confirmarPresencaGrupo(2, 100, true);

    expect(resultado.todos_confirmaram).toBe(false);
    expect(resultado.confirmados).toBe(1);
    expect(resultado.pendentes).toBe(1);
  });
});

// ═════════════════════════════════════════════════════════════
// 7. validarConclusaoSessao
// ═════════════════════════════════════════════════════════════
describe('validarConclusaoSessao', () => {

  // Marcação CONFIRMADA com a aula realizada há 1 hora (dentro das 48h)
  const marcacaoConfirmadaFixture = {
    ...marcacaoFixture,
    id_estado: ESTADO_MARCACAO.CONFIRMADA,
    data_a_realizar: new Date(Date.now() - 1 * 60 * 60 * 1000), // 1 hora atrás
  };

  test('regista validação do aluno com sucesso (docente ainda não validou)', async () => {
    prisma.participacao_conclusao.findFirst
      .mockResolvedValueOnce(null)          // 1.ª chamada: participação do aluno não existe
      .mockResolvedValueOnce(null);         // 2.ª chamada: docente ainda não validou

    prisma.marcacao.findUnique.mockResolvedValue(marcacaoConfirmadaFixture);
    prisma.participacao_conclusao.create.mockResolvedValue({ id_participacao_conclusao: 1, confirmou_conclusao: true });

    const resultado = await validarConclusaoSessao(1, 100);

    expect(resultado.dupla_validacao_completa).toBe(false);
    expect(resultado.mensagem).toContain('Aguarda a confirmação do docente');
  });

  test('conclui a sessão automaticamente quando docente também já validou', async () => {
    prisma.participacao_conclusao.findFirst
      .mockResolvedValueOnce(null)          // participação do aluno ainda não criada
      .mockResolvedValueOnce({             // docente já validou!
        id_participacao_conclusao: 5,
        confirmou_conclusao: true,
      });

    prisma.marcacao.findUnique.mockResolvedValue(marcacaoConfirmadaFixture);
    prisma.participacao_conclusao.create.mockResolvedValue({ confirmou_conclusao: true });
    prisma.marcacao.update.mockResolvedValue({});
    prisma.marcacao_estado_historico.create.mockResolvedValue({});

    const resultado = await validarConclusaoSessao(1, 100);

    expect(resultado.dupla_validacao_completa).toBe(true);
    expect(resultado.estado).toBe('Concluída');
    // A marcação deve ter sido movida para CONCLUIDA
    expect(prisma.marcacao.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: { id_estado: ESTADO_MARCACAO.CONCLUIDA },
      })
    );
  });

  test('actualiza registo existente se o aluno já tinha iniciado a validação', async () => {
    prisma.participacao_conclusao.findFirst
      .mockResolvedValueOnce({ id_participacao_conclusao: 1, confirmou_conclusao: false }) // existe mas false
      .mockResolvedValueOnce(null); // docente não validou

    prisma.participacao_conclusao.update.mockResolvedValue({ confirmou_conclusao: true });

    const resultado = await validarConclusaoSessao(1, 100);

    expect(prisma.participacao_conclusao.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ confirmou_conclusao: true }),
      })
    );
    expect(resultado.dupla_validacao_completa).toBe(false);
  });

  test('lança erro se a marcação não estiver CONFIRMADA', async () => {
    prisma.participacao_conclusao.findFirst.mockResolvedValue(null);
    prisma.marcacao.findUnique.mockResolvedValue({
      ...marcacaoConfirmadaFixture,
      id_estado: ESTADO_MARCACAO.PENDENTE, // estado errado!
    });

    await expect(validarConclusaoSessao(1, 100))
      .rejects.toThrow('Só é possível validar sessões no estado Confirmada.');
  });

  test('lança erro se a marcação não existir', async () => {
    prisma.participacao_conclusao.findFirst.mockResolvedValue(null);
    prisma.marcacao.findUnique.mockResolvedValue(null);

    await expect(validarConclusaoSessao(1, 100))
      .rejects.toThrow('Marcação não encontrada.');
  });

  test('lança erro se o prazo de 48 horas já tiver expirado', async () => {
    prisma.participacao_conclusao.findFirst.mockResolvedValue(null);
    prisma.marcacao.findUnique.mockResolvedValue({
      ...marcacaoConfirmadaFixture,
      // Aula realizada há 3 dias — prazo de 48h expirado
      data_a_realizar: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
    });

    await expect(validarConclusaoSessao(1, 100))
      .rejects.toThrow('O prazo de 48 horas para validação da sessão já expirou.');
  });
});

// ═════════════════════════════════════════════════════════════
// 8. listarColegas
// ═════════════════════════════════════════════════════════════
describe('listarColegas', () => {

  test('devolve lista de colegas excluindo o aluno actual', async () => {
    prisma.utilizador.findMany.mockResolvedValue([
      { id_utilizador: 2, nome: 'Ana', apelido: 'Costa' },
      { id_utilizador: 3, nome: 'Rui', apelido: 'Santos' },
    ]);

    const resultado = await listarColegas(1);

    expect(resultado).toHaveLength(2);
    expect(resultado[0].nome).toBe('Ana');
    // Confirma que a query excluiu o id_utilizador do aluno actual
    expect(prisma.utilizador.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          id_utilizador: { not: 1 },
        }),
      })
    );
  });

  test('devolve array vazio se não houver outros alunos', async () => {
    prisma.utilizador.findMany.mockResolvedValue([]);

    const resultado = await listarColegas(1);

    expect(resultado).toEqual([]);
  });

  test('filtra apenas utilizadores do tipo Aluno (id_tipo: 3)', async () => {
    prisma.utilizador.findMany.mockResolvedValue([]);

    await listarColegas(1);

    expect(prisma.utilizador.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ id_tipo: 3 }),
      })
    );
  });
});

// ═════════════════════════════════════════════════════════════
// 9. Constantes exportadas
// ═════════════════════════════════════════════════════════════
describe('Constantes de domínio exportadas', () => {

  test('ESTADO_MARCACAO tem os IDs correctos', () => {
    expect(ESTADO_MARCACAO.PENDENTE).toBe(1);
    expect(ESTADO_MARCACAO.EM_VALIDACAO).toBe(2);
    expect(ESTADO_MARCACAO.CONFIRMADA).toBe(3);
    expect(ESTADO_MARCACAO.CONCLUIDA).toBe(4);
    expect(ESTADO_MARCACAO.CANCELADA).toBe(5);
  });

  test('ESTADO_ALUNO_MARCACAO tem os IDs correctos', () => {
    expect(ESTADO_ALUNO_MARCACAO.PENDENTE).toBe(1);
    expect(ESTADO_ALUNO_MARCACAO.CONFIRMADO).toBe(2);
    expect(ESTADO_ALUNO_MARCACAO.CONCLUIDO).toBe(3);
    expect(ESTADO_ALUNO_MARCACAO.RECUSADO).toBe(4);
  });
});