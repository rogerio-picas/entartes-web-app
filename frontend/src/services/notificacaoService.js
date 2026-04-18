import { api } from './api'

function mapNotificacao(n) {
    return {
        id: n.id_notificacao,
        titulo: n.titulo ?? 'Sem título',
        mensagem: n.mensagem ?? '',
        data: n.data_envio ? new Date(n.data_envio).toLocaleDateString('pt-PT', {
            day: '2-digit', month: '2-digit', year: 'numeric',
            hour: '2-digit', minute: '2-digit'
        }) : '—',
        lida: n.lida ?? false,
    }
}

export const notificacaoService = {
    async getAll() {
        const data = await api.get('/notificacoes')
        return Array.isArray(data) ? data.map(mapNotificacao) : []
    },

    async markAsRead(id) {
        return fetch(`/api/notificacoes/${id}/lida`, {
            method: 'PATCH',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${localStorage.getItem('token')}`
            }
        }).then(r => r.json())
    }
}