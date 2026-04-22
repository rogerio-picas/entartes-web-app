import { api } from './api'

// ── Helpers de Formatação ────────────────────────────────────────────────────────

function formatDate(raw) {
    if (!raw) return '—'
    const d = new Date(raw)
    return d.toLocaleDateString('pt-PT', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
    })
}

function formatTime(raw) {
    if (!raw) return '—'
    const d = new Date(raw)
    // Caso seja formato HH:mm:ss vindo cru
    if (raw.toString().includes('T') === false && raw.toString().includes(':')) {
        const parts = raw.split(':')
        return `${parts[0]}:${parts[1]}`
    }
    return d.toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit' })
}

function formatDuration(minutos) {
    if (!minutos) return '—'
    if (minutos < 60) return `${minutos} min`
    const h = Math.floor(minutos / 60)
    const m = minutos % 60
    return m > 0 ? `${h}h ${m}min` : `${h}h`
}

/**
 * Normaliza os variados formatos vindos dos diferentes Endpoints de Coaching
 * para o formato unificado aceite pelas Views e ClassCards/ConfirmedCards.
 */
function mapCoachingParaCartoes(m) {
    // Alunos vêm como [{ nome: '...' }] dependendo se pedimos do docente ou coordenadora
    const nomesAlunos = Array.isArray(m.alunos) 
        ? m.alunos.map(a => a.nome ?? 'Aluno Desconhecido') 
        : []

    return {
        id:           m.id_marcacao,
        data:         formatDate(m.data),
        hora:         formatTime(m.hora_inicio),
        duracao:      formatDuration(m.duracao_minutos),
        duracao_min:  m.duracao_minutos ?? 0,
        docente:      m.docente ?? 'Docente logado',
        modalidade:   m.modalidade ?? '—',
        // Na coordenação chama-se sala_atual
        sala:         m.sala_atual ?? m.sala ?? '—',
        id_estado:    m.id_estado ?? null,
        estado_nome:  m.estado ?? 'Desconhecido',
        alunos:       nomesAlunos,
        _data_raw:    m.data,
    }
}

// ── API calls para as Roles ───────────────────────────────────────────────────────

export const coachingService = {
    // 1 = AGENDADA (PENDENTE)
    // 2 = EM_VALIDACAO
    // 3 = CONFIRMADA
    // 4 = CONCLUIDA
    // 5 = CANCELADA
    ESTADOS: {
        PENDENTE:    1,
        EM_VALIDACAO: 2,
        CONFIRMADA:  3,
        CONCLUIDA:   4,
        CANCELADA:   5,
    },

    // ── ADMIN (COORDENAÇÃO) ──
    async getAdminPedidos(estados = null) {
        const query = estados ? `?estados=${estados}` : ''
        const data = await api.get(`/coaching/pedidos-pendentes${query}`)
        return Array.isArray(data) ? data.map(mapCoachingParaCartoes) : []
    },

    // ── DOCENTE ──
    async getDocenteAulas(id_estado = null) {
        const query = id_estado ? `?id_estado=${id_estado}` : ''
        const data = await api.get(`/coaching/minhas-aulas${query}`)
        return Array.isArray(data) ? data.map(mapCoachingParaCartoes) : []
    },

    // ── ALUNO ──
    async getAlunoPedidos(id_estado = null) {
        const query = id_estado ? `?id_estado=${id_estado}` : ''
        const data = await api.get(`/coaching/meus-pedidos${query}`)
        return Array.isArray(data) ? data.map(mapCoachingParaCartoes) : []
    }
}
