import { useState, useEffect, useMemo, useCallback, Fragment } from 'react'
import {
    BookOpen, Clock, Coins,
    AlertCircle, RefreshCw,
    CheckCircle2, X, Check, ExternalLink,
    Search, Upload, Eye, ChevronDown
} from 'lucide-react'
import { api } from '../services/api'
import { formatDate, formatTime } from '../utils/dateUtils'
import { authService } from '../services/authService'

// ─── Helpers ──────────────────────────────────────────────────────────────────
export { formatDate, formatTime }

export function formatDuration(min) {
    if (!min) return '—'
    const h = Math.floor(min / 60)
    const m = min % 60
    return h > 0 ? (m > 0 ? `${h}h ${m}min` : `${h}h`) : `${m} min`
}

// ─── Shared Primitives ────────────────────────────────────────────────────────
export function ModalWrapper({ title, onClose, children, wide = false, wider = false, widest = false }) {
    const sizeClass = widest ? 'max-w-[95vw] lg:max-w-6xl' : wider ? 'max-w-4xl' : wide ? 'max-w-2xl' : 'max-w-lg'
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
            <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" />
            <div
                className={`relative bg-white rounded-2xl shadow-2xl flex flex-col overflow-hidden w-full ${sizeClass} max-h-[85vh]`}
                onClick={e => e.stopPropagation()}
            >
                <div className="bg-neutral-50 border-b-2 border-brand-800 px-6 py-4 flex items-center justify-between shrink-0">
                    <h3 className="font-bold text-brand-800 text-lg font-['Sora']">{title}</h3>
                    <button onClick={onClose} className="w-8 h-8 rounded-full hover:bg-brand-200 flex items-center justify-center text-neutral-600 transition-colors">
                        <X size={16} />
                    </button>
                </div>
                <div className="flex-1 overflow-y-auto px-6 py-5">{children}</div>
            </div>
        </div>
    )
}

export function Spinner() {
    return (
        <div className="flex items-center justify-center py-12 text-brand-800">
            <RefreshCw size={24} className="animate-spin" />
        </div>
    )
}

export function EmptyState({ icon: Icon, msg }) {
    return (
        <div className="flex flex-col items-center justify-center py-12 text-center">
            <Icon size={40} className="text-brand-800/20 mb-3" />
            <p className="text-sm text-neutral-600">{msg}</p>
        </div>
    )
}

export function Toast({ msg, type }) {
    return (
        <div className={`fixed bottom-6 right-6 z-[60] flex items-center gap-3 px-5 py-3 rounded-xl shadow-lg text-white font-['Sora'] text-sm font-medium
            ${type === 'success' ? 'bg-emerald-600' : 'bg-red-600'}`}>
            {type === 'success' ? <Check size={15} /> : <AlertCircle size={15} />}
            {msg}
        </div>
    )
}

// ─── Modal: Validação de Aulas ────────────────────────────────────────────────
export function ValidacaoModal({ onClose }) {
    const [aulas, setAulas] = useState([])
    const [loading, setLoading] = useState(true)
    const [confirmCtx, setConfirmCtx] = useState(null)
    const [salas, setSalas] = useState([])
    const [selectedSala, setSelectedSala] = useState('')
    const [actioning, setActioning] = useState(null)
    const [toast, setToast] = useState(null)

    useEffect(() => {
        api.get('/coaching/pedidos-pendentes').then(data => setAulas(Array.isArray(data) ? data : [])).finally(() => setLoading(false))
    }, [])

    function showToast(msg, type = 'success') {
        setToast({ msg, type })
        setTimeout(() => setToast(null), 3000)
    }

    async function handleStartConfirm(a) {
        try {
            const dataStr = a.data ? a.data.split('T')[0] : ''
            const horaStr = a.hora_inicio ? (a.hora_inicio.includes('T') ? a.hora_inicio.split('T')[1].substring(0, 8) : a.hora_inicio.substring(0, 8)) : ''
            const salasDisp = await api.get(`/coaching/salas-disponiveis?data_a_realizar=${dataStr}&hora_inicio=${horaStr}&duracao_minutos=${a.duracao_minutos}`)
            setSalas(Array.isArray(salasDisp) ? salasDisp.filter(s => s.disponivel) : [])
            setSelectedSala('')
            setConfirmCtx(a)
        } catch { showToast('Erro ao carregar salas.', 'error') }
    }

    async function handleConfirm() {
        if (!selectedSala || !confirmCtx) return
        setActioning(confirmCtx.id_marcacao)
        try {
            await api.post('/coaching/confirmar-marcacao', { id_marcacao: confirmCtx.id_marcacao, id_sala: Number(selectedSala) })
            setAulas(prev => prev.filter(a => a.id_marcacao !== confirmCtx.id_marcacao))
            setConfirmCtx(null)
            showToast('Aula confirmada!')
        } catch { showToast('Erro ao confirmar.', 'error') }
        finally { setActioning(null) }
    }

    const pendentes = aulas.filter(a => a.id_estado === 1)

    return (
        <>
            <ModalWrapper title="Validação de Aulas" onClose={onClose}>
                {loading ? <Spinner /> : pendentes.length === 0 ? (
                    <EmptyState icon={CheckCircle2} msg="Nenhuma aula pendente de validação." />
                ) : (
                    <ul className="divide-y divide-neutral-600/10">
                        {pendentes.map(a => (
                            <li key={a.id_marcacao} className="py-3.5 flex items-center justify-between gap-4">
                                <div>
                                    <p className="font-semibold text-neutral-800 text-sm">{a.modalidade ?? '—'}</p>
                                    <p className="text-xs text-neutral-600 mt-0.5">
                                        {formatDate(a.data)} · {formatTime(a.hora_inicio)} · {formatDuration(a.duracao_minutos)}
                                    </p>
                                    <p className="text-xs text-neutral-600">{a.sala_atual ?? '—'}</p>
                                </div>
                                <button
                                    onClick={() => handleStartConfirm(a)}
                                    disabled={actioning === a.id_marcacao}
                                    className="shrink-0 flex items-center gap-1.5 px-3.5 py-1.5 bg-brand-800 text-white text-xs font-bold rounded-xl hover:bg-brand-900 transition-colors disabled:opacity-50"
                                >
                                    {actioning === a.id_marcacao ? <RefreshCw size={12} className="animate-spin" /> : <Check size={12} />}
                                    Confirmar
                                </button>
                            </li>
                        ))}
                    </ul>
                )}
                {toast && <Toast {...toast} />}
            </ModalWrapper>

            {confirmCtx && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center p-4" onClick={() => setConfirmCtx(null)}>
                    <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" />
                    <div className="relative bg-white rounded-2xl shadow-xl p-6 w-full max-w-sm font-['Sora']" onClick={e => e.stopPropagation()}>
                        <h4 className="font-bold text-brand-800 text-base mb-1">Confirmar Aula</h4>
                        <p className="text-sm text-neutral-600 mb-4">
                            {confirmCtx.modalidade} · {formatDate(confirmCtx.data)} às {formatTime(confirmCtx.hora_inicio)}
                        </p>
                        {salas.length === 0 ? (
                            <p className="text-sm text-amber-600 mb-4">Sem salas disponíveis neste horário.</p>
                        ) : (
                            <select
                                value={selectedSala}
                                onChange={e => setSelectedSala(e.target.value)}
                                className="w-full border border-neutral-600/25 rounded-xl px-3 py-2 text-sm mb-4 focus:outline-none focus:border-brand-800"
                            >
                                <option value="">Selecionar sala...</option>
                                {salas.map(s => <option key={s.id_sala} value={s.id_sala}>{s.nome}</option>)}
                            </select>
                        )}
                        <div className="flex gap-2">
                            <button onClick={() => setConfirmCtx(null)} className="flex-1 py-2.5 text-sm border border-neutral-600/25 rounded-xl text-neutral-600 hover:bg-brand-50 transition-colors">
                                Cancelar
                            </button>
                            <button
                                onClick={handleConfirm}
                                disabled={!selectedSala || actioning === confirmCtx.id_marcacao}
                                className="flex-1 py-2.5 text-sm bg-brand-800 text-white font-bold rounded-xl hover:bg-brand-900 transition-colors disabled:opacity-50"
                            >
                                Confirmar
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    )
}

// ─── Modal: Histórico de Aulas ────────────────────────────────────────────────
const ESTADO_CFG = {
    1: { label: 'Pendente',     color: 'text-amber-600  bg-amber-50   border-amber-200' },
    2: { label: 'Em Validação', color: 'text-blue-600   bg-blue-50    border-blue-200'  },
    3: { label: 'Confirmada',   color: 'text-brand-800  bg-neutral-50 border-brand-500' },
    4: { label: 'Concluída',    color: 'text-brand-800  bg-brand-200  border-brand-800' },
    5: { label: 'Cancelada',    color: 'text-red-600    bg-red-50     border-red-200'   },
}

export function HistoricoModal({ onClose, initialFiltro = 'todos', onlyToday = false }) {
    const [aulas, setAulas] = useState([])
    const [loading, setLoading] = useState(true)
    const [filtroEstado, setFiltroEstado] = useState(initialFiltro)
    const role = authService.getUser()?.role ?? 3

    useEffect(() => {
        const endpoint = role === 1
            ? '/coaching/pedidos-pendentes?estados=1,2,3,4,5'
            : role === 2 ? '/coaching/minhas-aulas' : '/coaching/meus-pedidos'
        api.get(endpoint).then(data => setAulas(Array.isArray(data) ? data : [])).finally(() => setLoading(false))
    }, [role])

    const filtered = (filtroEstado === 'todos'
        ? aulas
        : aulas.filter(a => String(a.id_estado) === filtroEstado)
    ).filter(a => {
        if (!onlyToday) return true
        if (!a.data) return false
        const today = new Date()
        const yyyy = today.getFullYear()
        const mm = String(today.getMonth() + 1).padStart(2, '0')
        const dd = String(today.getDate()).padStart(2, '0')
        const todayStr = `${yyyy}-${mm}-${dd}`
        const datePart = String(a.data).includes('T') ? String(a.data).split('T')[0] : String(a.data)
        return datePart === todayStr
    }).sort((a, b) => new Date(b.data ?? 0) - new Date(a.data ?? 0))

    return (
        <ModalWrapper title={onlyToday ? "Aulas de Hoje" : "Histórico de Aulas"} onClose={onClose} wide>
            {!loading && aulas.length > 0 && (
                <div className="flex items-center gap-3 mb-4">
                    <select
                        value={filtroEstado}
                        onChange={e => setFiltroEstado(e.target.value)}
                        className="text-xs border border-neutral-600/25 rounded-lg px-3 py-1.5 bg-white focus:outline-none focus:border-brand-800"
                    >
                        <option value="todos">Todos os estados</option>
                        {Object.entries(ESTADO_CFG).map(([id, cfg]) => (
                            <option key={id} value={id}>{cfg.label}</option>
                        ))}
                    </select>
                    <span className="text-xs text-neutral-500">{filtered.length} registo{filtered.length !== 1 ? 's' : ''}</span>
                </div>
            )}
            {loading ? <Spinner /> : filtered.length === 0 ? (
                <EmptyState icon={BookOpen} msg="Nenhuma aula registada." />
            ) : (
                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="bg-neutral-50 border-b border-neutral-600/20">
                                {['Modalidade', 'Data', 'Hora', 'Duração', 'Sala', 'Estado'].map(col => (
                                    <th key={col} className="px-3 py-2.5 text-left text-xs font-bold text-brand-800 uppercase tracking-wide whitespace-nowrap">{col}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {filtered.map(a => {
                                const cfg = ESTADO_CFG[a.id_estado] ?? { label: a.estado ?? '—', color: 'text-gray-500 bg-gray-50 border-gray-200' }
                                return (
                                    <tr key={a.id_marcacao} className="border-b border-neutral-600/10 hover:bg-brand-50 transition-colors">
                                        <td className="px-3 py-3 font-semibold text-neutral-800">{a.modalidade ?? '—'}</td>
                                        <td className="px-3 py-3 text-gray-600 whitespace-nowrap">{formatDate(a.data)}</td>
                                        <td className="px-3 py-3 text-gray-600 whitespace-nowrap">{formatTime(a.hora_inicio)}</td>
                                        <td className="px-3 py-3 text-gray-600">{formatDuration(a.duracao_minutos)}</td>
                                        <td className="px-3 py-3 text-gray-600">{a.sala_atual ?? a.sala ?? '—'}</td>
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
export function CoachingModal({ onClose }) {
    const [data, setData] = useState([])
    const [loading, setLoading] = useState(true)
    const role = authService.getUser()?.role ?? 3

    useEffect(() => {
        if (role === 1) {
            api.get('/relatorio/horas-docente').then(d => setData(Array.isArray(d) ? d : [])).finally(() => setLoading(false))
        } else {
            const endpoint = role === 2 ? '/coaching/minhas-aulas' : '/coaching/meus-pedidos'
            api.get(endpoint).then(raw => {
                const concluded = (Array.isArray(raw) ? raw : []).filter(m => m.id_estado === 4)
                const user = authService.getUser()
                setData([{
                    nome: [user?.nome, user?.apelido].filter(Boolean).join(' ') || 'Eu',
                    totalSessoes: concluded.length,
                    totalMinutos: concluded.reduce((s, m) => s + (m.duracao_minutos ?? 0), 0),
                }])
            }).finally(() => setLoading(false))
        }
    }, [role])

    const totalMin = data.reduce((acc, d) => acc + (d.totalMinutos ?? 0), 0)
    const totalSessoes = data.reduce((acc, d) => acc + (d.totalSessoes ?? 0), 0)

    return (
        <ModalWrapper title="Horas de Coaching" onClose={onClose}>
            {loading ? <Spinner /> : data.length === 0 ? (
                <EmptyState icon={Clock} msg="Sem dados de coaching disponíveis." />
            ) : (
                <div>
                    <div className="grid grid-cols-2 gap-3 mb-5">
                        <div className="bg-neutral-50 rounded-xl p-4 text-center">
                            <p className="text-2xl font-bold text-brand-800">{formatDuration(totalMin)}</p>
                            <p className="text-xs text-neutral-600 font-medium mt-1">Total de horas</p>
                        </div>
                        <div className="bg-neutral-50 rounded-xl p-4 text-center">
                            <p className="text-2xl font-bold text-brand-800">{totalSessoes}</p>
                            <p className="text-xs text-neutral-600 font-medium mt-1">Sessões concluídas</p>
                        </div>
                    </div>
                    <ul className="divide-y divide-neutral-600/10">
                        {data.map((d, i) => (
                            <li key={i} className="py-3 flex items-center justify-between">
                                <div className="flex items-center gap-2.5">
                                    <div className="w-7 h-7 rounded-full bg-brand-200 flex items-center justify-center">
                                        <span className="text-brand-800 text-[11px] font-bold">D{i + 1}</span>
                                    </div>
                                    <div>
                                        <p className="text-sm font-semibold text-neutral-800">{d.nome}</p>
                                        <p className="text-xs text-neutral-600">{d.totalSessoes ?? 0} sessões</p>
                                    </div>
                                </div>
                                <span className="text-sm font-bold text-brand-800">{formatDuration(d.totalMinutos)}</span>
                            </li>
                        ))}
                    </ul>
                </div>
            )}
        </ModalWrapper>
    )
}

// ─── Modal: Extrato Mensal ────────────────────────────────────────────────────
export function ExtratoModal({ onClose }) {
    const now = new Date()
    const [from, setFrom] = useState(`${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`)
    const [to, setTo] = useState(now.toISOString().split('T')[0])
    const [data, setData] = useState(null)
    const [loading, setLoading] = useState(false)
    const role = authService.getUser()?.role ?? 3

    async function fetchExtrato() {
        setLoading(true)
        try {
            let result
            if (role === 1) {
                result = await api.get(`/relatorio/sessoes?from=${from}&to=${to}`)
            } else {
                const endpoint = role === 2 ? '/coaching/minhas-aulas' : '/coaching/meus-pedidos'
                const all = await api.get(endpoint)
                const fromDate = new Date(from)
                const toDate = new Date(to); toDate.setHours(23, 59, 59)
                result = (Array.isArray(all) ? all : []).filter(m => {
                    if (m.id_estado !== 4) return false
                    const d = new Date(m.data)
                    return d >= fromDate && d <= toDate
                })
            }
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
            <div className="flex flex-wrap items-end gap-3 mb-5 p-4 bg-neutral-50 rounded-xl">
                <div>
                    <label className="text-[10px] font-bold text-neutral-600 uppercase tracking-wider mb-1 block">De</label>
                    <input
                        type="date" value={from}
                        onChange={e => setFrom(e.target.value)}
                        className="text-sm border border-neutral-600/25 rounded-lg px-3 py-1.5 focus:outline-none focus:border-brand-800 bg-white"
                    />
                </div>
                <div>
                    <label className="text-[10px] font-bold text-neutral-600 uppercase tracking-wider mb-1 block">Até</label>
                    <input
                        type="date" value={to}
                        onChange={e => setTo(e.target.value)}
                        className="text-sm border border-neutral-600/25 rounded-lg px-3 py-1.5 focus:outline-none focus:border-brand-800 bg-white"
                    />
                </div>
                <button
                    onClick={fetchExtrato}
                    className="px-4 py-1.5 bg-brand-800 text-white text-xs font-bold rounded-xl hover:bg-brand-900 transition-colors"
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
                        <div className="bg-neutral-50 rounded-xl p-4 text-center">
                            <p className="text-2xl font-bold text-brand-800">{data.length}</p>
                            <p className="text-xs text-neutral-600 font-medium mt-1">Sessões</p>
                        </div>
                        <div className="bg-neutral-50 rounded-xl p-4 text-center">
                            <p className="text-2xl font-bold text-brand-800">{formatDuration(totalMin)}</p>
                            <p className="text-xs text-neutral-600 font-medium mt-1">Total de horas</p>
                        </div>
                    </div>
                    <div className="overflow-x-auto mb-4">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="bg-neutral-50 border-b border-neutral-600/20">
                                    {['Data', 'Hora', 'Duração', 'Modalidade', 'Sala'].map(c => (
                                        <th key={c} className="px-3 py-2.5 text-left text-xs font-bold text-brand-800 uppercase tracking-wide">{c}</th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {data.map((s, i) => (
                                    <tr key={s.id_marcacoes ?? s.id_marcacao ?? i} className="border-b border-neutral-600/10 hover:bg-brand-50">
                                        <td className="px-3 py-2.5 whitespace-nowrap">{formatDate(s.data_a_realizar ?? s.data)}</td>
                                        <td className="px-3 py-2.5 whitespace-nowrap">{formatTime(s.hora_inicio)}</td>
                                        <td className="px-3 py-2.5">{formatDuration(s.duracao_minutos)}</td>
                                        <td className="px-3 py-2.5">{s.modalidade?.nome ?? s.modalidade ?? '—'}</td>
                                        <td className="px-3 py-2.5">{s.sala?.nome ?? s.sala ?? '—'}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                    {role === 1 && (
                        <button
                            onClick={handleExportCSV}
                            className="flex items-center gap-2 text-xs font-bold text-brand-800 hover:text-brand-900 transition-colors"
                        >
                            <ExternalLink size={13} /> Exportar CSV
                        </button>
                    )}
                </>
            )}
        </ModalWrapper>
    )
}

// ─── Modal: Horas de Coaching (re-usável) ─────────────────────────────────────
const HORAS_COLS = [
    { key: 'id',           label: 'Número' },
    { key: 'nome',         label: 'Nome' },
    { key: 'modalidades',  label: 'Modalidade' },
    { key: 'totalSessoes', label: 'Total de Presenças' },
    { key: 'totalMinutos', label: 'Total de Horas' },
]

export function HorasCoachingModal({
    title, endpoint, normalize = d => d,
    columns, renderActions, searchKeys,
    exportFilename = 'relatorio',
    hideExport = false, hideActions = false,
    showDateFilter = false,
    onClose,
    widest = false
}) {
    const [rawData, setRawData]       = useState([])
    const [loading, setLoading]       = useState(true)
    const [search, setSearch]         = useState('')
    const [sortCol, setSortCol]       = useState(null)
    const [sortDir, setSortDir]       = useState('asc')
    const [expanded, setExpanded]     = useState(null)
    const [from, setFrom]             = useState('')
    const [to, setTo]                 = useState('')
    const [activeEndpoint, setActiveEndpoint] = useState(endpoint)
    const [toast, setToast]           = useState(null)

    function showToast(msg, type = 'success') {
        setToast({ msg, type })
        setTimeout(() => setToast(null), 3000)
    }

    useEffect(() => { setActiveEndpoint(endpoint) }, [endpoint])

    const cols = columns ?? HORAS_COLS
    const keys = searchKeys ?? ['id', 'nome']

    function aplicarFiltro() {
        const parts = []
        if (from) parts.push(`data_inicio=${from}`)
        if (to)   parts.push(`data_fim=${to}`)
        const sep = endpoint.includes('?') ? '&' : '?'
        setActiveEndpoint(parts.length ? endpoint + sep + parts.join('&') : endpoint)
    }

    function limparFiltro() {
        setFrom('')
        setTo('')
        setActiveEndpoint(endpoint)
    }

    const load = useCallback(() => {
        setLoading(true)
        api.get(activeEndpoint)
            .then(d => setRawData(Array.isArray(d) ? d : []))
            .catch(err => showToast(err.response?.data?.error || err.message || 'Erro ao carregar dados.', 'error'))
            .finally(() => setLoading(false))
    }, [activeEndpoint])

    useEffect(() => { load() }, [load])

    const rows = useMemo(() => {
        const q = search.toLowerCase()
        let data = normalize(rawData)

        if (!columns) {
            data = data.map(r => ({
                id:           r.id ?? r.id_aluno ?? r.id_docente ?? '',
                nome:         r.nome ?? '',
                modalidades:  Array.isArray(r.modalidades) ? r.modalidades : [],
                totalSessoes: r.totalSessoes ?? r._count ?? 0,
                totalMinutos: r.totalMinutos ?? r._sum?.duracao_minutos ?? 0,
            }))
        }

        return data
            .filter(r => !q || keys.some(k => String(r[k] ?? '').toLowerCase().includes(q)))
            .sort((a, b) => {
                if (!sortCol) return 0
                const av = a[sortCol]; const bv = b[sortCol]
                if (typeof av === 'number') return sortDir === 'asc' ? av - bv : bv - av
                return sortDir === 'asc'
                    ? String(av ?? '').localeCompare(String(bv ?? ''), 'pt')
                    : String(bv ?? '').localeCompare(String(av ?? ''), 'pt')
            })
    }, [rawData, normalize, columns, search, sortCol, sortDir, keys])

    function toggleSort(key) {
        if (sortCol === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
        else { setSortCol(key); setSortDir('asc') }
    }

    function handleExport() {
        const headers = cols.map(c => c.label).join(',')
        const lines = rows.map(r => cols.map(col => {
            const val = r[col.key] ?? ''
            const str = Array.isArray(val) ? val.join(' / ') : String(val)
            return str.includes(',') ? `"${str}"` : str
        }).join(','))
        const csv = [headers, ...lines].join('\n')
        const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }))
        const a = document.createElement('a')
        a.href = url; a.download = `${exportFilename}.csv`; a.click()
        URL.revokeObjectURL(url)
    }

    return (
        <ModalWrapper title={title} onClose={onClose} wider={!widest} widest={widest}>
            {showDateFilter && (
                <div className="flex flex-wrap items-end gap-3 mb-5 p-4 bg-neutral-50 rounded-xl">
                    <div>
                        <label className="text-[10px] font-bold text-neutral-600 uppercase tracking-wider mb-1 block">De</label>
                        <input
                            type="date" value={from}
                            onChange={e => setFrom(e.target.value)}
                            className="text-sm border border-neutral-600/25 rounded-lg px-3 py-1.5 focus:outline-none focus:border-brand-800 bg-white"
                        />
                    </div>
                    <div>
                        <label className="text-[10px] font-bold text-neutral-600 uppercase tracking-wider mb-1 block">Até</label>
                        <input
                            type="date" value={to}
                            onChange={e => setTo(e.target.value)}
                            className="text-sm border border-neutral-600/25 rounded-lg px-3 py-1.5 focus:outline-none focus:border-brand-800 bg-white"
                        />
                    </div>
                    <button
                        onClick={aplicarFiltro}
                        className="px-4 py-1.5 bg-brand-800 text-white text-xs font-bold rounded-xl hover:bg-brand-900 transition-colors"
                    >
                        Filtrar
                    </button>
                    <button
                        onClick={limparFiltro}
                        disabled={!from && !to}
                        className="px-4 py-1.5 border border-neutral-600/30 text-neutral-600 text-xs font-bold rounded-xl hover:bg-white transition-colors disabled:opacity-30"
                    >
                        Limpar filtro
                    </button>
                </div>
            )}
            <div className="flex items-center gap-3 mb-5">
                <div className="relative flex-1">
                    <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-600" />
                    <input
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        placeholder="Pesquisar..."
                        className="w-full pl-9 pr-4 py-2 text-sm border border-neutral-600/25 rounded-xl focus:outline-none focus:border-brand-800 bg-white"
                    />
                </div>
                {!hideExport && (
                    <button
                        onClick={handleExport}
                        disabled={rows.length === 0}
                        className="flex items-center gap-2 px-4 py-2 bg-brand-800 text-white text-sm font-bold rounded-xl hover:bg-brand-900 transition-colors disabled:opacity-40 shrink-0"
                    >
                        <Upload size={14} /> Exportar Relatório
                    </button>
                )}
            </div>

            {loading ? <Spinner /> : rows.length === 0 ? (
                <EmptyState icon={Clock} msg={search ? 'Nenhum resultado encontrado.' : 'Sem dados disponíveis.'} />
            ) : (
                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="border-b-2 border-neutral-600/15">
                                {cols.map(col => (
                                    <th
                                        key={col.key}
                                        onClick={() => toggleSort(col.key)}
                                        className="px-3 py-2.5 text-left text-sm font-medium text-neutral-600 cursor-pointer hover:text-brand-800 select-none whitespace-nowrap"
                                    >
                                        {col.label}
                                        <ChevronDown size={12} className={`inline ml-1 transition-transform ${sortCol === col.key ? 'text-brand-800' : 'opacity-30'} ${sortCol === col.key && sortDir === 'desc' ? 'rotate-180' : ''}`} />
                                    </th>
                                ))}
                                {!hideActions && <th className="w-24" />}
                            </tr>
                        </thead>
                        <tbody>
                            {rows.map(r => (
                                <Fragment key={r.id}>
                                    <tr className="border-b border-neutral-600/10 hover:bg-brand-50 transition-colors">
                                        {cols.map(col => (
                                            <td key={col.key} className="px-3 py-3.5 text-neutral-800">
                                                {col.render ? col.render(r) : (r[col.key] ?? '—')}
                                            </td>
                                        ))}
                                        {!hideActions && (
                                            <td className="px-3 py-3.5 whitespace-nowrap">
                                                {renderActions ? renderActions(r, load) : (
                                                    <button
                                                        onClick={() => setExpanded(expanded === r.id ? null : r.id)}
                                                        className="w-8 h-8 rounded-full bg-brand-800 flex items-center justify-center text-white hover:bg-brand-900 transition-colors mx-auto"
                                                    >
                                                        <Eye size={13} />
                                                    </button>
                                                )}
                                            </td>
                                        )}
                                    </tr>
                                    {!renderActions && expanded === r.id && (
                                        <tr className="bg-brand-50">
                                            <td colSpan={cols.length + 1} className="px-6 py-3">
                                                <div className="flex flex-wrap gap-6 text-sm">
                                                    <div>
                                                        <p className="text-[10px] font-bold text-neutral-600 uppercase tracking-wider mb-1">Modalidades</p>
                                                        <p className="text-neutral-800">{(r.modalidades ?? []).join(', ') || '—'}</p>
                                                    </div>
                                                    <div>
                                                        <p className="text-[10px] font-bold text-neutral-600 uppercase tracking-wider mb-1">Total de Presenças</p>
                                                        <p className="text-neutral-800 font-semibold">{r.totalSessoes} sessões</p>
                                                    </div>
                                                    <div>
                                                        <p className="text-[10px] font-bold text-neutral-600 uppercase tracking-wider mb-1">Total de Horas</p>
                                                        <p className="text-neutral-800 font-semibold">{formatDuration(r.totalMinutos)}</p>
                                                    </div>
                                                </div>
                                            </td>
                                        </tr>
                                    )}
                                </Fragment>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
            {toast && <Toast {...toast} />}
        </ModalWrapper>
    )
}

// ─── Modal: Validação de Coachings ────────────────────────────────────────────
const VALIDACAO_COLS = [
    { key: 'data',       label: 'Data' },
    { key: 'hora',       label: 'Hora' },
    { key: 'professor',  label: 'Professor' },
    { key: 'duracao',    label: 'Duração' },
    { key: 'modalidade', label: 'Modalidade' },
    { key: 'tipo',       label: 'Tipo' },
    {
        key: 'estado', label: 'Estado',
        render: r => {
            const cfg = ESTADO_CFG[r.id_estado] ?? { label: r.estado ?? '—', color: 'text-gray-500 bg-gray-50 border-gray-200' }
            return <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-bold border ${cfg.color}`}>{cfg.label}</span>
        },
    },
]

function normalizeValidacao(raw) {
    return raw.map(r => ({
        id:          r.id_marcacao,
        data:        formatDate(r.data),
        hora:        formatTime(r.hora_inicio),
        professor:   r.docente ?? '—',
        duracao:     `${r.duracao_minutos ?? 0} min`,
        modalidade:  r.modalidade ?? '—',
        tipo:        (r.numero_alunos_pretendidos ?? 1) > 1 ? 'Dueto' : 'Individual',
        estado:      r.estado ?? '—',
        id_estado:   r.id_estado,
        id_marcacao: r.id_marcacao,
        _data_raw:   r.data,
        _hora_raw:   r.hora_inicio,
        _duracao:    r.duracao_minutos,
    }))
}

export function ValidacaoCoachingModal({ onClose }) {
    const [confirmCtx, setConfirmCtx] = useState(null)
    const [selectedSala, setSelectedSala]   = useState('')
    const [pendingReject, setPendingReject] = useState(null)
    const [actioning, setActioning]   = useState(null)
    const [toast, setToast]           = useState(null)

    function showToast(msg, type = 'success') {
        setToast({ msg, type })
        setTimeout(() => setToast(null), 3000)
    }

    async function handleReject(row, refetch) {
        setActioning(row.id)
        setPendingReject(null)
        try {
            await api.post('/coaching/rejeitar-marcacao', { id_marcacao: row.id_marcacao, motivo: 'Pedido rejeitado pela coordenação' })
            showToast('Pedido rejeitado.')
            refetch()
        } catch { showToast('Erro ao rejeitar.', 'error') }
        finally { setActioning(null) }
    }

    async function handleStartConfirm(row, refetch) {
        try {
            const dataStr = row._data_raw ? row._data_raw.split('T')[0] : ''
            const horaStr = row._hora_raw ? (row._hora_raw.includes('T') ? row._hora_raw.split('T')[1].substring(0, 8) : row._hora_raw.substring(0, 8)) : ''
            const salas = await api.get(`/coaching/salas-disponiveis?data_a_realizar=${dataStr}&hora_inicio=${horaStr}&duracao_minutos=${row._duracao}`)
            setConfirmCtx({ row, salas: Array.isArray(salas) ? salas.filter(s => s.disponivel) : [], refetch })
            setSelectedSala('')
        } catch { showToast('Erro ao carregar salas.', 'error') }
    }

    async function handleConfirm() {
        if (!selectedSala || !confirmCtx) return
        setActioning(confirmCtx.row.id)
        try {
            await api.post('/coaching/confirmar-marcacao', { id_marcacao: confirmCtx.row.id_marcacao, id_sala: Number(selectedSala) })
            showToast('Coaching confirmado!')
            confirmCtx.refetch()
            setConfirmCtx(null)
        } catch { showToast('Erro ao confirmar.', 'error') }
        finally { setActioning(null) }
    }

    function renderActions(row, refetch) {
        const isPendente = row.id_estado < 3
        const busy = actioning === row.id

        if (pendingReject === row.id) {
            return (
                <div className="flex items-center gap-1.5">
                    <span className="text-xs text-neutral-500 whitespace-nowrap">Rejeitar?</span>
                    <button
                        onClick={() => handleReject(row, refetch)}
                        className="w-7 h-7 rounded-lg bg-red-600 flex items-center justify-center hover:bg-red-700 transition-colors"
                    >
                        <Check size={12} strokeWidth={3} className="text-white" />
                    </button>
                    <button
                        onClick={() => setPendingReject(null)}
                        className="w-7 h-7 rounded-lg bg-neutral-100 border border-neutral-200 flex items-center justify-center hover:bg-neutral-200 transition-colors"
                    >
                        <X size={12} strokeWidth={3} className="text-neutral-600" />
                    </button>
                </div>
            )
        }

        return (
            <div className="flex items-center justify-center gap-1.5">
                <button
                    disabled={!isPendente || busy}
                    onClick={() => setPendingReject(row.id)}
                    className="w-8 h-8 rounded-full border-2 border-red-400 text-red-500 flex items-center justify-center hover:bg-red-50 transition-colors disabled:opacity-25 disabled:cursor-not-allowed"
                >
                    {busy ? <RefreshCw size={11} className="animate-spin" /> : <X size={13} />}
                </button>
                <button
                    disabled={!isPendente || busy}
                    onClick={() => handleStartConfirm(row, refetch)}
                    className="w-8 h-8 rounded-full border-2 border-brand-800 text-brand-800 flex items-center justify-center hover:bg-neutral-50 transition-colors disabled:opacity-25 disabled:cursor-not-allowed"
                >
                    <Check size={13} />
                </button>
            </div>
        )
    }

    return (
        <>
            <HorasCoachingModal
                title="Validação de Coachings"
                endpoint="/coaching/pedidos-pendentes"
                normalize={normalizeValidacao}
                columns={VALIDACAO_COLS}
                renderActions={renderActions}
                searchKeys={['professor', 'modalidade']}
                exportFilename="validacao_coachings"
                showDateFilter
                hideExport
                widest
                onClose={onClose}
            />

            {confirmCtx && (
                <div className="fixed inset-0 z-[70] flex items-center justify-center p-4" onClick={() => setConfirmCtx(null)}>
                    <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" />
                    <div className="relative bg-white rounded-2xl shadow-xl p-6 w-full max-w-sm font-['Sora']" onClick={e => e.stopPropagation()}>
                        <h4 className="font-bold text-brand-800 text-base mb-1">Confirmar Coaching</h4>
                        <p className="text-sm text-neutral-600 mb-4">
                            {confirmCtx.row.professor} · {confirmCtx.row.data} às {confirmCtx.row.hora}
                        </p>
                        {confirmCtx.salas.length === 0 ? (
                            <p className="text-sm text-amber-600 mb-4">Sem salas disponíveis neste horário.</p>
                        ) : (
                            <select
                                value={selectedSala}
                                onChange={e => setSelectedSala(e.target.value)}
                                className="w-full border border-neutral-600/25 rounded-xl px-3 py-2 text-sm mb-4 focus:outline-none focus:border-brand-800"
                            >
                                <option value="">Selecionar sala...</option>
                                {confirmCtx.salas.map(s => <option key={s.id_sala} value={s.id_sala}>{s.nome}</option>)}
                            </select>
                        )}
                        <div className="flex gap-2">
                            <button onClick={() => setConfirmCtx(null)} className="flex-1 py-2.5 text-sm border border-neutral-600/25 rounded-xl text-neutral-600 hover:bg-brand-50 transition-colors">
                                Cancelar
                            </button>
                            <button
                                onClick={handleConfirm}
                                disabled={!selectedSala || actioning === confirmCtx.row.id}
                                className="flex-1 py-2.5 text-sm bg-brand-800 text-white font-bold rounded-xl hover:bg-brand-900 transition-colors disabled:opacity-50"
                            >
                                Confirmar
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {toast && <Toast {...toast} />}
        </>
    )
}

// ─── Modal: Listagem de Coaching ──────────────────────────────────────────────
const ValIcon = ({ val }) => val
    ? <span className="flex items-center gap-1 text-brand-800 font-bold text-xs whitespace-nowrap"><Check size={12} /> Sim</span>
    : <span className="flex items-center gap-1 text-red-500 font-bold text-xs whitespace-nowrap"><X size={12} /> Não</span>

const LISTAGEM_COLS = [
    { key: 'data',        label: 'Data' },
    { key: 'hora',        label: 'Hora' },
    { key: 'professor',   label: 'Professor' },
    { key: 'aluno',       label: 'Aluno' },
    { key: 'val_docente', label: 'Val. Docente', render: r => <ValIcon val={r.val_docente} /> },
    { key: 'val_aluno',   label: 'Val. Aluno',   render: r => <ValIcon val={r.val_aluno} /> },
    { key: 'estado',      label: 'Estado' },
]

function normalizeListagem(raw) {
    return raw.map(r => ({
        id:          r.id_marcacao,
        data:        formatDate(r.data),
        hora:        formatTime(r.hora_inicio),
        professor:   r.docente ?? '—',
        aluno:       r.alunos?.map(a => a.nome).join(', ') || '—',
        val_docente: r.val_docente ?? false,
        val_aluno:   r.val_aluno ?? false,
        estado:      r.estado ?? '—',
        id_marcacao: r.id_marcacao,
    }))
}

export function ListagemCoachingModal({ onClose }) {
    return (
        <HorasCoachingModal
            title="Listagem de Coaching"
            endpoint="/coaching/pedidos-pendentes?estados=3"
            normalize={normalizeListagem}
            columns={LISTAGEM_COLS}
            searchKeys={['professor', 'aluno']}
            showDateFilter
            hideExport
            hideActions
            widest
            onClose={onClose}
        />
    )
}

