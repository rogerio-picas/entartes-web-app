import { useState, useEffect } from 'react'
import { Clock, User, Check, X, RefreshCw, ChevronRight } from 'lucide-react'
import { api } from '../services/api'

// ─── Helpers ──────────────────────────────────────────────────────────────────
export { formatDate, formatTime } from '../utils/dateUtils'
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

export function StatCard({ count, label, color, bg, border }) {
    return (
        <div className={`relative flex items-center gap-3 rounded-xl px-5 py-3 border ${bg} ${border} min-w-[160px]`}>
            <span className={`text-4xl font-bold font-['Sora'] ${color}`}>{count}</span>
            <span className={`text-sm font-medium ${color} leading-tight max-w-[80px]`}>{label}</span>
        </div>
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
        <div className="flex-1 min-w-[300px] max-w-[380px] bg-[#F4FBF9] border border-[#BEC9C7] rounded-xl p-4 flex flex-col gap-2.5">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                    <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: DOT_COLORS[idx % DOT_COLORS.length] }} />
                    <span className="text-sm font-medium text-[#161D1C]">{String(aula.modalidade || '—')}</span>
                </div>
                <button onClick={onOpen} className="text-[10px] font-bold text-[#006A68] hover:underline uppercase tracking-wider">
                    Ver mais
                </button>
            </div>
            <div className="bg-white/60 border border-[#006A68] rounded-xl flex items-center gap-3 px-4 py-2">
                <div className="w-9 h-9 rounded-full bg-[#CCE8E6] border border-[#006A68] flex items-center justify-center shrink-0">
                    <User size={16} className="text-[#006A68]" />
                </div>
                <span className="font-medium text-[#000] text-sm">{String(aula.docente || '—')}</span>
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

export function CoachingCard({ aula, onConfirm, onReject, loading }) {
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
        {[['Modalidade', String(aula.modalidade || '—')], ['Data', String(aula.data || '—')],
          ['Docente', String(aula.docente || '—')], ['Duração', String(aula.duracao || '—')],
          ['Hora início', String(aula.hora || '—')], ['Tipo', 'Individual']
        ].map(([k, v]) => (
          <div key={k}>
            <span className="text-[#006A68]">{k}: </span>
            <span className="text-[#000] font-medium">{v}</span>
          </div>
        ))}
      </div>

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

export function ConfirmedCard({ aula, onOpen }) {
    return (
        <div className="flex-1 min-w-[300px] max-w-[380px] bg-[#F4FBF9] border border-[#006A68] rounded-xl p-5 flex flex-col gap-3">
            <div className="flex gap-3">
                <div className="flex-1 text-sm flex flex-col gap-0.5">
                    {[
                        ['Modalidade', String(aula.modalidade || '—')], ['Data', String(aula.data || '—')],
                        ['Hora início', String(aula.hora || '—')], ['Duração', String(aula.duracao || '—')],
                        ['Estúdio', String(aula.sala || '—')], ['Tipo', 'Individual']
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
                    <span className="text-[10px] font-bold text-[#00504E]">{String(aula.docente || '—')}</span>
                    <span className="text-[10px] text-[#000]">1852</span>
                </div>
            </div>
            <div className="flex items-center gap-2">
                <span className="bg-[#049A59] border border-[#0A7659] text-white text-[11px] font-semibold px-3 py-0.5 rounded-full">
                    Confirmada
                </span>
                <button 
                    onClick={onOpen}
                    className="bg-[#80D5D2] border border-[#006A68] text-white text-[11px] font-semibold px-3 py-0.5 rounded-full hover:brightness-95 transition-all"
                >
                    Ver mais
                </button>
            </div>
        </div>
    )
}

export function RequisicaoCard({ item, onAccept, onReject, loading, onVerPerfil }) {
  return (
    <div className="bg-brand-bg border border-brand-dark rounded-xl p-4 flex relative min-w-[340px]">
      <div className="flex-1 flex flex-col gap-1.5">
        <p className="text-sm"><span className="text-brand-darkest font-medium">Modalidade: </span>
          <span className="text-brand-dark">{item.modalidade}</span></p>
        <p className="text-sm"><span className="text-brand-darkest font-medium">Data: </span>
          <span className="text-brand-dark">{item.data}</span></p>
        <p className="text-sm"><span className="text-brand-darkest font-medium">Duração: </span>
          <span className="text-brand-dark">{item.duracao}</span></p>
        <p className="text-sm"><span className="text-brand-darkest font-medium">Hora início: </span>
          <span className="text-brand-dark">{item.hora}</span></p>
        <p className="text-sm"><span className="text-brand-darkest font-medium">Tipo: </span>
          <span className="text-brand-dark">Individual</span></p>
        {item.alunos?.length > 0 && (
          <button onClick={() => onVerPerfil(item.alunos[0])}
            className="flex items-center gap-2 mt-1 bg-[#CCE8E6] rounded-lg px-2.5 py-1.5 w-fit
              hover:bg-[#006A68]/20 transition-colors">
            <div className="w-6 h-6 rounded-full bg-[#006A68] flex items-center justify-center">
              <User size={13} className="text-white" />
            </div>
            <span className="text-xs font-semibold text-[#006A68]">{String(item.alunos[0] || '—')}</span>
            <ChevronRight size={12} className="text-[#006A68]" />
          </button>
        )}
        <div className="flex items-center gap-1.5 mt-1">
          <Clock size={13} className="text-brand-dark" />
          <span className="text-xs font-semibold text-black">Nas próximas 48h</span>
        </div>
      </div>
      <div className="flex flex-col items-end justify-end gap-2">
        {loading === item.id
          ? <RefreshCw size={18} className="text-[#006A68] animate-spin" />
          : <div className="flex gap-2">
            <button onClick={() => onReject(item.id)}
              className="w-12 h-12 bg-[#BA1A1A] border border-[#93000A] rounded-xl flex items-center justify-center hover:opacity-90">
              <X size={22} strokeWidth={3} className="text-white" />
            </button>
            <button onClick={() => onAccept(item.id)}
              className="w-12 h-12 bg-[#049A59] border border-brand-dark rounded-xl flex items-center justify-center hover:opacity-90">
              <Check size={22} strokeWidth={3} className="text-white" />
            </button>
          </div>
        }
      </div>
    </div>
  )
}

export function PresencaDocenteCard({ item, onConfirm, onReject, loading }) {
  return (
    <div className="bg-brand-bg border border-brand-dark rounded-xl p-4 flex relative min-w-[340px]">
      <div className="flex-1 flex flex-col gap-1.5">
        <p className="text-sm"><span className="text-brand-darkest font-medium">Modalidade: </span>
          <span className="text-brand-dark">{item.modalidade}</span></p>
        <p className="text-sm"><span className="text-brand-darkest font-medium">Data: </span>
          <span className="text-brand-dark">{item.data}</span></p>
        <p className="text-sm"><span className="text-brand-darkest font-medium">Hora: </span>
          <span className="text-brand-dark">{item.hora}</span></p>
        <p className="text-sm"><span className="text-brand-darkest font-medium">Duração: </span>
          <span className="text-brand-dark">{item.duracao}</span></p>
        <p className="text-sm"><span className="text-brand-darkest font-medium">Tipo: </span>
          <span className="text-brand-dark">Individual</span></p>
        <div className="flex items-center gap-1.5 mt-1">
          <Clock size={13} className="text-brand-dark" />
          <span className="text-xs font-semibold text-black">Nas próximas 48h</span>
        </div>
      </div>
      <div className="flex flex-col items-end justify-end gap-2">
        {loading === item.id
          ? <RefreshCw size={18} className="text-[#006A68] animate-spin" />
          : <div className="flex gap-2">
            <button onClick={() => onReject(item.id)}
              className="w-12 h-12 bg-[#BA1A1A] border border-[#93000A] rounded-xl flex items-center justify-center hover:opacity-90">
              <X size={22} strokeWidth={3} className="text-white" />
            </button>
            <button onClick={() => onConfirm(item.id)}
              className="w-12 h-12 bg-[#049A59] border border-brand-dark rounded-xl flex items-center justify-center hover:opacity-90">
              <Check size={22} strokeWidth={3} className="text-white" />
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
        <div className="bg-[#EFF5F4] border-b-2 border-[#006A68] px-6 py-5 flex items-center gap-4">
          <div className="w-14 h-14 rounded-full bg-[#CCE8E6] flex items-center justify-center">
            <User size={28} className="text-[#006A68]" />
          </div>
          <div>
            <p className="text-xs text-[#4A6362] uppercase tracking-wider">Perfil do Aluno</p>
            <h3 className="font-bold text-[#006A68] text-xl">{aluno.nome} {aluno.apelido}</h3>
          </div>
          <button onClick={onClose} className="ml-auto w-8 h-8 rounded-full hover:bg-[#CCE8E6]
            flex items-center justify-center text-[#4A6362]">
            <X size={16} />
          </button>
        </div>
        <div className="px-6 py-5 space-y-3 text-sm">
          {aluno.email && <div><span className="text-[#4A6362] font-medium">Email: </span>
            {aluno.email}</div>}
          {aluno.telemovel && <div><span className="text-[#4A6362] font-medium">Telemóvel: </span>
            {aluno.telemovel}</div>}
          {aluno.codigo_username && <div><span className="text-[#4A6362] font-medium">Nº Aluno: </span>
            {aluno.codigo_username}</div>}
        </div>
        <div className="px-6 pb-5">
          <button onClick={onClose} className="w-full py-2.5 rounded-xl bg-[#006A68] text-white
            font-semibold text-sm hover:bg-[#00504E] transition-colors">Fechar</button>
        </div>
      </div>
    </div>
  )
}

export function SectionHeader({ icon: Icon, title, action, onAction }) {
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

export function ScrollRow({ children }) {
    return (
        <div className="w-full overflow-x-auto pb-2 hide-scrollbar">
            <div className="flex gap-4 w-max">{children}</div>
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
