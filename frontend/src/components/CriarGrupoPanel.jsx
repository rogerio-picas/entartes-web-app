import { useState, useEffect } from 'react'
import { X, Search, Check, RefreshCw, AlertCircle } from 'lucide-react'
import { api } from '../services/api'

function getInitials(nome) {
    if (!nome) return '?'
    const parts = nome.trim().split(' ')
    return parts.length > 1
        ? (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
        : nome.slice(0, 2).toUpperCase()
}

export default function CriarGrupoPanel({ onClose, onSuccess, eventId, initialGroup }) {
    const [nome, setNome] = useState(initialGroup ? initialGroup.nome : '')
    const [descricao, setDescricao] = useState(initialGroup ? (initialGroup.descricao || '') : '')
    const [searchAluno, setSearchAluno] = useState('')
    const [alunos, setAlunos] = useState([])
    const [selected, setSelected] = useState([])
    const [loading, setLoading] = useState(false)
    const [erro, setErro] = useState('')

    useEffect(() => {
        api.get(`/evento/${eventId}/participantes`).then(data => {
            // Backend returns { alunos: [...], docentes: [...] }
            const alunosList = (data.alunos || []).map(a => ({
                id_utilizador: a.id_utilizador,
                nome: a.nome,
                apelido: a.apelido,
                email: a.email,
                codigo_username: a.codigo_username,
                tipo_utilizador: { id_tipo: 3 }
            }))
            const docentesList = (data.docentes || []).map(d => ({
                id_utilizador: d.id_utilizador,
                nome: d.nome,
                apelido: d.apelido,
                email: d.email,
                codigo_username: d.codigo_username,
                tipo_utilizador: { id_tipo: 2 }
            }))
            const all = [...alunosList, ...docentesList]
            setAlunos(all)

            // Prefill if editing
            if (initialGroup && all.length > 0) {
                const preSelectedIds = [
                    ...(initialGroup.aluno_grupo || []).map(ag => ag.id_aluno),
                    ...(initialGroup.docente_grupo || []).map(dg => dg.id_docente)
                ]
                const toSelect = all.filter(a => preSelectedIds.includes(a.id_utilizador))
                setSelected(toSelect)
            }
        }).catch(() => { })
    }, [initialGroup, eventId])

    const filtered = alunos.filter(u => {
        const q = searchAluno.toLowerCase()
        const n = `${u.nome ?? ''} ${u.apelido ?? ''}`.toLowerCase()
        const id = String(u.id_utilizador)
        return n.includes(q) || id.includes(q)
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
        setLoading(true)
        setErro('')
        try {
            let groupId;
            let grupo;

            if (initialGroup) {
                // Edit Group
                grupo = await api.put(`/evento/${eventId}/grupos/${initialGroup.id_grupo}`, { nome: nome.trim(), descricao })
                groupId = initialGroup.id_grupo

                // Sync Members
                const currentIds = [
                    ...(initialGroup.aluno_grupo || []).map(ag => ag.id_aluno),
                    ...(initialGroup.docente_grupo || []).map(dg => dg.id_docente)
                ]
                const selectedIds = selected.map(s => s.id_utilizador)

                const added = selected.filter(s => !currentIds.includes(s.id_utilizador))
                const removedIds = currentIds.filter(id => !selectedIds.includes(id))

                const errors = []
                for (const membro of added) {
                    const typeId = membro.tipo_utilizador?.id_tipo === 2 ? 2 : 3
                    try {
                        if (typeId === 2) {
                            await api.post(`/evento/${eventId}/grupos/${groupId}/docentes/${membro.id_utilizador}`, {})
                        } else {
                            await api.post(`/evento/${eventId}/grupos/${groupId}/alunos/${membro.id_utilizador}`, {})
                        }
                    } catch (e) {
                        errors.push(`Membro ${membro.nome}: ${e.response?.data?.error || e.message}`)
                    }
                }
                if (errors.length > 0) alert("Erros ao adicionar membros:\n" + errors.join("\n"))

                for (const id of removedIds) {
                    try {
                        const wasDocente = initialGroup.docente_grupo?.some(dg => dg.id_docente === id)
                        if (wasDocente) await api.delete(`/evento/${eventId}/grupos/${groupId}/docentes/${id}`)
                        else await api.delete(`/evento/${eventId}/grupos/${groupId}/alunos/${id}`)
                    } catch { }
                }
            } else {
                // Create Group
                grupo = await api.post(`/evento/${eventId}/grupos`, { nome: nome.trim(), descricao })
                groupId = grupo.id_grupo

                const errors = []
                for (const membro of selected) {
                    const typeId = membro.tipo_utilizador?.id_tipo === 2 ? 2 : 3
                    try {
                        if (typeId === 2) {
                            await api.post(`/evento/${eventId}/grupos/${groupId}/docentes/${membro.id_utilizador}`, {})
                        } else {
                            await api.post(`/evento/${eventId}/grupos/${groupId}/alunos/${membro.id_utilizador}`, {})
                        }
                    } catch (e) {
                        errors.push(`Membro ${membro.nome}: ${e.response?.data?.error || e.message}`)
                    }
                }
                if (errors.length > 0) alert("Erros ao adicionar membros:\n" + errors.join("\n"))
            }
            onSuccess(grupo)
        } catch (e) {
            setErro(e.message || 'Erro ao guardar dados do grupo.')
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className={`fixed top-0 right-0 h-full z-[60] w-[483px] max-w-[95vw] bg-[#F4FBF9] shadow-2xl flex flex-col transform transition-transform duration-300 ease-out border-l border-[#006A68]/20`}>
            {/* Header */}
            <div className="px-9 pt-10 pb-4 border-b border-[#006A68] shrink-0">
                <div className="flex items-center justify-between mb-1">
                    <h2 className="text-2xl font-bold text-[#006A68] font-['Sora']">{initialGroup ? 'Editar Grupo' : 'Criar novo grupo'}</h2>
                    <button onClick={onClose} className="w-8 h-8 rounded-full hover:bg-[#CCE8E6] flex items-center justify-center text-[#4A6362]">
                        <X size={17} />
                    </button>
                </div>
            </div>

            <div className="flex-1 overflow-y-auto px-9 py-5 space-y-5 font-['Sora']">
                {erro && (
                    <div className="flex items-center gap-2 bg-red-50 text-red-700 text-sm px-3 py-2.5 rounded-xl border border-red-200">
                        <AlertCircle size={14} /> {erro}
                    </div>
                )}

                <p className="text-sm font-medium text-[#000]">Detalhes</p>

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

                <p className="text-sm font-medium text-[#000] pt-2">Adicionar membros</p>

                <div className="flex items-center gap-2 bg-[#E3E9E8] rounded-full px-4 py-2">
                    <Search size={18} className="text-[#49454F] shrink-0" />
                    <input
                        value={searchAluno} onChange={e => setSearchAluno(e.target.value)}
                        placeholder="Pesquise por nome"
                        className="flex-1 bg-transparent text-sm text-[#49454F] focus:outline-none"
                    />
                </div>

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
                                    </div>
                                    <button onClick={() => toggleAluno(u)} className="w-5 h-5 rounded-full bg-[#DDE4E3] flex items-center justify-center shrink-0 hover:bg-red-100">
                                        <X size={11} className="text-[#4A6362]" />
                                    </button>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

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
                                    </div>
                                    {isSel && <Check size={14} className="text-[#006A68]" />}
                                </button>
                            )
                        })}
                    </div>
                )}
            </div>

            <div className="px-9 py-6 border-t border-[#BEC9C7] shrink-0">
                <button
                    onClick={handleCreate}
                    disabled={loading}
                    className="w-full py-4 bg-[#006A68] text-white font-semibold rounded-2xl hover:bg-[#00504E] transition-colors disabled:opacity-60 flex items-center justify-center gap-2"
                >
                    {loading ? <RefreshCw size={18} className="animate-spin" /> : <Check size={18} />}
                    {initialGroup ? 'Guardar Alterações' : 'Criar grupo'}
                </button>
            </div>
        </div>
    )
}
