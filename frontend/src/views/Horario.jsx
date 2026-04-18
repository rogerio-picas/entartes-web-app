import { useState, useEffect, useCallback } from 'react'
import {
    CalendarDays, Clock, User, MapPin, Music, CheckCircle2,
    XCircle, AlertCircle, RefreshCw, Plus, X, ChevronDown,
    Filter, BookOpen, ArrowUpDown, Check
} from 'lucide-react'
import { horarioService } from '../services/horarioService'
import { authService } from '../services/authService'
import NovaDisponibilidadeModal from './NovaDisponibilidadeModal'

// ─── Estado config ────────────────────────────────────────────────────────────
const STATUS_CFG = {
    1: { label: 'Pendente',    icon: AlertCircle,  dot: '!', textColor: 'text-amber-600',   bg: 'bg-amber-50',   border: 'border-amber-200' },
    2: { label: 'Confirmado',  icon: Check,         dot: '✓', textColor: 'text-[#006A68]',   bg: 'bg-[#EFF5F4]',  border: 'border-[#80D5D2]' },
    3: { label: 'Cancelado',   icon: XCircle,       dot: '✗', textColor: 'text-red-600',     bg: 'bg-red-50',     border: 'border-red-200' },
    4: { label: 'Finalizado',  icon: CheckCircle2,  dot: '✓', textColor: 'text-[#006A68]',   bg: 'bg-[#CCE8E6]',  border: 'border-[#006A68]' },
}

function getStatus(id_estado, nome) {
    if (STATUS_CFG[id_estado]) return STATUS_CFG[id_estado]
    const n = (nome ?? '').toLowerCase()
    if (n.includes('pend'))    return STATUS_CFG[1]
    if (n.includes('confirm')) return STATUS_CFG[2]
    if (n.includes('cancel'))  return STATUS_CFG[3]
    if (n.includes('conclu') || n.includes('finaliz')) return STATUS_CFG[4]
    return { label: nome ?? '—', dot: '?', textColor: 'text-gray-500', bg: 'bg-gray-50', border: 'border-gray-200' }
}

// ─── Modal Detalhe ─────────────────────────────────────────────────────────────
function AulaModal({ aula, onClose }) {
    if (!aula) return null
    const cfg = getStatus(aula.id_estado, aula.estado_nome)
    const StatusIcon = cfg.icon

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
            <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" />
            <div
                className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden"
                onClick={e => e.stopPropagation()}
            >
                {/* Header */}
                <div className="bg-[#EFF5F4] border-b-2 border-[#006A68] px-6 py-5 flex items-start justify-between">
                    <div>
                        <p className="text-[#4A6362] text-xs font-medium tracking-widest uppercase mb-1">Detalhe da Aula</p>
                        <h3 className="text-[#006A68] font-bold text-xl">{aula.modalidade}</h3>
                    </div>
                    <button
                        onClick={onClose}
                        className="w-8 h-8 rounded-full bg-white/80 flex items-center justify-center hover:bg-white transition-colors text-[#4A6362]"
                    >
                        <X size={16} />
                    </button>
                </div>

                {/* Body */}
                <div className="px-6 py-6 space-y-4">
                    {/* Estado */}
                    <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold border ${cfg.bg} ${cfg.textColor} ${cfg.border}`}>
                        {StatusIcon && <StatusIcon size={13} />}
                        {cfg.label}
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <InfoItem icon={CalendarDays} label="Data" value={aula.data} />
                        <InfoItem icon={Clock} label="Hora" value={aula.hora} />
                        <InfoItem icon={Clock} label="Duração" value={aula.duracao} />
                        <InfoItem icon={MapPin} label="Sala / Estúdio" value={aula.sala} />
                        <InfoItem icon={User} label="Professor" value={aula.docente} />
                        <InfoItem icon={Music} label="Modalidade" value={aula.modalidade} />
                    </div>

                    {aula.alunos && aula.alunos.length > 0 && (
                        <div>
                            <p className="text-xs font-semibold text-[#4A6362] uppercase tracking-wider mb-2">
                                Alunos inscritos ({aula.alunos.length}
                                {aula.numero_alunos_pretendidos ? `/${aula.numero_alunos_pretendidos}` : ''})
                            </p>
                            <div className="flex flex-wrap gap-1.5">
                                {aula.alunos.map((a, i) => (
                                    <span key={i} className="text-xs bg-[#CCE8E6] text-[#006A68] px-2.5 py-1 rounded-full font-medium">
                                        {a}
                                    </span>
                                ))}
                            </div>
                        </div>
                    )}
                </div>

                <div className="px-6 pb-6">
                    <button
                        onClick={onClose}
                        className="w-full py-2.5 rounded-xl bg-[#006A68] text-white font-semibold text-sm hover:bg-[#00504E] transition-colors"
                    >
                        Fechar
                    </button>
                </div>
            </div>
        </div>
    )
}

function InfoItem({ icon: Icon, label, value }) {
    return (
        <div className="flex items-start gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-[#CCE8E6] flex items-center justify-center shrink-0 mt-0.5">
                <Icon size={14} className="text-[#006A68]" />
            </div>
            <div>
                <p className="text-[10px] uppercase tracking-wider text-[#4A6362] font-semibold">{label}</p>
                <p className="text-sm font-medium text-gray-800">{value}</p>
            </div>
        </div>
    )
}

// ─── Modal Inscrever ────────────────────────────────────────────────────────────
function InscreverModal({ onClose, onSuccess }) {
    const [aulas, setAulas] = useState([])
    const [loading, setLoading] = useState(true)
    const [inscrevendo, setInscrevendo] = useState(null)
    const [erro, setErro] = useState('')

    useEffect(() => {
        horarioService.getAulasDisponiveis()
            .then(setAulas)
            .catch(e => setErro(e.message))
            .finally(() => setLoading(false))
    }, [])

    async function handleInscrever(id) {
        setInscrevendo(id)
        setErro('')
        try {
            await horarioService.inscrever(id)
            onSuccess()
        } catch (e) {
            setErro(e.message)
        } finally {
            setInscrevendo(null)
        }
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
            <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" />
            <div
                className="relative bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[80vh] flex flex-col overflow-hidden"
                onClick={e => e.stopPropagation()}
            >
                <div className="bg-[#EFF5F4] border-b-2 border-[#006A68] px-6 py-5 flex items-center justify-between shrink-0">
                    <div>
                        <p className="text-[#4A6362] text-xs font-medium tracking-widest uppercase mb-1">Inscrição</p>
                        <h3 className="text-[#006A68] font-bold text-xl">Aulas Disponíveis</h3>
                    </div>
                    <button onClick={onClose} className="w-8 h-8 rounded-full bg-white/80 flex items-center justify-center hover:bg-white text-[#4A6362]">
                        <X size={16} />
                    </button>
                </div>

                <div className="overflow-y-auto flex-1 px-6 py-4">
                    {erro && (
                        <div className="mb-4 flex items-center gap-2 bg-red-50 text-red-700 text-sm px-4 py-3 rounded-xl border border-red-200">
                            <AlertCircle size={15} /> {erro}
                        </div>
                    )}

                    {loading ? (
                        <div className="flex items-center justify-center py-12 text-[#006A68]">
                            <RefreshCw size={24} className="animate-spin" />
                        </div>
                    ) : aulas.length === 0 ? (
                        <div className="text-center py-12">
                            <CalendarDays size={40} className="mx-auto text-[#006A68]/20 mb-3" />
                            <p className="text-sm text-[#4A6362]">Sem aulas disponíveis de momento.</p>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {aulas.map(aula => {
                                const cfg = getStatus(aula.id_estado, aula.estado_nome)
                                return (
                                    <div key={aula.id} className="flex items-center gap-4 p-4 rounded-xl border border-[#4a6362]/15 hover:border-[#006A68]/30 hover:bg-[#F4FBF9] transition-all">
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2 mb-1">
                                                <span className="font-semibold text-[#324B4A] text-sm">{aula.modalidade}</span>
                                                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${cfg.bg} ${cfg.textColor} ${cfg.border}`}>
                                                    {cfg.label}
                                                </span>
                                            </div>
                                            <div className="flex flex-wrap gap-x-4 gap-y-0.5 text-xs text-[#4A6362]">
                                                <span>{aula.data} · {aula.hora}</span>
                                                <span>{aula.duracao}</span>
                                                <span>{aula.docente}</span>
                                                <span>{aula.sala}</span>
                                                {aula.vagas_disponiveis !== null && (
                                                    <span className={aula.vagas_disponiveis === 0 ? 'text-red-500 font-semibold' : ''}>
                                                        {aula.vagas_disponiveis} vaga{aula.vagas_disponiveis !== 1 ? 's' : ''}
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                        <button
                                            onClick={() => handleInscrever(aula.id)}
                                            disabled={inscrevendo === aula.id || aula.ja_inscrito || aula.vagas_disponiveis === 0}
                                            className={`shrink-0 px-4 py-2 rounded-xl text-xs font-bold transition-all
                                                ${aula.ja_inscrito
                                                    ? 'bg-[#CCE8E6] text-[#006A68] cursor-default'
                                                    : aula.vagas_disponiveis === 0
                                                        ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                                                        : 'bg-[#006A68] text-white hover:bg-[#00504E]'
                                                }`}
                                        >
                                            {inscrevendo === aula.id
                                                ? <RefreshCw size={13} className="animate-spin" />
                                                : aula.ja_inscrito
                                                    ? 'Inscrito'
                                                    : aula.vagas_disponiveis === 0
                                                        ? 'Lotado'
                                                        : 'Inscrever'}
                                        </button>
                                    </div>
                                )
                            })}
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────
function SkeletonRow() {
    return (
        <tr className="animate-pulse border-b border-[#4a6362]/10">
            {[...Array(8)].map((_, i) => (
                <td key={i} className="px-4 py-4">
                    <div className="h-4 bg-gray-100 rounded-lg mx-auto" style={{ width: `${60 + (i % 3) * 15}%` }} />
                </td>
            ))}
        </tr>
    )
}

// ─── Status Badge ──────────────────────────────────────────────────────────────
function StatusBadge({ id_estado, estado_nome }) {
    const cfg = getStatus(id_estado, estado_nome)
    const StatusIcon = cfg.icon
    return (
        <span className={`inline-flex items-center gap-1.5 text-xs font-bold px-2.5 py-1 rounded-full border whitespace-nowrap ${cfg.bg} ${cfg.textColor} ${cfg.border}`}>
            {StatusIcon && <StatusIcon size={11} />}
            {cfg.label}
        </span>
    )
}

// ─── Página Principal ──────────────────────────────────────────────────────────
export default function Horario() {
    const [aulas, setAulas] = useState([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState('')
    const [modalAula, setModalAula] = useState(null)
    const [showInscrever, setShowInscrever] = useState(false)
    const [showDisponibilidade, setShowDisponibilidade] = useState(false)
    const [filtroEstado, setFiltroEstado] = useState('todos')
    const [filtroModalidade, setFiltroModalidade] = useState('todas')
    const [toast, setToast] = useState(null)

    const user = authService.getUser()
    const role = user?.role

    const showToast = (msg, type = 'success') => {
        setToast({ msg, type })
        setTimeout(() => setToast(null), 3500)
    }

    const fetchAulas = useCallback(async () => {
        setLoading(true)
        setError('')
        try {
            const data = await horarioService.getMinhasAulas()
            setAulas(data)
        } catch (e) {
            setError(e.message || 'Erro ao carregar horário.')
        } finally {
            setLoading(false)
        }
    }, [])

    useEffect(() => { fetchAulas() }, [fetchAulas])

    // Filtros
    const modalidades = ['todas', ...new Set(aulas.map(a => a.modalidade).filter(Boolean))]
    const estados = ['todos', ...new Set(aulas.map(a => a.estado_nome).filter(Boolean))]

    const aulasFiltradas = aulas.filter(a => {
        if (filtroEstado !== 'todos' && a.estado_nome !== filtroEstado) return false
        if (filtroModalidade !== 'todas' && a.modalidade !== filtroModalidade) return false
        return true
    })

    // Resumo por estado
    const counts = aulas.reduce((acc, a) => {
        acc[a.id_estado] = (acc[a.id_estado] ?? 0) + 1
        return acc
    }, {})

    return (
        <>
            <div className="font-['Sora'] max-w-[1400px] mx-auto">

                {/* Header */}
                <div className="flex flex-wrap items-end justify-between gap-4 mb-8">
                    <div>
                        <p className="text-[#4A6362] text-sm font-medium tracking-wide mb-1">
                            {role === 2 ? 'As minhas sessões' : role === 1 ? 'Gestão de Horários' : 'O meu plano de aulas'}
                        </p>
                        <h1 className="text-[#324B4A] font-normal text-4xl leading-tight tracking-tight">
                            As minhas <span className="text-[#006A68] font-semibold">aulas</span>
                        </h1>
                    </div>

                    <div className="flex items-center gap-3">
                        <button
                            onClick={fetchAulas}
                            disabled={loading}
                            title="Atualizar"
                            className="w-9 h-9 rounded-full border border-[#4a6362]/30 flex items-center justify-center hover:bg-[#EFF5F4] transition-colors disabled:opacity-40"
                        >
                            <RefreshCw size={15} className={`text-[#4A6362] ${loading ? 'animate-spin' : ''}`} />
                        </button>

                        {role === 2 && (
                            <button
                                onClick={() => setShowDisponibilidade(true)}
                                className="flex items-center gap-2 px-5 py-2.5 bg-[#006A68] text-white rounded-xl text-sm font-bold hover:bg-[#00504E] transition-colors shadow-sm"
                            >
                                <Plus size={16} />
                                Nova disponibilidade
                            </button>
                        )}

                        {role === 3 && (
                            <button
                                onClick={() => setShowInscrever(true)}
                                className="flex items-center gap-2 px-5 py-2.5 bg-[#006A68] text-white rounded-xl text-sm font-bold hover:bg-[#00504E] transition-colors shadow-sm"
                            >
                                <Plus size={16} />
                                Inscrever em aula
                            </button>
                        )}
                    </div>
                </div>

                {/* Filtros */}
                {!loading && aulas.length > 0 && (
                    <div className="flex flex-wrap items-center gap-3 mb-6">
                        <div className="flex items-center gap-1.5 text-xs font-semibold text-[#4A6362]">
                            <Filter size={13} />
                            Filtrar:
                        </div>

                        {/* Filtro modalidade */}
                        <div className="relative">
                            <select
                                value={filtroModalidade}
                                onChange={e => setFiltroModalidade(e.target.value)}
                                className="appearance-none pl-3 pr-8 py-1.5 rounded-lg border border-[#4a6362]/25 text-xs font-medium text-[#324B4A] bg-white focus:outline-none focus:border-[#006A68] cursor-pointer"
                            >
                                <option value="todas">Todas as modalidades</option>
                                {modalidades.filter(m => m !== 'todas').map(m => (
                                    <option key={m} value={m}>{m}</option>
                                ))}
                            </select>
                            <ChevronDown size={12} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#4A6362] pointer-events-none" />
                        </div>

                        {/* Filtro estado */}
                        <div className="relative">
                            <select
                                value={filtroEstado}
                                onChange={e => setFiltroEstado(e.target.value)}
                                className="appearance-none pl-3 pr-8 py-1.5 rounded-lg border border-[#4a6362]/25 text-xs font-medium text-[#324B4A] bg-white focus:outline-none focus:border-[#006A68] cursor-pointer"
                            >
                                <option value="todos">Todos os estados</option>
                                {estados.filter(e => e !== 'todos').map(e => (
                                    <option key={e} value={e}>{e}</option>
                                ))}
                            </select>
                            <ChevronDown size={12} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#4A6362] pointer-events-none" />
                        </div>

                        {(filtroEstado !== 'todos' || filtroModalidade !== 'todas') && (
                            <button
                                onClick={() => { setFiltroEstado('todos'); setFiltroModalidade('todas') }}
                                className="text-xs text-red-500 font-medium hover:text-red-700 flex items-center gap-1"
                            >
                                <X size={11} /> Limpar filtros
                            </button>
                        )}

                        <span className="ml-auto text-xs text-[#4A6362]">
                            {aulasFiltradas.length} aula{aulasFiltradas.length !== 1 ? 's' : ''}
                        </span>
                    </div>
                )}

                {/* Erro */}
                {error && (
                    <div className="mb-6 flex items-center gap-2 bg-red-50 text-red-700 text-sm px-4 py-3 rounded-xl border border-red-200">
                        <AlertCircle size={16} />
                        {error}
                        <button onClick={fetchAulas} className="ml-auto underline text-xs">Tentar novamente</button>
                    </div>
                )}

                {/* Tabela */}
                <div className="rounded-2xl border border-[#4a6362]/20 overflow-hidden shadow-sm bg-white">
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="bg-[#EFF5F4] border-b-2 border-[#4a6362]/20">
                                {['Modalidade', 'Data', 'Hora', 'Duração', 'Professor', 'Sala', 'Estado', ''].map((col, i) => (
                                    <th
                                        key={col || i}
                                        className="px-4 py-3.5 text-left text-xs font-bold text-[#006A68] uppercase tracking-wider whitespace-nowrap"
                                    >
                                        {col && (
                                            <span className="flex items-center gap-1">
                                                {col}
                                                {col && col !== '' && <ArrowUpDown size={10} className="text-[#006A68]/30" />}
                                            </span>
                                        )}
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                [...Array(6)].map((_, i) => <SkeletonRow key={i} />)
                            ) : aulasFiltradas.length === 0 ? (
                                <tr>
                                    <td colSpan={8} className="py-20 text-center">
                                        <BookOpen size={40} className="mx-auto text-[#006A68]/15 mb-3" />
                                        <p className="text-sm text-[#4A6362] font-medium">
                                            {aulas.length === 0
                                                ? 'Ainda não tens aulas registadas.'
                                                : 'Nenhuma aula corresponde aos filtros.'}
                                        </p>
                                        {role === 3 && aulas.length === 0 && (
                                            <button
                                                onClick={() => setShowInscrever(true)}
                                                className="mt-4 inline-flex items-center gap-2 px-4 py-2 bg-[#006A68] text-white rounded-xl text-xs font-bold hover:bg-[#00504E] transition-colors"
                                            >
                                                <Plus size={13} /> Inscrever em aula
                                            </button>
                                        )}
                                    </td>
                                </tr>
                            ) : (
                                aulasFiltradas.map((aula, idx) => (
                                    <tr
                                        key={aula.id}
                                        className={`border-b border-[#4a6362]/10 hover:bg-[#F4FBF9] transition-colors ${idx % 2 === 0 ? '' : 'bg-[#FAFFFE]'}`}
                                    >
                                        <td className="px-4 py-4">
                                            <div className="flex items-center gap-2">
                                                <div className="w-1.5 h-8 rounded-full bg-[#80D5D2] shrink-0" />
                                                <span className="font-semibold text-[#324B4A]">{aula.modalidade}</span>
                                            </div>
                                        </td>
                                        <td className="px-4 py-4 text-gray-700 whitespace-nowrap">{aula.data}</td>
                                        <td className="px-4 py-4 text-gray-700 whitespace-nowrap font-medium">{aula.hora}</td>
                                        <td className="px-4 py-4 text-gray-700 whitespace-nowrap">{aula.duracao}</td>
                                        <td className="px-4 py-4">
                                            <div className="flex items-center gap-2">
                                                <div className="w-7 h-7 rounded-full bg-[#CCE8E6] flex items-center justify-center shrink-0">
                                                    <span className="text-[#006A68] text-[10px] font-bold">
                                                        {aula.docente !== '—' ? aula.docente.charAt(0).toUpperCase() : '?'}
                                                    </span>
                                                </div>
                                                <span className="text-gray-700 text-sm">{aula.docente}</span>
                                            </div>
                                        </td>
                                        <td className="px-4 py-4 text-gray-700">{aula.sala}</td>
                                        <td className="px-4 py-4">
                                            <StatusBadge id_estado={aula.id_estado} estado_nome={aula.estado_nome} />
                                        </td>
                                        <td className="px-4 py-4">
                                            <button
                                                onClick={() => setModalAula(aula)}
                                                className="px-3.5 py-1.5 rounded-lg bg-[#CCE8E6] text-[#006A68] text-xs font-bold hover:bg-[#006A68] hover:text-white transition-colors whitespace-nowrap"
                                            >
                                                Ver mais
                                            </button>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Resumo pills */}
                {!loading && aulas.length > 0 && (
                    <div className="mt-5 flex flex-wrap gap-2.5">
                        {Object.entries(STATUS_CFG).map(([idE, cfg]) => {
                            const c = counts[Number(idE)] ?? 0
                            if (c === 0) return null
                            const Icon = cfg.icon
                            return (
                                <div key={idE} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border ${cfg.bg} ${cfg.textColor} ${cfg.border}`}>
                                    {Icon && <Icon size={12} />}
                                    {cfg.label}: <strong>{c}</strong>
                                </div>
                            )
                        })}
                        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-gray-100 text-gray-600 border border-gray-200">
                            Total: <strong>{aulas.length}</strong>
                        </div>
                    </div>
                )}
            </div>

            {/* Modais */}
            {modalAula && (
                <AulaModal aula={modalAula} onClose={() => setModalAula(null)} />
            )}

            {showDisponibilidade && (
                <NovaDisponibilidadeModal
                    onClose={() => setShowDisponibilidade(false)}
                    onSuccess={() => {
                        setShowDisponibilidade(false)
                        showToast('Disponibilidade criada com sucesso!')
                    }}
                />
            )}

            {showInscrever && (
                <InscreverModal
                    onClose={() => setShowInscrever(false)}
                    onSuccess={() => {
                        setShowInscrever(false)
                        showToast('Inscrição realizada com sucesso!')
                        fetchAulas()
                    }}
                />
            )}

            {/* Toast */}
            {toast && (
                <div className={`fixed bottom-6 right-6 z-50 flex items-center gap-3 px-5 py-3 rounded-xl shadow-lg text-white font-['Sora'] text-sm font-medium
                    ${toast.type === 'success' ? 'bg-emerald-600' : 'bg-red-600'}`}>
                    {toast.type === 'success' ? <Check size={16} /> : <X size={16} />}
                    {toast.msg}
                    <button onClick={() => setToast(null)} className="ml-2 opacity-70 hover:opacity-100"><X size={14} /></button>
                </div>
            )}
        </>
    )
}