import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import {
    CalendarCheck, BookOpen, Clock, Coins,
    ChevronRight, AlertCircle, RefreshCw, Megaphone,
    CheckCircle2, X, Check, ExternalLink
} from 'lucide-react'
import { api } from '../services/api'
import { authService } from '../services/authService'

// ─── Helpers ──────────────────────────────────────────────────────────────────
function formatDate(raw) {
    if (!raw) return '—'
    return new Date(raw).toLocaleDateString('pt-PT', {
        day: '2-digit', month: '2-digit', year: 'numeric'
    })
}

function formatTime(raw) {
    if (!raw) return '—'
    return new Date(raw).toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit' })
}

function formatDuration(min) {
    if (!min) return '—'
    const h = Math.floor(min / 60)
    const m = min % 60
    return h > 0 ? (m > 0 ? `${h}h ${m}min` : `${h}h`) : `${m} min`
}

// ─── Modal: Validação de Aulas ────────────────────────────────────────────────
function ValidacaoModal({ onClose }) {
    const [aulas, setAulas] = useState([])
    const [loading, setLoading] = useState(true)
    const [confirming, setConfirming] = useState(null)
    const [toast, setToast] = useState(null)

    useEffect(() => {
        api.get('/aulas').then(data => setAulas(Array.isArray(data) ? data : [])).finally(() => setLoading(false))
    }, [])

    function showToast(msg, type = 'success') {
        setToast({ msg, type })
        setTimeout(() => setToast(null), 3000)
    }

    async function handleConfirm(id) {
        setConfirming(id)
        try {
            await fetch(`/api/aulas/${id}/estado`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${localStorage.getItem('token')}` },
                body: JSON.stringify({ id_estado: 2 })
            })
            setAulas(prev => prev.map(a => a.id_marcacoes === id ? { ...a, estado_marcacao: { id_estado: 2, nome: 'Confirmada' } } : a))
            showToast('Aula confirmada!')
        } catch { showToast('Erro ao confirmar.', 'error') }
        finally { setConfirming(null) }
    }

    const pendentes = aulas.filter(a => a.estado_marcacao?.id_estado === 1)

    return (
        <ModalWrapper title="Validação de Aulas" onClose={onClose}>
            {loading ? <Spinner /> : pendentes.length === 0 ? (
                <EmptyState icon={CheckCircle2} msg="Nenhuma aula pendente de validação." />
            ) : (
                <ul className="divide-y divide-[#4a6362]/10">
                    {pendentes.map(a => (
                        <li key={a.id_marcacoes} className="py-3.5 flex items-center justify-between gap-4">
                            <div>
                                <p className="font-semibold text-[#324B4A] text-sm">{a.modalidade?.nome ?? '—'}</p>
                                <p className="text-xs text-[#4A6362] mt-0.5">
                                    {formatDate(a.data_a_realizar)} · {formatTime(a.hora_inicio)} · {formatDuration(a.duracao_minutos)}
                                </p>
                                <p className="text-xs text-[#4A6362]">{a.sala?.nome ?? '—'}</p>
                            </div>
                            <button
                                onClick={() => handleConfirm(a.id_marcacoes)}
                                disabled={confirming === a.id_marcacoes}
                                className="shrink-0 flex items-center gap-1.5 px-3.5 py-1.5 bg-[#006A68] text-white text-xs font-bold rounded-xl hover:bg-[#00504E] transition-colors disabled:opacity-50"
                            >
                                {confirming === a.id_marcacoes ? <RefreshCw size={12} className="animate-spin" /> : <Check size={12} />}
                                Confirmar
                            </button>
                        </li>
                    ))}
                </ul>
            )}
            {toast && <Toast {...toast} />}
        </ModalWrapper>
    )
}

// ─── Modal: Histórico de Aulas ────────────────────────────────────────────────
const ESTADO_CFG = {
    1: { label: 'Pendente',   color: 'text-amber-600   bg-amber-50   border-amber-200' },
    2: { label: 'Confirmada', color: 'text-[#006A68]   bg-[#EFF5F4]  border-[#80D5D2]' },
    3: { label: 'Cancelada',  color: 'text-red-600     bg-red-50     border-red-200' },
    4: { label: 'Finalizado', color: 'text-[#006A68]   bg-[#CCE8E6]  border-[#006A68]' },
}

function HistoricoModal({ onClose }) {
    const [aulas, setAulas] = useState([])
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        api.get('/aulas/todas').then(data => setAulas(Array.isArray(data) ? data : [])).finally(() => setLoading(false))
    }, [])

    return (
        <ModalWrapper title="Histórico de Aulas" onClose={onClose} wide>
            {loading ? <Spinner /> : aulas.length === 0 ? (
                <EmptyState icon={BookOpen} msg="Nenhuma aula registada." />
            ) : (
                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="bg-[#EFF5F4] border-b border-[#4a6362]/20">
                                {['Modalidade', 'Data', 'Hora', 'Duração', 'Sala', 'Estado'].map(col => (
                                    <th key={col} className="px-3 py-2.5 text-left text-xs font-bold text-[#006A68] uppercase tracking-wide whitespace-nowrap">{col}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {aulas.map(a => {
                                const id_e = a.estado_marcacao?.id_estado
                                const cfg = ESTADO_CFG[id_e] ?? { label: a.estado_marcacao?.nome ?? '—', color: 'text-gray-500 bg-gray-50 border-gray-200' }
                                return (
                                    <tr key={a.id_marcacoes} className="border-b border-[#4a6362]/10 hover:bg-[#F4FBF9] transition-colors">
                                        <td className="px-3 py-3 font-semibold text-[#324B4A]">{a.modalidade?.nome ?? '—'}</td>
                                        <td className="px-3 py-3 text-gray-600 whitespace-nowrap">{formatDate(a.data_a_realizar)}</td>
                                        <td className="px-3 py-3 text-gray-600 whitespace-nowrap">{formatTime(a.hora_inicio)}</td>
                                        <td className="px-3 py-3 text-gray-600">{formatDuration(a.duracao_minutos)}</td>
                                        <td className="px-3 py-3 text-gray-600">{a.sala?.nome ?? '—'}</td>
                                        <td className="px-3 py-3">
                                            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-bold border ${cfg.color}`}>
                                                {cfg.label}
                                            </span>
                                        </td>
                                    </tr>
                                )
                            })}
                        </tbody>
                    </table>
                </div>
            )}
        </ModalWrapper>
    )
}

// ─── Modal: Horas de Coaching ─────────────────────────────────────────────────
function CoachingModal({ onClose }) {
    const [data, setData] = useState([])
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        api.get('/relatorio/horas-docente').then(d => setData(Array.isArray(d) ? d : [])).finally(() => setLoading(false))
    }, [])

    const totalMin = data.reduce((acc, d) => acc + (d._sum?.duracao_minutos ?? 0), 0)
    const totalSessoes = data.reduce((acc, d) => acc + (d._count ?? 0), 0)

    return (
        <ModalWrapper title="Horas de Coaching" onClose={onClose}>
            {loading ? <Spinner /> : data.length === 0 ? (
                <EmptyState icon={Clock} msg="Sem dados de coaching disponíveis." />
            ) : (
                <div>
                    {/* Summary */}
                    <div className="grid grid-cols-2 gap-3 mb-5">
                        <div className="bg-[#EFF5F4] rounded-xl p-4 text-center">
                            <p className="text-2xl font-bold text-[#006A68]">{formatDuration(totalMin)}</p>
                            <p className="text-xs text-[#4A6362] font-medium mt-1">Total de horas</p>
                        </div>
                        <div className="bg-[#EFF5F4] rounded-xl p-4 text-center">
                            <p className="text-2xl font-bold text-[#006A68]">{totalSessoes}</p>
                            <p className="text-xs text-[#4A6362] font-medium mt-1">Sessões concluídas</p>
                        </div>
                    </div>

                    <ul className="divide-y divide-[#4a6362]/10">
                        {data.map((d, i) => (
                            <li key={i} className="py-3 flex items-center justify-between">
                                <div className="flex items-center gap-2.5">
                                    <div className="w-7 h-7 rounded-full bg-[#CCE8E6] flex items-center justify-center">
                                        <span className="text-[#006A68] text-[11px] font-bold">D{i + 1}</span>
                                    </div>
                                    <div>
                                        <p className="text-sm font-semibold text-[#324B4A]">Docente #{d.id_docente}</p>
                                        <p className="text-xs text-[#4A6362]">{d._count ?? 0} sessões</p>
                                    </div>
                                </div>
                                <span className="text-sm font-bold text-[#006A68]">{formatDuration(d._sum?.duracao_minutos)}</span>
                            </li>
                        ))}
                    </ul>
                </div>
            )}
        </ModalWrapper>
    )
}

// ─── Modal: Extrato Mensal ────────────────────────────────────────────────────
function ExtratoModal({ onClose }) {
    const now = new Date()
    const [from, setFrom] = useState(`${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`)
    const [to, setTo] = useState(now.toISOString().split('T')[0])
    const [data, setData] = useState(null)
    const [loading, setLoading] = useState(false)

    async function fetchExtrato() {
        setLoading(true)
        try {
            const result = await api.get(`/relatorio/sessoes?from=${from}&to=${to}`)
            setData(Array.isArray(result) ? result : [])
        } catch {
            setData([])
        } finally {
            setLoading(false)
        }
    }

    async function handleExportCSV() {
        const token = localStorage.getItem('token')
        const res = await fetch(`/api/relatorio/exportar?from=${from}&to=${to}`, {
            headers: { Authorization: `Bearer ${token}` }
        })
        const blob = await res.blob()
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `extrato_${from}_${to}.csv`
        a.click()
        URL.revokeObjectURL(url)
    }

    const totalMin = data?.reduce((acc, s) => acc + (s.duracao_minutos ?? 0), 0) ?? 0

    return (
        <ModalWrapper title="Extrato Mensal" onClose={onClose} wide>
            {/* Date range picker */}
            <div className="flex flex-wrap items-end gap-3 mb-5 p-4 bg-[#EFF5F4] rounded-xl">
                <div>
                    <label className="text-[10px] font-bold text-[#4A6362] uppercase tracking-wider mb-1 block">De</label>
                    <input
                        type="date" value={from}
                        onChange={e => setFrom(e.target.value)}
                        className="text-sm border border-[#4a6362]/25 rounded-lg px-3 py-1.5 focus:outline-none focus:border-[#006A68] bg-white"
                    />
                </div>
                <div>
                    <label className="text-[10px] font-bold text-[#4A6362] uppercase tracking-wider mb-1 block">Até</label>
                    <input
                        type="date" value={to}
                        onChange={e => setTo(e.target.value)}
                        className="text-sm border border-[#4a6362]/25 rounded-lg px-3 py-1.5 focus:outline-none focus:border-[#006A68] bg-white"
                    />
                </div>
                <button
                    onClick={fetchExtrato}
                    className="px-4 py-1.5 bg-[#006A68] text-white text-xs font-bold rounded-xl hover:bg-[#00504E] transition-colors"
                >
                    Consultar
                </button>
            </div>

            {loading ? <Spinner /> : data === null ? (
                <EmptyState icon={Coins} msg="Seleciona um período e clica em Consultar." />
            ) : data.length === 0 ? (
                <EmptyState icon={Coins} msg="Sem sessões concluídas neste período." />
            ) : (
                <>
                    <div className="grid grid-cols-2 gap-3 mb-4">
                        <div className="bg-[#EFF5F4] rounded-xl p-4 text-center">
                            <p className="text-2xl font-bold text-[#006A68]">{data.length}</p>
                            <p className="text-xs text-[#4A6362] font-medium mt-1">Sessões</p>
                        </div>
                        <div className="bg-[#EFF5F4] rounded-xl p-4 text-center">
                            <p className="text-2xl font-bold text-[#006A68]">{formatDuration(totalMin)}</p>
                            <p className="text-xs text-[#4A6362] font-medium mt-1">Total de horas</p>
                        </div>
                    </div>

                    <div className="overflow-x-auto mb-4">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="bg-[#EFF5F4] border-b border-[#4a6362]/20">
                                    {['Data', 'Hora', 'Duração', 'Modalidade', 'Sala'].map(c => (
                                        <th key={c} className="px-3 py-2.5 text-left text-xs font-bold text-[#006A68] uppercase tracking-wide">{c}</th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {data.map(s => (
                                    <tr key={s.id_marcacoes} className="border-b border-[#4a6362]/10 hover:bg-[#F4FBF9]">
                                        <td className="px-3 py-2.5 whitespace-nowrap">{formatDate(s.data_a_realizar)}</td>
                                        <td className="px-3 py-2.5 whitespace-nowrap">{formatTime(s.hora_inicio)}</td>
                                        <td className="px-3 py-2.5">{formatDuration(s.duracao_minutos)}</td>
                                        <td className="px-3 py-2.5">{s.modalidade?.nome ?? '—'}</td>
                                        <td className="px-3 py-2.5">{s.sala?.nome ?? '—'}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    <button
                        onClick={handleExportCSV}
                        className="flex items-center gap-2 text-xs font-bold text-[#006A68] hover:text-[#00504E] transition-colors"
                    >
                        <ExternalLink size={13} /> Exportar CSV
                    </button>
                </>
            )}
        </ModalWrapper>
    )
}

// ─── Shared Primitives ────────────────────────────────────────────────────────
function ModalWrapper({ title, onClose, children, wide = false }) {
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
            <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" />
            <div
                className={`relative bg-white rounded-2xl shadow-2xl flex flex-col overflow-hidden w-full ${wide ? 'max-w-2xl' : 'max-w-lg'} max-h-[85vh]`}
                onClick={e => e.stopPropagation()}
            >
                <div className="bg-[#EFF5F4] border-b-2 border-[#006A68] px-6 py-4 flex items-center justify-between shrink-0">
                    <h3 className="font-bold text-[#006A68] text-lg font-['Sora']">{title}</h3>
                    <button onClick={onClose} className="w-8 h-8 rounded-full hover:bg-[#CCE8E6] flex items-center justify-center text-[#4A6362] transition-colors">
                        <X size={16} />
                    </button>
                </div>
                <div className="flex-1 overflow-y-auto px-6 py-5">{children}</div>
            </div>
        </div>
    )
}

function Spinner() {
    return (
        <div className="flex items-center justify-center py-12 text-[#006A68]">
            <RefreshCw size={24} className="animate-spin" />
        </div>
    )
}

function EmptyState({ icon: Icon, msg }) {
    return (
        <div className="flex flex-col items-center justify-center py-12 text-center">
            <Icon size={40} className="text-[#006A68]/20 mb-3" />
            <p className="text-sm text-[#4A6362]">{msg}</p>
        </div>
    )
}

function Toast({ msg, type }) {
    return (
        <div className={`fixed bottom-6 right-6 z-[60] flex items-center gap-3 px-5 py-3 rounded-xl shadow-lg text-white font-['Sora'] text-sm font-medium
            ${type === 'success' ? 'bg-emerald-600' : 'bg-red-600'}`}>
            {type === 'success' ? <Check size={15} /> : <AlertCircle size={15} />}
            {msg}
        </div>
    )
}

// ─── Action Card ──────────────────────────────────────────────────────────────
function ActionCard({ title, icon: Icon, onClick, description }) {
    return (
        <button
            onClick={onClick}
            className="group relative bg-[#CCE8E6] hover:bg-[#B8E0DE] transition-all rounded-2xl p-6 text-left w-full h-[171px] flex flex-col justify-between overflow-hidden shadow-sm hover:shadow-md"
        >
            <p className="font-bold text-[#000] text-[17px] leading-[143%] tracking-[0.17px] max-w-[180px] font-['Sora']">
                {title}
            </p>
            {description && (
                <p className="text-xs text-[#4A6362] line-clamp-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    {description}
                </p>
            )}
            <div className="flex items-end justify-between">
                <div className="flex items-center gap-1.5 text-xs font-semibold text-[#006A68] opacity-0 group-hover:opacity-100 transition-all translate-y-1 group-hover:translate-y-0">
                    Abrir <ChevronRight size={13} />
                </div>
                <div className="w-10 h-10 rounded-xl bg-black/10 group-hover:bg-[#006A68] transition-colors flex items-center justify-center">
                    <Icon size={20} className="text-black group-hover:text-white transition-colors" />
                </div>
            </div>
        </button>
    )
}

// ─── Novidades panel ──────────────────────────────────────────────────────────
function Novidades() {
    const [anuncios, setAnuncios] = useState([])
    const [loading, setLoading] = useState(true)
    const [selected, setSelected] = useState(null)

    useEffect(() => {
        // Anúncios vêm do endpoint /api/anuncios (via route do grupo ou evento)
        // Fallback: se o endpoint não existir ainda, mostramos placeholder
        api.get('/anuncios')
            .then(d => setAnuncios(Array.isArray(d) ? d : []))
            .catch(() => setAnuncios([]))
            .finally(() => setLoading(false))
    }, [])

    return (
        <div className="bg-[#CCE8E6] rounded-2xl p-5 flex flex-col h-full min-h-[400px]">
            <div className="flex items-center gap-2 mb-4">
                <Megaphone size={18} className="text-[#006A68]" />
                <h3 className="font-bold text-black text-[17px] tracking-[0.17px] font-['Sora']">Novidades</h3>
            </div>

            {loading ? (
                <div className="flex-1 flex items-center justify-center">
                    <RefreshCw size={20} className="text-[#006A68] animate-spin" />
                </div>
            ) : anuncios.length === 0 ? (
                // Placeholder bars (matching Figma skeleton)
                <div className="flex flex-col gap-3 flex-1">
                    {[...Array(9)].map((_, i) => (
                        <div key={i} className="h-[38px] rounded-xl bg-[#B0CCCA] opacity-80" />
                    ))}
                </div>
            ) : (
                <ul className="flex flex-col gap-2.5 flex-1 overflow-y-auto hide-scrollbar">
                    {anuncios.map(a => (
                        <li key={a.id_anuncio}>
                            <button
                                onClick={() => setSelected(selected?.id_anuncio === a.id_anuncio ? null : a)}
                                className="w-full text-left bg-[#B0CCCA] hover:bg-[#006A68]/20 transition-colors rounded-xl px-3.5 py-2.5"
                            >
                                <div className="flex items-start justify-between gap-2">
                                    <p className="text-xs font-bold text-[#324B4A] leading-snug line-clamp-1">{a.titulo}</p>
                                    <ChevronRight size={12} className={`shrink-0 text-[#4A6362] mt-0.5 transition-transform ${selected?.id_anuncio === a.id_anuncio ? 'rotate-90' : ''}`} />
                                </div>
                                {a.data_envio && (
                                    <p className="text-[10px] text-[#4A6362] mt-0.5">{formatDate(a.data_envio)}</p>
                                )}
                            </button>
                            {selected?.id_anuncio === a.id_anuncio && (
                                <div className="bg-white/60 rounded-xl px-3.5 py-2.5 mt-1 text-xs text-[#324B4A] leading-relaxed">
                                    {a.mensagem ?? 'Sem conteúdo.'}
                                </div>
                            )}
                        </li>
                    ))}
                </ul>
            )}
        </div>
    )
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function Escola() {
    const navigate = useNavigate()
    const [modal, setModal] = useState(null) // 'validacao' | 'historico' | 'coaching' | 'extrato'

    const cards = [
        {
            key: 'validacao',
            title: 'Validação de Aulas',
            icon: CalendarCheck,
            description: 'Confirma as aulas pendentes das próximas 48h',
        },
        {
            key: 'historico',
            title: 'Histórico de Aulas',
            icon: BookOpen,
            description: 'Consulta o historial completo de marcações',
        },
        {
            key: 'coaching',
            title: 'Consultar Horas de Coaching',
            icon: Clock,
            description: 'Total de horas e sessões por docente',
        },
        {
            key: 'extrato',
            title: 'Consultar Extrato Mensal',
            icon: Coins,
            description: 'Sessões concluídas num intervalo de datas',
        },
    ]

    return (
        <>
            <div className="font-['Sora']">
                {/* Header */}
                <div className="mb-8">
                    <p className="text-[#4A6362] text-sm font-medium tracking-wide mb-1">Serviços & Documentação</p>
                    <h1 className="text-[#324B4A] font-normal text-4xl leading-tight tracking-tight flex items-center gap-3">
                        <span className="w-10 h-10 bg-[#006A68] rounded-xl flex items-center justify-center shrink-0">
                            <BookOpen size={20} className="text-white" />
                        </span>
                        <span>Escola</span>
                    </h1>
                </div>

                {/* Content: 2-col grid + Novidades */}
                <div className="flex flex-col lg:flex-row gap-6">

                    {/* Left: 2x2 cards */}
                    <div className="flex-1">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                            {cards.map(card => (
                                <ActionCard
                                    key={card.key}
                                    title={card.title}
                                    icon={card.icon}
                                    description={card.description}
                                    onClick={() => setModal(card.key)}
                                />
                            ))}
                        </div>
                    </div>

                    {/* Right: Novidades */}
                    <div className="w-full lg:w-[302px] shrink-0">
                        <Novidades />
                    </div>
                </div>
            </div>

            {/* Modals */}
            {modal === 'validacao' && <ValidacaoModal onClose={() => setModal(null)} />}
            {modal === 'historico' && <HistoricoModal onClose={() => setModal(null)} />}
            {modal === 'coaching'  && <CoachingModal  onClose={() => setModal(null)} />}
            {modal === 'extrato'   && <ExtratoModal   onClose={() => setModal(null)} />}
        </>
    )
}