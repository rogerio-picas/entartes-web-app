import { useState, useEffect, useCallback } from 'react'
import {
    Plus, Search, Users, X, RefreshCw, AlertCircle, Check
} from 'lucide-react'
import { api } from '../services/api'

// ─── Helpers ──────────────────────────────────────────────────────────────────
function getInitials(nome) {
    if (!nome) return '?'
    const parts = nome.trim().split(' ')
    return parts.length > 1
        ? (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
        : nome.slice(0, 2).toUpperCase()
}

const COLORS = ['#CCE8E6', '#B0CCCA', '#80D5D2', '#EFF5F4', '#D2E4FF']

// ─── Avatar Stack ──────────────────────────────────────────────────────────────
function AvatarStack({ members, max = 4 }) {
    const shown = members.slice(0, max)
    const extra = members.length - max
    return (
        <div className="flex items-center">
            {extra > 0 && (
                <div className="w-10 h-10 rounded-full bg-[#E8F2F1] border border-[#6F7978] flex items-center justify-center text-xs text-[#6F7978] font-medium z-10">
                    +{extra}
                </div>
            )}
            {shown.map((m, i) => (
                <div
                    key={i}
                    className="w-10 h-10 rounded-full border-2 border-white flex items-center justify-center text-xs font-bold -ml-2 first:ml-0"
                    style={{ backgroundColor: COLORS[i % COLORS.length], zIndex: shown.length - i }}
                    title={m.nome ?? m}
                >
                    {typeof m === 'string' ? m.slice(0, 2).toUpperCase() : getInitials(m.nome ?? m)}
                </div>
            ))}
        </div>
    )
}

// ─── Group Card ────────────────────────────────────────────────────────────────
function GrupoCard({ grupo, onManage }) {
    const members = [
        ...(grupo.aluno_grupo ?? []).map(ag => ag.aluno?.utilizador?.nome ?? 'A'),
        ...(grupo.docente_grupo ?? []).map(dg => dg.docente?.utilizador?.nome ?? 'D'),
    ]
    const count = members.length

    return (
        <div className="border border-[#BEC9C7] rounded-xl p-4 flex flex-col gap-3 bg-white hover:border-[#006A68] hover:shadow-sm transition-all group">
            <div className="flex items-start justify-between gap-2">
                <div>
                    <p className="font-semibold text-[#000] text-lg leading-snug font-['Sora']">{grupo.nome}</p>
                    <p className="text-sm text-[#4A6362]">{count} membros</p>
                </div>
                <button
                    onClick={() => onManage(grupo)}
                    className="w-9 h-9 rounded-full bg-[#006A68] flex items-center justify-center text-white hover:bg-[#00504E] transition-colors shrink-0"
                    title="Gerir grupo"
                >
                    <Plus size={16} />
                </button>
            </div>
            <AvatarStack members={members} />
        </div>
    )
}

// ─── Create Group Panel ────────────────────────────────────────────────────────
function CriarGrupoPanel({ onClose, onSuccess, eventId: initialEventId }) {
    const [nome, setNome] = useState('')
    const [descricao, setDescricao] = useState('')
    const [searchAluno, setSearchAluno] = useState('')
    const [alunos, setAlunos] = useState([])
    const [eventos, setEventos] = useState([])
    const [selectedEventId, setSelectedEventId] = useState(initialEventId ?? '')
    const [selected, setSelected] = useState([])
    const [loading, setLoading] = useState(false)
    const [erro, setErro] = useState('')

    useEffect(() => {
        api.get('/users').then(data => {
            if (Array.isArray(data))
                setAlunos(data.filter(u => u.tipo_utilizador?.id_tipo === 3 || !u.tipo_utilizador))
        }).catch(() => {})

        // Load events for the selector (only when no eventId is pre-set)
        if (!initialEventId) {
            api.get('/evento').then(data => {
                if (Array.isArray(data)) setEventos(data)
            }).catch(() => {})
        }
    }, [initialEventId])

    const filtered = alunos.filter(u => {
        const q = searchAluno.toLowerCase()
        const nome = `${u.nome ?? ''} ${u.apelido ?? ''}`.toLowerCase()
        const id = String(u.id_utilizador)
        return nome.includes(q) || id.includes(q)
    })

    function toggleAluno(u) {
        setSelected(prev =>
            prev.some(s => s.id_utilizador === u.id_utilizador)
                ? prev.filter(s => s.id_utilizador !== u.id_utilizador)
                : [...prev, u]
        )
    }

    async function handleCreate() {
        if (!nome.trim()) { setErro('O nome do grupo é obrigatório.'); return }
        if (!selectedEventId) { setErro('Seleciona um evento para associar o grupo.'); return }
        setLoading(true)
        setErro('')
        try {
            const grupo = await api.post(`/evento/${selectedEventId}/grupos`, { nome: nome.trim(), descricao })

            const groupId = grupo.id_grupo
            for (const aluno of selected) {
                try {
                    try {
                        await api.post(`/evento/${selectedEventId}/participantes`, {
                            id_utilizador: aluno.id_utilizador,
                            tipo: 'aluno',
                        })
                    } catch { /* already registered — proceed */ }
                    await api.post(`/evento/grupos/${groupId}/alunos/${aluno.id_utilizador}`, {})
                } catch { /* skip individual errors */ }
            }
            onSuccess(grupo)
        } catch (e) {
            setErro(e.message || 'Erro ao criar grupo.')
        } finally {
            setLoading(false)
        }
    }

    return (
        <div
            className={`fixed top-0 right-0 h-full z-50 w-[483px] max-w-[95vw] bg-[#F4FBF9] shadow-2xl flex flex-col
                transform transition-transform duration-300 ease-out`}
        >
            {/* Header */}
            <div className="px-9 pt-10 pb-4 border-b border-[#006A68] shrink-0">
                <div className="flex items-center justify-between mb-1">
                    <h2 className="text-2xl font-bold text-[#006A68] font-['Sora']">Criar novo grupo</h2>
                    <button onClick={onClose} className="w-8 h-8 rounded-full hover:bg-[#CCE8E6] flex items-center justify-center text-[#4A6362]">
                        <X size={17} />
                    </button>
                </div>
            </div>

            <div className="flex-1 overflow-y-auto px-9 py-5 space-y-5">
                {erro && (
                    <div className="flex items-center gap-2 bg-red-50 text-red-700 text-sm px-3 py-2.5 rounded-xl border border-red-200">
                        <AlertCircle size={14} /> {erro}
                    </div>
                )}

                {/* Detalhes */}
                <p className="text-sm font-medium text-[#000]">Detalhes</p>

                {!initialEventId && (
                    <select
                        value={selectedEventId}
                        onChange={e => setSelectedEventId(e.target.value)}
                        className="w-full bg-white border border-[#6F7978] rounded-lg px-4 py-3 text-sm text-[#161D1C] focus:outline-none focus:border-[#006A68]"
                    >
                        <option value="">Seleciona um evento</option>
                        {eventos.map(ev => (
                            <option key={ev.id_evento} value={ev.id_evento}>{ev.nome}</option>
                        ))}
                    </select>
                )}

                <div className="relative">
                    <input
                        value={nome} onChange={e => setNome(e.target.value)}
                        placeholder="Nome do grupo"
                        className="w-full bg-white border border-[#6F7978] rounded-lg px-4 py-3 text-sm text-[#161D1C] focus:outline-none focus:border-[#006A68]"
                    />
                </div>

                <div className="relative">
                    <textarea
                        value={descricao} onChange={e => setDescricao(e.target.value)}
                        placeholder="Descrição do grupo"
                        rows={4}
                        className="w-full bg-white border border-[#6F7978] rounded-lg px-4 py-3 text-sm text-[#161D1C] focus:outline-none focus:border-[#006A68] resize-none"
                    />
                </div>

                {/* Adicionar membros */}
                <p className="text-sm font-medium text-[#000] pt-2">Adicionar membros</p>

                <div className="flex items-center gap-2 bg-[#E3E9E8] rounded-full px-4 py-2">
                    <Search size={18} className="text-[#49454F] shrink-0" />
                    <input
                        value={searchAluno} onChange={e => setSearchAluno(e.target.value)}
                        placeholder="Pesquise por nome ou número de aluno"
                        className="flex-1 bg-transparent text-sm text-[#49454F] focus:outline-none"
                    />
                </div>

                {/* Selected members */}
                {selected.length > 0 && (
                    <div>
                        <p className="text-xs font-semibold text-[#000] mb-2">Alunos selecionados ({selected.length})</p>
                        <div className="grid grid-cols-2 gap-2">
                            {selected.map(u => (
                                <div key={u.id_utilizador} className="flex items-center gap-2 bg-[#B0CCCA] rounded-xl px-3 py-2">
                                    <div className="w-9 h-9 rounded-full bg-[#006A68] flex items-center justify-center text-white text-xs font-bold shrink-0">
                                        {getInitials(`${u.nome ?? ''} ${u.apelido ?? ''}`)}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-xs font-medium text-[#000] truncate">{u.nome} {u.apelido}</p>
                                        <p className="text-[10px] text-[#4A6362]">{u.id_utilizador}</p>
                                    </div>
                                    <button onClick={() => toggleAluno(u)} className="w-5 h-5 rounded-full bg-[#DDE4E3] flex items-center justify-center shrink-0 hover:bg-red-100">
                                        <X size={11} className="text-[#4A6362]" />
                                    </button>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Search results */}
                {searchAluno && filtered.length > 0 && (
                    <div className="space-y-1.5">
                        {filtered.slice(0, 10).map(u => {
                            const isSel = selected.some(s => s.id_utilizador === u.id_utilizador)
                            return (
                                <button
                                    key={u.id_utilizador}
                                    onClick={() => toggleAluno(u)}
                                    className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl border transition-all text-left ${isSel ? 'border-[#006A68] bg-[#EFF5F4]' : 'border-[#BEC9C7] bg-white hover:border-[#006A68]'}`}
                                >
                                    <div className="w-8 h-8 rounded-full bg-[#CCE8E6] flex items-center justify-center text-xs font-bold text-[#006A68] shrink-0">
                                        {getInitials(`${u.nome ?? ''} ${u.apelido ?? ''}`)}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-medium text-[#000] truncate">{u.nome} {u.apelido}</p>
                                        <p className="text-[10px] text-[#4A6362]">{u.id_utilizador}</p>
                                    </div>
                                    {isSel && <Check size={14} className="text-[#006A68]" />}
                                </button>
                            )
                        })}
                    </div>
                )}
            </div>

            {/* Footer */}
            <div className="px-9 py-6 border-t border-[#BEC9C7] shrink-0">
                <button
                    onClick={handleCreate}
                    disabled={loading}
                    className="w-full py-4 bg-[#006A68] text-white font-semibold rounded-2xl hover:bg-[#00504E] transition-colors disabled:opacity-60 flex items-center justify-center gap-2"
                >
                    {loading ? <RefreshCw size={18} className="animate-spin" /> : <Check size={18} />}
                    Criar grupo
                </button>
            </div>
        </div>
    )
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function Grupos() {
    const [grupos, setGrupos] = useState([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState('')
    const [search, setSearch] = useState('')
    const [showCreate, setShowCreate] = useState(false)
    const [toast, setToast] = useState(null)

    function showToast(msg, type = 'success') {
        setToast({ msg, type })
        setTimeout(() => setToast(null), 3000)
    }

    const fetchGrupos = useCallback(async () => {
        setLoading(true)
        setError('')
        try {
            // Fetch all events and their groups
            const eventos = await api.get('/evento')
            const allGrupos = []
            if (Array.isArray(eventos)) {
                for (const ev of eventos.slice(0, 10)) {
                    try {
                        const gs = await api.get(`/evento/${ev.id_evento}/grupos`)
                        if (Array.isArray(gs)) allGrupos.push(...gs)
                    } catch { /* skip */ }
                }
            }
            setGrupos(allGrupos)
        } catch (e) {
            setError(e.message || 'Erro ao carregar grupos.')
        } finally {
            setLoading(false)
        }
    }, [])

    useEffect(() => { fetchGrupos() }, [fetchGrupos])

    const filtered = grupos.filter(g => g.nome?.toLowerCase().includes(search.toLowerCase()))

    return (
        <>
            {/* Backdrop when panel open */}
            {showCreate && (
                <div
                    className="fixed inset-0 z-40 bg-black/20 backdrop-blur-[2px]"
                    onClick={() => setShowCreate(false)}
                />
            )}

            <div className="font-['Sora']">
                {/* Header */}
                <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
                    <h1 className="text-2xl font-bold text-[#000] font-['Sora']">Todos os grupos</h1>
                    <button
                        onClick={() => setShowCreate(true)}
                        className="flex items-center gap-2 px-6 py-4 bg-[#4A6362] text-white font-semibold rounded-2xl hover:bg-[#006A68] transition-colors"
                    >
                        <Plus size={18} /> Novo grupo
                    </button>
                </div>

                {/* Search */}
                <div className="mb-6 flex items-center gap-2 bg-[#E3E9E8] rounded-full px-5 py-3 max-w-xl">
                    <Search size={18} className="text-[#49454F] shrink-0" />
                    <input
                        value={search} onChange={e => setSearch(e.target.value)}
                        placeholder="Pesquisar por nome do grupo"
                        className="flex-1 bg-transparent text-sm text-[#49454F] focus:outline-none"
                    />
                    {search && <button onClick={() => setSearch('')}><X size={14} className="text-[#49454F]" /></button>}
                </div>

                {/* Error */}
                {error && (
                    <div className="mb-6 flex items-center gap-2 bg-red-50 text-red-700 text-sm px-4 py-3 rounded-xl border border-red-200">
                        <AlertCircle size={16} /> {error}
                        <button onClick={fetchGrupos} className="ml-auto underline text-xs">Tentar novamente</button>
                    </div>
                )}

                {/* Loading */}
                {loading ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                        {[...Array(9)].map((_, i) => (
                            <div key={i} className="border border-[#BEC9C7] rounded-xl p-4 animate-pulse">
                                <div className="h-5 bg-gray-100 rounded w-2/3 mb-2" />
                                <div className="h-3 bg-gray-100 rounded w-1/3 mb-4" />
                                <div className="flex gap-1">
                                    {[...Array(4)].map((_, j) => <div key={j} className="w-10 h-10 rounded-full bg-gray-100" />)}
                                </div>
                            </div>
                        ))}
                    </div>
                ) : filtered.length === 0 ? (
                    <div className="text-center py-16">
                        <Users size={40} className="mx-auto text-[#006A68]/15 mb-3" />
                        <p className="text-sm text-[#4A6362]">
                            {grupos.length === 0 ? 'Ainda não existem grupos criados.' : 'Nenhum grupo encontrado.'}
                        </p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                        {filtered.map(g => (
                            <GrupoCard key={g.id_grupo} grupo={g} onManage={() => {}} />
                        ))}
                    </div>
                )}
            </div>

            {/* Create panel */}
            {showCreate && (
                <CriarGrupoPanel
                    onClose={() => setShowCreate(false)}
                    onSuccess={(g) => {
                        setShowCreate(false)
                        showToast(`Grupo "${g.nome}" criado com sucesso!`)
                        fetchGrupos()
                    }}
                />
            )}

            {/* Toast */}
            {toast && (
                <div className={`fixed bottom-6 right-6 z-[70] flex items-center gap-3 px-5 py-3 rounded-xl shadow-lg text-white font-['Sora'] text-sm font-medium ${toast.type === 'success' ? 'bg-emerald-600' : 'bg-red-600'}`}>
                    <Check size={15} /> {toast.msg}
                    <button onClick={() => setToast(null)}><X size={13} className="opacity-70" /></button>
                </div>
            )}
        </>
    )
}