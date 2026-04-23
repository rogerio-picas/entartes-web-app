import { api } from './api'; 

const coachingService = {

  ESTADOS: {
    PENDENTE:     1,
    EM_VALIDACAO: 2,
    CONFIRMADA:   3,
    CONCLUIDA:    4,
    CANCELADA:    5,
    },

  // ==========================================
  // ROTAS DO ALUNO
  // ==========================================
  
  consultarDisponibilidades: async (filtros = {}) => {
    // filtros pode conter { id_modalidade, data }
    const response = await api.get('/coaching/disponibilidades/consultar', { params: filtros });
    return response;
  },

  solicitarMarcacao: async (dados) => {
    // dados: { id_docente, id_modalidade, data_a_realizar, hora_inicio, duracao_minutos, ... }
    const response = await api.post('/coaching/marcacao/solicitar', dados);
    return response;
  },

  listarMeusPedidos: async (id_estado = null) => {
    const response = await api.get('/coaching/meus-pedidos', { params: { id_estado } });
    return response;
  },

  cancelarPedidoPendente: async (id_marcacao) => {
    const response = await api.delete(`/coaching/pedido/${id_marcacao}/cancelar`);
    return response;
  },

  validarConclusaoSessaoAluno: async (id_marcacao) => {
    const response = await api.post(`/coaching/aluno/conclusao-sessao/${id_marcacao}`);
    return response;
  },

  // ==========================================
  // ROTAS DA COORDENADORA
  // ==========================================

  listarPedidosPendentes: async (filtros = {}) => {
    const response = await api.get('/coaching/pedidos-pendentes', { params: filtros });
    return response;
  },

  confirmarMarcacao: async (id_marcacao, id_sala) => {
    const response = await api.post('/coaching/confirmar-marcacao', { id_marcacao, id_sala });
    return response;
  },

  rejeitarMarcacao: async (id_marcacao, motivo) => {
    const response = await api.post('/coaching/rejeitar-marcacao', { id_marcacao, motivo });
    return response;
  },

  cancelarMarcacaoConfirmada: async (id_marcacao, motivo) => {
    const response = await api.post('/coaching/cancelar-marcacao', { id_marcacao, motivo });
    return response;
  },

  // ==========================================
  // ROTAS DO DOCENTE
  // ==========================================

  listarMinhasAulas: async (id_estado = null) => {
    const response = await api.get('/coaching/minhas-aulas', { params: { id_estado } });
    return response;
  },

  validarConclusaoSessaoDocente: async (id_marcacao) => {
    const response = await api.post(`/coaching/docente/conclusao-sessao/${id_marcacao}`);
    return response;
  },

  cancelarMarcacaoDocente: async (id_marcacao, motivo) => {
    const response = await api.post(`/coaching/cancelar-marcacao/${id_marcacao}`, { motivo });
    return response;
  }

}

export default coachingService;
