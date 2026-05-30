import { useState, useEffect, useCallback, useMemo } from 'react'
import { Calendar, dateFnsLocalizer } from 'react-big-calendar'
import { format, parse, startOfWeek, getDay, addMonths, subMonths, addWeeks, subWeeks } from 'date-fns'
import { pt } from 'date-fns/locale'
import { useNavigate } from 'react-router-dom'
import {
    ChevronLeft, ChevronRight, Plus, X, RefreshCw,
    Clock, MapPin, User, CalendarDays,
    Check, AlertCircle, Music, ChevronDown, Trash2, Pencil
} from 'lucide-react'
import { horarioService } from '../services/horarioService'
import { eventService } from '../services/eventService'
import { disponibilidadeService } from '../services/disponibilidadeService'
import ItemDetailModal from '../components/ItemDetailModal'
import { authService } from '../services/authService'
import { api } from '../services/api'
import coachingService from '../services/coachingService'
import { formatDate, formatTime, parseDate, parseDateTime, addMinutesToTime, toWallClockISO } from '../utils/dateUtils'
import NovaDisponibilidadeModal from './NovaDisponibilidadeModal'
import NovoEventoModal from './NovoEventoModal'
import NovaMarcacaoModal from './NovaMarcacaoModal'
import EditSalaModal from '../components/EditSalaModal'
// ─── Localizer para português ───────────────────────────────────────────────
const localizer = dateFnsLocalizer({
    format,
    parse,
    startOfWeek: () => startOfWeek(new Date(), { locale: pt }),
    getDay,
    locales: { 'pt': pt },
})

// ─── Helpers ──────────────────────────────────────────────────────────────────

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
const STATUS_LABEL = { 1: 'Pendente', 2: 'Em Validação', 3: 'Confirmada', 4: 'Concluída', 5: 'Cancelada' }
const STATUS_COLOR = {
    1: 'bg-amber-100 border-amber-300 text-amber-700',
    2: 'bg-blue-100 border-blue-300 text-blue-700',
    3: 'bg-emerald-100 border-emerald-300 text-emerald-700',
    4: 'bg-[#CCE8E6] border-[#006A68] text-[#006A68]',
    5: 'bg-red-100 border-red-300 text-red-700'
}

// ─── Custom Calendar Event ───────────────────────────────────────────────────
function EventComponent({ event }) {
    const color = event._isEvent
        ? EVENT_COLOR
        : getModalityColor(event.modalidade)

    const timeStr = event.hora || event.hora_inicio_str || event.hora_inicio || '—'

    // Calcular fim se tiver duração
    let endTimeStr = ''
    if (event.duracao_minutos) {
        endTimeStr = addMinutesToTime(timeStr, event.duracao_minutos)
    }

    return (
        <div
            style={{
                backgroundColor: color.bg,
                color: color.text,
                border: `1px solid ${color.border}`,
            }}
            className="rounded px-1.5 py-0.5 text-[11px] font-medium overflow-hidden truncate leading-tight shadow-sm"
        >
            <span className="font-bold mr-1">{timeStr}</span>
            <span className="opacity-90">{event.title}</span>
        </div>
    )
}



// 2. Componente para renderizar o FUNDO do dia (a célula do calendário)
const DateCellWrapper = ({ children, value, onAdd, currentMonth }) => {
    const isOffRange = useMemo(() => value.getMonth() !== currentMonth, [value, currentMonth]);

    return (
        <div
            className="relative h-full w-full rbc-day-slot-wrapper"
            style={{
                borderLeft: '1px solid #E3E9E8',
                borderBottom: '1px solid #E3E9E8',
                backgroundColor: isOffRange ? '#F9FAFB' : 'transparent',
                cursor: isOffRange ? 'default' : 'pointer'
            }}
            onClick={() => !isOffRange && onAdd(value)}
        >
            {children}
        </div>
    );
};

// ─── Custom Toolbar ──────────────────────────────────────────────────────────
function CustomToolbar({ label, onNavigate, onView, view }) {
    return (
        <div className="flex flex-wrap items-center justify-between gap-3 mb-5 px-8 pt-8">
            <div className="flex items-center gap-4">
                <h2 className="text-2xl font-bold text-[#324B4A] w-[270px]">{label}</h2>
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

// ─── Componente de Info (reutilizado do Aulas.jsx) ──────────────────────────
function InfoItem({ icon: Icon, label, value }) {
    return (
        <div className="flex items-start gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-[#CCE8E6] flex items-center justify-center shrink-0 mt-0.5">
                {Icon && <Icon size={14} className="text-[#006A68]" />}
            </div>
            <div>
                <p className="text-[10px] uppercase tracking-wider text-[#4A6362] font-semibold">{label}</p>
                <p className="text-sm font-medium text-gray-800">{String(value || '—')}</p>
            </div>
        </div>
    )
}

// ─── Novo Coaching Modal (Docente) ────────────────────────────────────────────
function NovoCoachingModal({ onClose, onSuccess, selectedDate }) {
    const [loading, setLoading] = useState(false)
    const [erro, setErro] = useState('')
    const [erroHora, setErroHora] = useState('')
    const [modalidades, setModalidades] = useState([])
    const [salas, setSalas] = useState([])
    const [form, setForm] = useState({
        id_modalidade: '',
        id_sala: '',
        data: selectedDate ? format(selectedDate, 'yyyy-MM-dd') : '',
        hora: '10:00',
        duracao: 60,
        num_alunos: 1,
    })

    useEffect(() => {
        api.get('/modalidades').then(d => setModalidades(Array.isArray(d) ? d : [])).catch(() => { })
        api.get('/salas').then(d => setSalas(Array.isArray(d) ? d : [])).catch(() => { })
    }, [])

    function set(k, v) { setForm(prev => ({ ...prev, [k]: v })) }

    async function handleSubmit() {
        if (!form.data || !form.hora) { setErro('Data e hora são obrigatórias.'); return }
        if (form.hora < '08:30' || form.hora > '21:30') {
            setErroHora('A hora deve estar entre as 08:30 e as 21:30.')
            setErro('Corrija a hora assinalada.')
            return
        }
        setErroHora('')
        setLoading(true)
        setErro('')
        try {
            const isoWallClock = toWallClockISO(form.data, form.hora)
            await api.post('/aulas', {
                data_a_realizar: isoWallClock,
                hora_inicio: isoWallClock,
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
                            <input type="time" value={form.hora}
                                onChange={e => {
                                    const v = e.target.value
                                    set('hora', v)
                                    if (v && (v < '08:30' || v > '21:30')) {
                                        setErroHora('Fora do horário permitido (08:30–21:30)')
                                    } else {
                                        setErroHora('')
                                    }
                                }}
                                min="08:30" max="21:30"
                                className={`w-full bg-white border rounded-lg px-3 py-2.5 text-sm focus:outline-none transition-colors ${erroHora ? 'border-red-500 focus:border-red-500' : 'border-[#6F7978] focus:border-[#006A68]'}`} />
                            {erroHora && (
                                <p className="text-[10px] text-red-600 mt-1 flex items-center gap-1 whitespace-nowrap">
                                    <span className="inline-block w-3 h-3 rounded-full bg-red-500 text-white text-[8px] flex items-center justify-center font-bold">!</span>
                                    {erroHora}
                                </p>
                            )}
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
                                {Array.isArray(salas) && salas.map(s => <option key={s.id_sala} value={s.id_sala}>{s.nome}</option>)}
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
    const [isOpen, setIsOpen] = useState(false)

    // Find current label
    const currentOption = options.find(o => String(o.id !== undefined ? o.id : o) === String(value))
    const currentLabel = currentOption ? (currentOption.nome || currentOption) : (placeholder || 'Geral (Tudo)')

    return (
        <div className="relative inline-block text-left select-none z-20">
            <button
                type="button"
                onClick={() => setIsOpen(!isOpen)}
                className="flex items-center justify-between gap-2.5 pl-4 pr-3 py-2 bg-white border border-[#4a6362]/25 rounded-[12px] text-xs font-semibold text-[#324B4A] hover:bg-[#EFF5F4] transition-all cursor-pointer focus:outline-none focus:border-[#006A68] min-w-[150px]"
            >
                <span className="truncate">{currentLabel}</span>
                <ChevronDown size={14} className={`text-[#4A6362] transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
            </button>

            {isOpen && (
                <>
                    {/* Backdrop to close when clicking outside */}
                    <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />

                    {/* Dropdown Menu */}
                    <div className="absolute left-0 mt-1.5 w-[200px] bg-white border border-[#4a6362]/15 rounded-[16px] shadow-lg py-1.5 z-50 animate-in fade-in slide-in-from-top-2 duration-150">
                        {placeholder && (
                            <button
                                type="button"
                                onClick={() => { onChange(''); setIsOpen(false); }}
                                className={`w-full text-left px-4 py-2.5 text-xs font-semibold hover:bg-[#EFF5F4] transition-colors ${value === '' ? 'text-[#006A68] font-bold bg-[#EFF5F4]/60' : 'text-[#324B4A]'}`}
                            >
                                {placeholder}
                            </button>
                        )}
                        {options.map(o => {
                            const optionId = o.id !== undefined ? o.id : o;
                            const optionLabel = o.nome || o;
                            const isSelected = String(optionId) === String(value);
                            return (
                                <button
                                    key={optionId}
                                    type="button"
                                    onClick={() => { onChange(optionId); setIsOpen(false); }}
                                    className={`w-full text-left px-4 py-2.5 text-xs font-semibold hover:bg-[#EFF5F4] transition-colors ${isSelected ? 'text-[#006A68] font-bold bg-[#EFF5F4]/60' : 'text-[#324B4A]'}`}
                                >
                                    {optionLabel}
                                </button>
                            )
                        })}
                    </div>
                </>
            )}
        </div>
    )
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function Horario() {
    const today = useMemo(() => {
        const d = new Date(); d.setHours(0, 0, 0, 0); return d
    }, [])

    const user = authService.getUser()
    const role = Number(user?.role ?? 3)
    const [showNovoEvento, setShowNovoEvento] = useState(false)
    // View state
    const [viewMode, setViewMode] = useState('month') // 'month' | 'week'
    const [currentDate, setCurrentDate] = useState(new Date(today))
    const [filterType, setFilterType] = useState('') // 'Pessoal' | 'Geral' | ''
    const [filterModalidade, setFilterModalidade] = useState('')

    const navigate = useNavigate()

    // Data
    const [aulas, setAulas] = useState([])
    const [eventos, setEventos] = useState([])
    const [disponibilidades, setDisponibilidades] = useState([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState('')
    const [salas, setSalas] = useState([])

    // Modals
    const [selectedItem, setSelectedItem] = useState(null)
    const [showNovoCoaching, setShowNovoCoaching] = useState(false)
    const [showNovaDisponibilidade, setShowNovaDisponibilidade] = useState(false)
    const [selectedDate, setSelectedDate] = useState(null)
    const [itemToEdit, setItemToEdit] = useState(null)
    const [showEditSala, setShowEditSala] = useState(false)
    const [toast, setToast] = useState(null)
    const [pendingDeleteItem, setPendingDeleteItem] = useState(null)

    function showToast(msg, type = 'success') {
        setToast({ msg, type })
        setTimeout(() => setToast(null), 3500)
    }

    const fetchAll = useCallback(async () => {
        setLoading(true)
        setError('')
        try {
            const [aulasRes, evRes, meusEvRes, dispRes] = await Promise.allSettled([
                role === 1
                    ? coachingService.listarPedidosPendentes({ estados: '1,2,3,4,5' })
                    : (role === 2 ? coachingService.listarMinhasAulas() : coachingService.listarMeusPedidos()),
                role === 1 || role === 2 ? eventService.getAll() : Promise.resolve([]),
                role === 2 || role === 3 ? eventService.getMyEvents() : Promise.resolve([]),
                role === 2 ? disponibilidadeService.listar() : (role === 3 ? coachingService.consultarDisponibilidades() : Promise.resolve([]))
            ])

            const rawAulas = aulasRes.status === 'fulfilled' ? (Array.isArray(aulasRes.value) ? aulasRes.value : (aulasRes.value?.data || [])) : []
            setAulas(rawAulas.map(a => {
                let resolvedIdEstado = a.id_estado;
                if (!resolvedIdEstado && a.estado) {
                    const est = String(a.estado).toLowerCase();
                    if (est.includes('pend') || est.includes('agend')) resolvedIdEstado = 1;
                    else if (est.includes('valida')) resolvedIdEstado = 2;
                    else if (est.includes('confirm')) resolvedIdEstado = 3;
                    else if (est.includes('conclui') || est.includes('finaliz')) resolvedIdEstado = 4;
                    else if (est.includes('cancel')) resolvedIdEstado = 5;
                }
                return {
                    ...a,
                    id: a.id_marcacao,
                    id_estado: resolvedIdEstado,
                    data_de_realizacao: a.data,
                    _data_raw: a.data,
                    _type: 'aula',
                    modalidade: typeof a.modalidade === 'object' ? a.modalidade.nome : (a.modalidade || '—'),
                    docente: typeof a.docente === 'object' ? a.docente.nome : (a.docente || '—'),
                    sala: typeof a.sala === 'object' ? a.sala.nome : (a.sala || a.sala_atual || 'Por atribuir'),
                    alunos: a.alunos?.map(al => typeof al === 'object' ? al.nome : al) || [],
                    duracao: a.duracao_minutos ? `${a.duracao_minutos} min` : (a.duracao || '—')
                }
            }))

            const rawDisp = dispRes.status === 'fulfilled' ? (Array.isArray(dispRes.value) ? dispRes.value : (dispRes.value?.data || [])) : []
            setDisponibilidades(rawDisp.map(d => ({ ...d, _type: 'disponibilidade' })))

            let fetchedEvents = []
            if (role === 1 && evRes.status === 'fulfilled') {
                fetchedEvents = Array.isArray(evRes.value) ? evRes.value : []
            } else if (role === 2 && evRes.status === 'fulfilled' && meusEvRes.status === 'fulfilled') {
                const allEvents = Array.isArray(evRes.value) ? evRes.value : []
                const myEvents = Array.isArray(meusEvRes.value) ? meusEvRes.value : []
                const myEventIds = new Set(myEvents.map(e => e.id_evento))
                fetchedEvents = allEvents.map(e => ({ ...e, _inserido: myEventIds.has(e.id_evento) }))
            } else if (role === 3 && meusEvRes.status === 'fulfilled') {
                fetchedEvents = Array.isArray(meusEvRes.value) ? meusEvRes.value : []
                fetchedEvents = fetchedEvents.map(e => ({ ...e, _inserido: true }))
            }
            setEventos(fetchedEvents.map(e => ({ ...e, _type: 'evento' })))

            // Fetch salas (apenas admin precisa para editar sala)
            if (role === 1) {
                const salasRes = await api.get('/salas')
                setSalas(Array.isArray(salasRes) ? salasRes : (salasRes?.data || []))
            }
        } catch (e) {
            setError(e.message || 'Erro ao carregar horário.')
        } finally {
            setLoading(false)
        }
    }, [role])

    useEffect(() => { fetchAll() }, [fetchAll])

    // Combine all items as calendar events
    const events = useMemo(() => {
        // Todos os perfis veem todas as aulas
        const aulasToUse = aulas

        const mappedAulas = aulasToUse.map(a => {
            const dur = a.duracao_minutos || 60
            const start = parseDateTime(a.data_de_realizacao || a._data_raw)
            const end = start ? new Date(start.getTime() + dur * 60000) : null
            return {
                ...a,
                id: a.id,
                title: a.modalidade || 'Aula',
                start: start,
                end: end,
                _type: 'aula',
                data: formatDate(a.data || a.data_de_realizacao),
                hora: formatTime(a.hora_inicio),
                duracao_minutos: dur,
                duracao: `${dur} min`,
            }
        }).filter(e => e.start && e.id_estado !== 4 && e.id_estado !== 5)

        const mappedEventos = eventos.map(e => {
            const dur = e.duracao_minutos || 60
            const start = parseDateTime(e.data_de_realizacao)
            const end = start ? new Date(start.getTime() + dur * 60000) : null
            return {
                ...e,
                id: e.id_evento,
                title: e.nome || 'Evento',
                start: start,
                end: end,
                _isEvent: true,
                _type: 'evento',
                data: formatDate(e.data_de_realizacao),
                hora_inicio_str: formatTime(e.data_de_realizacao),
                hora: formatTime(e.data_de_realizacao),
                duracao_minutos: dur,
                duracao: `${dur} min`,
                descricao: e.descricao,
                local: e.local,
                sala: e.local,
                link_whatsapp: e.link_whatsapp,
                data_de_realizacao: e.data_de_realizacao,
                _data_raw: e.data_de_realizacao,
                _inserido: e._inserido
            }
        }).filter(e => e.start && e.id_evento_estado !== 5)

        let combined = [...mappedAulas, ...mappedEventos]

        // Disponibilidades -> Events (Visível no Calendário)
        if (role === 2 || role === 3) {
            const year = currentDate.getFullYear();
            const month = currentDate.getMonth();
            const daysInMonth = new Date(year, month + 1, 0).getDate();

            disponibilidades.forEach(d => {
                try {
                    const hIniRaw = d.hora_inicio ? String(d.hora_inicio) : '00:00';
                    const hFimRaw = d.hora_fim ? String(d.hora_fim) : '01:00';

                    const hIni = (typeof hIniRaw === 'string' && hIniRaw.includes('T')) ? hIniRaw.split('T')[1].slice(0, 5) : String(hIniRaw).slice(0, 5);
                    const hFim = (typeof hFimRaw === 'string' && hFimRaw.includes('T')) ? hFimRaw.split('T')[1].slice(0, 5) : String(hFimRaw).slice(0, 5);

                    const [h, m] = hIni.split(':').map(Number);
                    const [h2, m2] = hFim.split(':').map(Number);

                    if (d.data_especifica) {
                        const dateStr = String(d.data_especifica).split('T')[0];
                        const dateObj = new Date(dateStr + "T12:00:00");

                        if (dateObj.getMonth() === month && dateObj.getFullYear() === year) {
                            const start = new Date(dateObj.getFullYear(), dateObj.getMonth(), dateObj.getDate(), h || 0, m || 0);
                            const end = new Date(dateObj.getFullYear(), dateObj.getMonth(), dateObj.getDate(), h2 || (h || 0) + 1, m2 || 0);

                            // Não mostrar disponibilidades passadas
                            if (start < today) return;

                            combined.push({
                                ...d,
                                title: `Livre (${hIni} - ${hFim})`,
                                start,
                                end,
                                _isEvent: false,
                                _isDisponibilidade: true,
                                _type: 'disponibilidade',
                                modalidade: 'Disponível',
                                data: format(start, 'dd/MM/yyyy'),
                                hora: hIni,
                                hora_inicio: hIni,
                                hora_fim: hFim
                            });
                        }
                    } else if (d.dia_semana !== undefined && d.dia_semana !== null) {
                        for (let day = 1; day <= daysInMonth; day++) {
                            const dateObj = new Date(year, month, day);
                            if (dateObj.getDay() === Number(d.dia_semana)) {
                                const start = new Date(year, month, day, h || 0, m || 0);
                                const end = new Date(year, month, day, h2 || (h || 0) + 1, m2 || 0);

                                // Não mostrar disponibilidades passadas
                                if (start < today) continue;

                                combined.push({
                                    ...d,
                                    title: `Livre (${hIni} - ${hFim})`,
                                    start,
                                    end,
                                    _isEvent: false,
                                    _isDisponibilidade: true,
                                    modalidade: 'Disponível',
                                    data: format(start, 'dd/MM/yyyy'),
                                    hora: hIni,
                                    hora_inicio: hIni,
                                    hora_fim: hFim
                                });
                            }
                        }
                    }
                } catch (err) {
                    console.error("Erro ao carregar disponibilidade:", err);
                }
            });
        }

        // Só filtrar por tipo se selecionado
        if (filterType === 'aulas') {
            combined = combined.filter(it => it._type === 'aula')
        } else if (filterType === 'eventos') {
            combined = combined.filter(it => it._type === 'evento')
        } else if (filterType === 'disponibilidades') {
            combined = combined.filter(it => it._type === 'disponibilidade')
        }

        // Só filtrar por modalidade se selecionado
        if (filterModalidade && filterModalidade !== 'Todas as modalidades') {
            combined = combined.filter(it => it.modalidade === filterModalidade)
        }

        return combined
    }, [aulas, eventos, disponibilidades, currentDate, filterModalidade, filterType, role])

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

    const handleAdd = (date) => {
        // Bloquear datas passadas
        const d = new Date(date)
        d.setHours(0, 0, 0, 0)
        if (d < today) {
            showToast('Não é possível marcar eventos ou disponibilidades em datas passadas.', 'error')
            return
        }

        setSelectedDate(date)
        if (role === 1) setShowNovoEvento(true)
        else if (role === 2) setShowNovaDisponibilidade(true)
        else setShowNovoCoaching(true)
    }

    const handleEditItem = (item) => {
        setItemToEdit(item)
        if (item._type === 'disponibilidade') {
            setShowNovaDisponibilidade(true)
        } else if (item._type === 'evento') {
            if (role === 1) {
                setShowNovoEvento(true)
            } else {
                showToast('Edição de eventos disponível para administradores', 'info')
            }
        } else if (item._type === 'aula') {
            if (role === 1) {
                setShowEditSala(true)
            }
        }
    }

    const handleDeleteItem = (item) => {
        setPendingDeleteItem(item)
    }

    const executeDeleteItem = async (item) => {
        setPendingDeleteItem(null)
        try {
            if (item._type === 'disponibilidade') {
                await disponibilidadeService.eliminar(item.id_disponibilidade)
            } else if (item._type === 'aula') {
                if (role === 2) {
                    await coachingService.cancelarMarcacaoDocente(item.id, 'Cancelado pelo docente')
                } else if (role === 1) {
                    if (item.id_estado === 3) {
                        await coachingService.cancelarMarcacaoConfirmada(item.id, 'Cancelado pelo administrador')
                    } else {
                        await coachingService.cancelarPedidoPendente(item.id)
                    }
                } else {
                    await coachingService.cancelarPedidoPendente(item.id)
                }
            } else if (item._type === 'evento') {
                await eventService.delete(item.id_evento)
            }
            setSelectedItem(null)
            showToast('Operação realizada com sucesso!')
            fetchAll()
        } catch (e) {
            showToast(e.message || 'Erro ao processar', 'error')
        }
    }

    const eventStyleGetter = useCallback((event) => {
        let color;
        if (event._isDisponibilidade) {
            color = { bg: '#F4FBF9', border: '#80D5D2', text: '#006A68' }; // Verde claro/teal para Disponibilidade
        } else if (event._isEvent) {
            color = EVENT_COLOR;
        } else {
            color = getModalityColor(event.modalidade);
        }

        const isNotInsertedDocente = event._isEvent && role === 2 && !event._inserido;

        return {
            style: {
                backgroundColor: color.bg,
                borderColor: color.border,
                color: color.text,
                borderRadius: '6px',
                border: isNotInsertedDocente ? `1px dashed ${color.border}` : `1px solid ${color.border}`,
                opacity: isNotInsertedDocente ? 0.7 : 1,
                fontSize: '11px',
                fontWeight: '600',
                boxShadow: '0 1px 2px rgba(0,0,0,0.05)'
            }
        }
    }, [role])

    // Estilos personalizados para a grelha e hoje
    const calendarStyles = `
        .rbc-calendar { background: white; font-family: 'Sora', sans-serif; }
        .rbc-month-view { 
            border: 1px solid #D1D5D4 !important; 
            border-radius: 16px; 
            overflow: hidden; 
            box-shadow: 0 4px 30px rgba(0,0,0,0.05);
        }
        
        /* Grelha muito definida */
        .rbc-day-bg { border-left: 1px solid #E3E9E8 !important; border-top: 1px solid #E3E9E8 !important; }
        .rbc-month-row { border-top: none !important; }
        .rbc-month-row + .rbc-month-row { border-top: 1px solid #E3E9E8 !important; }

        .rbc-header { 
            padding: 15px 0 !important; 
            font-weight: 700 !important; 
            text-transform: uppercase; 
            font-size: 12px; 
            color: #4A6362; 
            background: #F8FAFA;
            border-bottom: 1px solid #D1D5D4 !important;
            border-left: 1px solid #D1D5D4 !important;
        }
        .rbc-header:first-child { border-left: none !important; }
        
        /* Ocultar a área de "dia inteiro" (all-day) na vista semanal para remover o espaço em branco */
        .rbc-allday-cell { display: none !important; }
        
        .rbc-off-range-bg { background-color: #F9FAFB !important; }
        
        /* Círculo do dia "Hoje" (Azul Google) */
        .today-circle {
            display: inline-flex;
            align-items: center;
            justify-content: center;
            width: 32px;
            height: 32px;
            border-radius: 50%;
            background-color: #1A73E8;
            color: white !important;
            font-weight: 700;
            margin-bottom: 4px;
            box-shadow: 0 2px 4px rgba(26, 115, 232, 0.3);
        }
        
        .rbc-date-cell { 
            padding: 8px 12px !important; 
            text-align: right !important; 
            font-size: 14px; 
            font-weight: 500;
            color: #3C4043;
        }

        .rbc-now .rbc-button-link { color: #1A73E8; }
        
        /* Estilo dos eventos dentro da célula */
        .rbc-event { 
            margin: 1px 4px !important; 
            padding: 0 !important; 
            background: transparent !important; 
            border: none !important; 
        }

        /* Popup de "Ver mais" */
        .rbc-overlay {
            background: white !important;
            border-radius: 12px !important;
            border: 1px solid #E3E9E8 !important;
            box-shadow: 0 10px 25px rgba(0,0,0,0.1) !important;
            padding: 12px !important;
            z-index: 100 !important;
        }
        .rbc-overlay-header {
            border-bottom: 1px solid #E3E9E8 !important;
            padding-bottom: 8px !important;
            margin-bottom: 8px !important;
            font-weight: 700 !important;
            color: #006A68 !important;
        }

        .rbc-show-more { 
            color: #5F6368 !important; 
            font-weight: 600; 
            font-size: 12px; 
            padding: 2px 8px !important;
            border-radius: 4px;
            margin-left: 4px;
        }
        .rbc-show-more:hover { background-color: #F1F3F4; }
    `;

    const filterOptions = useMemo(() => {
        const base = [
            { id: '', nome: 'Geral (Tudo)' },
            { id: 'aulas', nome: 'Aulas' },
            { id: 'eventos', nome: 'Eventos' }
        ]
        if (role !== 1) {
            base.push({ id: 'disponibilidades', nome: 'Disponibilidades' })
        }
        return base
    }, [role])

    return (
        <>
            <style>{calendarStyles}</style>
            <div className="font-['Sora'] max-w-[1400px] mx-auto">

                {/* Header */}
                <div className="flex flex-wrap items-end justify-between gap-4 mb-6">
                    <div>
                        <p className="text-[#4A6362] text-sm font-medium tracking-wide mb-1">
                            {role === 1 ? 'Gestão de Horários' : role === 2 ? 'As minhas sessões' : 'O meu plano de aulas'}
                        </p>
                        <h1 className="text-[#324B4A] font-normal text-3xl leading-tight tracking-tight">
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

                        {/* Docente: Nova Disponibilidade */}
                        {role === 2 && (
                            <button onClick={() => setShowNovaDisponibilidade(true)}
                                className="flex items-center gap-2 px-4 py-2.5 bg-[#006A68] text-white rounded-xl text-sm font-bold hover:bg-[#00504E] transition-colors">
                                <Plus size={15} /> Nova Disponibilidade
                            </button>
                        )}

                        {/* Admin: Novo evento */}
                        {role === 1 && (
                            <button onClick={() => { setSelectedDate(null); setShowNovoEvento(true); }}
                                className="flex items-center gap-2 px-4 py-2.5 bg-[#006A68] text-white rounded-xl text-sm font-bold hover:bg-[#00504E] transition-colors">
                                <Plus size={15} /> Novo evento
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
                        style={{ height: 850, fontFamily: 'Sora, sans-serif', fontSize: 15 }}
                        view={viewMode}
                        onView={setViewMode}
                        date={currentDate}
                        onNavigate={date => setCurrentDate(date)}
                        min={new Date(0, 0, 0, 8, 0, 0)}
                        max={new Date(0, 0, 0, 22, 0, 0)}
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
                            return {
                                className: isToday ? 'rbc-now' : '',
                                style: {
                                    backgroundColor: isToday ? '#F0F9F9' : 'transparent',
                                }
                            }
                        }}
                        components={{
                            event: EventComponent,
                            toolbar: CustomToolbar,
                            dateHeader: ({ label, date }) => {
                                const isToday = format(date, 'yyyy-MM-dd') === format(new Date(), 'yyyy-MM-dd');
                                return (
                                    <div className="rbc-date-cell relative flex items-center justify-end h-8 px-2 w-full group/header">
                                        {/* Só mostrar botão de adicionar se for hoje ou no futuro */}
                                        {new Date(date).getTime() >= today.getTime() && (
                                            <button
                                                type="button"
                                                onClick={(e) => { e.stopPropagation(); handleAdd(date); }}
                                                className="absolute left-1.5 top-1/2 -translate-y-1/2 w-6 h-6 bg-[#006A68] text-white rounded-[5px] flex items-center justify-center opacity-0 group-hover/header:opacity-100 transition-opacity hover:bg-[#00504E] shadow-sm cursor-pointer z-50"
                                                title="Adicionar"
                                            >
                                                <Plus size={15} strokeWidth={3} />
                                            </button>
                                        )}
                                        <button type="button" className={`rbc-button-link ${isToday ? 'today-circle' : ''}`}>
                                            {label}
                                        </button>
                                    </div>
                                );
                            },
                            dateCellWrapper: (props) => (
                                <DateCellWrapper
                                    {...props}
                                    currentMonth={currentDate.getMonth()}
                                    onAdd={handleAdd}
                                />
                            )
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
                        popup={true}
                        selectable={false}
                        length={30}
                        longPressThreshold={100}
                        dayLayoutAlgorithm="no-overlap"
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
            {selectedItem && (() => {
                const isEvent = !!(selectedItem._isEvent || selectedItem._type === 'evento');
                const isDisp = !!(selectedItem._isDisponibilidade || selectedItem._type === 'disponibilidade');
                const isAula = !!(selectedItem._type === 'aula');

                let canEdit = false;
                let canDelete = false;

                if (role === 1) {
                    // Admin pode tudo em itens futuros
                    canEdit = !isAula; // O admin usa o botão "Mudar Sala" para aulas, não o "Editar"
                    canDelete = true;
                } else if (role === 2) {
                    // Docente gere suas disponibilidades e pode cancelar suas aulas
                    if (isDisp) {
                        canEdit = true;
                        canDelete = true;
                    } else if (isAula) {
                        canDelete = true; // "Cancelar"
                    }
                } else if (role === 3) {
                    // Aluno pode cancelar suas aulas
                    if (isAula) {
                        canDelete = true;
                    }
                }

                return (
                    <ItemDetailModal
                        item={selectedItem}
                        role={role}
                        onClose={() => setSelectedItem(null)}
                        onEdit={canEdit ? handleEditItem : null}
                        onChangeRoom={(role === 1 && isAula) ? () => setShowEditSala(true) : undefined}
                        onDelete={canDelete ? handleDeleteItem : null}
                        onNavigate={(item) => {
                            if (item._isEvent || item._type === 'evento') {
                                navigate(`/eventos/${item.id}`);
                            } else {
                                navigate('/aulas');
                            }
                        }}
                    />
                );
            })()}

            {showNovoCoaching && (
                <NovaMarcacaoModal
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
                    onClose={() => {
                        setShowNovaDisponibilidade(false)
                        setItemToEdit(null)
                    }}
                    selectedDate={selectedDate}
                    initialData={itemToEdit}
                    onSuccess={() => {
                        setShowNovaDisponibilidade(false)
                        setItemToEdit(null)
                        showToast(itemToEdit ? 'Disponibilidade atualizada!' : 'Disponibilidade criada!')
                        fetchAll()
                    }}
                />
            )}

            {showNovoEvento && (
                <NovoEventoModal
                    onClose={() => {
                        setShowNovoEvento(false)
                        setItemToEdit(null)
                    }}
                    selectedDate={selectedDate}
                    initialData={itemToEdit}
                    onSuccess={(nome) => {
                        setShowNovoEvento(false)
                        setItemToEdit(null)
                        showToast(itemToEdit ? `Evento "${nome}" atualizado!` : `Evento "${nome}" criado com sucesso!`)
                        fetchAll()
                    }}
                />
            )}

            {showEditSala && (
                <EditSalaModal
                    item={itemToEdit}
                    salas={salas}
                    onClose={() => {
                        setShowEditSala(false)
                        setItemToEdit(null)
                    }}
                    onSuccess={() => {
                        setShowEditSala(false)
                        setItemToEdit(null)
                        showToast('Sala alterada com sucesso!')
                        fetchAll()
                    }}
                />
            )}


            {pendingDeleteItem && (
                <div className="fixed inset-0 z-[120] flex items-center justify-center p-4" onClick={() => setPendingDeleteItem(null)}>
                    <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" />
                    <div className="relative bg-white rounded-2xl shadow-xl p-6 w-full max-w-sm font-['Sora']" onClick={e => e.stopPropagation()}>
                        <p className="font-semibold text-neutral-800 text-base mb-1">
                            {pendingDeleteItem._type === 'aula' ? 'Cancelar marcação?' : 'Eliminar registo?'}
                        </p>
                        <p className="text-sm text-neutral-500 mb-5">Esta ação não pode ser desfeita.</p>
                        <div className="flex gap-2">
                            <button onClick={() => setPendingDeleteItem(null)} className="flex-1 py-2.5 text-sm border border-neutral-600/25 rounded-xl text-neutral-600 hover:bg-neutral-50 transition-colors">
                                Cancelar
                            </button>
                            <button onClick={() => executeDeleteItem(pendingDeleteItem)} className="flex-1 py-2.5 text-sm bg-red-600 text-white font-bold rounded-xl hover:bg-red-700 transition-colors">
                                Confirmar
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {toast && <Toast {...toast} onClose={() => setToast(null)} />}
        </>
    )
}
