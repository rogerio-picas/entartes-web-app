import { useState, useEffect, useCallback, useMemo } from 'react'
import { Calendar, dateFnsLocalizer } from 'react-big-calendar'
import { format, parse, startOfWeek, getDay, addMonths, subMonths, addWeeks, subWeeks } from 'date-fns'
import { pt } from 'date-fns/locale'
import {
    ChevronLeft, ChevronRight, Plus, X, RefreshCw,
    Clock, MapPin, User, CalendarDays,
    Check, AlertCircle, Music, ChevronDown
} from 'lucide-react'
import { horarioService } from '../services/horarioService'
import { eventService } from '../services/eventService'
import { authService } from '../services/authService'
import { api } from '../services/api'
import NovaDisponibilidadeModal from './NovaDisponibilidadeModal'

// ─── Localizer para português ───────────────────────────────────────────────
const localizer = dateFnsLocalizer({
    format,
    parse,
    startOfWeek: () => startOfWeek(new Date(), { locale: pt }),
    getDay,
    locales: { 'pt': pt },
})

// ─── Helpers ──────────────────────────────────────────────────────────────────
function parseDate(raw) {
    if (!raw) return null
    const d = new Date(raw)
    return isNaN(d.getTime()) ? null : d
}

// ─── Color coding per modalidade ─────────────────────────────────────────────
const MODALITY_COLORS = [
    { bg: '#E8F5FF', text: '#1565C0', border: '#90CAF9' },
    { bg: '#FCE4EC', text: '#C62828', border: '#F48FB1' },
    { bg: '#E8F5E9', text: '#2E7D32', border: '#A5D6A7' },
    { bg: '#FFF3E0', text: '#E65100', border: '#FFCC80' },
    { bg: '#F3E5F5', text: '#6A1B9A', border: '#CE93D8' },
    { bg: '#E0F7FA', text: '#00695C', border: '#80DEEA' },
]
const modalityColorMap = {}
let colorIdx = 0
function getModalityColor(nome) {
    if (!nome) return MODALITY_COLORS[0]
    if (!modalityColorMap[nome]) {
        modalityColorMap[nome] = MODALITY_COLORS[colorIdx % MODALITY_COLORS.length]
        colorIdx++
    }
    return modalityColorMap[nome]
}

// Event color (competitions / events)
const EVENT_COLOR = { bg: '#FFF3E0', text: '#B36A00', border: '#FFCC02' }

// ─── Status badge colors ─────────────────────────────────────────────────────
const STATUS_COLOR = {
    1: 'bg-amber-50 text-amber-700 border-amber-200',
    2: 'bg-[#EFF5F4] text-[#006A68] border-[#80D5D2]',
    3: 'bg-red-50 text-red-600 border-red-200',
    4: 'bg-[#CCE8E6] text-[#006A68] border-[#006A68]',
}
const STATUS_LABEL = { 1: 'Pendente', 2: 'Confirmado', 3: 'Cancelado', 4: 'Finalizado' }

// ─── Custom Calendar Event ───────────────────────────────────────────────────
function EventComponent({ event }) {
    const color = event._isEvent
        ? EVENT_COLOR
        : getModalityColor(event.modalidade)

    return (
        <div
            style={{
                backgroundColor: color.bg,
                color: color.text,
                border: `1px solid ${color.border}`,
            }}
            className="rounded px-1.5 py-0.5 text-[11px] font-medium truncate overflow-hidden"
        >
            <span className="font-semibold">{format(event.start, 'HH:mm')}</span>
            {' '}
            <span className="truncate">{event.title}</span>
        </div>
    )
}

// ─── Custom Toolbar ──────────────────────────────────────────────────────────
function CustomToolbar({ label, onNavigate, onView, view }) {
    return (
        <div className="flex flex-wrap items-center justify-between gap-3 mb-5 px-8 pt-8">
            <div className="flex items-center gap-4">
                <h2 className="text-2xl font-bold text-[#324B4A] min-w-[200px]">{label}</h2>
                <div className="flex items-center gap-2 ml-2">
                    <button onClick={() => onNavigate('PREV')} className="w-9 h-9 rounded-full border border-[#4a6362]/25 flex items-center justify-center hover:bg-[#EFF5F4] transition-colors">
                        <ChevronLeft size={17} className="text-[#4A6362]" />
                    </button>
                    <button onClick={() => onNavigate('TODAY')} className="px-4 py-1.5 rounded-lg border border-[#4a6362]/25 text-sm font-semibold text-[#4A6362] hover:bg-[#EFF5F4] transition-colors">
                        Hoje
                    </button>
                    <button onClick={() => onNavigate('NEXT')} className="w-9 h-9 rounded-full border border-[#4a6362]/25 flex items-center justify-center hover:bg-[#EFF5F4] transition-colors">
                        <ChevronRight size={17} className="text-[#4A6362]" />
                    </button>
                </div>
            </div>
            <div className="flex items-center gap-2">
                <div className="flex items-center border border-[#4a6362]/25 rounded-xl overflow-hidden">
                    {['month', 'week'].map(mode => (
                        <button key={mode} onClick={() => onView(mode)}
                            className={`px-4 py-2 text-sm font-semibold capitalize transition-colors
                                ${view === mode ? 'bg-[#006A68] text-white' : 'text-[#4A6362] hover:bg-[#EFF5F4]'}`}>
                            {mode === 'month' ? 'Mensal' : 'Semanal'}
                        </button>
                    ))}
                </div>
            </div>
        </div>
    )
}

// ─── Detail Modal ─────────────────────────────────────────────────────────────
function DetailModal({ item, onClose, role }) {
    if (!item) return null
    const color = item._isEvent ? EVENT_COLOR : getModalityColor(item.modalidade)
    const statusClass = STATUS_COLOR[item.id_estado] ?? 'bg-gray-50 text-gray-600 border-gray-200'
    const statusLabel = STATUS_LABEL[item.id_estado] ?? item.estado_nome ?? '—'

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
            <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" />
            <div
                className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden"
                onClick={e => e.stopPropagation()}
            >
                <div
                    className="px-6 py-5 flex items-start justify-between"
                    style={{ backgroundColor: color.bg, borderBottom: `2px solid ${color.border}` }}
                >
                    <div>
                        <p className="text-xs font-semibold uppercase tracking-widest mb-1" style={{ color: color.text }}>
                            {item._isEvent ? 'Evento' : 'Aula'}
                        </p>
                        <h3 className="font-bold text-xl" style={{ color: color.text }}>
                            {item.modalidade || item.nome || 'Disponibilidade'}
                        </h3>
                    </div>
                    <button onClick={onClose} className="w-8 h-8 rounded-full bg-white/70 flex items-center justify-center text-gray-500 hover:bg-white transition-colors">
                        <X size={16} />
                    </button>
                </div>
                <div className="px-6 py-5 space-y-3">
                    {!item._isEvent && (
                        <span className={`inline-flex items-center text-xs font-bold px-3 py-1 rounded-full border ${statusClass}`}>
                            {statusLabel}
                        </span>
                    )}
                    <div className="grid grid-cols-2 gap-3 text-sm">
                        {item.data && (
                            <div className="flex items-start gap-2">
                                <CalendarDays size={14} className="text-[#006A68] mt-0.5 shrink-0" />
                                <div>
                                    <p className="text-[10px] text-[#4A6362] uppercase font-semibold">Data</p>
                                    <p className="font-medium text-[#324B4A]">{item.data}</p>
                                </div>
                            </div>
                        )}
                        {(item.hora || item.hora_inicio_str) && (
                            <div className="flex items-start gap-2">
                                <Clock size={14} className="text-[#006A68] mt-0.5 shrink-0" />
                                <div>
                                    <p className="text-[10px] text-[#4A6362] uppercase font-semibold">Hora</p>
                                    <p className="font-medium text-[#324B4A]">{item.hora || item.hora_inicio_str}</p>
                                </div>
                            </div>
                        )}
                        {item.duracao && (
                            <div className="flex items-start gap-2">
                                <Clock size={14} className="text-[#006A68] mt-0.5 shrink-0" />
                                <div>
                                    <p className="text-[10px] text-[#4A6362] uppercase font-semibold">Duração</p>
                                    <p className="font-medium text-[#324B4A]">{item.duracao}</p>
                                </div>
                            </div>
                        )}
                        {item.sala && (
                            <div className="flex items-start gap-2">
                                <MapPin size={14} className="text-[#006A68] mt-0.5 shrink-0" />
                                <div>
                                    <p className="text-[10px] text-[#4A6362] uppercase font-semibold">Sala</p>
                                    <p className="font-medium text-[#324B4A]">{item.sala}</p>
                                </div>
                            </div>
                        )}
                        {item.docente && (
                            <div className="flex items-start gap-2 col-span-2">
                                <User size={14} className="text-[#006A68] mt-0.5 shrink-0" />
                                <div>
                                    <p className="text-[10px] text-[#4A6362] uppercase font-semibold">Professor</p>
                                    <p className="font-medium text-[#324B4A]">{item.docente}</p>
                                </div>
                            </div>
                        )}
                        {item.descricao && (
                            <div className="col-span-2">
                                <p className="text-[10px] text-[#4A6362] uppercase font-semibold mb-1">Descrição</p>
                                <p className="text-sm text-gray-600 leading-relaxed">{item.descricao}</p>
                            </div>
                        )}
                    </div>
                    {item.alunos?.length > 0 && (
                        <div>
                            <p className="text-[10px] text-[#4A6362] uppercase font-semibold mb-2">
                                Alunos ({item.alunos.length}{item.numero_alunos_pretendidos ? `/${item.numero_alunos_pretendidos}` : ''})
                            </p>
                            <div className="flex flex-wrap gap-1.5">
                                {item.alunos.map((a, i) => (
                                    <span key={i} className="text-xs bg-[#CCE8E6] text-[#006A68] px-2.5 py-1 rounded-full">{a}</span>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
                <div className="px-6 pb-5">
                    <button onClick={onClose} className="w-full py-2.5 rounded-xl bg-[#006A68] text-white font-semibold text-sm hover:bg-[#00504E] transition-colors">
                        Fechar
                    </button>
                </div>
            </div>
        </div>
    )
}

// ─── Novo Coaching Modal (Docente) ────────────────────────────────────────────
function NovoCoachingModal({ onClose, onSuccess }) {
    const [loading, setLoading] = useState(false)
    const [erro, setErro] = useState('')
    const [modalidades, setModalidades] = useState([])
    const [salas, setSalas] = useState([])
    const [form, setForm] = useState({
        id_modalidade: '',
        id_sala: '',
        data: '',
        hora: '10:00',
        duracao: 60,
        num_alunos: 1,
    })

    useEffect(() => {
        api.get('/modalidades').then(d => setModalidades(Array.isArray(d) ? d : [])).catch(() => {})
        api.get('/salas').then(d => setSalas(Array.isArray(d) ? d : [])).catch(() => {})
    }, [])

    function set(k, v) { setForm(prev => ({ ...prev, [k]: v })) }

    async function handleSubmit() {
        if (!form.data || !form.hora) { setErro('Data e hora são obrigatórias.'); return }
        setLoading(true)
        setErro('')
        try {
            const dataHora = new Date(`${form.data}T${form.hora}:00`)
            await api.post('/aulas', {
                data_a_realizar: dataHora.toISOString(),
                hora_inicio: dataHora.toISOString(),
                duracao_minutos: Number(form.duracao),
                id_modalidade: form.id_modalidade ? Number(form.id_modalidade) : undefined,
                id_sala: form.id_sala ? Number(form.id_sala) : undefined,
                numero_alunos_pretendidos: Number(form.num_alunos),
            })
            onSuccess()
        } catch (e) {
            setErro(e.message || 'Erro ao criar coaching.')
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
            <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" />
            <div className="relative bg-[#F4FBF9] rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden" onClick={e => e.stopPropagation()}>
                <div className="bg-[#EFF5F4] border-b-2 border-[#006A68] px-6 py-5 flex items-center justify-between">
                    <div>
                        <p className="text-xs text-[#4A6362] font-medium uppercase tracking-wider mb-0.5">Novo</p>
                        <h3 className="text-[#006A68] font-bold text-xl font-['Sora']">Novo Coaching</h3>
                    </div>
                    <button onClick={onClose} className="w-8 h-8 rounded-full hover:bg-[#CCE8E6] flex items-center justify-center text-[#4A6362]">
                        <X size={16} />
                    </button>
                </div>
                <div className="px-6 py-5 space-y-4">
                    {erro && (
                        <div className="flex items-center gap-2 bg-red-50 text-red-700 text-sm px-3 py-2.5 rounded-xl border border-red-200">
                            <AlertCircle size={14} /> {erro}
                        </div>
                    )}
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="text-[11px] font-bold text-[#4A6362] uppercase tracking-wider mb-1.5 block">Data</label>
                            <input type="date" value={form.data} onChange={e => set('data', e.target.value)}
                                className="w-full bg-white border border-[#6F7978] rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-[#006A68]" />
                        </div>
                        <div>
                            <label className="text-[11px] font-bold text-[#4A6362] uppercase tracking-wider mb-1.5 block">Hora</label>
                            <input type="time" value={form.hora} onChange={e => set('hora', e.target.value)}
                                className="w-full bg-white border border-[#6F7978] rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-[#006A68]" />
                        </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="text-[11px] font-bold text-[#4A6362] uppercase tracking-wider mb-1.5 block">Duração (min)</label>
                            <input type="number" value={form.duracao} onChange={e => set('duracao', e.target.value)} min={15} step={15}
                                className="w-full bg-white border border-[#6F7978] rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-[#006A68]" />
                        </div>
                        <div>
                            <label className="text-[11px] font-bold text-[#4A6362] uppercase tracking-wider mb-1.5 block">Nº alunos</label>
                            <input type="number" value={form.num_alunos} onChange={e => set('num_alunos', e.target.value)} min={1}
                                className="w-full bg-white border border-[#6F7978] rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-[#006A68]" />
                        </div>
                    </div>
                    <div>
                        <label className="text-[11px] font-bold text-[#4A6362] uppercase tracking-wider mb-1.5 block">Modalidade</label>
                        <div className="relative">
                            <select value={form.id_modalidade} onChange={e => set('id_modalidade', e.target.value)}
                                className="w-full appearance-none bg-white border border-[#6F7978] rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-[#006A68] pr-8">
                                <option value="">Selecionar modalidade...</option>
                                {modalidades.map(m => <option key={m.id_modalidade} value={m.id_modalidade}>{m.nome}</option>)}
                            </select>
                            <ChevronDown size={13} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#4A6362] pointer-events-none" />
                        </div>
                    </div>
                    <div>
                        <label className="text-[11px] font-bold text-[#4A6362] uppercase tracking-wider mb-1.5 block">Sala</label>
                        <div className="relative">
                            <select value={form.id_sala} onChange={e => set('id_sala', e.target.value)}
                                className="w-full appearance-none bg-white border border-[#6F7978] rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-[#006A68] pr-8">
                                <option value="">Selecionar sala...</option>
                                {salas.map(s => <option key={s.id_sala} value={s.id_sala}>{s.nome}</option>)}
                            </select>
                            <ChevronDown size={13} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#4A6362] pointer-events-none" />
                        </div>
                    </div>
                </div>
                <div className="px-6 pb-6">
                    <button onClick={handleSubmit} disabled={loading}
                        className="w-full py-3.5 bg-[#006A68] text-white font-bold rounded-2xl hover:bg-[#00504E] transition-colors disabled:opacity-60 flex items-center justify-center gap-2 text-sm">
                        {loading ? <RefreshCw size={16} className="animate-spin" /> : <Check size={16} />}
                        Criar Coaching
                    </button>
                </div>
            </div>
        </div>
    )
}



// ─── Toast ────────────────────────────────────────────────────────────────────
function Toast({ msg, type, onClose }) {
    return (
        <div className={`fixed bottom-6 right-6 z-[60] flex items-center gap-3 px-5 py-3 rounded-xl shadow-lg text-white font-['Sora'] text-sm font-medium ${type === 'success' ? 'bg-emerald-600' : 'bg-red-600'}`}>
            {type === 'success' ? <Check size={15} /> : <X size={15} />}
            {msg}
            <button onClick={onClose}><X size={13} className="opacity-70" /></button>
        </div>
    )
}

// ─── Filter Dropdown ──────────────────────────────────────────────────────────
function FilterDropdown({ value, onChange, options, placeholder }) {
    return (
        <div className="relative">
            <select value={value} onChange={e => onChange(e.target.value)}
                className="appearance-none pl-3 pr-7 py-1.5 rounded-lg border border-[#4a6362]/25 text-xs font-medium text-[#324B4A] bg-white focus:outline-none focus:border-[#006A68] cursor-pointer">
                <option value="">{placeholder}</option>
                {options.map(o => <option key={o} value={o}>{o}</option>)}
            </select>
            <ChevronDown size={11} className="absolute right-2 top-1/2 -translate-y-1/2 text-[#4A6362] pointer-events-none" />
        </div>
    )
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function Horario() {
    const today = useMemo(() => {
        const d = new Date(); d.setHours(0, 0, 0, 0); return d
    }, [])

    const user = authService.getUser()
    const role = user?.role ?? 3

    // View state
    const [viewMode, setViewMode] = useState('month') // 'month' | 'week'
    const [currentDate, setCurrentDate] = useState(new Date(today))
    const [filterType, setFilterType] = useState('') // 'Pessoal' | 'Geral' | ''
    const [filterModalidade, setFilterModalidade] = useState('')

    // Data
    const [aulas, setAulas] = useState([])
    const [eventos, setEventos] = useState([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState('')

    // Modals
    const [selectedItem, setSelectedItem] = useState(null)
    const [showNovoCoaching, setShowNovoCoaching] = useState(false)
    const [showNovaDisponibilidade, setShowNovaDisponibilidade] = useState(false)
    const [toast, setToast] = useState(null)

    function showToast(msg, type = 'success') {
        setToast({ msg, type })
        setTimeout(() => setToast(null), 3500)
    }

    const fetchAll = useCallback(async () => {
        setLoading(true)
        setError('')
        try {
            // Buscar todas as aulas e eventos para todos os perfis
            const { aulasService: as } = await import('../services/aulasService')
            const [aulasRes, evRes] = await Promise.allSettled([
                as.getTodas(),
                eventService.getAll(),
            ])
            setAulas(aulasRes.status === 'fulfilled' ? aulasRes.value : [])
            setEventos(evRes.status === 'fulfilled' && Array.isArray(evRes.value) ? evRes.value : [])
        } catch (e) {
            setError(e.message || 'Erro ao carregar horário.')
        } finally {
            setLoading(false)
        }
    }, [])

    useEffect(() => { fetchAll() }, [fetchAll])

    // Combine all items as calendar events
    const events = useMemo(() => {
        // Todos os perfis veem todas as aulas
        const aulasToUse = aulas

        const mappedAulas = aulasToUse.map(a => {
            const start = parseDate(a.data_de_realizacao || a._data_raw)
            const end = start ? new Date(start.getTime() + (a.duracao_minutos || 60) * 60000) : null
            return {
                id: a.id,
                title: a.modalidade || 'Aula',
                start: start,
                end: end,
                _type: 'aula',
                ...a,
            }
        }).filter(e => e.start)

        const mappedEventos = eventos.map(e => {
            const start = parseDate(e.data_de_realizacao)
            const end = start ? new Date(start.getTime() + 60 * 60000) : null
            return {
                id: e.id_evento,
                title: e.nome || 'Evento',
                start: start,
                end: end,
                _isEvent: true,
                _type: 'evento',
                data: start ? format(start, 'dd/MM/yyyy') : '—',
                hora_inicio_str: start ? format(start, 'HH:mm') : '—',
                hora: start ? format(start, 'HH:mm') : '',
                descricao: e.descricao,
                data_de_realizacao: e.data_de_realizacao,
                _data_raw: e.data_de_realizacao,
            }
        }).filter(e => e.start)

        let combined = [...mappedAulas, ...mappedEventos]

        // Só filtrar por modalidade se selecionado
        if (filterModalidade) {
            combined = combined.filter(it => it.modalidade === filterModalidade || it._isEvent)
        }

        return combined
    }, [aulas, eventos, filterModalidade])

    const modalidades = useMemo(() => [...new Set(aulas.map(a => a.modalidade).filter(Boolean))], [aulas])

    // Navigation handlers for the calendar
    const handleNavigate = useCallback((action) => {
        setCurrentDate(prev => {
            if (action === 'PREV') {
                return viewMode === 'month' ? subMonths(prev, 1) : subWeeks(prev, 1)
            } else if (action === 'NEXT') {
                return viewMode === 'month' ? addMonths(prev, 1) : addWeeks(prev, 1)
            } else {
                return new Date(today)
            }
        })
    }, [viewMode, today])

    const handleSelectEvent = useCallback((event) => {
        setSelectedItem(event)
    }, [])

    // Custom event style getter
    const eventStyleGetter = useCallback((event) => {
        const color = event._isEvent
            ? EVENT_COLOR
            : getModalityColor(event.modalidade)
        return {
            style: {
                backgroundColor: color.bg,
                borderColor: color.border,
                color: color.text,
                borderRadius: '4px',
                border: `1px solid ${color.border}`,
            }
        }
    }, [])

    const filterOptions = ['Geral', 'Pessoal']

    return (
        <>
            <div className="font-['Sora'] max-w-[1400px] mx-auto">

                {/* Header */}
                <div className="flex flex-wrap items-end justify-between gap-4 mb-6">
                    <div>
                        <p className="text-[#4A6362] text-sm font-medium tracking-wide mb-1">
                            {role === 1 ? 'Gestão de Horários' : role === 2 ? 'As minhas sessões' : 'O meu plano de aulas'}
                        </p>
                        <h1 className="text-[#324B4A] font-normal text-4xl leading-tight tracking-tight">
                            Horário <span className="text-[#006A68] font-semibold">
                                {role === 1 ? 'Geral' : role === 2 ? 'do Docente' : 'do Aluno'}
                            </span>
                        </h1>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2 flex-wrap">
                        <button onClick={fetchAll} disabled={loading} title="Atualizar"
                            className="w-9 h-9 rounded-full border border-[#4a6362]/30 flex items-center justify-center hover:bg-[#EFF5F4] disabled:opacity-40">
                            <RefreshCw size={15} className={`text-[#4A6362] ${loading ? 'animate-spin' : ''}`} />
                        </button>

                        {role === 2 && (
                            <button onClick={() => setShowNovaDisponibilidade(true)}
                                className="flex items-center gap-2 px-4 py-2.5 bg-[#006A68] text-white rounded-xl text-sm font-bold hover:bg-[#00504E] transition-colors">
                                <Plus size={15} /> Nova Disponibilidade
                            </button>
                        )}
                    </div>
                </div>

                {/* Filters */}
                <div className="flex flex-wrap items-center gap-2 mb-4">
                    {/* Filter: type (Geral/Pessoal) — agora para todos */}
                    <FilterDropdown
                        value={filterType}
                        onChange={setFilterType}
                        options={filterOptions}
                        placeholder="Geral"
                    />

                    {/* Filter: modalidade */}
                    <FilterDropdown
                        value={filterModalidade}
                        onChange={setFilterModalidade}
                        options={modalidades}
                        placeholder="Todas as modalidades"
                    />

                    {(filterType || filterModalidade) && (
                        <button onClick={() => { setFilterType(''); setFilterModalidade('') }}
                            className="text-xs text-red-500 font-medium flex items-center gap-1 hover:text-red-700">
                            <X size={11} /> Limpar
                        </button>
                    )}
                </div>

                {/* Error */}
                {error && (
                    <div className="mb-5 flex items-center gap-2 bg-red-50 text-red-700 text-sm px-4 py-3 rounded-xl border border-red-200">
                        <AlertCircle size={15} /> {error}
                        <button onClick={fetchAll} className="ml-auto underline text-xs">Tentar novamente</button>
                    </div>
                )}

                {/* Calendar */}
                <div className="rounded-2xl border border-[#4a6362]/20 overflow-hidden bg-white shadow-lg">
                    <Calendar
                        className="!pt-2"
                        localizer={localizer}
                        events={events}
                        startAccessor="start"
                        endAccessor="end"
                        style={{ height: 600, fontFamily: 'Sora, sans-serif', fontSize: 15 }}
                        view={viewMode}
                        onView={setViewMode}
                        date={currentDate}
                        onNavigate={date => setCurrentDate(date)}
                        onSelectEvent={handleSelectEvent}
                        eventPropGetter={event => {
                            const base = eventStyleGetter(event)
                            // Destacar evento ao hover
                            return {
                                ...base,
                                style: {
                                    ...base.style,
                                    boxShadow: '0 1px 6px 0 #006A6822',
                                    transition: 'box-shadow 0.2s',
                                }
                            }
                        }}
                        dayPropGetter={date => {
                            const isToday = format(date, 'yyyy-MM-dd') === format(new Date(), 'yyyy-MM-dd')
                            return isToday ? {
                                style: {
                                    backgroundColor: '#E0F7FA',
                                    borderRadius: '12px',
                                }
                            } : {}
                        }}
                        components={{
                            event: EventComponent,
                            toolbar: CustomToolbar,
                        }}
                        messages={{
                            today: 'Hoje',
                            previous: 'Anterior',
                            next: 'Próximo',
                            month: 'Mensal',
                            week: 'Semanal',
                            day: 'Dia',
                            agenda: 'Agenda',
                            noEventsInRange: 'Sem eventos neste período.',
                            showMore: count => `+${count} mais`,
                        }}
                        culture="pt"
                        popup
                        selectable={false}
                    />
                </div>

                {/* Legend */}
                {!loading && events.length > 0 && (
                    <div className="mt-4 flex flex-wrap gap-2">
                        {[...new Set(events.filter(it => it.modalidade).map(it => it.modalidade))].slice(0, 5).map(m => {
                            const c = getModalityColor(m)
                            return (
                                <div key={m} className="flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full border font-medium"
                                    style={{ backgroundColor: c.bg, borderColor: c.border, color: c.text }}>
                                    <Music size={10} /> {m}
                                </div>
                            )
                        })}
                        {events.some(it => it._isEvent) && (
                            <div className="flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full border font-medium"
                                style={{ backgroundColor: EVENT_COLOR.bg, borderColor: EVENT_COLOR.border, color: EVENT_COLOR.text }}>
                                <CalendarDays size={10} /> Eventos
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* Modals */}

            {selectedItem && (
                <DetailModal item={selectedItem} onClose={() => setSelectedItem(null)} role={role} />
            )}

            {showNovoCoaching && (
                <NovoCoachingModal
                    onClose={() => setShowNovoCoaching(false)}
                    onSuccess={() => {
                        setShowNovoCoaching(false)
                        showToast('Coaching criado com sucesso!')
                        fetchAll()
                    }}
                />
            )}

            {showNovaDisponibilidade && (
                <NovaDisponibilidadeModal
                    onClose={() => setShowNovaDisponibilidade(false)}
                    onSuccess={() => {
                        setShowNovaDisponibilidade(false)
                        showToast('Disponibilidade criada com sucesso!')
                    }}
                />
            )}

            {toast && <Toast {...toast} onClose={() => setToast(null)} />}
        </>
    )
}