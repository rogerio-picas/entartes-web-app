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
}
