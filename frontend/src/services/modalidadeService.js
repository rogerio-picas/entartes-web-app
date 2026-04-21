import { api } from './api'

export const modalidadeService = {
    async listar(id_docente, comDocentes = false) {
        const params = new URLSearchParams()
        if (id_docente) params.set('id_docente', id_docente)
        if (comDocentes) params.set('docentes', 'true')
        const query = params.toString() ? `?${params}` : ''
        return api.get(`/modalidades${query}`)
    },

    async criar(nome) {
        return api.post('/modalidades', { nome })
    },

    async atualizar(id, nome) {
        return api.put(`/modalidades/${id}`, { nome })
    },

    async eliminar(id) {
        return api.delete(`/modalidades/${id}`)
    },

    async listarDocentes() {
        const users = await api.get('/users?id_tipo=2')
        return users.map(u => ({ id_docente: u.id_utilizador, nome: u.nome, apelido: u.apelido }))
    },

    async associarDocente(id_modalidade, id_docente) {
        return api.post(`/modalidades/${id_modalidade}/docentes`, { id_docente })
    },

    async desassociarDocente(id_modalidade, id_docente) {
        return api.delete(`/modalidades/${id_modalidade}/docentes/${id_docente}`)
    },
}
