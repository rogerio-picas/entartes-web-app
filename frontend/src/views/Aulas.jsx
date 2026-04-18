import { useState, useEffect, useCallback } from 'react'
import {
  CalendarDays, Clock, User, MapPin, Music, CheckCircle2,
  XCircle, AlertCircle, RefreshCw, Plus, X, BookOpen, ArrowUpDown, Check
} from 'lucide-react'
import { aulasService } from '../services/aulasService.js'
import { authService } from '../services/authService'
import NovaDisponibilidadeModal from './NovaDisponibilidadeModal'

// ─── Mapeamento de estados e Funções Auxiliares ───────────
const STATUS_CFG = {
  1: { label: 'Pendente',   icon: Clock,        textColor: 'text-amber-700',   bg: 'bg-amber-100',   border: 'border-amber-200' },
  2: { label: 'Confirmada', icon: CheckCircle2, textColor: 'text-emerald-700', bg: 'bg-emerald-100', border: 'border-emerald-200' },
  3: { label: 'Cancelada',  icon: XCircle,      textColor: 'text-red-700',     bg: 'bg-red-100',     border: 'border-red-200' },
  4: { label: 'Concluída',  icon: CheckCircle2, textColor: 'text-[#006A68]',   bg: 'bg-[#CCE8E6]',   border: 'border-[#006A68]' },
}

function getStatusCfg(id_estado, estado_nome) {
  if (STATUS_CFG[id_estado]) return STATUS_CFG[id_estado]
  const nome = (estado_nome ?? '').toLowerCase()
  if (nome.includes('pend'))    return STATUS_CFG[1]
  if (nome.includes('confirm')) return STATUS_CFG[2]
  if (nome.includes('cancel'))  return STATUS_CFG[3]
  if (nome.includes('conclui') || nome.includes('finaliz')) return STATUS_CFG[4]
  return { label: estado_nome ?? '—', textColor: 'text-gray-600', bg: 'bg-gray-100', border: 'border-gray-200', icon: Clock }
}


// ─── Modal Detalhe ─────────────────────────────────────────────
function AulaModal({ aula, onClose }) {
  if (!aula) return null
  const cfg = getStatusCfg(aula.id_estado, aula.estado_nome)
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
            <InfoItem label="Tipo de Aula" value={aula.tipo_aula} icon={BookOpen} />
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
        {Icon && <Icon size={14} className="text-[#006A68]" />}
      </div>
      <div>
        <p className="text-[10px] uppercase tracking-wider text-[#4A6362] font-semibold">{label}</p>
        <p className="text-sm font-medium text-gray-800">{value}</p>
      </div>
    </div>
  )
}

function SkeletonRow() {
  return (
    <tr className="animate-pulse border-b border-[#4a6362]/10">
      {[...Array(9)].map((_, i) => (
        <td key={i} className="px-4 py-4">
          <div className="h-4 bg-gray-100 rounded-lg mx-auto" style={{ width: `${60 + (i % 3) * 15}%` }} />
        </td>
      ))}
    </tr>
  )
}

function StatusBadge({ id_estado, estado_nome }) {
  const cfg = getStatusCfg(id_estado, estado_nome)
  const StatusIcon = cfg.icon
  return (
    <span className={`inline-flex items-center gap-1.5 text-xs font-bold px-2.5 py-1 rounded-full border whitespace-nowrap ${cfg.bg} ${cfg.textColor} ${cfg.border}`}>
      {StatusIcon && <StatusIcon size={11} />}
      {cfg.label}
    </span>
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
  const [marcacoes, setMarcacoes] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [loadingId, setLoadingId] = useState(null)
  const [toast, setToast] = useState(null)
  const [showAll, setShowAll] = useState(false)
  const [modalAula, setModalAula] = useState(null)
  const [filtroEstado, setFiltroEstado] = useState('todos')
  const [filtroModalidade, setFiltroModalidade] = useState('todas')

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

  // Filtros
  const modalidades = ['todas', ...new Set(marcacoes.map(a => a.modalidade).filter(Boolean))]
  const estados = ['todos', ...new Set(marcacoes.map(a => a.estado_nome).filter(Boolean))]

  const marcacoesFiltradas = marcacoes.filter(a => {
    if (filtroEstado !== 'todos' && a.estado_nome !== filtroEstado) return false
    if (filtroModalidade !== 'todas' && a.modalidade !== filtroModalidade) return false
    return true
  })

  const counts = marcacoes.reduce((acc, m) => {
    acc[m.id_estado] = (acc[m.id_estado] ?? 0) + 1
    return acc
  }, {})

  const pendentes = counts[aulasService.ESTADOS.PENDENTE] ?? 0

  return (
    <>
      <div className="max-w-[1400px] mx-auto font-['Sora']">
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
            <button
              onClick={() => {/* abrir modal de nova disponibilidade */}}
              className="flex items-center gap-2 px-5 py-2.5 bg-[#006A68] text-white rounded-xl text-sm font-bold hover:bg-[#00504E] transition-colors shadow-sm"
            >
              <Plus size={16} />
              Nova Disponibilidade
            </button>
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

        {/* Filtros */}
        {!loading && marcacoes.length > 0 && (
          <div className="flex flex-wrap items-center gap-3 mb-6">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-[#4A6362]">
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
              {marcacoesFiltradas.length} aula{marcacoesFiltradas.length !== 1 ? 's' : ''}
            </span>
          </div>
        )}

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
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-[#EFF5F4] border-b-2 border-[#4a6362]/20">
                {['Modalidade', 'Data', 'Hora', 'Duração', 'Tipo Aula', 'Sala', 'Estado', 'Ação', ''].map((col, i) => (
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
              ) : marcacoesFiltradas.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-20 text-center">
                    <BookOpen size={40} className="mx-auto text-[#006A68]/15 mb-3" />
                    <p className="text-sm text-[#4A6362] font-medium">
                      {showAll
                        ? 'Não existem aulas registadas.'
                        : 'Nenhuma aula para confirmar nas próximas 48h.'}
                    </p>
                  </td>
                </tr>
              ) : (
                marcacoesFiltradas.map((row, idx) => {
                  const cfg = getStatusCfg(row.id_estado, row.estado_nome)
                  const StatusIcon = cfg.icon
                  const isLoading = loadingId === row.id
                  const isPendente = row.id_estado === aulasService.ESTADOS.PENDENTE
                  return (
                    <tr
                      key={row.id}
                      className={`border-b border-[#4a6362]/10 hover:bg-[#F4FBF9] transition-colors ${idx % 2 === 0 ? '' : 'bg-[#FAFFFE]'}`}
                    >
                      <td className="px-4 py-4">
                        <div className="flex items-center gap-2">
                          <div className="w-1.5 h-8 rounded-full bg-[#80D5D2] shrink-0" />
                          <span className="font-semibold text-[#324B4A]">{row.modalidade}</span>
                        </div>
                      </td>
                      <td className="px-4 py-4 text-gray-700 whitespace-nowrap">{row.data}</td>
                      <td className="px-4 py-4 text-gray-700 whitespace-nowrap font-medium">{row.hora}</td>
                      <td className="px-4 py-4 text-gray-700 whitespace-nowrap">{row.duracao}</td>
                      <td className="px-4 py-4 text-gray-700 whitespace-nowrap">{row.tipo_aula}</td>
                      <td className="px-4 py-4 text-gray-700">{row.sala}</td>
                      <td className="px-4 py-4">
                        <StatusBadge id_estado={row.id_estado} estado_nome={row.estado_nome} />
                      </td>
                      <td className="px-4 py-4">
                        {isLoading ? (
                          <RefreshCw size={18} className="text-[#006A68] animate-spin" />
                        ) : isPendente ? (
                          <div className="flex gap-2">
                            <button onClick={() => handleConfirm(row.id)} title="Confirmar"
                              className="w-8 h-8 bg-[#049A59] border border-[#0A7659] rounded-lg flex items-center justify-center hover:brightness-95 transition-all active:scale-95">
                              <Check size={15} strokeWidth={3} className="text-white" />
                            </button>
                            <button onClick={() => handleReject(row.id)} title="Cancelar"
                              className="w-8 h-8 bg-[#BA1A1A] border border-[#93000A] rounded-lg flex items-center justify-center hover:brightness-95 transition-all active:scale-95">
                              <X size={15} strokeWidth={3} className="text-white" />
                            </button>
                          </div>
                        ) : (
                          <span className="text-xs text-gray-300 font-['Sora']">—</span>
                        )}
                      </td>
                      <td className="px-4 py-4">
                        <button
                          onClick={() => setModalAula(row)}
                          className="px-3.5 py-1.5 rounded-lg bg-[#CCE8E6] text-[#006A68] text-xs font-bold hover:bg-[#006A68] hover:text-white transition-colors whitespace-nowrap"
                        >
                          Ver mais
                        </button>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Resumo */}
        {!loading && marcacoes.length > 0 && (
          <div className="mt-5 flex gap-3 flex-wrap">
            {Object.entries(STATUS_CFG).map(([idEstado, cfg]) => {
              const c = counts[Number(idEstado)] ?? 0
              if (c === 0) return null
              const Icon = cfg.icon
              return (
                <div key={idEstado}
                  className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-semibold ${cfg.bg} ${cfg.textColor} ${cfg.border}`}>
                  <Icon size={13} />{cfg.label}: <strong>{c}</strong>
                </div>
              )
            })}
            <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-semibold bg-gray-100 text-gray-600 border border-gray-200">
              Total: <strong>{marcacoes.length}</strong>
            </div>
          </div>
        )}
      </div>

      {/* Modal de detalhes */}
      {modalAula && (
        <AulaModal aula={modalAula} onClose={() => setModalAula(null)} />
      )}

      {/* Toast */}
      {toast && (
        <div className={`fixed bottom-6 right-6 z-50 flex items-center gap-3 px-5 py-3 rounded-xl shadow-lg text-white font-['Sora'] text-sm font-medium
          ${toast.type === 'success' ? 'bg-emerald-600' : 'bg-red-600'}`}>
          {toast.type === 'success' ? <Check size={16} /> : <X size={16} />}
          {toast.message}
          <button onClick={() => setToast(null)} className="ml-2 opacity-70 hover:opacity-100"><X size={14} /></button>
        </div>
      )}
    </>
  )
}