import { api } from './api'

/**
 * Serviço para o módulo de Aulas / Marcações.
 *
 * Mapeia os dados vindos da API (modelo `marcacao` do Prisma) para
 * um formato plano e fácil de usar nos componentes React.
 *
 * Campos do modelo `marcacao` usados:
 *   id_marcacoes, data_a_realizar, hora_inicio, duracao_minutos,
 *   estado_marcacao { id_estado, nome },
 *   modalidade { nome },
 *   sala { nome },
 *   docente { utilizador { nome, apelido } },
 *   aluno_marcacao[{ aluno { utilizador { nome, apelido } } }]
 */

// ── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Formata uma data ISO ou Date para "dd/mm/yyyy"
 */
function formatDate(raw) {
    if (!raw) return '—'
    const d = new Date(raw)
    return d.toLocaleDateString('pt-PT', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
    })
}

/**
 * Formata um campo TIME do Postgres (guardado como Date com base 1970)
 * para "HH:mm"
 */
function formatTime(raw) {
    if (!raw) return '—'
    // Se vier como string HH:mm:ss simples (sem data), extrai directamente
    if (typeof raw === 'string' && !raw.includes('T') && raw.includes(':')) {
        const parts = raw.split(':')
        return `${parts[0].padStart(2, '0')}:${parts[1].padStart(2, '0')}`
    }
    // hora_inicio é guardado como DateTime base 1970-01-01THH:mm:ssZ (UTC).
    // Usar timeZone:'UTC' para não adicionar o offset de Portugal (+1h no Verão).
    const d = new Date(raw)
    return d.toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit', timeZone: 'UTC' })
}

/**
 * Converte minutos para string legível: "90 mins" → "1h 30min"
 */
function formatDuration(minutos) {
    if (!minutos) return '—'
    if (minutos < 60) return `${minutos} min`
    const h = Math.floor(minutos / 60)
    const m = minutos % 60
    return m > 0 ? `${h}h ${m}min` : `${h}h`
}

/**
 * Transforma uma marcação da API no formato que o componente precisa.
 */
export function mapMarcacao(m) {
    const docNome = m.docente?.utilizador
        ? `${m.docente.utilizador.nome ?? ''} ${m.docente.utilizador.apelido ?? ''}`.trim()
        : 'Sem docente'

    const alunos = (m.aluno_marcacao ?? []).map(am => {
        const u = am.aluno?.utilizador
        return u ? `${u.nome ?? ''} ${u.apelido ?? ''}`.trim() : 'Aluno desconhecido'
    })

    return {
        id:           m.id_marcacoes,
        data:         formatDate(m.data_a_realizar),
        hora:         formatTime(m.hora_inicio),
        duracao:      formatDuration(m.duracao_minutos),
        duracao_min:  m.duracao_minutos ?? 0,
        docente:      docNome,
        modalidade:   m.modalidade?.nome ?? '—',
        sala:         m.sala?.nome ?? '—',
        id_estado:    m.estado_marcacao?.id_estado ?? null,
        estado_nome:  m.estado_marcacao?.nome ?? 'Desconhecido',
        alunos,
        // data crua para ordenações
        _data_raw:    m.data_a_realizar,
    }
}

// ── API calls ─────────────────────────────────────────────────────────────────

export const aulasService = {
    /**
     * Marcações das próximas 48h (para o painel de confirmação)
     */
    async getParaConfirmar() {
        const data = await api.get('/aulas')
        return Array.isArray(data) ? data.map(mapMarcacao) : []
    },

    /**
     * Todas as marcações (histórico completo)
     */
    async getTodas() {
        const data = await api.get('/aulas/todas')
        return Array.isArray(data) ? data.map(mapMarcacao) : []
    },

    /**
     * Atualiza o estado de uma marcação.
     * @param {number} id       id_marcacoes
     * @param {number} idEstado 1=Pendente | 2=Confirmada | 3=Cancelada | 4=Concluída
     */
    async updateEstado(id, idEstado) {
        return api.patch !== undefined
            ? api.patch(`/aulas/${id}/estado`, { id_estado: idEstado })
            : fetch(`/api/aulas/${id}/estado`, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${localStorage.getItem('token')}`
                },
                body: JSON.stringify({ id_estado: idEstado })
            }).then(r => r.json())
    },

    /** IDs de estado normalizados (devem corresponder à tabela estado_marcacao) */
    ESTADOS: {
        PENDENTE:    1,
        CONFIRMADA:  2,
        CANCELADA:   3,
        CONCLUIDA:   4,
    }
}