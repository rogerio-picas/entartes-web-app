import { api } from './api'
import { formatDate, formatTime } from '../utils/dateUtils'

export { formatDate, formatTime }

export function formatDuration(minutos) {
    if (!minutos) return '—'
    if (minutos < 60) return `${minutos} min`
    const h = Math.floor(minutos / 60)
    const m = minutos % 60
    return m > 0 ? `${h}h ${m}min` : `${h}h`
}

function mapMarcacao(m) {
    const docenteNome = m.docente?.utilizador
        ? `${m.docente.utilizador.nome ?? ''} ${m.docente.utilizador.apelido ?? ''}`.trim()
        : '—'

    const alunos = (m.aluno_marcacao ?? []).map(am => {
        const u = am.aluno?.utilizador
        return u ? `${u.nome ?? ''} ${u.apelido ?? ''}`.trim() : 'Aluno desconhecido'
    })

    return {
        id: m.id_marcacoes,
        data: formatDate(m.data_a_realizar),
        data_raw: m.data_a_realizar,
        hora: formatTime(m.hora_inicio),
        duracao: formatDuration(m.duracao_minutos),
        duracao_min: m.duracao_minutos ?? 0,
        docente: docenteNome,
        modalidade: m.modalidade?.nome ?? '—',
        sala: m.sala?.nome ?? '—',
        id_estado: m.estado_marcacao?.id_estado ?? null,
        estado_nome: m.estado_marcacao?.nome ?? 'Desconhecido',
        alunos,
        vagas_disponiveis: m.vagas_disponiveis ?? null,
        ja_inscrito: m.ja_inscrito ?? false,
        numero_alunos_pretendidos: m.numero_alunos_pretendidos ?? null,
    }
}

// ── API calls ─────────────────────────────────────────────────────────────────

export const horarioService = {
    /**
     * Aulas do utilizador autenticado
     */
    async getMinhasAulas() {
        const data = await api.get('/horario/minhas-aulas')
        return Array.isArray(data) ? data.map(mapMarcacao) : []
    },

    /**
     * Aulas disponíveis para inscrição
     */
    async getAulasDisponiveis() {
        const data = await api.get('/horario/disponiveis')
        return Array.isArray(data) ? data.map(mapMarcacao) : []
    },

    /**
     * Detalhes de uma aula
     */
    async getAulaDetalhe(id) {
        const data = await api.get(`/horario/minhas-aulas/${id}`)
        return mapMarcacao(data)
    },

    /**
     * Inscrever aluno numa aula
     */
    async inscrever(id_marcacoes) {
        return fetch(`/api/horario/inscrever`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${localStorage.getItem('token')}`
            },
            body: JSON.stringify({ id_marcacoes })
        }).then(async r => {
            const data = await r.json()
            if (!r.ok) throw new Error(data.message || `Erro ${r.status}`)
            return data
        })
    },

    ESTADOS: {
        PENDENTE: 1,
        CONFIRMADA: 2,
        CANCELADA: 3,
        CONCLUIDA: 4,
    }
}