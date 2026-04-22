import { useState, useEffect, useCallback } from 'react'
import {
    ArrowUpDown, Plus, RefreshCw, AlertCircle, CheckCircle2,
    XCircle, Clock, Check, X, BookOpen, Filter, ChevronDown
} from 'lucide-react'
import coachingService from '../services/coachingService'
import NovoEventoModal from './NovoEventoModal'

// ─── Status config ─────────────────────────────────────────────────────────────
const ESTADOS = {
    1: { label: 'Pendente',     icon: '!', color: 'text-[#C32E81]' },
    2: { label: 'Em Validação', icon: '?', color: 'text-[#F59E0B]' },
    3: { label: 'Confirmada',   icon: '✓', color: 'text-[#45C92B]' },
    4: { label: 'Concluída',    icon: '★', color: 'text-[#006A68]' },
    5: { label: 'Cancelada',    icon: '✗', color: 'text-[#BA1A1A]' },
}
function getEstado(id, nome) {
    if (ESTADOS[id]) return ESTADOS[id]
    const n = (nome ?? '').toLowerCase()
    if (n.includes('pend'))    return ESTADOS[1]
    if (n.includes('confirm')) return ESTADOS[2]
    if (n.includes('cancel'))  return ESTADOS[3]
    if (n.includes('conclu') || n.includes('finaliz')) return ESTADOS[4]
    if (n.includes('decor'))   return ESTADOS[5]
    return { label: nome ?? '—', icon: '', color: 'text-gray-600', ring: '' }
}

// ─── Circular progress badge ──────────────────────────────────────────────────
function CircleCount({ count, total }) {
    const pct = total ? Math.round(count / total * 100) : 0
    const r = 14, circ = 2 * Math.PI * r
    const dash = (pct / 100) * circ
    return (
        <div className="relative w-10 h-10 flex items-center justify-center">
            <svg viewBox="0 0 36 36" className="absolute inset-0 w-full h-full -rotate-90">
                <circle cx="18" cy="18" r={r} fill="none" stroke="#E3E9E8" strokeWidth="4" />
                <circle cx="18" cy="18" r={r} fill="none" stroke="#006A68" strokeWidth="4"
                    strokeDasharray={`${dash} ${circ}`} strokeLinecap="round" />
            </svg>
            <span className="text-[11px] font-bold text-[#006A68] relative">{count}</span>
        </div>
    )
}

// ─── Skeleton row ─────────────────────────────────────────────────────────────
function SkeletonRow() {
    return (
        <div className="flex items-center border-b border-[#4a6362]/25 animate-pulse">
            {[...Array(7)].map((_, i) => (
                <div key={i} className={`flex-1 px-4 py-4 ${i < 6 ? 'border-r border-[#4a6362]/25' : ''}`}>
                    <div className="h-4 bg-gray-100 rounded-lg w-3/4 mx-auto" />
                </div>
            ))}
        </div>
    )
}

// ─── Table header col ─────────────────────────────────────────────────────────
function TH({ children }) {
    return (
        <div className="flex-1 flex items-center justify-center gap-1.5 px-3 py-3 border-r border-[#4a6362]/40 last:border-r-0">
            <span className="font-bold text-[#4A6362]/80 text-sm tracking-wide">{children}</span>
            <ArrowUpDown size={12} className="text-[#4A6362]/40" />
        </div>
    )
}

// ─── Main component ───────────────────────────────────────────────────────────
export default function AulasAdmin() {
    const [aulas, setAulas] = useState([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState('')
    const [filtroEstado, setFiltroEstado] = useState('todos')
    const [filtroModalidade, setFiltroModalidade] = useState('todas')
    const [showNovoEvento, setShowNovoEvento] = useState(false)
    const [toast, setToast] = useState(null)

    function showToast(msg, type = 'success') {
        setToast({ msg, type })
        setTimeout(() => setToast(null), 3000)
    }

    const fetchAulas = useCallback(async () => {
        setLoading(true)
        setError('')
        try {
            // Passamos os estados todos para a coordenadora poder ver o histórico e cancelar confirmadas
            const response = await coachingService.listarPedidosPendentes({ estados: '1,2,3,4,5' })
            
            // A instância da API pode retornar diretamente o array, validamos isso:
            const rawData = Array.isArray(response) ? response : (response?.data || [])
            
            const formatted = rawData.map(m => {
                const dt = m.data ? new Date(m.data) : null;
                const hr = m.hora_inicio ? new Date(m.hora_inicio) : null;
                
                return {
                id: m.id_marcacao,
                data: (dt && !isNaN(dt)) ? dt.toLocaleDateString('pt-PT') : '—',
                hora: (hr && !isNaN(hr)) ? hr.toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit' }) : '—',
                docente: m.docente || '—',
                modalidade: m.modalidade || '—',
                numero_alunos_pretendidos: m.numero_alunos_pretendidos,
                alunos: m.alunos || [],
                id_estado: m.id_estado,
                estado_nome: m.estado || '—',
                sala: m.sala_atual || '—'
            }})
            setAulas(formatted)
        } catch (e) {
            setError(e.response?.data?.message || e.message || 'Erro ao carregar coachings.')
        } finally {
            setLoading(false)
        }
    }, [])

    useEffect(() => { fetchAulas() }, [fetchAulas])

    // ─── Ações da Coordenação ──────────────────────────────────────────────────
    const handleConfirm = async (id_marcacao) => {
        const id_sala = window.prompt("Para confirmar, insira o ID numérico da Sala (ex: 1):");
        if (!id_sala) return;

        try {
            await coachingService.confirmarMarcacao(id_marcacao, parseInt(id_sala));
            showToast('Marcação confirmada com sucesso!');
            fetchAulas();
        } catch (e) {
            showToast(e.response?.data?.message || e.message || 'Erro ao confirmar.', 'error');
        }
    }

    const handleReject = async (id_marcacao) => {
        const motivo = window.prompt("Motivo da rejeição:");
        if (!motivo) return;

        try {
            await coachingService.rejeitarMarcacao(id_marcacao, motivo);
            showToast('Marcação rejeitada com sucesso!');
            fetchAulas();
        } catch (e) {
            showToast(e.response?.data?.message || e.message || 'Erro ao rejeitar.', 'error');
        }
    }

    const handleCancel = async (id_marcacao) => {
        const motivo = window.prompt("Motivo do cancelamento:");
        if (!motivo) return;

        try {
            await coachingService.cancelarMarcacaoConfirmada(id_marcacao, motivo);
            showToast('Marcação cancelada com sucesso!');
            fetchAulas();
        } catch (e) {
            showToast(e.response?.data?.message || e.message || 'Erro ao cancelar.', 'error');
        }
    }

    const modalidades = ['todas', ...new Set(aulas.map(a => a.modalidade).filter(Boolean))]
    const estados = ['todos', ...new Set(aulas.map(a => a.estado_nome).filter(Boolean))]

    const filtradas = aulas.filter(a => {
        if (filtroEstado !== 'todos' && a.estado_nome !== filtroEstado) return false
        if (filtroModalidade !== 'todas' && a.modalidade !== filtroModalidade) return false
        return true
    })

    return (
        <>
            <div className="font-['Sora']">
                {/* Header */}
                <div className="flex flex-wrap items-end justify-between gap-4 mb-8">
                    <div>
                        <p className="text-[#4A6362] text-sm font-medium tracking-wide mb-1">Gestão da Coordenação</p>
                        <h1 className="text-[#324B4A] font-normal text-4xl leading-tight tracking-tight">
                            Pedidos de <span className="text-[#006A68] font-semibold">Coaching</span>
                        </h1>
                    </div>
                    <div className="flex items-center gap-3">
                        <button
                            onClick={fetchAulas} disabled={loading}
                            className="w-9 h-9 rounded-full border border-[#4a6362]/30 flex items-center justify-center hover:bg-[#EFF5F4] disabled:opacity-40"
                        >
                            <RefreshCw size={15} className={`text-[#4A6362] ${loading ? 'animate-spin' : ''}`} />
                        </button>
                        <button
                            onClick={() => setShowNovoEvento(true)}
                            className="flex items-center gap-2 px-5 py-2.5 bg-[#006A68] text-white rounded-xl text-sm font-bold hover:bg-[#00504E] transition-colors"
                        >
                            <Plus size={16} /> Novo evento
                        </button>
                    </div>
                </div>

                {/* Filters */}
                {!loading && aulas.length > 0 && (
                    <div className="flex flex-wrap items-center gap-3 mb-5">
                        <Filter size={13} className="text-[#4A6362]" />
                        <div className="relative">
                            <select value={filtroModalidade} onChange={e => setFiltroModalidade(e.target.value)}
                                className="appearance-none pl-3 pr-7 py-1.5 rounded-lg border border-[#4a6362]/25 text-xs font-medium text-[#324B4A] bg-white focus:outline-none focus:border-[#006A68] cursor-pointer">
                                <option value="todas">Todas as modalidades</option>
                                {modalidades.filter(m => m !== 'todas').map(m => <option key={m} value={m}>{m}</option>)}
                            </select>
                            <ChevronDown size={11} className="absolute right-2 top-1/2 -translate-y-1/2 text-[#4A6362] pointer-events-none" />
                        </div>
                        <div className="relative">
                            <select value={filtroEstado} onChange={e => setFiltroEstado(e.target.value)}
                                className="appearance-none pl-3 pr-7 py-1.5 rounded-lg border border-[#4a6362]/25 text-xs font-medium text-[#324B4A] bg-white focus:outline-none focus:border-[#006A68] cursor-pointer">
                                <option value="todos">Todos os estados</option>
                                {estados.filter(e => e !== 'todos').map(e => <option key={e} value={e}>{e}</option>)}
                            </select>
                            <ChevronDown size={11} className="absolute right-2 top-1/2 -translate-y-1/2 text-[#4A6362] pointer-events-none" />
                        </div>
                        {(filtroEstado !== 'todos' || filtroModalidade !== 'todas') && (
                            <button onClick={() => { setFiltroEstado('todos'); setFiltroModalidade('todas') }}
                                className="text-xs text-red-500 font-medium flex items-center gap-1 hover:text-red-700">
                                <X size={11} /> Limpar
                            </button>
                        )}
                        <span className="ml-auto text-xs text-[#4A6362]">{filtradas.length} registos</span>
                    </div>
                )}

                {/* Error */}
                {error && (
                    <div className="mb-6 flex items-center gap-2 bg-red-50 text-red-700 text-sm px-4 py-3 rounded-xl border border-red-200">
                        <AlertCircle size={16} /> {error}
                        <button onClick={fetchAulas} className="ml-auto underline text-xs">Tentar novamente</button>
                    </div>
                )}

                {/* Table */}
                <div className="rounded-2xl border border-[#4a6362]/30 overflow-hidden shadow-sm bg-white">
                    {/* Header row */}
                    <div className="flex items-center border-b-2 border-[#4a6362]/25 bg-[#EFF5F4]">
                        <TH>Data</TH>
                        <TH>Hora</TH>
                        <TH>Professor</TH>
                        <TH>Modalidade</TH>
                        <TH>N.º Inscritos</TH>
                        <TH>Estado</TH>
                        <TH>Ações</TH>
                    </div>

                    {loading ? (
                        [...Array(6)].map((_, i) => <SkeletonRow key={i} />)
                    ) : filtradas.length === 0 ? (
                        <div className="py-20 flex flex-col items-center gap-3 text-[#4A6362]">
                            <BookOpen size={40} className="opacity-20" />
                            <p className="text-sm font-medium opacity-50">
                                {aulas.length === 0 ? 'Nenhum coaching registado.' : 'Nenhum resultado para os filtros aplicados.'}
                            </p>
                        </div>
                    ) : (
                        filtradas.map((a, idx) => {
                            const cfg = getEstado(a.id_estado, a.estado_nome)
                            const total = a.numero_alunos_pretendidos ?? null
                            const count = a.alunos?.length ?? 0
                            return (
                                <div
                                    key={a.id}
                                    className={`flex items-center border-b border-[#4a6362]/15 hover:bg-[#F4FBF9] transition-colors ${idx % 2 === 0 ? '' : 'bg-[#FAFFFE]'}`}
                                >
                                    {/* Data */}
                                    <div className="flex-1 flex items-center justify-center px-4 py-3.5 border-r border-[#4a6362]/15">
                                        <span className="text-sm text-gray-800">{a.data}</span>
                                    </div>
                                    {/* Hora */}
                                    <div className="flex-1 flex items-center justify-center px-4 py-3.5 border-r border-[#4a6362]/15">
                                        <span className="text-sm text-gray-800 font-medium">{a.hora}</span>
                                    </div>
                                    {/* Professor */}
                                    <div className="flex-1 flex items-center justify-center px-4 py-3.5 border-r border-[#4a6362]/15">
                                        <span className="text-sm text-gray-800">{a.docente}</span>
                                    </div>
                                    {/* Modalidade */}
                                    <div className="flex-1 flex items-center justify-center px-4 py-3.5 border-r border-[#4a6362]/15">
                                        <span className="text-sm font-semibold text-gray-800">{a.modalidade}</span>
                                    </div>
                                    {/* N.º Inscritos */}
                                    <div className="flex-1 flex items-center justify-center px-4 py-3.5 border-r border-[#4a6362]/15">
                                        <CircleCount count={count} total={total ?? Math.max(count, 1)} />
                                    </div>
                                    {/* Estado */}
                                    <div className="flex-1 flex items-center justify-center px-4 py-3.5 border-r border-[#4a6362]/15">
                                        <span className={`flex items-center gap-1.5 text-sm font-bold ${cfg.color}`}>
                                            <span>{cfg.icon}</span>
                                            {cfg.label}
                                        </span>
                                    </div>
                                    {/* Action */}
                                    <div className="flex-1 flex items-center justify-center px-4 py-3.5">
                                        <div className="flex gap-2">
                                            {(a.id_estado === 1 || a.id_estado === 2) && (
                                                <>
                                                    <button onClick={() => handleConfirm(a.id)} className="text-[10px] font-bold text-white bg-[#049A59] px-2 py-1 rounded hover:bg-[#037A47] transition-colors">Confirmar</button>
                                                    <button onClick={() => handleReject(a.id)} className="text-[10px] font-bold text-white bg-[#BA1A1A] px-2 py-1 rounded hover:bg-[#93000A] transition-colors">Rejeitar</button>
                                                </>
                                            )}
                                            {a.id_estado === 3 && (
                                                <button onClick={() => handleCancel(a.id)} className="text-[10px] font-bold text-white bg-[#BA1A1A] px-2 py-1 rounded hover:bg-[#93000A] transition-colors">Cancelar</button>
                                            )}
                                            {a.id_estado > 3 && (
                                                <span className="text-xs text-gray-400">—</span>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            )
                        })
                    )}
                </div>

                {/* Summary */}
                {!loading && filtradas.length > 0 && (
                    <div className="mt-4 flex gap-2 flex-wrap">
                        {Object.entries(ESTADOS).map(([id, cfg]) => {
                            const c = aulas.filter(a => a.id_estado === Number(id)).length
                            if (c === 0) return null
                            return (
                                <div key={id} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-gray-50 border border-gray-200 ${cfg.color}`}>
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

            {showNovoEvento && (
                <NovoEventoModal
                    onClose={() => setShowNovoEvento(false)}
                    onSuccess={nome => {
                        setShowNovoEvento(false)
                        setToast({ msg: `Evento "${nome}" criado!`, type: 'success' })
                        setTimeout(() => setToast(null), 3000)
                    }}
                />
            )}

            {toast && (
                <div className={`fixed bottom-6 right-6 z-[60] flex items-center gap-3 px-5 py-3 rounded-xl shadow-lg text-white font-['Sora'] text-sm font-medium ${toast.type === 'success' ? 'bg-emerald-600' : 'bg-red-600'}`}>
                    {toast.type === 'success' ? <Check size={15} /> : <X size={15} />}
                    {toast.msg}
                    <button onClick={() => setToast(null)}><X size={13} className="opacity-70" /></button>
                </div>
            )}
        </>
    )
}