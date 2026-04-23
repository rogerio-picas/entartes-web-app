import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import {
    CalendarCheck, CalendarDays, Clock, CheckCircle2, XCircle,
    AlertCircle, RefreshCw, Check, X, Plus, ChevronRight,
    Users, MapPin, Music, User, TrendingUp, Star, Megaphone
} from 'lucide-react'
import { api } from '../services/api'
import coachingService from '../services/coachingService'
import { eventService } from '../services/eventService'
import NovoEventoModal from './NovoEventoModal'

// ─── Helpers ──────────────────────────────────────────────────────────────────
function formatDate(raw) {
    if (!raw) return '—'
    return new Date(raw).toLocaleDateString('pt-PT', { day: '2-digit', month: '2-digit', year: 'numeric' })
}
function formatTime(raw) {
    if (!raw) return '—'
    return new Date(raw).toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit' })
}
function formatDuration(min) {
    if (!min) return '—'
    const h = Math.floor(min / 60), m = min % 60
    return h > 0 ? (m > 0 ? `${h}h ${m}min` : `${h}h`) : `${m} min`
}
function timeRemaining(dateRaw) {
    if (!dateRaw) return null
    const diff = new Date(dateRaw) - new Date()
    if (diff <= 0) return 'Expirado'
    const h = Math.floor(diff / 3600000), m = Math.floor((diff % 3600000) / 60000)
    return `${h}h${m.toString().padStart(2, '0')}min restantes`
}

// ─── Stat Card ─────────────────────────────────────────────────────────────────
function StatCard({ count, label, color, bg, border }) {
    return (
        <div className={`relative flex items-center gap-3 rounded-xl px-5 py-3 border ${bg} ${border} min-w-[160px]`}>
            <span className={`text-4xl font-bold font-['Sora'] ${color}`}>{count}</span>
            <span className={`text-sm font-medium ${color} leading-tight max-w-[80px]`}>{label}</span>
        </div>
    )
}

// ─── Mini Bar Chart (coaching hours by modality) ───────────────────────────────
function ModalityChart({ data }) {
    const COLORS = ['#00504E', '#BA1A1A', '#02B2AF', '#89AFFF', '#B800D8']
    const modalidades = [...new Set(data.map(d => d.modalidade?.nome).filter(Boolean))]
    const counts = modalidades.map(m => ({
        nome: m,
        total: data.filter(d => d.modalidade?.nome === m).reduce((a, c) => a + (c._sum?.duracao_minutos ?? 0), 0)
    }))
    const max = Math.max(...counts.map(c => c.total), 1)
    return (
        <div className="flex flex-col h-full">
            <p className="text-xs font-bold text-[#006A68] mb-2">Por modalidade</p>
            <div className="flex items-end gap-1.5 flex-1 min-h-[80px]">
                {counts.slice(0, 5).map((c, i) => (
                    <div key={c.nome} className="flex flex-col items-center gap-1 flex-1">
                        <div
                            className="w-full rounded-t-sm min-h-[4px] transition-all"
                            style={{ height: `${Math.round((c.total / max) * 80)}px`, backgroundColor: COLORS[i % COLORS.length] }}
                        />
                        <span className="text-[9px] text-gray-500 truncate w-full text-center">{c.nome.slice(0, 6)}</span>
                    </div>
                ))}
                {counts.length === 0 && <p className="text-xs text-gray-400 m-auto">Sem dados</p>}
            </div>
            <div className="flex flex-wrap gap-2 mt-2">
                {counts.slice(0, 3).map((c, i) => (
                    <div key={c.nome} className="flex items-center gap-1">
                        <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: COLORS[i] }} />
                        <span className="text-[10px] text-gray-600">{c.nome}</span>
                    </div>
                ))}
            </div>
        </div>
    )
}

// ─── Coaching Hours Line Chart ─────────────────────────────────────────────────
function CoachingHoursChart({ data }) {
    if (!data.length) return <div className="flex items-center justify-center h-full text-xs text-gray-400">Sem dados</div>
    const vals = data.map(d => d._sum?.duracao_minutos ?? 0)
    const max = Math.max(...vals, 1)
    const W = 300, H = 120, PAD = 20
    const pts = vals.map((v, i) => {
        const x = PAD + (i / Math.max(vals.length - 1, 1)) * (W - 2 * PAD)
        const y = H - PAD - (v / max) * (H - 2 * PAD)
        return `${x},${y}`
    }).join(' ')
    return (
        <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-full" style={{ maxHeight: 120 }}>
            <polyline fill="none" stroke="#006A68" strokeWidth="2" points={pts} />
            {vals.map((v, i) => {
                const x = PAD + (i / Math.max(vals.length - 1, 1)) * (W - 2 * PAD)
                const y = H - PAD - (v / max) * (H - 2 * PAD)
                return <circle key={i} cx={x} cy={y} r="3" fill="#006A68" />
            })}
            <text x={W / 2} y={H - 4} textAnchor="middle" fontSize="9" fill="#4A6362">Média de horas de coaching</text>
        </svg>
    )
}

// ─── Student Enrollment Bar Chart ─────────────────────────────────────────────
function EnrollmentChart({ data }) {
    const W = 300, H = 120, PAD = 24
    const months = data.slice(-12)
    const vals = months.map(d => d.totalSessoes ?? 0)
    const max = Math.max(...vals, 1)
    const barW = Math.max(8, (W - 2 * PAD) / Math.max(months.length, 1) - 4)
    return (
        <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-full" style={{ maxHeight: 120 }}>
            {vals.map((v, i) => {
                const x = PAD + i * ((W - 2 * PAD) / Math.max(months.length, 1))
                const bh = Math.max(2, (v / max) * (H - 2 * PAD))
                return <rect key={i} x={x} y={H - PAD - bh} width={barW} height={bh} rx="2" fill="#006A68" />
            })}
            <text x={W / 2} y={H - 4} textAnchor="middle" fontSize="9" fill="#4A6362">Alunos inscritos em coaching</text>
        </svg>
    )
}

// ─── Live Class Card ──────────────────────────────────────────────────────────
const DOT_COLORS = ['#89AFFF', '#B800D8', '#02B2AF', '#049A59', '#B93815']
function LiveClassCard({ aula, idx }) {
    const progress = aula.numero_alunos_pretendidos
        ? Math.round((aula.aluno_marcacao?.length ?? 0) / aula.numero_alunos_pretendidos * 100)
        : 0
    return (
        <div className="flex-1 min-w-[300px] max-w-[380px] bg-[#F4FBF9] border border-[#BEC9C7] rounded-xl p-4 flex flex-col gap-2.5">
            <div className="flex items-center gap-1.5">
                <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: DOT_COLORS[idx % DOT_COLORS.length] }} />
                <span className="text-sm font-medium text-[#161D1C]">{aula.modalidade}</span>
            </div>
            <div className="bg-white/60 border border-[#006A68] rounded-xl flex items-center gap-3 px-4 py-2">
                <div className="w-9 h-9 rounded-full bg-[#CCE8E6] border border-[#006A68] flex items-center justify-center shrink-0">
                    <User size={16} className="text-[#006A68]" />
                </div>
                <span className="font-medium text-[#000] text-sm">{aula.docente}</span>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
                <span className="bg-[#006A68] text-white text-[11px] font-semibold px-2 py-0.5 rounded-full">{aula.hora}</span>
                <span className="bg-[#DAE5E3] text-[#6F7978] text-[11px] px-2 py-0.5 rounded-full">{aula.duracao}</span>
                <span className="bg-[#DAE5E3] text-[#3F4948] text-[11px] px-2 py-0.5 rounded-full">Individual</span>
            </div>
            <div className="border-t border-dashed border-[#6F7978]/20 pt-2">
                <div className="bg-[#006A68]/10 border border-[#006A68] rounded-lg text-center py-1.5 text-sm font-medium text-[#006A68]">
                    {aula.sala}
                </div>
            </div>
            <div className="flex items-center gap-2">
                <div className="flex-1 h-1.5 bg-[#00504E]/20 rounded-full overflow-hidden">
                    <div className="h-full bg-[#00504E] rounded-full" style={{ width: `${progress}%` }} />
                </div>
                <span className="text-sm font-semibold text-[#00504E]">{progress}%</span>
            </div>
        </div>
    )
}

// ─── Coaching Validation Card ─────────────────────────────────────────────────
function CoachingCard({ aula, onConfirm, onReject, loading }) {
  const [salas, setSalas] = useState([])
  const [selectedSala, setSelectedSala] = useState('')
  const remaining = timeRemaining(aula._data_raw)

  useEffect(() => {
    api.get('/salas').then(d => setSalas(Array.isArray(d) ? d : [])).catch(() => {})
  }, [])

  function handleConfirm() {
    onConfirm(aula.id, selectedSala ? parseInt(selectedSala) : null)
  }

  return (
    <div className="flex-1 min-w-[300px] max-w-[380px] bg-[#F4FBF9] border border-[#006A68] rounded-xl p-4 flex flex-col gap-2.5">
      <div className="flex flex-col gap-1 text-sm">
        {[['Modalidade', aula.modalidade], ['Data', aula.data],
          ['Docente', aula.docente], ['Duração', aula.duracao],
          ['Hora início', aula.hora], ['Tipo', 'Individual']
        ].map(([k, v]) => (
          <div key={k}>
            <span className="text-[#006A68]">{k}: </span>
            <span className="text-[#000] font-medium">{v}</span>
          </div>
        ))}
      </div>

      {/* Aferir sala */}
      <div>
        <label className="text-[10px] text-[#4A6362] font-bold uppercase tracking-wider mb-1 block">
          Aferir sala
        </label>
        <select value={selectedSala} onChange={e => setSelectedSala(e.target.value)}
          className="w-full bg-white border border-[#6F7978] rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#006A68]">
          <option value="">Selecionar sala...</option>
          {salas.map(s => <option key={s.id_sala} value={s.id_sala}>{s.nome}</option>)}
        </select>
      </div>

      {remaining && (
        <div className="flex items-center gap-1.5 text-xs text-[#000]">
          <Clock size={13} /><span>{remaining}</span>
        </div>
      )}
      <div className="flex items-center gap-2 pt-1">
        <button onClick={() => onReject(aula.id)} disabled={loading === aula.id}
          className="w-12 h-12 bg-[#BA1A1A] border border-[#93000A] rounded-xl flex items-center justify-center hover:opacity-90 disabled:opacity-50">
          <X size={18} strokeWidth={3} className="text-white" />
        </button>
        <button onClick={handleConfirm} disabled={loading === aula.id}
          className="flex-1 h-12 bg-[#049A59] border border-[#006A68] rounded-xl flex items-center justify-center gap-2 hover:opacity-90 disabled:opacity-50 text-white text-sm font-bold">
          <Check size={16} /> Confirmar
        </button>
      </div>
    </div>
  )
}

// ─── Confirmed Class Card ──────────────────────────────────────────────────────
function ConfirmedCard({ aula }) {
    return (
        <div className="flex-1 min-w-[300px] max-w-[380px] bg-[#F4FBF9] border border-[#006A68] rounded-xl p-5 flex flex-col gap-3">
            <div className="flex gap-3">
                <div className="flex-1 text-sm flex flex-col gap-0.5">
                    {[
                        ['Modalidade', aula.modalidade], ['Data', aula.data],
                        ['Hora início', aula.hora], ['Duração', aula.duracao],
                        ['Estúdio', aula.sala], ['Tipo', 'Individual']
                    ].map(([k, v]) => (
                        <div key={k}>
                            <span className="text-[#006A68]">{k}: </span>
                            <span className="text-[#000] font-medium">{v}</span>
                        </div>
                    ))}
                </div>
                <div className="flex flex-col items-center gap-1 text-center">
                    <div className="w-12 h-12 rounded-full bg-[#CCE8E6] flex items-center justify-center">
                        <User size={24} className="text-[#006A68] mt-2" />
                    </div>
                    <span className="text-[10px] font-bold text-[#00504E]">{aula.docente}</span>
                    <span className="text-[10px] text-[#000]">1852</span>
                </div>
            </div>
            <div className="flex items-center gap-2">
                <span className="bg-[#049A59] border border-[#0A7659] text-white text-[11px] font-semibold px-3 py-0.5 rounded-full">
                    Confirmada
                </span>
                <button className="bg-[#80D5D2] border border-[#006A68] text-white text-[11px] font-semibold px-3 py-0.5 rounded-full hover:brightness-95">
                    Ver mais
                </button>
            </div>
        </div>
    )
}

// ─── Event Card ───────────────────────────────────────────────────────────────
function EventCard({ event }) {
    const dt = event.data_de_realizacao
        ? new Date(event.data_de_realizacao).toLocaleDateString('pt-PT', { weekday: 'long', day: 'numeric', month: 'long' })
        : 'Data por definir'
    return (
        <div className="flex-1 min-w-[300px] max-w-[380px] bg-[#F4FBF9] border border-[#006A68] rounded-xl p-5 flex flex-col gap-2">
            <div className="flex items-center gap-2">
                <Megaphone size={20} className="text-[#006A68]" />
                <h3 className="font-bold text-[#006A68] text-lg leading-snug">{event.nome}</h3>
            </div>
            <p className="text-[#324B4A] font-semibold text-sm">{dt.charAt(0).toUpperCase() + dt.slice(1)}</p>
            <div className="text-sm text-[#006A68]">
                <span>Duração: </span><span className="text-[#000]">2h 30min</span>
            </div>
            {event.descricao && (
                <p className="text-xs text-[#6F7978] leading-relaxed line-clamp-3">{event.descricao}</p>
            )}
            <div className="flex justify-end mt-auto pt-1">
                <button className="bg-[#80D5D2] border border-[#006A68] text-white text-xs font-semibold px-4 py-1 rounded-full hover:brightness-95">
                    Ver mais
                </button>
            </div>
        </div>
    )
}

// ─── Section Header ───────────────────────────────────────────────────────────
function SectionHeader({ icon: Icon, title, action, onAction }) {
    return (
        <div className="flex items-center gap-3 mb-4">
            <Icon size={28} className="text-[#006A68]" />
            <h2 className="text-2xl font-bold text-black font-['Sora'] flex-1">{title}</h2>
            {action && (
                <button onClick={onAction} className="text-xs font-semibold text-[#006A68] hover:underline flex items-center gap-1">
                    {action} <ChevronRight size={13} />
                </button>
            )}
        </div>
    )
}

// ─── Scrollable Row ───────────────────────────────────────────────────────────
function ScrollRow({ children }) {
    return (
        <div className="w-full overflow-x-auto pb-2 hide-scrollbar">
            <div className="flex gap-4 w-max">{children}</div>
        </div>
    )
}

// ─── Toast ────────────────────────────────────────────────────────────────────
function Toast({ msg, type, onClose }) {
    return (
        <div className={`fixed bottom-6 right-6 z-[60] flex items-center gap-3 px-5 py-3 rounded-xl shadow-lg text-white font-['Sora'] text-sm font-medium ${type === 'success' ? 'bg-emerald-600' : 'bg-red-600'}`}>
            {type === 'success' ? <Check size={15} /> : <X size={15} />}
            {msg}
            <button onClick={onClose}><X size={13} className="opacity-70 hover:opacity-100" /></button>
        </div>
    )
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function HomeAdmin() {
    const navigate = useNavigate()
    const [loading, setLoading] = useState(true)
    const [loadingAction, setLoadingAction] = useState(null)
    const [toast, setToast] = useState(null)
    const [showNovoEvento, setShowNovoEvento] = useState(false)

    // Data state
    const [stats, setStats] = useState({ hoje: 0, porValidar: 0, concluidas: 0 })
    const [liveAulas, setLiveAulas] = useState([])
    const [coachings48h, setCoachings48h] = useState([])
    const [confirmedAulas, setConfirmedAulas] = useState([])
    const [eventos, setEventos] = useState([])
    const [horasData, setHorasData] = useState([])
    const [alunosData, setAlunosData] = useState([])

    function showToast(msg, type = 'success') {
        setToast({ msg, type })
        setTimeout(() => setToast(null), 3500)
    }

    const loadAll = useCallback(async () => {
        setLoading(true)
        try {
            const [todasRes, eventosRes, horasRes, alunosRes] = await Promise.allSettled([
                coachingService.listarPedidosPendentes({ estados: '1,2,3,4,5' }),
                eventService.getAll(),
                api.get('/relatorio/horas-docente'),
                api.get('/relatorio/alunos'),
            ])

            const rawTodas = todasRes.status === 'fulfilled' ? (Array.isArray(todasRes.value) ? todasRes.value : (todasRes.value?.data || [])) : []
            const todas = rawTodas.map(a => ({
                ...a,
                id: a.id_marcacao,
                _data_raw: a.data,
                data: new Date(a.data).toLocaleDateString('pt-PT'),
                hora: new Date(a.hora_inicio).toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit' }),
                duracao: formatDuration(a.duracao_minutos),
                sala: a.sala_atual
            }))
            
            const evs = eventosRes.status === 'fulfilled' && Array.isArray(eventosRes.value) ? eventosRes.value : []
            const horas = horasRes.status === 'fulfilled' && Array.isArray(horasRes.value) ? horasRes.value : []
            const alunos = alunosRes.status === 'fulfilled' && Array.isArray(alunosRes.value) ? alunosRes.value : []

            const now = new Date()
            const in48h = new Date(now.getTime() + 48 * 3600000)

            // Stats
            const hoje = todas.filter(a => {
                const d = new Date(a._data_raw)
                return d.toDateString() === now.toDateString()
            })
            setStats({
                hoje: hoje.length,
                porValidar: todas.filter(a => a.id_estado === 1 || a.id_estado === 2).length,
                concluidas: todas.filter(a => a.id_estado === 4).length
            })

            // Live — happening now (simplification: today + confirmed)
            setLiveAulas(hoje.filter(a => a.id_estado === 3).slice(0, 3))

            // Coachings to validate in 48h
            setCoachings48h(todas.filter(a => {
                const d = new Date(a._data_raw)
                return (a.id_estado === 1 || a.id_estado === 2) && d >= now && d <= in48h
            }).slice(0, 3))

            // Confirmed upcoming
            setConfirmedAulas(todas.filter(a => {
                const d = new Date(a._data_raw)
                return a.id_estado === 3 && d >= now
            }).slice(0, 3))

            setEventos(evs.slice(0, 3))
            setHorasData(horas)
            setAlunosData(alunos)
        } catch (e) {
            console.error(e)
        } finally {
            setLoading(false)
        }
    }, [])

    useEffect(() => { loadAll() }, [loadAll])

    async function handleConfirm(id) {
        const id_sala = window.prompt("Para confirmar, insira o ID numérico da Sala (ex: 1):");
        if (!id_sala) return;
        setLoadingAction(id)
        try {
            await coachingService.confirmarMarcacao(id, parseInt(id_sala))
            setCoachings48h(prev => prev.filter(a => a.id !== id))
            setStats(s => ({ ...s, porValidar: Math.max(0, s.porValidar - 1) }))
            showToast('Coaching confirmado!')
        } catch(e) { showToast(e.response?.data?.message || 'Erro ao confirmar.', 'error') }
        finally { setLoadingAction(null) }
    }

    async function handleReject(id) {
        const motivo = window.prompt("Motivo da rejeição:");
        if (!motivo) return;
        setLoadingAction(id)
        try {
            await coachingService.rejeitarMarcacao(id, motivo)
            setCoachings48h(prev => prev.filter(a => a.id !== id))
            setStats(s => ({ ...s, porValidar: Math.max(0, s.porValidar - 1) }))
            showToast('Coaching rejeitado.', 'error')
        } catch(e) { showToast(e.response?.data?.message || 'Erro ao rejeitar.', 'error') }
        finally { setLoadingAction(null) }
    }

    if (loading) return (
        <div className="flex items-center justify-center py-24 text-[#006A68]">
            <RefreshCw size={32} className="animate-spin" />
        </div>
    )

    return (
        <>
            <div className="font-['Sora'] space-y-10">

                {/* Stats Row + Charts + Buttons */}
                <div className="flex flex-wrap gap-4 items-start">

                    {/* Stats pills */}
                    <div className="flex flex-wrap gap-3">
                        <StatCard count={stats.hoje} label="aulas hoje" color="text-[#324B4A]" bg="bg-[#CCE8E6]" border="border-[#006A68]" />
                        <StatCard count={stats.porValidar} label="por validar" color="text-[#324863]" bg="bg-[#D2E4FF]" border="border-[#324863]" />
                        <StatCard count={stats.concluidas} label="concluída" color="text-[#93000A]" bg="bg-[#FFDAD6]" border="border-[#93000A]" />
                    </div>

                    {/* Charts */}
                    <div className="flex gap-4 flex-wrap flex-1">
                        <div className="border border-[#006A68] rounded-xl p-4 bg-white flex-1 min-w-[200px] max-w-[250px]">
                            <ModalityChart data={horasData} />
                        </div>
                        <div className="border border-[#006A68] rounded-xl p-3 bg-white flex-1 min-w-[200px] max-w-[260px]">
                            <p className="text-xs font-bold text-[#006A68] mb-1">Média de horas</p>
                            <CoachingHoursChart data={horasData} />
                        </div>
                        <div className="border border-[#006A68] rounded-xl p-3 bg-white flex-1 min-w-[200px] max-w-[260px]">
                            <p className="text-xs font-bold text-[#006A68] mb-1">Inscrições</p>
                            <EnrollmentChart data={alunosData} />
                        </div>
                    </div>

                    {/* Action buttons */}
                    <div className="flex flex-col gap-2 shrink-0">
                        <button
                            onClick={() => navigate('/aulas')}
                            className="px-4 py-2.5 border border-[#006A68] text-[#006A68] text-sm font-semibold rounded-xl hover:bg-[#EFF5F4] transition-colors whitespace-nowrap"
                        >
                            Consultar Coachings
                        </button>
                        <button
                            onClick={() => setShowNovoEvento(true)}
                            className="flex items-center gap-2 px-4 py-2.5 bg-[#006A68] text-white text-sm font-semibold rounded-xl hover:bg-[#00504E] transition-colors"
                        >
                            <Plus size={16} /> Novo evento
                        </button>
                    </div>
                </div>

                {/* Aulas a decorrer */}
                {liveAulas.length > 0 && (
                    <section>
                        <SectionHeader icon={Star} title="Aulas a decorrer" action="Ver todas" onAction={() => navigate('/aulas')} />
                        <ScrollRow>
                            {liveAulas.map((a, i) => <LiveClassCard key={a.id} aula={a} idx={i} />)}
                        </ScrollRow>
                    </section>
                )}

                {/* Coachings a validar 48h */}
                <section>
                    <SectionHeader icon={Clock} title="Coachings a validar a expirar em 48h" />
                    {coachings48h.length === 0 ? (
                        <p className="text-sm text-[#4A6362] italic">Sem coachings pendentes nas próximas 48h.</p>
                    ) : (
                        <ScrollRow>
                            {coachings48h.map(a => (
                                <CoachingCard key={a.id} aula={a} onConfirm={handleConfirm} onReject={handleReject} loading={loadingAction} />
                            ))}
                        </ScrollRow>
                    )}
                </section>

                {/* Próximas aulas confirmadas */}
                <section>
                    <SectionHeader icon={CalendarCheck} title="Próximas aulas confirmadas" action="Ver todas" onAction={() => navigate('/aulas')} />
                    {confirmedAulas.length === 0 ? (
                        <p className="text-sm text-[#4A6362] italic">Sem aulas confirmadas agendadas.</p>
                    ) : (
                        <ScrollRow>
                            {confirmedAulas.map(a => <ConfirmedCard key={a.id} aula={a} />)}
                        </ScrollRow>
                    )}
                </section>

                {/* Próximos eventos */}
                <section>
                    <SectionHeader
                        icon={CalendarDays}
                        title="Próximos eventos"
                        action="Ver todos"
                        onAction={() => navigate('/events')}
                    />
                    {eventos.length === 0 ? (
                        <p className="text-sm text-[#4A6362] italic">Sem eventos agendados.</p>
                    ) : (
                        <ScrollRow>
                            {eventos.map(e => <EventCard key={e.id_evento} event={e} />)}
                        </ScrollRow>
                    )}
                </section>
            </div>

            {showNovoEvento && (
                <NovoEventoModal
                    onClose={() => setShowNovoEvento(false)}
                    onSuccess={(nome) => {
                        setShowNovoEvento(false)
                        showToast(`Evento "${nome}" criado com sucesso!`)
                        eventService.getAll().then(d => setEventos(Array.isArray(d) ? d.slice(0, 3) : []))
                    }}
                />
            )}

            {toast && <Toast {...toast} onClose={() => setToast(null)} />}
        </>
    )
}