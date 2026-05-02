import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { Users, Plus, RefreshCw, Pencil, Trash2, X, Check, AlertCircle, ArrowUpDown, ChevronUp, ChevronDown } from 'lucide-react'
import { utilizadorService } from '../services/utilizadorService'
import { modalidadeService } from '../services/modalidadeService'
import { authService } from '../services/authService'
import NovoUtilizadorModal from './NovoUtilizadorModal'

const TYPE_LABELS = { 1: 'Coordenador/a', 2: 'Docente', 3: 'Aluno' }
const TYPE_BADGE = {
    1: 'bg-purple-50 text-purple-700 border-purple-200',
    2: 'bg-blue-50 text-blue-700 border-blue-200',
    3: 'bg-teal-50 text-teal-700 border-teal-200',
}

const TABS = [
    { label: 'Aluno', value: 3 },
    { label: 'Docente', value: 2 },
    { label: 'Coordenador/a', value: 1 },
]

function SkeletonRow() {
    return (
        <tr className="animate-pulse border-b border-neutral-600/10">
            {[30, 15, 40, 50, 20, 15].map((w, i) => (
                <td key={i} className="px-4 py-4">
                    <div className="h-4 bg-gray-100 rounded-lg" style={{ width: `${w}%` }} />
                </td>
            ))}
        </tr>
    )
}

export default function GestaoUtilizadores() {
    const navigate = useNavigate()
    const user = authService.getUser()
    const role = user?.role ?? 3

    useEffect(() => {
        if (role !== 1) navigate('/', { replace: true })
    }, [role, navigate])

    const [utilizadores, setUtilizadores] = useState([])
    const [docenteModalidades, setDocenteModalidades] = useState({})
    const [activeTab, setActiveTab] = useState(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState('')
    const [toast, setToast] = useState(null)
    const [showModal, setShowModal] = useState(false)
    const [editTarget, setEditTarget] = useState(null)
    const [confirmDeleteId, setConfirmDeleteId] = useState(null)
    const [deletingId, setDeletingId] = useState(null)
    const [sortKey, setSortKey] = useState(null)
    const [sortDir, setSortDir] = useState('asc')

    const showToast = (message, type = 'success') => {
        setToast({ message, type })
        setTimeout(() => setToast(null), 3500)
    }

    const fetchData = useCallback(async () => {
        setLoading(true)
        setError('')
        try {
            const [users, modalidades] = await Promise.all([
                utilizadorService.listar(),
                modalidadeService.listar(null, true).catch(() => []),
            ])
            setUtilizadores(users)
            const map = {}
            modalidades.forEach(m => {
                ;(m.docente_modalidade ?? []).forEach(d => {
                    if (!map[d.id_docente]) map[d.id_docente] = []
                    map[d.id_docente].push(m.nome)
                })
            })
            setDocenteModalidades(map)
        } catch (err) {
            setError(err.message || 'Erro ao carregar utilizadores.')
        } finally {
            setLoading(false)
        }
    }, [])

    useEffect(() => { fetchData() }, [fetchData])

    const SORT_KEYS = { 'Tipo': 'id_tipo', 'Número': 'id_utilizador', 'Nome': 'nome', 'Coaching': 'coaching' }

    function toggleSort(col) {
        const key = SORT_KEYS[col]
        if (!key) return
        if (sortKey === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
        else { setSortKey(key); setSortDir('asc') }
    }

    function getSortIcon(col) {
        const key = SORT_KEYS[col]
        if (!key) return null
        if (sortKey !== key) return <ArrowUpDown size={10} className="text-brand-800/30" />
        return sortDir === 'asc'
            ? <ChevronUp size={10} className="text-brand-800" />
            : <ChevronDown size={10} className="text-brand-800" />
    }

    const baseFiltered = activeTab
        ? utilizadores.filter(u => u.id_tipo === activeTab)
        : utilizadores

    const filtered = sortKey ? [...baseFiltered].sort((a, b) => {
        let av, bv
        if (sortKey === 'nome') {
            av = [a.nome, a.apelido].filter(Boolean).join(' ') || a.codigo_username
            bv = [b.nome, b.apelido].filter(Boolean).join(' ') || b.codigo_username
        } else if (sortKey === 'coaching') {
            av = a.aluno?.coaching ? 1 : 0
            bv = b.aluno?.coaching ? 1 : 0
        } else {
            av = a[sortKey] ?? ''
            bv = b[sortKey] ?? ''
        }
        if (av < bv) return sortDir === 'asc' ? -1 : 1
        if (av > bv) return sortDir === 'asc' ? 1 : -1
        return 0
    }) : baseFiltered

    const handleDelete = async (id) => {
        setDeletingId(id)
        try {
            await utilizadorService.eliminar(id)
            setUtilizadores(prev => prev.filter(u => u.id_utilizador !== id))
            showToast('Utilizador eliminado com sucesso.')
        } catch (err) {
            showToast(err.message || 'Erro ao eliminar utilizador.', 'error')
        } finally {
            setDeletingId(null)
            setConfirmDeleteId(null)
        }
    }

    const handleModalSuccess = (wasEdit) => {
        setShowModal(false)
        setEditTarget(null)
        fetchData()
        showToast(wasEdit ? 'Utilizador atualizado com sucesso.' : 'Utilizador criado com sucesso.')
    }

    return (
        <>
            <div className="max-w-[1400px] mx-auto font-['Sora']">
                {/* Header */}
                <div className="flex flex-wrap items-end justify-between gap-4 mb-8">
                    <div>
                        <p className="text-neutral-600 text-sm font-medium tracking-wide mb-1">
                            Painel de Gestão · Admin
                        </p>
                        <h1 className="text-neutral-800 font-normal text-4xl leading-tight tracking-tight">
                            Gestão de utilizadores
                        </h1>
                    </div>
                    <div className="flex items-center gap-3">
                        <button
                            onClick={() => { setEditTarget(null); setShowModal(true) }}
                            className="flex items-center gap-2 px-5 py-2.5 bg-brand-800 text-white rounded-xl text-sm font-bold hover:bg-brand-900 transition-colors shadow-sm"
                        >
                            <Plus size={16} />
                            Novo utilizador
                        </button>
                        <button
                            onClick={fetchData}
                            disabled={loading}
                            title="Atualizar"
                            className="w-9 h-9 rounded-full border border-neutral-600/30 flex items-center justify-center hover:bg-neutral-50 transition-colors disabled:opacity-40"
                        >
                            <RefreshCw size={15} className={`text-neutral-600 ${loading ? 'animate-spin' : ''}`} />
                        </button>
                    </div>
                </div>

                {/* Filter tabs */}
                <div className="flex items-center gap-2 mb-4">
                    {TABS.map(tab => (
                        <button
                            key={tab.value}
                            onClick={() => setActiveTab(activeTab === tab.value ? null : tab.value)}
                            className={`px-4 py-1.5 rounded-full text-xs font-semibold border transition-colors
                                ${activeTab === tab.value
                                    ? 'bg-brand-800 text-white border-brand-800'
                                    : 'bg-white text-neutral-600 border-neutral-600/30 hover:bg-neutral-50'
                                }`}
                        >
                            {tab.label}
                        </button>
                    ))}
                </div>

                {/* Error */}
                {error && (
                    <div className="mb-6 flex items-center gap-2 bg-red-50 text-red-700 text-sm px-4 py-3 rounded-xl border border-red-200">
                        <AlertCircle size={16} />
                        {error}
                        <button onClick={fetchData} className="ml-auto underline text-xs">Tentar novamente</button>
                    </div>
                )}

                {/* Table */}
                <div className="rounded-2xl border border-neutral-600/20 overflow-hidden shadow-sm bg-white">
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="bg-neutral-50 border-b-2 border-neutral-600/20">
                                {['Tipo', 'Número', 'Nome', 'Modalidade', 'Coaching', ''].map((col, i) => (
                                    <th
                                        key={i}
                                        onClick={() => toggleSort(col)}
                                        className={`px-4 py-3.5 text-left text-xs font-bold text-brand-800 uppercase tracking-wider whitespace-nowrap ${SORT_KEYS[col] ? 'cursor-pointer select-none hover:bg-brand-200' : ''}`}
                                    >
                                        <span className="flex items-center gap-1">
                                            {col}
                                            {getSortIcon(col)}
                                        </span>
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                [...Array(6)].map((_, i) => <SkeletonRow key={i} />)
                            ) : filtered.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className="py-20 text-center">
                                        <Users size={40} className="mx-auto text-brand-800/15 mb-3" />
                                        <p className="text-sm text-neutral-600 font-medium">
                                            Nenhum utilizador encontrado.
                                        </p>
                                    </td>
                                </tr>
                            ) : (
                                filtered.map((u, idx) => {
                                    const modalidades = u.id_tipo === 2
                                        ? (docenteModalidades[u.id_utilizador] ?? [])
                                        : []
                                    return (
                                        <tr
                                            key={u.id_utilizador}
                                            className={`border-b border-neutral-600/10 hover:bg-brand-50 transition-colors ${idx % 2 === 0 ? '' : 'bg-brand-50'}`}
                                        >
                                            <td className="px-4 py-3.5">
                                                <span className={`text-xs px-2.5 py-1 rounded-md border font-medium ${TYPE_BADGE[u.id_tipo] ?? ''}`}>
                                                    {TYPE_LABELS[u.id_tipo] ?? '—'}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3.5 text-neutral-600 font-mono">
                                                {u.id_utilizador}
                                            </td>
                                            <td className="px-4 py-3.5">
                                                <span className="font-semibold text-neutral-800">
                                                    {[u.nome, u.apelido].filter(Boolean).join(' ') || u.codigo_username}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3.5">
                                                {modalidades.length > 0 ? (
                                                    <span className="text-neutral-600">
                                                        {modalidades.join(', ')}
                                                    </span>
                                                ) : (
                                                    <span className="text-gray-300 text-xs">—</span>
                                                )}
                                            </td>
                                            <td className="px-4 py-3.5">
                                                {u.id_tipo === 3 ? (
                                                    <span className={`text-xs px-2.5 py-1 rounded-md border font-medium ${u.aluno?.coaching ? 'bg-teal-50 text-teal-700 border-teal-200' : 'bg-gray-50 text-gray-400 border-gray-200'}`}>
                                                        {u.aluno?.coaching ? 'Sim' : 'Não'}
                                                    </span>
                                                ) : (
                                                    <span className="text-gray-300 text-xs">—</span>
                                                )}
                                            </td>
                                            <td className="px-4 py-3.5">
                                                {confirmDeleteId === u.id_utilizador ? (
                                                    <div className="flex items-center gap-2">
                                                        <span className="text-xs text-gray-500">Confirmar?</span>
                                                        <button
                                                            onClick={() => handleDelete(u.id_utilizador)}
                                                            disabled={deletingId === u.id_utilizador}
                                                            className="w-7 h-7 bg-feedback-error border border-feedback-error-dark rounded-lg flex items-center justify-center hover:brightness-95 transition-all active:scale-95 disabled:opacity-50"
                                                        >
                                                            {deletingId === u.id_utilizador
                                                                ? <RefreshCw size={12} className="text-white animate-spin" />
                                                                : <Check size={12} strokeWidth={3} className="text-white" />
                                                            }
                                                        </button>
                                                        <button
                                                            onClick={() => setConfirmDeleteId(null)}
                                                            className="w-7 h-7 bg-gray-100 border border-gray-200 rounded-lg flex items-center justify-center hover:brightness-95 transition-all active:scale-95"
                                                        >
                                                            <X size={12} strokeWidth={3} className="text-gray-600" />
                                                        </button>
                                                    </div>
                                                ) : (
                                                    <div className="flex items-center gap-2">
                                                        <button
                                                            onClick={() => { setEditTarget(u); setShowModal(true) }}
                                                            title="Editar"
                                                            className="w-8 h-8 bg-neutral-800 text-white rounded-full flex items-center justify-center hover:bg-brand-800 transition-colors active:scale-95"
                                                        >
                                                            <Pencil size={14} />
                                                        </button>
                                                        <button
                                                            onClick={() => setConfirmDeleteId(u.id_utilizador)}
                                                            title="Eliminar"
                                                            className="w-8 h-8 bg-feedback-error text-white rounded-full flex items-center justify-center hover:bg-feedback-error-dark transition-colors active:scale-95"
                                                        >
                                                            <Trash2 size={14} />
                                                        </button>
                                                    </div>
                                                )}
                                            </td>
                                        </tr>
                                    )
                                })
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Summary */}
                {!loading && filtered.length > 0 && (
                    <div className="mt-5">
                        <span className="text-xs text-neutral-600">
                            {filtered.length} utilizador{filtered.length !== 1 ? 'es' : ''}
                            {activeTab ? ` · ${TYPE_LABELS[activeTab]}` : ''}
                        </span>
                    </div>
                )}
            </div>

            {/* Modal */}
            {showModal && (
                <NovoUtilizadorModal
                    onClose={() => { setShowModal(false); setEditTarget(null) }}
                    onSuccess={handleModalSuccess}
                    utilizador={editTarget}
                />
            )}

            {/* Toast */}
            {toast && (
                <div className={`fixed bottom-6 right-6 z-50 flex items-center gap-3 px-5 py-3 rounded-xl shadow-lg text-white font-['Sora'] text-sm font-medium
                    ${toast.type === 'success' ? 'bg-emerald-600' : 'bg-red-600'}`}>
                    {toast.type === 'success' ? <Check size={16} /> : <X size={16} />}
                    {toast.message}
                    <button onClick={() => setToast(null)} className="ml-2 opacity-70 hover:opacity-100">
                        <X size={14} />
                    </button>
                </div>
            )}
        </>
    )
}

