import { useState, useEffect } from 'react'
import { X, Search, UserPlus, RefreshCw, AlertCircle, CheckCircle2, Check } from 'lucide-react'
import { api } from '../services/api'

function getInitials(nome) {
    if (!nome) return '?'
    const parts = nome.trim().split(' ')
    return parts.length > 1
        ? (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
        : nome.slice(0, 2).toUpperCase()
}

export default function AddEventMemberPanel({ eventId, onClose, onSuccess }) {
    const [search, setSearch] = useState('')
    const [allUsers, setAllUsers] = useState([])
    const [selected, setSelected] = useState([])
    const [loadingUsers, setLoadingUsers] = useState(true)
    const [loading, setLoading] = useState(false)
    const [erro, setErro] = useState('')
    const [sucesso, setSucesso] = useState('')

    // Fetch all users on mount
    useEffect(() => {
        setLoadingUsers(true)
        api.get('/users')
            .then(data => {
                if (Array.isArray(data)) {
                    setAllUsers(data)
                }
            })
            .catch(() => {})
            .finally(() => setLoadingUsers(false))
    }, [])

    const filtered = allUsers.filter(u => {
        const q = search.toLowerCase()
        const name = `${u.nome ?? ''} ${u.apelido ?? ''}`.toLowerCase()
        const code = (u.codigo_username ?? '').toLowerCase()
        return name.includes(q) || code.includes(q)
    })

    function toggle(u) {
        setSelected(prev =>
            prev.some(s => s.id_utilizador === u.id_utilizador)
                ? prev.filter(s => s.id_utilizador !== u.id_utilizador)
                : [...prev, u]
        )
    }

    async function handleAdd() {
        if (selected.length === 0) { setErro('Seleciona pelo menos um utilizador.'); return }
        setLoading(true)
        setErro('')
        setSucesso('')

        const errors = []
        let successCount = 0
        for (const u of selected) {
            try {
                await api.post(`/evento/${eventId}/participantes`, {
                    codigo_username: u.codigo_username
                })
                successCount++
            } catch (e) {
                const msg = e.response?.data?.error || e.message || 'Erro desconhecido'
                errors.push(`${u.nome} ${u.apelido || ''} (${u.codigo_username}): ${msg}`)
            }
        }

        setLoading(false)
        if (errors.length > 0 && successCount === 0) {
            setErro(errors.join('\n'))
        } else if (errors.length > 0) {
            setErro(`${successCount} adicionado(s). Erros:\n` + errors.join('\n'))
            setSelected([])
            setSearch('')
            onSuccess()
        } else {
            setSucesso(`${successCount} membro(s) adicionado(s) com sucesso!`)
            setSelected([])
            setSearch('')
            onSuccess()
        }
    }

    return (
        <div className="fixed top-0 right-0 h-full z-[60] w-[483px] max-w-[95vw] bg-[#F4FBF9] shadow-2xl flex flex-col border-l border-[#006A68]/20">
            {/* Header */}
            <div className="px-9 pt-10 pb-4 border-b border-[#006A68] shrink-0">
                <div className="flex items-center justify-between mb-1">
                    <h2 className="text-2xl font-bold text-[#006A68] font-['Sora']">Adicionar Membro</h2>
                    <button onClick={onClose} className="w-8 h-8 rounded-full hover:bg-[#CCE8E6] flex items-center justify-center text-[#4A6362]">
                        <X size={17} />
                    </button>
                </div>
                <p className="text-sm text-[#4A6362] mt-1 font-['Sora']">Pesquisa e seleciona os utilizadores a inscrever neste evento.</p>
            </div>

            <div className="flex-1 overflow-y-auto px-9 py-5 space-y-4 font-['Sora']">
                {erro && (
                    <div className="flex items-start gap-2 bg-red-50 text-red-700 text-sm px-3 py-2.5 rounded-xl border border-red-200">
                        <AlertCircle size={14} className="shrink-0 mt-0.5" /> {erro}
                    </div>
                )}
                {sucesso && (
                    <div className="flex items-center gap-2 bg-green-50 text-green-700 text-sm px-3 py-2.5 rounded-xl border border-green-200">
                        <CheckCircle2 size={14} /> {sucesso}
                    </div>
                )}

                {/* Search box */}
                <div className="flex items-center gap-2 bg-[#E3E9E8] rounded-full px-4 py-2.5">
                    <Search size={16} className="text-[#49454F] shrink-0" />
                    <input
                        value={search}
                        onChange={e => { setSearch(e.target.value); setErro(''); setSucesso('') }}
                        placeholder="Pesquise por nome ou código..."
                        className="flex-1 bg-transparent text-sm text-[#49454F] focus:outline-none"
                        autoFocus
                    />
                </div>

                {/* Selected chips */}
                {selected.length > 0 && (
                    <div>
                        <p className="text-xs font-semibold text-[#4A6362] mb-2 uppercase tracking-wider">Selecionados ({selected.length})</p>
                        <div className="grid grid-cols-2 gap-2">
                            {selected.map(u => (
                                <div key={u.id_utilizador} className="flex items-center gap-2 bg-[#CCE8E6] rounded-xl px-3 py-2 border border-[#006A68]/20">
                                    <div className="w-8 h-8 rounded-full bg-[#006A68] flex items-center justify-center text-white text-xs font-bold shrink-0">
                                        {getInitials(`${u.nome ?? ''} ${u.apelido ?? ''}`)}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-xs font-semibold text-[#161D1C] truncate">{u.nome} {u.apelido}</p>
                                        <p className="text-[10px] text-[#4A6362] truncate">{u.tipo_utilizador?.id_tipo === 2 ? 'Docente' : 'Aluno'}</p>
                                    </div>
                                    <button onClick={() => toggle(u)} className="w-5 h-5 rounded-full bg-white/60 flex items-center justify-center shrink-0 hover:bg-red-100">
                                        <X size={11} className="text-[#4A6362]" />
                                    </button>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Results list */}
                {loadingUsers ? (
                    <p className="text-sm text-center text-[#4A6362] py-4">A carregar utilizadores...</p>
                ) : search.length > 0 && filtered.length === 0 ? (
                    <p className="text-sm text-center text-[#4A6362] italic py-4">Nenhum utilizador encontrado.</p>
                ) : search.length > 0 ? (
                    <div className="space-y-1.5">
                        {filtered.slice(0, 10).map(u => {
                            const isSel = selected.some(s => s.id_utilizador === u.id_utilizador)
                            const isDocente = u.tipo_utilizador?.id_tipo === 2
                            return (
                                <button
                                    key={u.id_utilizador}
                                    onClick={() => toggle(u)}
                                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl border transition-all text-left ${isSel ? 'border-[#006A68] bg-[#EFF5F4]' : 'border-[#BEC9C7] bg-white hover:border-[#006A68]'}`}
                                >
                                    <div className="w-9 h-9 rounded-full bg-[#CCE8E6] flex items-center justify-center text-xs font-bold text-[#006A68] shrink-0">
                                        {getInitials(`${u.nome ?? ''} ${u.apelido ?? ''}`)}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-semibold text-[#161D1C] truncate">{u.nome} {u.apelido}</p>
                                        <p className="text-[10px] text-[#4A6362]">{isDocente ? 'Docente' : 'Aluno'} · {u.codigo_username}</p>
                                    </div>
                                    {isSel && <Check size={15} className="text-[#006A68] shrink-0" />}
                                </button>
                            )
                        })}
                    </div>
                ) : (
                    <p className="text-xs text-center text-[#6F7978] italic pt-2">Começa a escrever para pesquisar utilizadores...</p>
                )}
            </div>

            <div className="px-9 py-5 border-t border-[#BEC9C7] shrink-0 flex gap-3">
                <button
                    onClick={handleAdd}
                    disabled={loading || selected.length === 0}
                    className="flex-1 py-3.5 bg-[#006A68] text-white font-semibold rounded-2xl hover:bg-[#00504E] transition-colors disabled:opacity-60 flex items-center justify-center gap-2 font-['Sora']"
                >
                    {loading ? <RefreshCw size={17} className="animate-spin" /> : <UserPlus size={17} />}
                    Adicionar {selected.length > 0 ? `(${selected.length})` : ''}
                </button>
                <button onClick={onClose} className="px-5 py-3.5 bg-white border border-[#BEC9C7] text-[#4A6362] font-semibold rounded-2xl hover:bg-gray-50 transition-colors text-sm font-['Sora']">
                    Fechar
                </button>
            </div>
        </div>
    )
}
