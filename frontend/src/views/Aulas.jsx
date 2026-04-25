import { useState, useEffect, useCallback } from 'react'
import { formatDate, formatTime } from '../utils/dateUtils'
import { useLocation } from 'react-router-dom'
import {
  CalendarDays, Clock, User, MapPin, Music, CheckCircle2,
  XCircle, AlertCircle, RefreshCw, Plus, X, BookOpen, ArrowUpDown, Check
} from 'lucide-react'
import coachingService from '../services/coachingService'
import { api } from '../services/api'
import { authService } from '../services/authService'
import NovaDisponibilidadeModal from './NovaDisponibilidadeModal'
import NovaMarcacaoModal from './NovaMarcacaoModal'
import { disponibilidadeService } from '../services/disponibilidadeService'
import ItemDetailModal from '../components/ItemDetailModal'

// ─── Mapeamento de estados e Funções Auxiliares ───────────
const STATUS_CFG = {
  1: { label: 'Agendada', icon: Clock, textColor: 'text-amber-700', bg: 'bg-amber-100', border: 'border-amber-200' },
  2: { label: 'Em Validação', icon: Clock, textColor: 'text-blue-700', bg: 'bg-blue-100', border: 'border-blue-200' },
  3: { label: 'Confirmada', icon: CheckCircle2, textColor: 'text-emerald-700', bg: 'bg-emerald-100', border: 'border-emerald-200' },
  4: { label: 'Concluída', icon: CheckCircle2, textColor: 'text-[#006A68]', bg: 'bg-[#CCE8E6]', border: 'border-[#006A68]' },
  5: { label: 'Cancelada', icon: XCircle, textColor: 'text-red-700', bg: 'bg-red-100', border: 'border-red-200' },
}

function getStatusCfg(id_estado, estado_nome) {
  if (STATUS_CFG[id_estado]) return STATUS_CFG[id_estado]
  const nome = (estado_nome ?? '').toLowerCase()
  if (nome.includes('agend') || nome.includes('pend')) return STATUS_CFG[1]
  if (nome.includes('valida')) return STATUS_CFG[2]
  if (nome.includes('confirm')) return STATUS_CFG[3]
  if (nome.includes('conclui') || nome.includes('finaliz')) return STATUS_CFG[4]
  if (nome.includes('cancel')) return STATUS_CFG[5]
  return { label: estado_nome ?? '—', textColor: 'text-gray-600', bg: 'bg-gray-100', border: 'border-gray-200', icon: Clock }
}


// O componente AulaModal foi removido pois agora usamos o ItemDetailModal compartilhado.

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

// ─── Página Principal ─────────────────────────────────────────────
export default function Aulas() {
  const role = authService.getUser()?.role ?? 3
  const location = useLocation()
  const [marcacoes, setMarcacoes] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [loadingId, setLoadingId] = useState(null)
  const [toast, setToast] = useState(null)
  const [showAll, setShowAll] = useState(false)
  const [modalAula, setModalAula] = useState(null)
  const [filtroEstado, setFiltroEstado] = useState(location.state?.filtroEstado || 'todos')
  const [filtroModalidade, setFiltroModalidade] = useState('todas')
  const [showNovaDisponibilidade, setShowNovaDisponibilidade] = useState(false)
  const [showNovaMarcacao, setShowNovaMarcacao] = useState(false)
  const [disponibilidades, setDisponibilidades] = useState([])
  const [loadingDisp, setLoadingDisp] = useState(false)
  const [deletingDispId, setDeletingDispId] = useState(null)
  const [showDisponibilidadesModal, setShowDisponibilidadesModal] = useState(false)
  const [slotParaMarcacao, setSlotParaMarcacao] = useState(null)

  const showToast = (message, type = 'success') => {
    setToast({ message, type })
    setTimeout(() => setToast(null), 3500)
  }

  const fetchMarcacoes = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      let data;
      if (role === 1) {
        data = await coachingService.listarPedidosPendentes({ estados: '1,2,3,4,5' });
      } else if (role === 2) {
        data = await coachingService.listarMinhasAulas();
      } else {
        data = await coachingService.listarMeusPedidos();
      }

      const rawData = Array.isArray(data) ? data : (data?.data || [])

      // Normalizamos os dados para a tabela
      const formatadas = rawData.map(m => {
        return {
          id: m.id_marcacao,
          modalidade: typeof m.modalidade === 'object' ? m.modalidade.nome : (m.modalidade || '—'),
          data: formatDate(m.data),
          hora: formatTime(m.hora_inicio),
          duracao: `${m.duracao_minutos} min`,
          tipo_aula: m.numero_alunos_pretendidos > 1 ? 'Grupo' : 'Individual',
          sala: typeof m.sala === 'object' ? m.sala.nome : (m.sala || m.sala_atual || 'Por atribuir'),
          docente: role === 2
            ? (m.alunos?.length > 0 ? m.alunos.map(a => typeof a === 'object' ? a.nome : a).join(', ') : 'A aguardar alunos')
            : (typeof m.docente === 'object' ? m.docente.nome : (m.docente || '—')),
          id_estado: m.id_estado,
          estado_nome: m.estado || '—',
          alunos: m.alunos?.map(a => typeof a === 'object' ? a.nome : a) || [],
          numero_alunos_pretendidos: m.numero_alunos_pretendidos,
          ja_validou: m.ja_validou
        }
      })
      setMarcacoes(formatadas)
    } catch (err) {
      setError(err.message || 'Erro ao carregar as aulas.')
    } finally {
      setLoading(false)
    }
  }, [showAll, role])

  useEffect(() => { fetchMarcacoes() }, [fetchMarcacoes])

  const fetchDisponibilidades = useCallback(async () => {
    if (role !== 2) return
    setLoadingDisp(true)
    try {
      const data = await disponibilidadeService.listar()
      setDisponibilidades(Array.isArray(data) ? data : data.data || [])
    } catch { /* silencioso */ }
    finally { setLoadingDisp(false) }
  }, [role])

  useEffect(() => { fetchDisponibilidades() }, [fetchDisponibilidades])

  const handleDeleteDisponibilidade = async (id) => {
    setDeletingDispId(id)
    try {
      const token = localStorage.getItem('token')
      const res = await fetch(`/api/disponibilidades/${id}`, {
        method: 'DELETE',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      })
      if (!res.ok) { const d = await res.json().catch(() => ({})); throw new Error(d.message || `Erro ${res.status}`) }
      showToast('Disponibilidade eliminada.', 'success')
      fetchDisponibilidades()
    } catch (err) {
      showToast(err.message || 'Erro ao eliminar.', 'error')
    } finally {
      setDeletingDispId(null)
    }
  }

  const handleConfirm = async (id) => {
    setLoadingId(id)
    try {
      let result
      if (role === 1) {
        const salaId = prompt('Introduza o ID da Sala para confirmar (ex: 1):')
        if (!salaId) throw new Error('ID Sala é obrigatório para o Admin atribuir.')
        result = await api.post('/coaching/confirmar-marcacao', { id_marcacao: id, id_sala: parseInt(salaId) })
      } else if (role === 2) {
        result = await api.post(`/coaching/docente/conclusao-sessao/${id}`)
      } else {
        result = await api.post(`/coaching/aluno/conclusao-sessao/${id}`)
      }
      showToast(result?.mensagem || 'Validação registada com sucesso!', 'success')
      fetchMarcacoes()
    } catch (err) {
      showToast(err.response?.data?.message || err.message || 'Erro.', 'error')
    } finally {
      setLoadingId(null)
    }
  }

  const handleReject = async (id) => {
    setLoadingId(id)
    try {
      if (role === 1) {
        await api.post('/coaching/rejeitar-marcacao', { id_marcacao: id, motivo: 'Cancelado na página Aulas' })
      } else if (role === 2) {
        await api.post(`/coaching/cancelar-marcacao/${id}`)
      } else {
        await api.delete(`/coaching/pedido/${id}/cancelar`)
      }
      showToast('Cancelado com sucesso.', 'success')
      fetchMarcacoes()
    } catch (err) {
      showToast(err.response?.data?.message || err.message || 'Erro ao cancelar.', 'error')
    } finally {
      setLoadingId(null)
    }
  }

  // ── Lógica 48h para aluno ─────────────────────────────────────────────────
  // Uma aula precisa de confirmação se: estado=Confirmada + data já passou + menos de 48h
  function precisaConfirmacao(aula) {
    if (aula.id_estado !== 3) return false
    if (!aula._data_raw) return false
    const fim = new Date(aula._data_raw)
    fim.setMinutes(fim.getMinutes() + (aula.duracao_min || 60))
    const agora = new Date()
    const diffHoras = (agora - fim) / (1000 * 60 * 60)
    return diffHoras >= 0 && diffHoras <= 48
  }

  const aulasParaConfirmar = role === 3
    ? marcacoes.filter(precisaConfirmacao)
    : []

  // Filtros
  const modalidades = ['todas', ...new Set(marcacoes.map(a => a.modalidade).filter(Boolean))]

  const marcacoesFiltradas = marcacoes.filter(a => {
    if (!showAll && [4, 5].includes(a.id_estado)) return false // Se o histórico estiver oculto (só pendentes/confirmadas)
    if (filtroEstado !== 'todos' && String(a.id_estado) !== String(filtroEstado)) return false
    if (filtroModalidade !== 'todas' && a.modalidade !== filtroModalidade) return false
    if (!showAll && role === 1 && a.id_estado !== 1 && a.id_estado !== 2) return false
    // Oculta canceladas por defeito em todos os roles — só aparecem com "Ver todas" ou filtro explícito
    if (!showAll && a.id_estado === 5 && filtroEstado === 'todos') return false
    return true
  })

  // Se o id_estado for null, pomos "Desconhecido" contido no 0
  const counts = marcacoes.reduce((acc, m) => {
    const id = m.id_estado || 0
    acc[id] = (acc[id] ?? 0) + 1
    return acc
  }, {})

  const pendentes = (counts[1] ?? 0) + (counts[2] ?? 0)

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
            {role === 3 && (
              <button
                onClick={() => setShowNovaMarcacao(true)}
                className="flex items-center gap-2 px-5 py-2.5 bg-[#006A68] text-white rounded-xl text-sm font-bold hover:bg-[#00504E] transition-colors shadow-sm"
              >
                <Plus size={16} />
                Nova Marcação
              </button>
            )}
            {role === 2 && (
              <button
                onClick={() => setShowNovaDisponibilidade(true)}
                className="flex items-center gap-2 px-5 py-2.5 bg-[#006A68] text-white rounded-xl text-sm font-bold hover:bg-[#00504E] transition-colors shadow-sm"
              >
                <Plus size={16} />
                Nova Disponibilidade
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
                {Object.entries(STATUS_CFG).map(([id, cfg]) =>
                  counts[Number(id)] ? <option key={id} value={id}>{cfg.label} ({counts[Number(id)]})</option> : null
                )}
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

        {/* ── Banner 48h (só para aluno) ──────────────────────────────────── */}
        {role === 3 && aulasParaConfirmar.length > 0 && (
          <div className="mb-6 rounded-2xl border-2 border-amber-300 bg-amber-50 overflow-hidden shadow-sm">
            <div className="flex items-center gap-3 px-5 py-3.5 bg-amber-100 border-b border-amber-200">
              <div className="w-8 h-8 rounded-full bg-amber-400 flex items-center justify-center shrink-0">
                <AlertCircle size={16} className="text-white" />
              </div>
              <div>
                <p className="text-amber-900 font-bold text-sm">
                  {aulasParaConfirmar.length === 1
                    ? 'Tens 1 aula a aguardar a tua confirmação de presença'
                    : `Tens ${aulasParaConfirmar.length} aulas a aguardar a tua confirmação de presença`}
                </p>
                <p className="text-amber-700 text-xs mt-0.5">Tens 48h após o fim de cada aula para confirmar a presença.</p>
              </div>
            </div>
            <div className="divide-y divide-amber-200">
              {aulasParaConfirmar.map(aula => {
                const fim = new Date(aula._data_raw)
                fim.setMinutes(fim.getMinutes() + (aula.duracao_min || 60))
                const diffHoras = (new Date() - fim) / (1000 * 60 * 60)
                const horasRestantes = Math.max(0, 48 - diffHoras)
                const prazoExpirou = diffHoras > 48
                const isLoadingThis = loadingId === aula.id
                return (
                  <div key={aula.id} className="flex flex-wrap items-center gap-3 px-5 py-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold text-[#324B4A] text-sm">{aula.modalidade}</span>
                        {prazoExpirou ? (
                          <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full font-semibold">
                            Prazo expirado
                          </span>
                        ) : (
                          <span className="text-xs text-amber-700 bg-amber-200 px-2 py-0.5 rounded-full font-semibold">
                            {horasRestantes < 1
                              ? `${Math.round(horasRestantes * 60)} min restantes`
                              : `${horasRestantes.toFixed(0)}h restantes`}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-gray-500 mt-0.5">
                        {aula.data} · {aula.hora} · {aula.duracao}
                        {aula.sala && aula.sala !== '—' ? ` · ${aula.sala}` : ''}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setModalAula(aula)}
                        className="px-3 py-1.5 rounded-lg border border-amber-300 text-amber-700 text-xs font-semibold hover:bg-amber-100 transition-colors"
                      >
                        Ver detalhe
                      </button>
                      {isLoadingThis ? (
                        <RefreshCw size={16} className="text-emerald-600 animate-spin" />
                      ) : (
                        <button
                          onClick={() => handleConfirm(aula.id)}
                          disabled={prazoExpirou}
                          title={prazoExpirou ? 'O prazo de 48h para confirmar a presença expirou.' : ''}
                          className={`flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-xs font-bold transition-colors shadow-sm
                            ${prazoExpirou
                              ? 'bg-gray-200 text-gray-400 cursor-not-allowed shadow-none'
                              : 'bg-emerald-600 text-white hover:bg-emerald-700'}`}
                        >
                          <Check size={13} strokeWidth={3} />
                          {prazoExpirou ? 'Prazo expirado' : 'Confirmar presen\u00e7a'}
                        </button>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
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
                  const isPendente = row.id_estado === 1 || row.id_estado === 2

                  // Janela de confirmação de presença (role 2 e 3): estado Confirmada + aula já passou + ≤48h
                  const podeConfirmarPresenca = (() => {
                    if (role === 1 || row.id_estado !== 3 || !row._data_raw) return false
                    const fim = new Date(row._data_raw)
                    fim.setMinutes(fim.getMinutes() + (row.duracao_min || 60))
                    const diffHoras = (new Date() - fim) / (1000 * 60 * 60)
                    return diffHoras >= 0 && diffHoras <= 48
                  })()
                  const prazoExpiradoTabela = (() => {
                    if (role === 1 || row.id_estado !== 3 || !row._data_raw) return false
                    const fim = new Date(row._data_raw)
                    fim.setMinutes(fim.getMinutes() + (row.duracao_min || 60))
                    const diffHoras = (new Date() - fim) / (1000 * 60 * 60)
                    return diffHoras > 48
                  })()
                  return (
                    <tr
                      key={row.id ?? idx}
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
                        ) : role === 1 && isPendente ? (
                          <div className="flex gap-2">
                            <button onClick={() => handleConfirm(row.id)} title="Confirmar"
                              className="w-8 h-8 bg-[#049A59] border border-[#0A7659] rounded-lg flex items-center justify-center hover:brightness-95 transition-all active:scale-95">
                              <Check size={15} strokeWidth={3} className="text-white" />
                            </button>
                          </div>
                        ) : podeConfirmarPresenca ? (
                          <button
                            onClick={() => handleConfirm(row.id)}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 text-white text-xs font-bold hover:bg-emerald-700 transition-colors"
                          >
                            <Check size={12} strokeWidth={3} />
                            Confirmar presen&ccedil;a
                          </button>
                        ) : prazoExpiradoTabela ? (
                          <span className="text-xs text-gray-400 font-medium">Prazo expirado</span>
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

        {/* ── Tabela de Disponibilidades (docente) ─────────────────────────────── */}
        {role === 2 && (
          <div className="mt-10">
            <div className="flex items-end justify-between gap-4 mb-4">
              <div>
                <p className="text-[#4A6362] text-xs font-medium tracking-wide mb-0.5">As tuas janelas de coaching</p>
                <h2 className="text-[#324B4A] font-semibold text-xl">Disponibilidades</h2>
              </div>
              <button
                onClick={() => setShowNovaDisponibilidade(true)}
                className="flex items-center gap-2 px-4 py-2 bg-[#006A68] text-white rounded-xl text-sm font-bold hover:bg-[#00504E] transition-colors shadow-sm"
              >
                <Plus size={15} />
                Nova
              </button>
            </div>
            <div className="rounded-2xl border border-[#4a6362]/20 overflow-hidden shadow-sm bg-white">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-[#EFF5F4] border-b-2 border-[#4a6362]/20">
                    {['Frequência', 'Data / Dia', 'Hora Início', 'Hora Fim', ''].map((col, i) => (
                      <th key={i} className="px-4 py-3.5 text-left text-xs font-bold text-[#4A6362] uppercase tracking-wider">{col}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {loadingDisp ? (
                    [...Array(3)].map((_, i) => (
                      <tr key={i} className="animate-pulse border-b border-[#4a6362]/10">
                        {[...Array(5)].map((_, j) => (
                          <td key={j} className="px-4 py-4"><div className="h-4 bg-gray-100 rounded-lg w-3/4" /></td>
                        ))}
                      </tr>
                    ))
                  ) : disponibilidades.length === 0 ? (
                    <tr><td colSpan={5} className="px-4 py-10 text-center text-gray-400 text-sm">Sem disponibilidades registadas.</td></tr>
                  ) : (
                    disponibilidades.map((d, idx) => {
                      const DIAS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']
                      const frequencia = d.data_especifica ? 'Única' : 'Semanal'
                      const dataOuDia = d.data_especifica
                        ? new Date(d.data_especifica).toLocaleDateString('pt-PT')
                        : (d.dia_semana != null ? DIAS[d.dia_semana] : '—')
                      const fmtTime = (iso) => {
                        if (!iso) return '—'
                        const dt = new Date(iso)
                        return isNaN(dt) ? iso.substring(11, 16) : dt.toISOString().substring(11, 16)
                      }
                      const isDeleting = deletingDispId === d.id_disponibilidade
                      return (
                        <tr key={d.id_disponibilidade}
                          className={`border-b border-[#4a6362]/10 hover:bg-[#F4FBF9] transition-colors ${idx % 2 === 0 ? '' : 'bg-[#FAFFFE]'}`}
                        >
                          <td className="px-4 py-4">
                            <span className={`inline-flex items-center gap-1.5 text-xs font-bold px-2.5 py-1 rounded-full border
                              ${frequencia === 'Semanal' ? 'bg-blue-50 text-blue-700 border-blue-200' : 'bg-amber-50 text-amber-700 border-amber-200'}`}>
                              {frequencia}
                            </span>
                          </td>
                          <td className="px-4 py-4 text-gray-700 font-medium">{dataOuDia}</td>
                          <td className="px-4 py-4 text-gray-700 whitespace-nowrap">{fmtTime(d.hora_inicio)}</td>
                          <td className="px-4 py-4 text-gray-700 whitespace-nowrap">{fmtTime(d.hora_fim)}</td>
                          <td className="px-4 py-4">
                            {isDeleting ? (
                              <RefreshCw size={16} className="text-red-500 animate-spin" />
                            ) : (
                              <button
                                onClick={() => handleDeleteDisponibilidade(d.id_disponibilidade)}
                                title="Eliminar disponibilidade"
                                className="w-8 h-8 bg-red-50 border border-red-200 rounded-lg flex items-center justify-center hover:bg-red-100 transition-colors text-red-600"
                              >
                                <X size={14} strokeWidth={2.5} />
                              </button>
                            )}
                          </td>
                        </tr>
                      )
                    })
                  )}
                </tbody>
              </table>
            </div>
            {!loadingDisp && disponibilidades.length > 0 && (
              <p className="mt-3 text-xs text-gray-400 text-right">{disponibilidades.length} disponibilidade{disponibilidades.length !== 1 ? 's' : ''} registada{disponibilidades.length !== 1 ? 's' : ''}</p>
            )}
          </div>
        )}
      </div>

      {/* Modal de detalhes */}
      {modalAula && (
        <ItemDetailModal item={modalAula} role={role} onClose={() => setModalAula(null)} />
      )}

      {showNovaDisponibilidade && (
        <NovaDisponibilidadeModal
          onClose={() => setShowNovaDisponibilidade(false)}
          onSuccess={() => { setShowNovaDisponibilidade(false); fetchMarcacoes(); fetchDisponibilidades() }}
        />
      )}

      {showNovaMarcacao && (
        <NovaMarcacaoModal
          onClose={() => setShowNovaMarcacao(false)}
          onSuccess={() => { showToast('Pedido de marcação enviado com sucesso!', 'success'); fetchMarcacoes() }}
        />
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