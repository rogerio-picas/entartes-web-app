import { api } from './api'

export const utilizadorService = {
    async listar(id_tipo) {
        const query = id_tipo != null ? `?id_tipo=${id_tipo}` : ''
        return api.get(`/users${query}`)
    },

    async criar(dados) {
        return api.post('/users', dados)
    },

    async atualizar(id_utilizador, dados) {
        return api.put(`/users/${id_utilizador}`, dados)
    },

    async eliminar(id_utilizador) {
        return api.delete(`/users/${id_utilizador}`)
    },
}
