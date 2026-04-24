export const disponibilidadeService = {
    async criar(dados) {
        const token = localStorage.getItem('token')
        const res = await fetch('/api/disponibilidades', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                ...(token ? { Authorization: `Bearer ${token}` } : {}),
            },
            body: JSON.stringify(dados),
        })
        const data = await res.json().catch(() => ({}))
        if (!res.ok) throw new Error(data.message || `Erro ${res.status}`)
        return data
    },

    async listar() {
        const token = localStorage.getItem('token')
        const res = await fetch('/api/disponibilidades', {
            headers: token ? { Authorization: `Bearer ${token}` } : {},
        })
        const data = await res.json().catch(() => ({}))
        if (!res.ok) throw new Error(data.message || `Erro ${res.status}`)
        return data
    },

    async eliminar(id) {
        const token = localStorage.getItem('token')
        const res = await fetch(`/api/disponibilidades/${id}`, {
            method: 'DELETE',
            headers: token ? { Authorization: `Bearer ${token}` } : {},
        })
        if (!res.ok) {
            const data = await res.json().catch(() => ({}))
            throw new Error(data.message || `Erro ${res.status}`)
        }
        return true
    },

    async editar(id, dados) {
        const token = localStorage.getItem('token')
        const res = await fetch(`/api/disponibilidades/${id}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                ...(token ? { Authorization: `Bearer ${token}` } : {}),
            },
            body: JSON.stringify(dados),
        })
        const data = await res.json().catch(() => ({}))
        if (!res.ok) throw new Error(data.message || `Erro ${res.status}`)
        return data
    }
}
