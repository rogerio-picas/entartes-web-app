import { useState, useEffect, useCallback } from 'react'
// Removidos useNavigate e useLocation pois a navegação agora está no Layout/Header
import {
  Calendar, CalendarDays, Users, GraduationCap,
  User, Bell, LogOut, ArrowUpDown, CheckCircle2, Clock,
  XCircle, Check, X, AlertCircle, RefreshCw, BookOpen,
  MapPin, Music, Plus
} from 'lucide-react'
import { aulasService } from '../services/aulasService.js'
import { authService } from '../services/authService'
import NovaDisponibilidadeModal from './NovaDisponibilidadeModal'

// ─── Mapeamento de estados e Funções Auxiliares (Mantêm-se iguais) ───────────
const STATUS_MAP = {
  1: { label: 'Pendente',   color: 'bg-amber-100   text-amber-700',   icon: Clock        },
  2: { label: 'Confirmada', color: 'bg-emerald-100 text-emerald-700', icon: CheckCircle2 },
  3: { label: 'Cancelada',  color: 'bg-red-100     text-red-700',     icon: XCircle      },
  4: { label: 'Concluída',  color: 'bg-[#CCE8E6]   text-[#006A68]',   icon: CheckCircle2 },
}

function getStatusCfg(id_estado, estado_nome) {
  if (STATUS_MAP[id_estado]) return STATUS_MAP[id_estado]
  const nome = (estado_nome ?? '').toLowerCase()
  if (nome.includes('pend'))    return STATUS_MAP[1]
  if (nome.includes('confirm')) return STATUS_MAP[2]
  if (nome.includes('cancel'))  return STATUS_MAP[3]
  if (nome.includes('conclui') || nome.includes('finaliz')) return STATUS_MAP[4]
  return { label: estado_nome ?? '—', color: 'bg-gray-100 text-gray-600', icon: Clock }
}

// ─── Componentes de Tabela (Mantêm-se iguais) ───────────────────────────────
function TableHeader({ showAll }) {
  const cols = ['Data', 'Hora', 'Duração', 'Docente', 'Modalidade',
    ...(showAll ? ['Sala'] : []), 'Estado', 'Ação']
  return (
    <div className="flex items-center border-b-2 border-[#4a6362]/20 bg-[#EFF5F4]">
      {cols.map((col, i) => (
        <div key={col}
          className={`flex items-center justify-center gap-1.5 px-3 py-3 font-['Sora'] font-semibold text-[#006A68] text-xs tracking-wide uppercase
            ${i < cols.length - 1 ? 'border-r border-[#4a6362]/20' : ''}
            ${col === 'Ação' ? 'flex-[0.7]' : 'flex-1'}`}>
          {col}
          {col !== 'Ação' && <ArrowUpDown size={11} className="text-[#006A68]/30" />}
        </div>
      ))}
    </div>
  )
}

function TableRow({ row, onConfirm, onReject, showAll, loadingId }) {
  const cfg = getStatusCfg(row.id_estado, row.estado_nome)
  const StatusIcon = cfg.icon
  const isLoading = loadingId === row.id
  const isPendente = row.id_estado === aulasService.ESTADOS.PENDENTE

  return (
    <div className="flex items-center border-b border-[#4a6362]/10 hover:bg-[#F4FBF9] transition-colors">
      <div className="flex-1 flex items-center justify-center px-3 py-3.5 border-r border-[#4a6362]/10">
        <span className="font-['Sora'] text-sm text-gray-800">{row.data}</span>
      </div>
      <div className="flex-1 flex items-center justify-center px-3 py-3.5 border-r border-[#4a6362]/10">
        <span className="font-['Sora'] text-sm text-gray-800">{row.hora}</span>
      </div>
      <div className="flex-1 flex items-center justify-center px-3 py-3.5 border-r border-[#4a6362]/10">
        <span className="font-['Sora'] text-sm text-gray-800">{row.duracao}</span>
      </div>
      <div className="flex-1 flex items-center justify-center px-3 py-3.5 border-r border-[#4a6362]/10">
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-7 h-7 rounded-full bg-[#CCE8E6] flex items-center justify-center shrink-0">
            <span className="text-[#006A68] text-xs font-semibold font-['Sora']">
              {row.docente !== 'Sem docente' ? row.docente.charAt(0).toUpperCase() : '?'}
            </span>
          </div>
          <span className="font-['Sora'] text-sm text-gray-800 truncate">{row.docente}</span>
        </div>
      </div>
      <div className="flex-1 flex items-center justify-center gap-1.5 px-3 py-3.5 border-r border-[#4a6362]/10">
        <Music size={13} className="text-[#006A68]/50 shrink-0" />
        <span className="font-['Sora'] text-sm text-gray-800 truncate">{row.modalidade}</span>
      </div>
      {showAll && (
        <div className="flex-1 flex items-center justify-center gap-1.5 px-3 py-3.5 border-r border-[#4a6362]/10">
          <MapPin size={13} className="text-[#006A68]/50 shrink-0" />
          <span className="font-['Sora'] text-sm text-gray-800">{row.sala}</span>
        </div>
      )}
      <div className="flex-1 flex items-center justify-center px-3 py-3.5 border-r border-[#4a6362]/10">
        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold font-['Sora'] whitespace-nowrap ${cfg.color}`}>
          <StatusIcon size={11} />
          {cfg.label}
        </span>
      </div>
      <div className="flex-[0.7] flex items-center justify-center gap-2 px-3 py-3.5">
        {isLoading ? (
          <RefreshCw size={18} className="text-[#006A68] animate-spin" />
        ) : isPendente ? (
          <>
            <button onClick={() => onConfirm(row.id)} title="Confirmar"
              className="w-8 h-8 bg-[#049A59] border border-[#0A7659] rounded-lg flex items-center justify-center hover:brightness-95 transition-all active:scale-95">
              <Check size={15} strokeWidth={3} className="text-white" />
            </button>
            <button onClick={() => onReject(row.id)} title="Cancelar"
              className="w-8 h-8 bg-[#BA1A1A] border border-[#93000A] rounded-lg flex items-center justify-center hover:brightness-95 transition-all active:scale-95">
              <X size={15} strokeWidth={3} className="text-white" />
            </button>
          </>
        ) : (
          <span className="text-xs text-gray-300 font-['Sora']">—</span>
        )}
      </div>
    </div>
  )
}

function SkeletonRow() {
  return (
    <div className="flex items-center border-b border-[#4a6362]/10 animate-pulse">
      {[...Array(7)].map((_, i) => (
        <div key={i} className="flex-1 px-3 py-4 border-r border-[#4a6362]/10 last:border-r-0">
          <div className="h-4 bg-gray-200 rounded-md mx-auto w-3/4" />
        </div>
      ))}
    </div>
  )
}

function Toast({ message, type, onClose }) {
  return (
    <div className={`fixed bottom-6 right-6 z-50 flex items-center gap-3 px-5 py-3 rounded-xl shadow-lg text-white font-['Sora'] text-sm font-medium
      ${type === 'success' ? 'bg-emerald-600' : 'bg-red-600'}`}>
      {type === 'success' ? <Check size={16} /> : <X size={16} />}
      {message}
      <button onClick={onClose} className="ml-2 opacity-70 hover:opacity-100"><X size={14} /></button>
    </div>
  )
}

// ─── Página Principal (Limpada) ─────────────────────────────────────────────
export default function Aulas() {
  const [marcacoes, setMarcacoes]           = useState([])
  const [loading, setLoading]               = useState(true)
  const [error, setError]                   = useState('')
  const [loadingId, setLoadingId]           = useState(null)
  const [toast, setToast]                   = useState(null)
  const [showAll, setShowAll]               = useState(false)
  const [showDisponibilidade, setShowDisponibilidade] = useState(false)

  const role = authService.getUser()?.role

  const showToast = (message, type = 'success') => {
    setToast({ message, type })
    setTimeout(() => setToast(null), 3500)
  }

  const fetchMarcacoes = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const data = showAll
        ? await aulasService.getTodas()
        : await aulasService.getParaConfirmar()
      setMarcacoes(data)
    } catch (err) {
      setError(err.message || 'Erro ao carregar as aulas.')
    } finally {
      setLoading(false)
    }
  }, [showAll])

  useEffect(() => { fetchMarcacoes() }, [fetchMarcacoes])

  const handleConfirm = async (id) => {
    setLoadingId(id)
    try {
      await aulasService.updateEstado(id, aulasService.ESTADOS.CONFIRMADA)
      setMarcacoes(prev => prev.map(r =>
        r.id === id ? { ...r, id_estado: aulasService.ESTADOS.CONFIRMADA, estado_nome: 'Confirmada' } : r
      ))
      showToast('Aula confirmada com sucesso!', 'success')
    } catch (err) {
      showToast(err.message || 'Erro ao confirmar aula.', 'error')
    } finally {
      setLoadingId(null)
    }
  }

  const handleReject = async (id) => {
    setLoadingId(id)
    try {
      await aulasService.updateEstado(id, aulasService.ESTADOS.CANCELADA)
      setMarcacoes(prev => prev.map(r =>
        r.id === id ? { ...r, id_estado: aulasService.ESTADOS.CANCELADA, estado_nome: 'Cancelada' } : r
      ))
      showToast('Aula cancelada.', 'error')
    } catch (err) {
      showToast(err.message || 'Erro ao cancelar aula.', 'error')
    } finally {
      setLoadingId(null)
    }
  }

  const counts = marcacoes.reduce((acc, m) => {
    acc[m.id_estado] = (acc[m.id_estado] ?? 0) + 1
    return acc
  }, {})

  const pendentes = counts[aulasService.ESTADOS.PENDENTE] ?? 0

  return (
    <>
      {/* Removido o <DashboardNav /> e as div externas. 
          O layout agora cuida de tudo ao redor.
      */}
      <div className="max-w-[1400px] mx-auto">
        {/* Cabeçalho de conteúdo */}
        <div className="flex flex-wrap items-end justify-between gap-4 mb-8">
          <div>
            <p className="text-[#4A6362] text-sm font-medium tracking-wide mb-1">Gestão de Presenças</p>
            <h1 className="text-[#324B4A] font-normal text-4xl leading-tight tracking-tight">
              {showAll ? 'Todas as Aulas' : 'Confirmação de Aulas'}
              {!showAll && <span className="text-[#006A68] font-semibold"> (48h)</span>}
            </h1>
          </div>
          <div className="flex items-center gap-3">
            {role === 2 && (
              <button
                onClick={() => setShowDisponibilidade(true)}
                className="flex items-center gap-2 px-5 py-2.5 bg-[#006A68] text-white rounded-xl text-sm font-bold hover:bg-[#00504E] transition-colors shadow-sm"
              >
                <Plus size={16} />
                Nova disponibilidade
              </button>
            )}

            {pendentes > 0 && !showAll && (
              <div className="flex items-center gap-1.5 bg-amber-100 border border-amber-300 text-amber-700 px-3 py-1.5 rounded-full text-sm font-semibold">
                <AlertCircle size={14} />
                {pendentes} pendente{pendentes > 1 ? 's' : ''}
              </div>
            )}
            <button onClick={() => setShowAll(v => !v)}
              className="flex items-center gap-2 px-4 py-2 rounded-full border border-[#006A68] text-[#006A68] text-sm font-medium hover:bg-[#CCE8E6] transition-colors">
              <BookOpen size={15} />
              {showAll ? 'Ver próximas 48h' : 'Ver todas'}
            </button>
            <button onClick={fetchMarcacoes} disabled={loading} title="Atualizar"
              className="w-9 h-9 rounded-full border border-[#4a6362]/30 flex items-center justify-center hover:bg-[#EFF5F4] transition-colors disabled:opacity-40">
              <RefreshCw size={15} className={`text-[#4A6362] ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        {/* Erro */}
        {error && (
          <div className="mb-6 flex items-center gap-2 bg-red-50 text-red-700 text-sm px-4 py-3 rounded-xl border border-red-200">
            <AlertCircle size={16} />
            {error}
            <button onClick={fetchMarcacoes} className="ml-auto underline text-xs">Tentar novamente</button>
          </div>
        )}

        {/* Tabela */}
        <div className="rounded-2xl border border-[#4a6362]/20 overflow-hidden shadow-sm bg-white">
          <TableHeader showAll={showAll} />
          {loading ? (
            [...Array(5)].map((_, i) => <SkeletonRow key={i} />)
          ) : marcacoes.length === 0 ? (
            <div className="py-20 flex flex-col items-center gap-3 text-[#4A6362]">
              <CheckCircle2 size={40} className="opacity-20" />
              <p className="text-sm font-medium opacity-50">
                {showAll
                  ? 'Não existem aulas registadas.'
                  : 'Nenhuma aula para confirmar nas próximas 48h.'}
              </p>
            </div>
          ) : (
            marcacoes.map(row => (
              <TableRow key={row.id} row={row} showAll={showAll}
                onConfirm={handleConfirm} onReject={handleReject} loadingId={loadingId} />
            ))
          )}
        </div>

        {/* Resumo */}
        {!loading && marcacoes.length > 0 && (
          <div className="mt-5 flex gap-3 flex-wrap">
            {Object.entries(STATUS_MAP).map(([idEstado, cfg]) => {
              const c = counts[Number(idEstado)] ?? 0
              if (c === 0) return null
              const Icon = cfg.icon
              return (
                <div key={idEstado}
                  className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-semibold ${cfg.color}`}>
                  <Icon size={13} />{cfg.label}: <strong>{c}</strong>
                </div>
              )
            })}
            <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-semibold bg-gray-100 text-gray-600">
              Total: <strong>{marcacoes.length}</strong>
            </div>
          </div>
        )}
      </div>

      {showDisponibilidade && (
        <NovaDisponibilidadeModal
          onClose={() => setShowDisponibilidade(false)}
          onSuccess={() => {
            setShowDisponibilidade(false)
            showToast('Disponibilidade criada com sucesso!', 'success')
          }}
        />
      )}

      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
    </>
  )
}