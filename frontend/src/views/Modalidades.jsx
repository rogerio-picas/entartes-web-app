import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { Music, Plus, RefreshCw, ArrowUpDown, Pencil, Trash2, X, Check, AlertCircle } from 'lucide-react'
import { modalidadeService } from '../services/modalidadeService'
import { authService } from '../services/authService'
import NovaModalidadeModal from './NovaModalidadeModal'

function SkeletonRow({ cols }) {
    return (
        <tr className="animate-pulse border-b border-[#4a6362]/10">
            {[...Array(cols)].map((_, i) => (
                <td key={i} className="px-4 py-4">
                    <div className="h-4 bg-gray-100 rounded-lg" style={{ width: `${60 + (i % 3) * 15}%` }} />
                </td>
            ))}
        </tr>
    )
}

export default function Modalidades() {
    const navigate = useNavigate()
    const user = authService.getUser()
    const role = user?.role ?? 3
    const isAdmin = role === 1

    useEffect(() => {
        if (role === 3) navigate('/', { replace: true })
    }, [role, navigate])

    const [modalidades, setModalidades] = useState([])
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

    const fetchModalidades = useCallback(async () => {
        setLoading(true)
        setError('')
        try {
            if (isAdmin) {
                const data = await modalidadeService.listar(null, true)
                setModalidades(data)
            } else {
                const token = localStorage.getItem('token')
                const id_docente = token ? JSON.parse(atob(token.split('.')[1])).id : null
                const data = await modalidadeService.listar(id_docente)
                setModalidades(data)
            }
        } catch (err) {
            setError(err.message || 'Erro ao carregar modalidades.')
        } finally {
            setLoading(false)
        }
    }, [isAdmin])

    useEffect(() => { fetchModalidades() }, [fetchModalidades])

    const handleDelete = async (id) => {
        setDeletingId(id)
        try {
            await modalidadeService.eliminar(id)
            setModalidades(prev => prev.filter(m => m.id_modalidade !== id))
            showToast('Modalidade eliminada com sucesso.')
        } catch (err) {
            showToast(err.message || 'Erro ao eliminar modalidade.', 'error')
        } finally {
            setDeletingId(null)
            setConfirmDeleteId(null)
        }
    }

    const handleModalSuccess = (nome) => {
        setShowModal(false)
        setEditTarget(null)
        fetchModalidades()
        showToast(editTarget ? `"${nome}" atualizada com sucesso.` : `"${nome}" criada com sucesso.`)
    }

    const colCount = isAdmin ? 3 : 1

    return (
        <>
            <div className="max-w-[1400px] mx-auto font-['Sora']">
                {/* Cabeçalho */}
                <div className="flex flex-wrap items-end justify-between gap-4 mb-8">
                    <div>
                        <p className="text-[#4A6362] text-sm font-medium tracking-wide mb-1">Gestão de Conteúdo</p>
                        <h1 className="text-[#324B4A] font-normal text-4xl leading-tight tracking-tight">
                            Modalidades
                        </h1>
                    </div>
                    <div className="flex items-center gap-3">
                        {isAdmin && (
                            <button
                                onClick={() => { setEditTarget(null); setShowModal(true) }}
                                className="flex items-center gap-2 px-5 py-2.5 bg-[#006A68] text-white rounded-xl text-sm font-bold hover:bg-[#00504E] transition-colors shadow-sm"
                            >
                                <Plus size={16} />
                                Nova Modalidade
                            </button>
                        )}
                        <button
                            onClick={fetchModalidades}
                            disabled={loading}
                            title="Atualizar"
                            className="w-9 h-9 rounded-full border border-[#4a6362]/30 flex items-center justify-center hover:bg-[#EFF5F4] transition-colors disabled:opacity-40"
                        >
                            <RefreshCw size={15} className={`text-[#4A6362] ${loading ? 'animate-spin' : ''}`} />
                        </button>
                    </div>
                </div>

                {/* Erro */}
                {error && (
                    <div className="mb-6 flex items-center gap-2 bg-red-50 text-red-700 text-sm px-4 py-3 rounded-xl border border-red-200">
                        <AlertCircle size={16} />
                        {error}
                        <button onClick={fetchModalidades} className="ml-auto underline text-xs">Tentar novamente</button>
                    </div>
                )}

                {/* Tabela */}
                <div className="rounded-2xl border border-[#4a6362]/20 overflow-hidden shadow-sm bg-white">
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="bg-[#EFF5F4] border-b-2 border-[#4a6362]/20">
                                {['Nome', ...(isAdmin ? ['Docentes', ''] : [])].map((col, i) => (
                                    <th
                                        key={i}
                                        className="px-4 py-3.5 text-left text-xs font-bold text-[#006A68] uppercase tracking-wider whitespace-nowrap"
                                    >
                                        {col && (
                                            <span className="flex items-center gap-1">
                                                {col}
                                                {col !== '' && <ArrowUpDown size={10} className="text-[#006A68]/30" />}
                                            </span>
                                        )}
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                [...Array(5)].map((_, i) => <SkeletonRow key={i} cols={colCount} />)
                            ) : modalidades.length === 0 ? (
                                <tr>
                                    <td colSpan={colCount} className="py-20 text-center">
                                        <Music size={40} className="mx-auto text-[#006A68]/15 mb-3" />
                                        <p className="text-sm text-[#4A6362] font-medium">Não existem modalidades registadas.</p>
                                    </td>
                                </tr>
                            ) : (
                                modalidades.map((m, idx) => (
                                    <tr
                                        key={m.id_modalidade}
                                        className={`border-b border-[#4a6362]/10 hover:bg-[#F4FBF9] transition-colors ${idx % 2 === 0 ? '' : 'bg-[#FAFFFE]'}`}
                                    >
                                        <td className="px-4 py-4">
                                            <div className="flex items-center gap-2">
                                                <div className="w-1.5 h-8 rounded-full bg-[#80D5D2] shrink-0" />
                                                <span className="font-semibold text-[#324B4A]">{m.nome}</span>
                                            </div>
                                        </td>
                                        {isAdmin && (
                                            <>
                                                <td className="px-4 py-4 text-gray-600">
                                                    {m.docente_modalidade?.length > 0 ? (
                                                        <div className="flex flex-wrap gap-1.5">
                                                            {m.docente_modalidade.map(d => (
                                                                <span
                                                                    key={d.id_docente}
                                                                    className="text-xs bg-[#CCE8E6] text-[#006A68] px-2.5 py-1 rounded-full font-medium"
                                                                >
                                                                    {[d.nome, d.apelido].filter(Boolean).join(' ') || d.codigo_username}
                                                                </span>
                                                            ))}
                                                        </div>
                                                    ) : (
                                                        <span className="text-xs text-gray-300">—</span>
                                                    )}
                                                </td>
                                                <td className="px-4 py-4">
                                                    {confirmDeleteId === m.id_modalidade ? (
                                                        <div className="flex items-center gap-2">
                                                            <span className="text-xs text-gray-500">Confirmar?</span>
                                                            <button
                                                                onClick={() => handleDelete(m.id_modalidade)}
                                                                disabled={deletingId === m.id_modalidade}
                                                                className="w-7 h-7 bg-[#BA1A1A] border border-[#93000A] rounded-lg flex items-center justify-center hover:brightness-95 transition-all active:scale-95 disabled:opacity-50"
                                                            >
                                                                {deletingId === m.id_modalidade
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
                                                        <div className="flex gap-2">
                                                            <button
                                                                onClick={() => { setEditTarget(m); setShowModal(true) }}
                                                                title="Editar"
                                                                className="px-3.5 py-1.5 rounded-lg bg-[#CCE8E6] text-[#006A68] text-xs font-bold hover:bg-[#006A68] hover:text-white transition-colors flex items-center gap-1.5"
                                                            >
                                                                <Pencil size={12} /> Editar
                                                            </button>
                                                            <button
                                                                onClick={() => setConfirmDeleteId(m.id_modalidade)}
                                                                title="Eliminar"
                                                                className="px-3.5 py-1.5 rounded-lg bg-red-50 text-red-600 text-xs font-bold hover:bg-red-600 hover:text-white transition-colors flex items-center gap-1.5 border border-red-200"
                                                            >
                                                                <Trash2 size={12} /> Eliminar
                                                            </button>
                                                        </div>
                                                    )}
                                                </td>
                                            </>
                                        )}
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Resumo */}
                {!loading && modalidades.length > 0 && (
                    <div className="mt-5">
                        <span className="text-xs text-[#4A6362]">
                            {modalidades.length} modalidade{modalidades.length !== 1 ? 's' : ''}
                        </span>
                    </div>
                )}
            </div>

            {/* Modal criar/editar */}
            {showModal && (
                <NovaModalidadeModal
                    onClose={() => { setShowModal(false); setEditTarget(null) }}
                    onSuccess={handleModalSuccess}
                    modalidade={editTarget}
                />
            )}

            {/* Toast */}
            {toast && (
                <div className={`fixed bottom-6 right-6 z-50 flex items-center gap-3 px-5 py-3 rounded-xl shadow-lg text-white font-['Sora'] text-sm font-medium
                    ${toast.type === 'success' ? 'bg-emerald-600' : 'bg-red-600'}`}>
                    {toast.type === 'success' ? <Check size={16} /> : <X size={16} />}
                    {toast.message}
                    <button onClick={() => setToast(null)} className="ml-2 opacity-70 hover:opacity-100"><X size={14} /></button>
                </div>
            )}
        </>
    )
}
