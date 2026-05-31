import { useState, useEffect } from 'react'
import { Clock, User, Check, X, RefreshCw, ChevronRight, CalendarClock } from 'lucide-react'
import { api } from '../services/api'
import { authService } from '../services/authService'

// ─── Helpers ──────────────────────────────────────────────────────────────────
import { formatDate, formatTime } from '../utils/dateUtils'
export { formatDate, formatTime }
export function formatDuration(min) {
  if (!min) return '—'
  const h = Math.floor(min / 60), m = min % 60
  return h > 0 ? (m > 0 ? `${h}h ${m}min` : `${h}h`) : `${m} min`
}
export function timeRemaining(dateRaw) {
  if (!dateRaw) return null
  const diff = new Date(dateRaw) - new Date()
  if (diff <= 0) return 'Expirado'
  const h = Math.ceil(diff / 3600000)
  return `${h}h restantes`
}

export function StatCard({ count, label, color, bg, border, onClick }) {
  const Tag = onClick ? 'button' : 'div'
  return (
    <Tag
      onClick={onClick}
      className={`relative flex items-center gap-3 rounded-xl px-5 py-3 border ${bg} ${border ?? 'border-transparent'} min-w-[160px] ${onClick ? 'cursor-pointer hover:ring-2 hover:ring-offset-1 hover:ring-neutral-300 hover:shadow-sm transition-all duration-200 active:scale-[0.98]' : ''}`}
    >
      <span className={`text-4xl font-bold font-['Sora'] ${color}`}>{count}</span>
      <span className={`text-sm font-medium ${color} leading-tight max-w-[80px]`}>{label}</span>
    </Tag>
  )
}

export function ModalityChart({ data }) {
  const COLORS = ['#00504E', '#BA1A1A', '#02B2AF', '#89AFFF', '#B800D8']
  const modalidades = [...new Set(data.map(d => d.modalidade?.nome).filter(Boolean))]
  const counts = modalidades.map(m => ({
    nome: m,
    total: data.filter(d => d.modalidade?.nome === m).reduce((a, c) => a + (c._sum?.duracao_minutos ?? 0), 0)
  }))
  const max = Math.max(...counts.map(c => c.total), 1)
  return (
    <div className="flex flex-col h-full">
      <p className="text-xs font-bold text-brand-800 mb-2">Por modalidade</p>
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

export function CoachingHoursChart({ data }) {
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

export function EnrollmentChart({ data }) {
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

export function LiveClassCard({ aula, idx, onOpen }) {
  const DOT_COLORS = ['#89AFFF', '#B800D8', '#02B2AF', '#049A59', '#B93815']
  const progress = aula.numero_alunos_pretendidos
    ? Math.round((aula.aluno_marcacao?.length ?? 0) / aula.numero_alunos_pretendidos * 100)
    : 0
  return (
    <div className="flex-1 min-w-[300px] max-w-[380px] bg-brand-50 border border-neutral-400 rounded-xl p-4 flex flex-col gap-2.5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: DOT_COLORS[idx % DOT_COLORS.length] }} />
          <span className="text-sm font-medium text-neutral-900">{String(aula.modalidade || '—')}</span>
        </div>
        <button onClick={onOpen} className="text-[10px] font-bold text-brand-900 hover:underline uppercase tracking-wider">
          Ver mais
        </button>
      </div>
      <div className="bg-white/60 border border-brand-800 rounded-xl flex items-center gap-3 px-4 py-2">
        <div className="w-9 h-9 rounded-full bg-brand-200 border border-brand-800 flex items-center justify-center shrink-0">
          <User size={16} className="text-brand-800" />
        </div>
        <span className="font-medium text-black text-sm">{String(aula.docente || '—')}</span>
      </div>
      <div className="flex items-center gap-2 flex-wrap">
        <span className="bg-brand-800 text-white text-[11px] font-semibold px-2 py-0.5 rounded-full">{aula.hora}</span>
        <span className="bg-neutral-200 text-neutral-500 text-[11px] px-2 py-0.5 rounded-full">{aula.duracao}</span>
        <span className="bg-neutral-200 text-neutral-700 text-[11px] px-2 py-0.5 rounded-full">Individual</span>
      </div>
      <div className="border-t border-dashed border-neutral-500/20 pt-2">
        <div className="bg-brand-800/10 border border-brand-800 rounded-lg text-center py-1.5 text-sm font-medium text-brand-800">
          {aula.sala}
        </div>
      </div>
      <div className="flex items-center gap-2">
        <div className="flex-1 h-1.5 bg-brand-900/20 rounded-full overflow-hidden">
          <div className="h-full bg-brand-900 rounded-full" style={{ width: `${progress}%` }} />
        </div>
        <span className="text-sm font-semibold text-brand-900">{progress}%</span>
      </div>
    </div>
  )
}

export function CoachingCard({ aula, onConfirm, onReject, loading }) {
  const [salas, setSalas] = useState([])
  const [selectedSala, setSelectedSala] = useState('')
  const remaining = timeRemaining(aula._data_raw)

  useEffect(() => {
    api.get('/salas').then(d => setSalas(Array.isArray(d) ? d : [])).catch(() => { })
  }, [])

  function handleConfirm() {
    onConfirm(aula.id, selectedSala ? parseInt(selectedSala) : null)
  }

  return (
    <div className="flex-1  flex flex-col min-w-[300px] w-full bg-white border border-neutral-600/20 shadow-sm rounded-xl p-5 flex flex-col gap-2.5">
      <div className="flex flex-col gap-1 text-sm">
        {[['Modalidade', String(aula.modalidade || '—')], ['Data', String(aula.data || '—')],
        ['Docente', String(aula.docente || '—')], ['Duração', String(aula.duracao || '—')],
        ['Hora início', String(aula.hora || '—')], ['Tipo', 'Individual']
        ].map(([k, v]) => (
          <div key={k}>
            <span className="text-neutral-500 font-medium">{k}: </span>
            <span className="text-neutral-800 font-semibold">{v}</span>
          </div>
        ))}
      </div>

      <div>
        <label className="text-[10px] text-neutral-600 font-bold uppercase tracking-wider mb-1 block">
          Atribuir sala
        </label>
        <select value={selectedSala} onChange={e => setSelectedSala(e.target.value)}
          className="w-full bg-white border border-neutral-500 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-brand-800">
          <option value="">Selecionar sala...</option>
          {salas.map(s => <option key={s.id_sala} value={s.id_sala}>{s.nome}</option>)}
        </select>
      </div>

      {remaining && (
        <div className="flex items-center gap-1.5 text-xs">
          <Clock size={14} className="text-amber-600" /><span className="text-amber-700 font-semibold">{remaining}</span>
        </div>
      )}
      <div className="flex items-center gap-2 pt-1">
        <button onClick={() => onReject(aula.id)} disabled={loading === aula.id}
          className="w-12 h-12 bg-feedback-error border border-feedback-error-dark rounded-xl flex items-center justify-center hover:opacity-90 transition-opacity disabled:opacity-50">
          <X size={18} strokeWidth={3} className="text-white" />
        </button>
        <button onClick={handleConfirm} disabled={loading === aula.id}
          className="flex-1 h-12 bg-feedback-success border border-feedback-success-dark rounded-xl flex items-center justify-center gap-2 hover:opacity-90 transition-opacity disabled:opacity-50 text-white text-sm font-bold">
          <Check size={16} /> Confirmar
        </button>
      </div>
    </div>
  )
}

export function ConfirmedCard({ aula, onOpen, role }) {
  return (
    <div
      onClick={onOpen}
      className="flex-1 min-w-[300px] w-full bg-white border border-neutral-600/20 shadow-sm rounded-xl p-5 flex flex-col gap-3 cursor-pointer hover:scale-[1.01] hover:shadow-md transition-all duration-300 group"
    >
      <div className="flex gap-3">
        <div className="flex-1 text-sm flex flex-col gap-0.5">
          {[
            ['Modalidade', String(aula.modalidade || '—')], ['Data', String(aula.data || '—')],
            ['Hora início', String(aula.hora || '—')], ['Duração', String(aula.duracao || '—')],
            ['Sala', String(aula.sala || '—')], ['Tipo', String(aula.tipo || '—')]
          ].map(([k, v]) => (
            <div key={k}>
              <span className="text-neutral-500 font-medium">{k}: </span>
              <span className="text-neutral-800 font-semibold">{v}</span>
            </div>
          ))}
        </div>
        <div className="flex flex-col items-center gap-1 text-center my-auto">
          <div className="w-14 h-14 rounded-full bg-brand-500 flex items-center justify-center border-2 border-brand-800">
            <User size={32} className="text-brand-800" />
          </div>
          <span className="text-neutral-500 text-xs text-center leading-tight">
            {role === 2 ? 'Aluno(s)' : 'Docente'}<br />
            <span className="font-bold text-neutral-800 flex flex-col items-center text-sm mt-0.5">
              {(role === 3 ? String(aula.alunos || '—') : String(aula.docente || '—'))
                .split(',')
                .map((n, i) => <span key={i}>{n.trim()}</span>)
              }
            </span>
          </span>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <span className="bg-feedback-success border border-feedback-success-dark text-white text-xs font-semibold px-3 py-0.5 rounded-full">
          Confirmada
        </span>
      </div>
    </div>
  )
}

export function RequisicaoCard({ item, onAccept, onReject, loading, onVerPerfil }) {
  const role = authService.getUser()?.role ?? 3
  return (
    <div className="bg-white border border-neutral-600/20 shadow-sm rounded-xl p-5 flex relative min-w-[340px] justify-between">
      <div className="flex-1 flex flex-col gap-1.5">
        <p className="text-sm"><span className="text-neutral-500 font-medium">Modalidade: </span>
          <span className="text-neutral-800 font-semibold">{item.modalidade}</span></p>
        <p className="text-sm"><span className="text-neutral-500 font-medium">Data: </span>
          <span className="text-neutral-800 font-semibold">{item.data}</span></p>
        <p className="text-sm"><span className="text-neutral-500 font-medium">Duração: </span>
          <span className="text-neutral-800 font-semibold">{item.duracao}</span></p>
        <p className="text-sm"><span className="text-neutral-500 font-medium">Hora início: </span>
          <span className="text-neutral-800 font-semibold">{item.hora}</span></p>
        <p className="text-sm"><span className="text-neutral-500 font-medium">Tipo: </span>
          <span className="text-neutral-800 font-semibold">{item.tipo || 'Individual'}</span></p>

        <div className="flex items-center gap-1.5 mt-1">
          <Clock size={14} className="text-amber-600" />
          <span className="text-xs font-semibold text-amber-700">{item.tempoRestante || 'Nas próximas 48h'}</span>
        </div>
      </div>

      <div className="flex flex-col items-center justify-between ml-4 gap-2">
        <div className="flex flex-col items-center gap-1 text-center my-auto">
          <div className="w-12 h-12 rounded-full bg-brand-500 flex items-center justify-center border-2 border-brand-800">
            <User size={24} className="text-brand-800" />
          </div>
          <span className="text-neutral-500 text-xs text-center leading-tight">
            {role === 2 ? 'Aluno(s)' : 'Docente'}<br />
            <span className="font-bold text-neutral-800 flex flex-col items-center text-sm mt-0.5">
              {(role === 3 ? String(item.alunos || '—') : String(item.docente || '—'))
                .split(',')
                .map((n, i) => <span key={i}>{n.trim()}</span>)
              }
            </span>
          </span>
        </div>

        {loading === item.id
          ? <RefreshCw size={18} className="text-brand-800 animate-spin" />
          : <div className="flex gap-2">
            <button onClick={() => onReject(item.id)}
              className="w-14 h-14 bg-feedback-error border border-feedback-error-dark rounded-full flex items-center justify-center hover:opacity-90 transition-opacity">
              <X size={22} strokeWidth={3} className="text-white" />
            </button>
            {onAccept && (
              <button onClick={() => onAccept(item.id)}
                className="w-14 h-14 bg-feedback-success border border-feedback-success-dark rounded-full flex items-center justify-center hover:opacity-90 transition-opacity">
                <Check size={22} strokeWidth={3} className="text-white" />
              </button>
            )}
          </div>
        }
      </div>
    </div>
  )
}

export function PresencaDocenteCard({ item, onConfirm, onReject, loading }) {
  return (
    <div className="bg-white border border-neutral-600/20 shadow-sm rounded-xl p-5 flex relative min-w-[340px]">
      <div className="flex-1 flex flex-col gap-1.5">
        <p className="text-sm"><span className="text-neutral-500 font-medium">Modalidade: </span>
          <span className="text-neutral-800 font-semibold">{item.modalidade}</span></p>
        <p className="text-sm"><span className="text-neutral-500 font-medium">Data: </span>
          <span className="text-neutral-800 font-semibold">{item.data}</span></p>
        <p className="text-sm"><span className="text-neutral-500 font-medium">Hora: </span>
          <span className="text-neutral-800 font-semibold">{item.hora}</span></p>
        <p className="text-sm"><span className="text-neutral-500 font-medium">Duração: </span>
          <span className="text-neutral-800 font-semibold">{item.duracao}</span></p>
        <p className="text-sm"><span className="text-neutral-500 font-medium">Tipo: </span>
          <span className="text-neutral-800 font-semibold">Individual</span></p>
        <div className="flex items-center gap-1.5 mt-1">
          <Clock size={16} className="text-amber-600" />
          <span className="text-xs font-semibold text-amber-700">{item.tempoRestante || 'A expirar nas próximas 48h'}</span>
        </div>
      </div>
      <div className="flex flex-col items-end justify-end gap-2">
        {loading === item.id
          ? <RefreshCw size={18} className="text-brand-800 animate-spin" />
          : <div className="flex gap-2">
            <button onClick={() => onReject(item.id)}
              className="w-14 h-14 bg-feedback-error border border-feedback-error-dark rounded-full flex items-center justify-center hover:opacity-90 transition-opacity">
              <X size={26} strokeWidth={3} className="text-white" />
            </button>
            <button onClick={() => onConfirm(item.id)}
              className="w-14 h-14 bg-feedback-success border border-feedback-success-dark rounded-full flex items-center justify-center hover:opacity-90 transition-opacity">
              <Check size={26} strokeWidth={3} className="text-white" />
            </button>
          </div>
        }
      </div>
    </div>
  )
}

export function PerfilModal({ aluno, onClose }) {
  if (!aluno) return null
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden"
        onClick={e => e.stopPropagation()}>
        <div className="bg-neutral-50 border-b-2 border-brand-800 px-6 py-5 flex items-center gap-4">
          <div className="w-14 h-14 rounded-full bg-brand-200 flex items-center justify-center">
            <User size={28} className="text-brand-800" />
          </div>
          <div>
            <p className="text-xs text-neutral-600 uppercase tracking-wider">Perfil do Aluno</p>
            <h3 className="font-bold text-brand-800 text-xl">{aluno.nome} {aluno.apelido}</h3>
          </div>
          <button onClick={onClose} className="ml-auto w-8 h-8 rounded-full hover:bg-brand-200
            flex items-center justify-center text-neutral-600">
            <X size={16} />
          </button>
        </div>
        <div className="px-6 py-5 space-y-3 text-sm">
          {aluno.email && <div><span className="text-neutral-600 font-medium">Email: </span>
            {aluno.email}</div>}
          {aluno.telemovel && <div><span className="text-neutral-600 font-medium">Telemóvel: </span>
            {aluno.telemovel}</div>}
          {aluno.codigo_username && <div><span className="text-neutral-600 font-medium">Nº Aluno: </span>
            {aluno.codigo_username}</div>}
        </div>
        <div className="px-6 pb-5">
          <button onClick={onClose} className="w-full py-2.5 rounded-xl bg-red-600 text-white
            font-semibold text-sm hover:bg-red-700 transition-colors">Fechar</button>
        </div>
      </div>
    </div>
  )
}

export function SectionHeader({ icon: Icon, title, action, onAction }) {
  return (
    <div className="flex items-center gap-3 mb-4">
      <Icon size={36} className="text-brand-800" />
      <h2 className="text-2xl font-bold text-black font-['Sora'] flex-1">{title}</h2>
      {action && (
        <button onClick={onAction} className="text-sm font-semibold text-brand-800 hover:underline flex items-center gap-1">
          {action} <ChevronRight size={16} />
        </button>
      )}
    </div>
  )
}

export function ScrollRow({ children }) {
  return (
    <div className="w-full overflow-x-auto pb-2 hide-scrollbar">
      <div className="grid grid-cols-3 gap-4 w-full">{children}</div>
    </div>
  )
}

export function RoomOccupancyWidget({ data }) {
  if (!data || data.length === 0) return <div className="text-xs text-gray-400 italic">Sem dados de ocupação.</div>

  return (
    <div className="grid grid-cols-3 gap-3">
      {data.map(sala => (
        <div key={sala.id_sala} className="bg-white border border-brand-800/10 rounded-xl p-3 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-bold text-brand-900">{sala.nome}</span>
            <div className="flex items-center gap-2">
              <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${sala.percentagemOcupacao > 70 ? 'bg-red-100 text-red-700 border border-red-200' :
                sala.percentagemOcupacao > 30 ? 'bg-amber-100 text-amber-700 border border-amber-200' :
                  'bg-emerald-100 text-emerald-700 border border-emerald-200'
                }`}>
                {sala.percentagemOcupacao}%
              </span>
            </div>
          </div>

          <div className="w-full h-2 bg-neutral-100 rounded-full overflow-hidden mb-3 border border-neutral-200">
            <div
              className={`h-full transition-all duration-500 ${sala.percentagemOcupacao > 70 ? 'bg-feedback-error' :
                sala.percentagemOcupacao > 30 ? 'bg-amber-500' : 'bg-emerald-500'
                }`}
              style={{ width: `${sala.percentagemOcupacao}%` }}
            />
          </div>

          <div className="flex flex-wrap gap-1.5">
            {sala.ocupacoes.length === 0 ? (
              <span className="text-[10px] text-emerald-700 font-semibold italic bg-emerald-50 px-2 py-0.5 rounded-lg border border-emerald-100">
                Disponível
              </span>
            ) : (
              sala.ocupacoes.map((oc, i) => (
                <div key={i} className="flex flex-col bg-brand-50 border border-brand-800/20 rounded-lg px-2 py-1 min-w-[70px]">
                  <span className="text-[9px] font-bold text-brand-900">{oc.inicio} - {oc.fim}</span>
                  <span className="text-[8px] text-brand-800 truncate max-w-[60px]">{oc.docente}</span>
                </div>
              ))
            )}
          </div>
        </div>
      ))}
    </div>
  )
}

// ─── SalasDoDiaWidget ─────────────────────────────────────────────────────────
// Layout: cada SALA é uma COLUNA. As aulas empilham VERTICALMENTE dentro de cada
// coluna, como um quadro de horários de estúdio (imagem de referência).

const SESSION_PALETTE = [
  { bg: '#CCE8E6', border: '#006A68', text: '#00504E', label: '#006A68' },
  { bg: '#E8F5FF', border: '#90CAF9', text: '#1565C0', label: '#1565C0' },
  { bg: '#F3E5F5', border: '#CE93D8', text: '#6A1B9A', label: '#6A1B9A' },
  { bg: '#FFF3E0', border: '#FFCC80', text: '#E65100', label: '#E65100' },
  { bg: '#FCE4EC', border: '#F48FB1', text: '#C62828', label: '#C62828' },
  { bg: '#E0F7FA', border: '#80DEEA', text: '#00695C', label: '#00695C' },
  { bg: '#E8F5E9', border: '#A5D6A7', text: '#2E7D32', label: '#2E7D32' },
  { bg: '#FFF8E1', border: '#FFE082', text: '#F57F17', label: '#F57F17' },
]


export function SalasDoDiaWidget({ onItemClick }) {
  const [salas, setSalas] = useState([])
  const [loadingWidget, setLoadingWidget] = useState(true)

  useEffect(() => {
    const hoje = new Date()
    const yyyy = hoje.getFullYear()
    const mm = String(hoje.getMonth() + 1).padStart(2, '0')
    const dd = String(hoje.getDate()).padStart(2, '0')
    const dataStr = `${yyyy}-${mm}-${dd}`

    Promise.all([
      api.get('/salas').catch(() => []),
      api.get('/coaching/pedidos-pendentes?estados=3').catch(() => [])
    ])
      .then(([salasRes, pendentesRes]) => {
        const roomsList = Array.isArray(salasRes) ? salasRes : []
        const classesList = Array.isArray(pendentesRes) ? pendentesRes : []

        const classesHoje = classesList.filter(c => c.data && c.data.substring(0, 10) === dataStr)

        const mappedSalas = roomsList.map(sala => {
          const roomClasses = classesHoje.filter(c => c.sala_atual === sala.nome)
          const ocupacoes = roomClasses.map(c => {
            const startStr = formatTime(c.hora_inicio)
            let endStr = '00:00'
            if (startStr && startStr !== '—') {
              const [h, m] = startStr.split(':').map(Number)
              const totalMin = h * 60 + m + (c.duracao_minutos || 60)
              const endH = String(Math.floor(totalMin / 60) % 24).padStart(2, '0')
              const endM = String(totalMin % 60).padStart(2, '0')
              endStr = `${endH}:${endM}`
            }
            return {
              id: c.id_marcacao,
              inicio: startStr,
              fim: endStr,
              docente: c.docente || '—',
              modalidade: c.modalidade || 'Coaching',
              duracao_minutos: c.duracao_minutos || 60,
              _rawClass: {
                id: c.id_marcacao,
                id_marcacao: c.id_marcacao,
                modalidade: c.modalidade || 'Coaching',
                data: formatDate(c.data),
                hora: formatTime(c.hora_inicio),
                duracao: `${c.duracao_minutos || 60} min`,
                tipo_aula: (c.numero_alunos_pretendidos > 1) ? 'Grupo' : 'Individual',
                sala: sala.nome,
                docente: c.docente || '—',
                id_estado: c.id_estado,
                estado_nome: c.estado || 'Confirmada',
                alunos: c.alunos?.map(a => typeof a === 'object' ? a.nome : a) || [],
                _data_raw: c.data
              }
            }
          })
          ocupacoes.sort((a, b) => a.inicio.localeCompare(b.inicio))
          return { id_sala: sala.id_sala, nome: sala.nome, descricao: sala.descricao, ocupacoes }
        })

        setSalas(mappedSalas)
      })
      .catch(() => setSalas([]))
      .finally(() => setLoadingWidget(false))
  }, [])

  const hoje = new Date()
  const diaSemana = hoje.toLocaleDateString('pt-PT', { weekday: 'long' })
  const dataFmt = hoje.toLocaleDateString('pt-PT', { day: '2-digit', month: 'long', year: 'numeric' })
  const allUniqueTimes = [...new Set(salas.flatMap(s => s.ocupacoes.map(o => o.inicio)))].sort()
  const timeColorMap = {}
  allUniqueTimes.forEach((t, i) => { timeColorMap[t] = SESSION_PALETTE[i % SESSION_PALETTE.length] })

  if (loadingWidget) {
    return (
      <div className="flex items-center justify-center py-8 text-brand-800">
        <RefreshCw size={20} className="animate-spin" />
      </div>
    )
  }

  const colWidth = 150
  const totalW = salas.length * (colWidth + 8)

  return (
    <div className="flex flex-col">

      {/* Date banner */}
      <div className="bg-brand-200 border border-brand-500 rounded-xl px-3.5 py-1.5 text-center mb-2.5">
        <span className="text-[11px] font-extrabold text-brand-800 uppercase tracking-widest">
          {diaSemana.toUpperCase()} | {hoje.getDate()} DE {hoje.toLocaleDateString('pt-PT', { month: 'long' }).toUpperCase()} DE {hoje.getFullYear()}
        </span>
      </div>

      {/* Grid */}
      {salas.length === 0 ? (
        <p className="text-[11px] text-neutral-300 italic text-center py-4">Sem salas disponíveis.</p>
      ) : (
        <div className="overflow-x-auto">
          <div
            className="border border-neutral-200 rounded-xl overflow-hidden"
            style={{
              display: 'grid',
              gridTemplateColumns: `repeat(${salas.length}, minmax(${colWidth}px, 1fr))`,
              minWidth: `${totalW}px`,
            }}
          >
            {/* Room headers */}
            {salas.map((sala, si) => (
              <div
                key={`hdr-${sala.nome}`}
                className="px-2.5 py-2.5 bg-brand-800 flex items-center justify-center"
                style={{ borderRight: si < salas.length - 1 ? '1px solid #00504E' : 'none' }}
              >
                <span className="text-[11px] font-extrabold text-white uppercase tracking-wider text-center">
                  {sala.nome}
                </span>
              </div>
            ))}

            {/* Cells */}
            {allUniqueTimes.length === 0 ? (
              salas.map((sala, si) => (
                <div
                  key={`empty-${sala.nome}`}
                  className="flex items-center justify-center min-h-[100px] p-5"
                  style={{
                    background: si % 2 === 0 ? '#FFFFFF' : '#F8FFFE',
                    borderRight: si < salas.length - 1 ? '1px solid #E8F0EF' : 'none',
                    borderTop: '1px solid #E8F0EF',
                  }}
                >
                  <span className="text-[10px] text-brand-800 font-semibold opacity-50 italic">Disponível</span>
                </div>
              ))
            ) : (
              allUniqueTimes.map(timeSlot =>
                salas.map((sala, si) => {
                  const oc = sala.ocupacoes.find(o => o.inicio === timeSlot)
                  return (
                    <div
                      key={`cell-${sala.id_sala || sala.nome}-${timeSlot}`}
                      className="flex flex-col justify-center min-h-[100px] p-2"
                      style={{
                        background: si % 2 === 0 ? '#FFFFFF' : '#F8FFFE',
                        borderRight: si < salas.length - 1 ? '1px solid #E8F0EF' : 'none',
                        borderTop: '1px solid #E8F0EF',
                      }}
                    >
                      {oc ? (() => {
                        const color = timeColorMap[oc.inicio] || SESSION_PALETTE[0]
                        return (
                          <div
                            className="flex flex-col gap-0.5 rounded-lg px-2.5 py-2 cursor-pointer transition-all duration-100 hover:-translate-y-px"
                            style={{ background: color.bg, border: `1.5px solid ${color.border}` }}
                            onMouseEnter={e => { e.currentTarget.style.boxShadow = `0 4px 12px ${color.border}55` }}
                            onMouseLeave={e => { e.currentTarget.style.boxShadow = 'none' }}
                            onClick={() => onItemClick && onItemClick(oc._rawClass)}
                          >
                            <span className="text-[10px] font-extrabold uppercase tracking-wide truncate" style={{ color: color.text }}>
                              {oc.modalidade}
                            </span>
                            <span className="text-[9px] font-bold opacity-90" style={{ color: color.text }}>
                              {oc.inicio} – {oc.fim}
                            </span>
                            {oc.docente && (
                              <span className="text-[9px] font-semibold opacity-75 truncate italic" style={{ color: color.text }}>
                                ({oc.docente})
                              </span>
                            )}
                          </div>
                        )
                      })() : (
                        sala.ocupacoes.length === 0 && timeSlot === allUniqueTimes[0] ? (
                          <div className="flex items-center justify-center w-full h-full">
                            <span className="text-[10px] text-neutral-300 italic">Disponível</span>
                          </div>
                        ) : null
                      )}
                    </div>
                  )
                })
              )
            )}
          </div>
        </div>
      )}
    </div>
  )
}
export function Toast({ msg, type, onClose }) {
  return (
    <div className={`fixed bottom-6 right-6 z-[60] flex items-center gap-3 px-5 py-3 rounded-xl shadow-lg text-white font-['Sora'] text-sm font-medium ${type === 'success' ? 'bg-emerald-600' : 'bg-red-600'}`}>
      {type === 'success' ? <Check size={15} /> : <X size={15} />}
      {msg}
      <button onClick={onClose}><X size={13} className="opacity-70 hover:opacity-100" /></button>
    </div>
  )
}
