const express = require('express');
const router = express.Router();
const coachingController = require('../controllers/coachingController');
const coachingAlunoController = require('../controllers/coachingAlunoController');
const coachingCoordenacaoController = require('../controllers/coachingCoordenacaoController');
const coachingDocenteController = require('../controllers/coachingDocenteController');
const tokenValidation = require('../middlewares/authMiddleware');
const authorize = require('../middlewares/roleCheckMiddleware');

/**
 * @swagger
 * /api/coaching:
 *   post:
 *     summary: Cria um novo agendamento de coaching
 *     tags: [Coaching]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               id_modalidade:
 *                 type: integer
 *               id_sala:
 *                 type: integer
 *               data_a_realizar:
 *                 type: string
 *               hora_inicio:
 *                 type: string
 *               duracao_minutos:
 *                 type: integer
 *     responses:
 *       201:
 *         description: Criado com sucesso
 *   get:
 *     summary: Lista todos os agendamentos
 *     tags: [Coaching]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Sucesso
 *
 * /api/coaching/{id_utilizador}:
 *   get:
 *     summary: Retorna agendamentos de coaching de um utilizador
 *     tags: [Coaching]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id_utilizador
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Sucesso
 *   put:
 *     summary: Atualiza um agendamento de coaching
 *     tags: [Coaching]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id_utilizador
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Sucesso
 *   delete:
 *     summary: Elimina um agendamento de coaching
 *     tags: [Coaching]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id_utilizador
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Sucesso
 *
 * /api/coaching/disponibilidades/consultar:
 *   get:
 *     summary: Consulta disponibilidades de coaching filtrando por modalidade e data
 *     tags: [Coaching - Aluno]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: id_modalidade
 *         schema:
 *           type: integer
 *       - in: query
 *         name: data
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Lista de disponibilidades
 *
 * /api/coaching/marcacao/solicitar:
 *   post:
 *     summary: Solicita uma marcação de coaching (aluno)
 *     tags: [Coaching - Aluno]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               id_docente:
 *                 type: integer
 *               id_modalidade:
 *                 type: integer
 *               data_a_realizar:
 *                 type: string
 *               hora_inicio:
 *                 type: string
 *               duracao_minutos:
 *                 type: integer
 *               numero_alunos_pretendidos:
 *                 type: integer
 *     responses:
 *       201:
 *         description: Pedido de marcação enviado com sucesso
 *
 * /api/coaching/meus-pedidos:
 *   get:
 *     summary: Lista os pedidos de coaching do aluno autenticado
 *     tags: [Coaching - Aluno]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: id_estado
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Lista de pedidos
 *
 * /api/coaching/pedido/{id_marcacao}/cancelar:
 *   delete:
 *     summary: Cancela um pedido de marcação pendente
 *     tags: [Coaching - Aluno]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id_marcacao
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Pedido cancelado com sucesso
 *
 * /api/coaching/presenca-grupo:
 *   post:
 *     summary: Confirma presença em uma sessão de grupo
 *     tags: [Coaching - Aluno]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               id_marcacao:
 *                 type: integer
 *               aceitar:
 *                 type: boolean
 *     responses:
 *       200:
 *         description: Presença confirmada
 *
 * /api/coaching/conclusao-sessao/{id_marcacao}:
 *   post:
 *     summary: Valida a conclusão de uma sessão de coaching
 *     tags: [Coaching - Aluno]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id_marcacao
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Sessão validada
 *
 * /api/coaching/pedidos-pendentes:
 *   get:
 *     summary: Lista pedidos de coaching pendentes (coordenadora)
 *     tags: [Coaching - Coordenadora]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: estados
 *         schema:
 *           type: string
 *       - in: query
 *         name: data_inicio
 *         schema:
 *           type: string
 *       - in: query
 *         name: data_fim
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Lista de pedidos pendentes
 *
 * /api/coaching/confirmar-marcacao:
 *   post:
 *     summary: Confirma uma marcação e atribui sala (coordenadora)
 *     tags: [Coaching - Coordenadora]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               id_marcacao:
 *                 type: integer
 *               id_sala:
 *                 type: integer
 *     responses:
 *       200:
 *         description: Marcação confirmada com sucesso
 *
 * /api/coaching/rejeitar-marcacao:
 *   post:
 *     summary: Rejeita uma marcação de coaching
 *     tags: [Coaching - Coordenadora]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               id_marcacao:
 *                 type: integer
 *               motivo:
 *                 type: string
 *     responses:
 *       200:
 *         description: Marcação rejeitada com sucesso
 *
 * /api/coaching/cancelar-marcacao:
 *   post:
 *     summary: Cancela uma marcação confirmada
 *     tags: [Coaching - Coordenadora]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               id_marcacao:
 *                 type: integer
 *               motivo:
 *                 type: string
 *     responses:
 *       200:
 *         description: Marcação cancelada com sucesso
 *
 * /api/coaching/reatribuir-sala:
 *   post:
 *     summary: Reatribui sala a uma marcação
 *     tags: [Coaching - Coordenadora]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               id_marcacao:
 *                 type: integer
 *               nova_id_sala:
 *                 type: integer
 *     responses:
 *       200:
 *         description: Sala reatribuída com sucesso
 *
 * /api/coaching/salas-disponiveis:
 *   get:
 *     summary: Consulta salas disponíveis para uma data e hora
 *     tags: [Coaching - Coordenadora]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: data_a_realizar
 *         required: true
 *         schema:
 *           type: string
 *       - in: query
 *         name: hora_inicio
 *         required: true
 *         schema:
 *           type: string
 *       - in: query
 *         name: duracao_minutos
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Lista de salas disponíveis
 *
 * /api/coaching/historico-marcacao/{id_marcacao}:
 *   get:
 *     summary: Consulta histórico de uma marcação
 *     tags: [Coaching - Coordenadora]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id_marcacao
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Histórico da marcação
 *
 * /api/coaching/docente/minhas-aulas:
 *   get:
 *     summary: Lista as aulas do docente autenticado
 *     tags: [Coaching - Docente]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: id_estado
 *         schema:
 *           type: integer
 *         description: Filtrar por estado da marcação
 *     responses:
 *       200:
 *         description: Lista de aulas do docente
 *       500:
 *         description: Erro interno no servidor
 *
 * /api/coaching/docente/conclusao-sessao/{id_marcacao}:
 *   post:
 *     summary: Valida a conclusão de uma sessão pelo docente
 *     tags: [Coaching - Docente]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id_marcacao
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Validação registada com sucesso
 *       400:
 *         description: A sessão não está no estado 'Confirmada'
 *       404:
 *         description: Marcação não encontrada ou não pertence ao docente
 *
 * /api/coaching/docente/cancelar-marcacao/{id_marcacao}:
 *   post:
 *     summary: Docente cancela uma sessão de coaching atribuída
 *     tags: [Coaching - Docente]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id_marcacao
 *         required: true
 *         schema:
 *           type: integer
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               motivo:
 *                 type: string
 *     responses:
 *       200:
 *         description: Sessão cancelada com sucesso
 */

// ========== ROTAS GENÉRICAS (coordenador) ==========
// router.post('/', tokenValidation, authorize([1]), coachingController.createNewCoaching);
// router.get('/', tokenValidation, authorize([1]), coachingController.getAllCoachings);
// router.get('/:id_utilizador', tokenValidation, authorize([1,2,3]), coachingController.getCoachingById);
// router.put('/:id_utilizador', tokenValidation, authorize([1]), coachingController.updateCoaching);
// router.delete('/:id_utilizador', tokenValidation, authorize([1]), coachingController.deleteCoaching);

// ========== ROTAS DO ALUNO ==========
router.get('/disponibilidades/consultar', tokenValidation, authorize([3]), coachingAlunoController.consultarDisponibilidades);
router.post('/marcacao/solicitar', tokenValidation, authorize([3]), coachingAlunoController.solicitarMarcacao);
router.get('/meus-pedidos', tokenValidation, authorize([3]), coachingAlunoController.listarMeusPedidos);
router.delete('/pedido/:id_marcacao/cancelar', tokenValidation, authorize([3]), coachingAlunoController.cancelarPedidoPendente);
router.post('/presenca-grupo', tokenValidation, authorize([3]), coachingAlunoController.confirmarPresencaGrupo);
router.post('/aluno/conclusao-sessao/:id_marcacao', tokenValidation, authorize([3]), coachingAlunoController.validarConclusaoSessao);

// ========== ROTAS DA COORDENADORA ==========
router.get('/pedidos-pendentes', tokenValidation, authorize([1]), coachingCoordenacaoController.listarPedidosPendentes);
router.post('/confirmar-marcacao', tokenValidation, authorize([1]), coachingCoordenacaoController.confirmarMarcacao);
router.post('/rejeitar-marcacao', tokenValidation, authorize([1]), coachingCoordenacaoController.rejeitarMarcacao);
router.post('/cancelar-marcacao', tokenValidation, authorize([1]), coachingCoordenacaoController.cancelarMarcacaoConfirmada);
router.post('/reatribuir-sala', tokenValidation, authorize([1]), coachingCoordenacaoController.reatribuirSala);
router.get('/salas-disponiveis', tokenValidation, authorize([1]), coachingCoordenacaoController.consultarSalasDisponiveis);
router.get('/historico-marcacao/:id_marcacao', tokenValidation, authorize([1]), coachingCoordenacaoController.consultarHistoricoMarcacao);

// ============ ROTAS DO DOCENTE ================
router.get('/minhas-aulas', tokenValidation, authorize([2]), coachingDocenteController.listarMinhasAulas);
router.post('/docente/conclusao-sessao/:id_marcacao', tokenValidation, authorize([2]), coachingDocenteController.validarConclusaoSessao);
router.post('/cancelar-marcacao/:id_marcacao', tokenValidation, authorize([2]), coachingDocenteController.cancelarMarcacao);

module.exports = router;