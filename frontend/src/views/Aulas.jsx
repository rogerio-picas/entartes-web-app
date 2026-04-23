import { useState, useEffect, useCallback } from 'react'
import {
  CalendarDays, Clock, User, MapPin, Music, CheckCircle2,
  XCircle, AlertCircle, RefreshCw, Plus, X, BookOpen,
  ChevronUp, ChevronDown, Search, Users
} from 'lucide-react'
import { authService } from '../services/authService'
import { coachingService } from '../services/coachingService'
import NovaDisponibilidadeModal from './NovaDisponibilidadeModal'

// ─── Estados com IDs correctos (espelham o backend) ─────────────────────────
const STATUS_CFG = {
  1: { label: 'Agendada',      textColor: 'text-amber-700',    bg: 'bg-amber-50',    border: 'border-amber-300',   dot: 'bg-amber-400'   },
  2: { label: 'Em Validação',  textColor: 'text-blue-700',     bg: 'bg-blue-50',     border: 'border-blue-300',    dot: 'bg-blue-400'    },
  3: { label: 'Confirmada',    textColor: 'text-emerald-700',  bg: 'bg-emerald-50',  border: 'border-emerald-300', dot: 'bg-emerald-500' },
  4: { label: 'Concluída',     textColor: 'text-[#006A68]',    bg: 'bg-[#CCE8E6]',  border: 'border-[#80D5D2]',   dot: 'bg-[#006A68]'  },
  5: { label: 'Cancelada',     textColor: 'text-red-700',      bg: 'bg-red-50',      border: 'border-red-300',     dot: 'bg-red-500'    },
}

function getStatusCfg(id_estado, estado_nome) {
  if (STATUS_CFG[id_estado]) return STATUS_CFG[id_estado]
  const n = (estado_nome ?? '').toLowerCase()
  if (n.includes('agend'))   return STATUS_CFG[1]
  if (n.includes('valid'))   return STATUS_CFG[2]
  if (n.includes('confirm')) return STATUS_CFG[3]
  if (n.includes('conclu'))  return STATUS_CFG[4]
  if (n.includes('cancel'))  return STATUS_CFG[5]
  return { label: estado_nome ?? '—', textColor: 'text-gray-600', bg: 'bg-gray-50', border: 'border-gray-200', dot: 'bg-gray-400' }
}

// ─── Badge de estado ─────────────────────────────────────────────────────────
function StatusBadge({ id_estado, estado_nome }) {
  const cfg = getStatusCfg(id_estado, estado_nome)
  return (
    <span className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full border whitespace-nowrap ${cfg.bg} ${cfg.textColor} ${cfg.border}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
      {cfg.label}
    </span>
  )
}

// ─── Skeleton ────────────────────────────────────────────────────────────────
function SkeletonRow({ cols }) {
  return (
    <tr className="animate-pulse border-b border-[#4a6362]/8">
      {[...Array(cols)].map((_, i) => (
        <td key={i} className="px-4 py-4">
          <div className="h-4 bg-gray-100 rounded-lg" style={{ width: `${55 + (i % 4) * 12}%` }} />
        </td>
      ))}
    </tr>
  )
}

// ─── Modal de detalhe ────────────────────────────────────────────────────────
function AulaModal({ aula, role, onClose }) {
  if (!aula) return null
  const cfg = getStatusCfg(aula.id_estado, aula.estado_nome)
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden" onClick={e => e.stopPropagation()}>
        <div className="bg-[#EFF5F4] border-b-2 border-[#006A68] px-6 py-5 flex items-start justify-between">
          <div>
            <p className="text-[#4A6362] text-xs font-medium tracking-widest uppercase mb-1">Detalhe do Coaching</p>
            <h3 className="text-[#006A68] font-bold text-xl">{aula.modalidade}</h3>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-full bg-white/80 flex items-center justify-center hover:bg-white transition-colors text-[#4A6362]">
            <X size={16} />
          </button>
        </div>
        <div className="px-6 py-5 space-y-4">
          <span className={`inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-full border ${cfg.bg} ${cfg.textColor} ${cfg.border}`}>
            <span className={`w-2 h-2 rounded-full ${cfg.dot}`} />{cfg.label}
          </span>
          <div className="grid grid-cols-2 gap-4">
            <InfoItem icon={CalendarDays} label="Data" value={aula.data} />
            <InfoItem icon={Clock} label="Hora" value={aula.hora} />
            <InfoItem icon={Clock} label="Duração" value={aula.duracao} />
            <InfoItem icon={MapPin} label="Sala" value={aula.sala} />
            <InfoItem icon={User} label="Docente" value={aula.docente} />
            <InfoItem icon={Music} label="Modalidade" value={aula.modalidade} />
          </div>
          {aula.alunos && aula.alunos.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-[#4A6362] uppercase tracking-wider mb-2 flex items-center gap-1.5">
                <Users size={12} /> Alunos ({aula.alunos.length})
              </p>
              <div className="flex flex-wrap gap-1.5">
                {aula.alunos.map((a, i) => (
                  <span key={i} className="text-xs bg-[#CCE8E6] text-[#006A68] px-2.5 py-1 rounded-full font-medium">{a}</span>
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

function InfoItem({ icon: Icon, label, value }) {
  return (
    <div className="flex items-start gap-2.5">
      <div className="w-7 h-7 rounded-lg bg-[#CCE8E6] flex items-center justify-center shrink-0 mt-0.5">
        {Icon && <Icon size={14} className="text-[#006A68]" />}
      </div>
      <div>
        <p className="text-[10px] uppercase tracking-wider text-[#4A6362] font-semibold">{label}</p>
        <p className="text-sm font-medium text-gray-800">{value ?? '—'}</p>
      </div>
    </div>
  )
}

// ─── Cabeçalho de coluna ordenável ───────────────────────────────────────────
function TH({ children, field, sortField, sortDir, onSort }) {
  const active = sortField === field
  return (
    <th
      className={`px-4 py-3.5 text-left text-xs font-bold uppercase tracking-wider whitespace-nowrap cursor-pointer select-none group ${active ? 'text-[#006A68]' : 'text-[#4A6362]'}`}
      onClick={() => onSort(field)}
    >
      <span className="flex items-center gap-1">
        {children}
        <span className="flex flex-col">
          <ChevronUp size={9} className={active && sortDir === 'asc' ? 'text-[#006A68]' : 'text-gray-300'} />
          <ChevronDown size={9} className={active && sortDir === 'desc' ? 'text-[#006A68]' : 'text-gray-300'} />
        </span>
      </span>
    </th>
  )
}

// ─── Página Principal ─────────────────────────────────────────────────────────
export default function Aulas() {
  const user = authService.getUser()
  const role = user?.role ?? 3
  const isAdmin   = role === 1
  const isDocente = role === 2
  const isAluno   = role === 3

  const [marcacoes, setMarcacoes]         = useState([])
  const [loading, setLoading]             = useState(true)
  const [error, setError]                 = useState('')
  const [toast, setToast]                 = useState(null)
  const [modalAula, setModalAula]         = useState(null)
  const [filtroEstado, setFiltroEstado]   = useState('todos')
  const [filtroModal, setFiltroModal]     = useState('todas')
  const [search, setSearch]               = useState('')
  const [sortField, setSortField]         = useState('_data_raw')
  const [sortDir, setSortDir]             = useState('asc')
  const [showNovaDisp, setShowNovaDisp]   = useState(false)

  function showToast(msg, type = 'success') {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 3500)
  }

  // ── Carregar dados por role ──────────────────────────────────────────────
  const fetchMarcacoes = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      let data = []
      if (isAdmin) {
        // Todos os estados: 1,2,3,4,5
        data = await coachingService.getAdminPedidos('1,2,3,4,5')
      } else if (isDocente) {
        data = await coachingService.getDocenteAulas()
      } else {
        data = await coachingService.getAlunoPedidos()
      }
      setMarcacoes(Array.isArray(data) ? data : [])
    } catch (err) {
      setError(err.message || 'Erro ao carregar as aulas.')
    } finally {
      setLoading(false)
    }
  }, [isAdmin, isDocente])

  useEffect(() => { fetchMarcacoes() }, [fetchMarcacoes])

  // ── Ordenação ────────────────────────────────────────────────────────────
  function handleSort(field) {
    if (sortField === field) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setSortField(field); setSortDir('asc') }
  }

  // ── Filtros e ordenação ──────────────────────────────────────────────────
  const modalidades = ['todas', ...new Set(marcacoes.map(a => a.modalidade).filter(Boolean))]
  const estados = ['todos', ...new Set(marcacoes.map(a => a.id_estado).filter(Boolean))]

  const marcacoesFiltradas = marcacoes
    .filter(a => {
      if (filtroEstado !== 'todos' && String(a.id_estado) !== filtroEstado) return false
      if (filtroModal !== 'todas' && a.modalidade !== filtroModal) return false
      if (search) {
        const q = search.toLowerCase()
        return (
          (a.modalidade ?? '').toLowerCase().includes(q) ||
          (a.docente ?? '').toLowerCase().includes(q) ||
          (a.sala ?? '').toLowerCase().includes(q) ||
          (a.alunos ?? []).some(al => al.toLowerCase().includes(q))
        )
      }
      return true
    })
    .sort((a, b) => {
      let va = a[sortField], vb = b[sortField]
      if (sortField === '_data_raw') { va = new Date(va); vb = new Date(vb) }
      if (va < vb) return sortDir === 'asc' ? -1 : 1
      if (va > vb) return sortDir === 'asc' ? 1 : -1
      return 0
    })

  // ── Contagens por estado ──────────────────────────────────────────────────
  const counts = marcacoes.reduce((acc, m) => {
    acc[m.id_estado] = (acc[m.id_estado] ?? 0) + 1
    return acc
  }, {})

  // ── Título por role ───────────────────────────────────────────────────────
  const titulo = isAdmin ? 'Todos os Coachings' : isDocente ? 'As Minhas Aulas' : 'As Minhas Sessões'
  const subtitulo = isAdmin ? 'Visão completa de todas as sessões' : isDocente ? 'Sessões em que és docente' : 'Sessões em que estás inscrito'

  // ── Colunas por role ──────────────────────────────────────────────────────
  const showDocente = isAdmin || isAluno
  const showAlunos  = isAdmin || isDocente

  const numCols = 6 + (showDocente ? 1 : 0) + (showAlunos ? 1 : 0) + 1

  return (
    <>
      <div className="max-w-[1400px] mx-auto font-['Sora']">

        {/* ── Cabeçalho ── */}
        <div className="flex flex-wrap items-end justify-between gap-4 mb-8">
          <div>
            <p className="text-[#4A6362] text-sm font-medium tracking-wide mb-1">{subtitulo}</p>
            <h1 className="text-[#324B4A] font-normal text-4xl leading-tight tracking-tight">
              {isAdmin ? 'Todos os ' : 'As minhas '}<span className="text-[#006A68] font-semibold">{isAdmin ? 'Coachings' : 'Aulas'}</span>
            </h1>
          </div>
          <div className="flex items-center gap-2">
            {isDocente && (
              <button
                onClick={() => setShowNovaDisp(true)}
                className="flex items-center gap-2 px-4 py-2.5 bg-[#006A68] text-white rounded-xl text-sm font-bold hover:bg-[#00504E] transition-colors shadow-sm"
              >
                <Plus size={15} /> Nova Disponibilidade
              </button>
            )}
            <button
              onClick={fetchMarcacoes} disabled={loading}
              className="w-9 h-9 rounded-full border border-[#4a6362]/30 flex items-center justify-center hover:bg-[#EFF5F4] transition-colors disabled:opacity-40"
              title="Atualizar"
            >
              <RefreshCw size={15} className={`text-[#4A6362] ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        {/* ── Filtros ── */}
        <div className="flex flex-wrap items-center gap-3 mb-6">
          {/* Search */}
          <div className="relative">
            <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#4A6362]" />
            <input
              value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Pesquisar…"
              className="pl-8 pr-3 py-1.5 rounded-lg border border-[#4a6362]/25 text-xs text-[#324B4A] bg-white focus:outline-none focus:border-[#006A68] w-44"
            />
          </div>

          {/* Filtro modalidade */}
          <select
            value={filtroModal} onChange={e => setFiltroModal(e.target.value)}
            className="appearance-none pl-3 pr-7 py-1.5 rounded-lg border border-[#4a6362]/25 text-xs font-medium text-[#324B4A] bg-white focus:outline-none focus:border-[#006A68] cursor-pointer"
          >
            <option value="todas">Todas as modalidades</option>
            {modalidades.filter(m => m !== 'todas').map(m => <option key={m} value={m}>{m}</option>)}
          </select>

          {/* Filtro estado */}
          <select
            value={filtroEstado} onChange={e => setFiltroEstado(e.target.value)}
            className="appearance-none pl-3 pr-7 py-1.5 rounded-lg border border-[#4a6362]/25 text-xs font-medium text-[#324B4A] bg-white focus:outline-none focus:border-[#006A68] cursor-pointer"
          >
            <option value="todos">Todos os estados</option>
            {Object.entries(STATUS_CFG).map(([id, cfg]) =>
              counts[Number(id)] ? <option key={id} value={id}>{cfg.label} ({counts[Number(id)]})</option> : null
            )}
          </select>

          {(filtroEstado !== 'todos' || filtroModal !== 'todas' || search) && (
            <button
              onClick={() => { setFiltroEstado('todos'); setFiltroModal('todas'); setSearch('') }}
              className="text-xs text-red-500 font-medium hover:text-red-700 flex items-center gap-1"
            >
              <X size={11} /> Limpar
            </button>
          )}

          <span className="ml-auto text-xs text-[#4A6362]">
            {marcacoesFiltradas.length} sessão{marcacoesFiltradas.length !== 1 ? 'ões' : ''}
          </span>
        </div>

        {/* ── Erro ── */}
        {error && (
          <div className="mb-6 flex items-center gap-2 bg-red-50 text-red-700 text-sm px-4 py-3 rounded-xl border border-red-200">
            <AlertCircle size={16} /> {error}
            <button onClick={fetchMarcacoes} className="ml-auto underline text-xs">Tentar novamente</button>
          </div>
        )}

        {/* ── Tabela ── */}
        <div className="rounded-2xl border border-[#4a6362]/20 overflow-hidden shadow-sm bg-white">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-[#EFF5F4] border-b-2 border-[#4a6362]/15">
                <TH field="modalidade" sortField={sortField} sortDir={sortDir} onSort={handleSort}>Modalidade</TH>
                <TH field="_data_raw" sortField={sortField} sortDir={sortDir} onSort={handleSort}>Data</TH>
                <TH field="hora" sortField={sortField} sortDir={sortDir} onSort={handleSort}>Hora</TH>
                <TH field="duracao_min" sortField={sortField} sortDir={sortDir} onSort={handleSort}>Duração</TH>
                {showDocente && <TH field="docente" sortField={sortField} sortDir={sortDir} onSort={handleSort}>Docente</TH>}
                <TH field="sala" sortField={sortField} sortDir={sortDir} onSort={handleSort}>Sala</TH>
                {showAlunos && <th className="px-4 py-3.5 text-left text-xs font-bold text-[#4A6362] uppercase tracking-wider">Alunos</th>}
                <TH field="id_estado" sortField={sortField} sortDir={sortDir} onSort={handleSort}>Estado</TH>
                <th className="px-4 py-3.5 w-24" />
              </tr>
            </thead>
            <tbody>
              {loading ? (
                [...Array(6)].map((_, i) => <SkeletonRow key={i} cols={numCols} />)
              ) : marcacoesFiltradas.length === 0 ? (
                <tr>
                  <td colSpan={numCols} className="py-20 text-center">
                    <BookOpen size={40} className="mx-auto text-[#006A68]/15 mb-3" />
                    <p className="text-sm text-[#4A6362] font-medium">
                      {marcacoes.length === 0 ? 'Sem sessões registadas.' : 'Nenhum resultado para os filtros aplicados.'}
                    </p>
                  </td>
                </tr>
              ) : (
                marcacoesFiltradas.map((row, idx) => (
                  <tr
                    key={row.id}
                    className={`border-b border-[#4a6362]/8 hover:bg-[#F4FBF9] transition-colors cursor-pointer ${idx % 2 !== 0 ? 'bg-[#FAFFFE]' : ''}`}
                    onClick={() => setModalAula(row)}
                  >
                    {/* Modalidade */}
                    <td className="px-4 py-3.5">
                      <div className="flex items-center gap-2">
                        <div className="w-1.5 h-7 rounded-full bg-[#80D5D2] shrink-0" />
                        <span className="font-semibold text-[#324B4A] whitespace-nowrap">{row.modalidade}</span>
                      </div>
                    </td>
                    {/* Data */}
                    <td className="px-4 py-3.5 text-gray-700 whitespace-nowrap">{row.data}</td>
                    {/* Hora */}
                    <td className="px-4 py-3.5 text-gray-700 whitespace-nowrap font-medium">{row.hora}</td>
                    {/* Duração */}
                    <td className="px-4 py-3.5 text-gray-500 whitespace-nowrap">{row.duracao}</td>
                    {/* Docente (Admin e Aluno) */}
                    {showDocente && (
                      <td className="px-4 py-3.5 text-gray-700 whitespace-nowrap">{row.docente}</td>
                    )}
                    {/* Sala */}
                    <td className="px-4 py-3.5 text-gray-600">{row.sala ?? '—'}</td>
                    {/* Alunos (Admin e Docente) */}
                    {showAlunos && (
                      <td className="px-4 py-3.5">
                        {row.alunos && row.alunos.length > 0 ? (
                          <div className="flex flex-wrap gap-1">
                            {row.alunos.slice(0, 2).map((a, i) => (
                              <span key={i} className="text-[10px] bg-[#CCE8E6] text-[#006A68] px-2 py-0.5 rounded-full font-medium whitespace-nowrap">
                                {a}
                              </span>
                            ))}
                            {row.alunos.length > 2 && (
                              <span className="text-[10px] bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full font-medium">
                                +{row.alunos.length - 2}
                              </span>
                            )}
                          </div>
                        ) : (
                          <span className="text-xs text-gray-300">—</span>
                        )}
                      </td>
                    )}
                    {/* Estado */}
                    <td className="px-4 py-3.5" onClick={e => e.stopPropagation()}>
                      <StatusBadge id_estado={row.id_estado} estado_nome={row.estado_nome} />
                    </td>
                    {/* Acção */}
                    <td className="px-4 py-3.5" onClick={e => e.stopPropagation()}>
                      <button
                        onClick={() => setModalAula(row)}
                        className="px-3 py-1.5 rounded-lg bg-[#CCE8E6] text-[#006A68] text-xs font-bold hover:bg-[#006A68] hover:text-white transition-colors whitespace-nowrap"
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

        {/* ── Resumo por estado ── */}
        {!loading && marcacoes.length > 0 && (
          <div className="mt-5 flex gap-2 flex-wrap">
            {Object.entries(STATUS_CFG).map(([idEstado, cfg]) => {
              const c = counts[Number(idEstado)] ?? 0
              if (c === 0) return null
              return (
                <button
                  key={idEstado}
                  onClick={() => setFiltroEstado(filtroEstado === idEstado ? 'todos' : idEstado)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all
                    ${filtroEstado === idEstado ? `${cfg.bg} ${cfg.textColor} ${cfg.border} ring-1 ring-current` : `bg-gray-50 text-gray-600 border-gray-200 hover:${cfg.bg}`}`}
                >
                  <span className={`w-2 h-2 rounded-full ${cfg.dot}`} />
                  {cfg.label}: <strong>{c}</strong>
                </button>
              )
            })}
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-gray-100 text-gray-600 border border-gray-200 ml-auto">
              Total: <strong>{marcacoes.length}</strong>
            </div>
          </div>
        )}
      </div>

      {/* ── Modal detalhe ── */}
      {modalAula && <AulaModal aula={modalAula} role={role} onClose={() => setModalAula(null)} />}

      {/* ── Nova disponibilidade (Docente) ── */}
      {showNovaDisp && (
        <NovaDisponibilidadeModal
          onClose={() => setShowNovaDisp(false)}
          onSuccess={() => { setShowNovaDisp(false); fetchMarcacoes() }}
        />
      )}

      {/* ── Toast ── */}
      {toast && (
        <div className={`fixed bottom-6 right-6 z-[60] flex items-center gap-3 px-5 py-3 rounded-xl shadow-lg text-white font-['Sora'] text-sm font-medium
          ${toast.type === 'success' ? 'bg-emerald-600' : 'bg-red-600'}`}>
          {toast.msg}
          <button onClick={() => setToast(null)}><X size={14} className="opacity-70" /></button>
        </div>
      )}
    </>
  )
}