import { api } from './api'
import { formatDate } from '../utils/dateUtils'

function mapNotificacao(n) {
    return {
        id: n.id_notificacao,
        titulo: n.titulo ?? 'Sem título',
        mensagem: n.mensagem ?? '',
        data: formatDate(n.data_envio),
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