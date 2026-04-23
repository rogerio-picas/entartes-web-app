import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { Users, Plus, RefreshCw, Pencil, Trash2, X, Check, AlertCircle } from 'lucide-react'
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
        <tr className="animate-pulse border-b border-[#4a6362]/10">
            {[30, 15, 40, 50, 15].map((w, i) => (
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

    const filtered = activeTab
        ? utilizadores.filter(u => u.id_tipo === activeTab)
        : utilizadores

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

    const handleModalSuccess = () => {
        setShowModal(false)
        setEditTarget(null)
        fetchData()
        showToast(editTarget ? 'Utilizador atualizado com sucesso.' : 'Utilizador criado com sucesso.')
    }

    return (
        <>
            <div className="max-w-[1400px] mx-auto font-['Sora']">
                {/* Header */}
                <div className="flex flex-wrap items-end justify-between gap-4 mb-8">
                    <div>
                        <p className="text-[#4A6362] text-sm font-medium tracking-wide mb-1">
                            Painel de Gestão · Admin
                        </p>
                        <h1 className="text-[#324B4A] font-normal text-4xl leading-tight tracking-tight">
                            Gestão de utilizadores
                        </h1>
                    </div>
                    <div className="flex items-center gap-3">
                        <button
                            onClick={() => { setEditTarget(null); setShowModal(true) }}
                            className="flex items-center gap-2 px-5 py-2.5 bg-[#006A68] text-white rounded-xl text-sm font-bold hover:bg-[#00504E] transition-colors shadow-sm"
                        >
                            <Plus size={16} />
                            Novo utilizador
                        </button>
                        <button
                            onClick={fetchData}
                            disabled={loading}
                            title="Atualizar"
                            className="w-9 h-9 rounded-full border border-[#4a6362]/30 flex items-center justify-center hover:bg-[#EFF5F4] transition-colors disabled:opacity-40"
                        >
                            <RefreshCw size={15} className={`text-[#4A6362] ${loading ? 'animate-spin' : ''}`} />
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
                                    ? 'bg-[#006A68] text-white border-[#006A68]'
                                    : 'bg-white text-[#4A6362] border-[#4a6362]/30 hover:bg-[#EFF5F4]'
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
                <div className="rounded-2xl border border-[#4a6362]/20 overflow-hidden shadow-sm bg-white">
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="bg-[#EFF5F4] border-b-2 border-[#4a6362]/20">
                                {['Tipo', 'Número', 'Nome', 'Modalidade', ''].map((col, i) => (
                                    <th
                                        key={i}
                                        className="px-4 py-3.5 text-left text-xs font-bold text-[#006A68] uppercase tracking-wider whitespace-nowrap"
                                    >
                                        {col}
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                [...Array(6)].map((_, i) => <SkeletonRow key={i} />)
                            ) : filtered.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="py-20 text-center">
                                        <Users size={40} className="mx-auto text-[#006A68]/15 mb-3" />
                                        <p className="text-sm text-[#4A6362] font-medium">
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
                                            className={`border-b border-[#4a6362]/10 hover:bg-[#F4FBF9] transition-colors ${idx % 2 === 0 ? '' : 'bg-[#FAFFFE]'}`}
                                        >
                                            <td className="px-4 py-3.5">
                                                <span className={`text-xs px-2.5 py-1 rounded-md border font-medium ${TYPE_BADGE[u.id_tipo] ?? ''}`}>
                                                    {TYPE_LABELS[u.id_tipo] ?? '—'}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3.5 text-[#4A6362] font-mono">
                                                {u.id_utilizador}
                                            </td>
                                            <td className="px-4 py-3.5">
                                                <span className="font-semibold text-[#324B4A]">
                                                    {[u.nome, u.apelido].filter(Boolean).join(' ') || u.codigo_username}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3.5">
                                                {modalidades.length > 0 ? (
                                                    <span className="text-[#4A6362]">
                                                        {modalidades.join(', ')}
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
                                                            className="w-7 h-7 bg-[#BA1A1A] border border-[#93000A] rounded-lg flex items-center justify-center hover:brightness-95 transition-all active:scale-95 disabled:opacity-50"
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
                                                            className="w-8 h-8 bg-[#324B4A] text-white rounded-full flex items-center justify-center hover:bg-[#006A68] transition-colors active:scale-95"
                                                        >
                                                            <Pencil size={14} />
                                                        </button>
                                                        <button
                                                            onClick={() => setConfirmDeleteId(u.id_utilizador)}
                                                            title="Eliminar"
                                                            className="w-8 h-8 bg-[#BA1A1A] text-white rounded-full flex items-center justify-center hover:bg-[#93000A] transition-colors active:scale-95"
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
                        <span className="text-xs text-[#4A6362]">
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
