import { useState, useEffect, useCallback } from 'react'
import { formatDate, formatTime } from '../utils/dateUtils'
import { useLocation } from 'react-router-dom'
import {
  Clock, CheckCircle2,
  XCircle, AlertCircle, RefreshCw, Plus, X, BookOpen, ArrowUpDown, ArrowUp, ArrowDown, Check
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
  1: { label: 'Pendente', icon: Clock, textColor: 'text-amber-700', bg: 'bg-amber-100', border: 'border-amber-200' },
  2: { label: 'Em Validação', icon: Clock, textColor: 'text-blue-700', bg: 'bg-blue-100', border: 'border-blue-200' },
  3: { label: 'Confirmada', icon: CheckCircle2, textColor: 'text-emerald-700', bg: 'bg-emerald-100', border: 'border-emerald-200' },
  4: { label: 'Concluída', icon: CheckCircle2, textColor: 'text-brand-800', bg: 'bg-brand-200', border: 'border-brand-800' },
  5: { label: 'Cancelada', icon: XCircle, textColor: 'text-red-700', bg: 'bg-red-100', border: 'border-red-200' },
}

function getStatusCfg(id_estado, estado_nome) {
  if (STATUS_CFG[id_estado]) return STATUS_CFG[id_estado]
  const nome = (estado_nome ?? '').toLowerCase()
  if (nome.includes('pend')) return STATUS_CFG[1]
  if (nome.includes('valida')) return STATUS_CFG[2]
  if (nome.includes('confirm')) return STATUS_CFG[3]
  if (nome.includes('conclui') || nome.includes('finaliz')) return STATUS_CFG[4]
  if (nome.includes('cancel')) return STATUS_CFG[5]
  return { label: estado_nome ?? '—', textColor: 'text-gray-600', bg: 'bg-gray-100', border: 'border-gray-200', icon: Clock }
}


// O componente AulaModal foi removido pois agora usamos o ItemDetailModal compartilhado.


function SkeletonRow() {
  return (
    <tr className="animate-pulse border-b border-neutral-600/10">
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
  const [modalAula, setModalAula] = useState(null)
  const [filtroEstado, setFiltroEstado] = useState(location.state?.filtroEstado || (role === 1 ? '1' : 'todos'))
  const [filtroModalidade, setFiltroModalidade] = useState('todas')
  const [filtro48h, setFiltro48h] = useState(location.state?.filtro48h ?? false)
  const [sortConfig, setSortConfig] = useState({ key: null, dir: 'asc' })
  const [showNovaDisponibilidade, setShowNovaDisponibilidade] = useState(false)
  const [showNovaMarcacao, setShowNovaMarcacao] = useState(false)
  const [disponibilidades, setDisponibilidades] = useState([])
  const [loadingDisp, setLoadingDisp] = useState(false)
  const [deletingDispId, setDeletingDispId] = useState(null)
  const [confirmId, setConfirmId] = useState(null)
  const [salaPickerCtx, setSalaPickerCtx] = useState(null)
  const [selectedSalaPicker, setSelectedSalaPicker] = useState('')

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
        const estadosParam = filtroEstado === 'todos' ? '1,2,3,4,5' : filtroEstado;
        data = await coachingService.listarPedidosPendentes({ estados: estadosParam });
      } else if (role === 2) {
        data = await coachingService.listarMinhasAulas(filtroEstado === 'todos' ? null : filtroEstado);
      } else {
        data = await coachingService.listarMeusPedidos(filtroEstado === 'todos' ? null : filtroEstado);
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
          ja_validou: m.ja_validou,
          _data_raw: m.data,
          hora_inicio_raw: m.hora_inicio,
          duracao_min: m.duracao_minutos
        }
      })
      setMarcacoes(formatadas)
    } catch (err) {
      setError(err.message || 'Erro ao carregar as aulas.')
    } finally {
      setLoading(false)
    }
  }, [filtroEstado, role])

  useEffect(() => { fetchMarcacoes() }, [fetchMarcacoes])

  const fetchDisponibilidades = useCallback(async () => {
    if (role !== 2) return
    setLoadingDisp(true)
    try {
      const data = await disponibilidadeService.listar()
      const rawList = Array.isArray(data) ? data : data.data || []
      
      const hoje = new Date()
      hoje.setHours(0, 0, 0, 0)
      
      const filtradas = rawList.filter(d => {
        if (d.data_especifica) {
          const dateStr = String(d.data_especifica).split('T')[0]
          const dt = new Date(dateStr + "T12:00:00")
          dt.setHours(0, 0, 0, 0)
          return dt >= hoje
        }
        return true
      })
      
      setDisponibilidades(filtradas)
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
    if (role === 1) {
      setLoadingId(id)
      try {
        const row = marcacoes.find(m => m.id === id)
        const dataStr = row?._data_raw ? row._data_raw.split('T')[0] : ''
        const horaStr = row?.hora_inicio_raw
          ? (row.hora_inicio_raw.includes('T') ? row.hora_inicio_raw.split('T')[1].substring(0, 8) : row.hora_inicio_raw.substring(0, 8))
          : ''
        const salas = await api.get(`/coaching/salas-disponiveis?data_a_realizar=${dataStr}&hora_inicio=${horaStr}&duracao_minutos=${row?.duracao_min ?? 60}`)
        setSalaPickerCtx({ id, salas: Array.isArray(salas) ? salas.filter(s => s.disponivel) : [] })
        setSelectedSalaPicker('')
      } catch (err) {
        showToast(err.response?.data?.message || err.message || 'Erro ao carregar salas.', 'error')
      } finally {
        setLoadingId(null)
      }
      return
    }
    setLoadingId(id)
    try {
      let result
      if (role === 2) {
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

  const handleConfirmComSala = async () => {
    if (!selectedSalaPicker || !salaPickerCtx) return
    setLoadingId(salaPickerCtx.id)
    try {
      const result = await api.post('/coaching/confirmar-marcacao', { id_marcacao: salaPickerCtx.id, id_sala: Number(selectedSalaPicker) })
      setSalaPickerCtx(null)
      showToast(result?.mensagem || 'Coaching confirmado!', 'success')
      fetchMarcacoes()
    } catch (err) {
      showToast(err.response?.data?.message || err.message || 'Erro ao confirmar.', 'error')
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
    if (aula.id_estado !== 3 || aula.ja_validou) return false
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
    if (filtroModalidade !== 'todas' && a.modalidade !== filtroModalidade) return false
    if (filtro48h) {
      if (!a._data_raw) return false
      const inicio = new Date(a._data_raw)
      const agora = new Date()
      const diffHoras = (inicio - agora) / (1000 * 60 * 60)
      if (diffHoras < 0 || diffHoras > 48) return false

    }

    return true
  })

  const SORT_KEYS = { Modalidade: 'modalidade', Data: '_data_raw', Hora: 'hora_inicio_raw', 'Duração': 'duracao_min', 'Tipo Aula': 'tipo_aula', Sala: 'sala', Estado: 'id_estado' }

  const handleSort = (col) => {
    const key = SORT_KEYS[col]
    if (!key) return
    setSortConfig(prev => ({ key, dir: prev.key === key && prev.dir === 'asc' ? 'desc' : 'asc' }))
  }

  const marcacoesOrdenadas = sortConfig.key
    ? [...marcacoesFiltradas].sort((a, b) => {
        const va = a[sortConfig.key] ?? ''
        const vb = b[sortConfig.key] ?? ''
        const cmp = typeof va === 'number' && typeof vb === 'number'
          ? va - vb
          : String(va).localeCompare(String(vb))
        return sortConfig.dir === 'asc' ? cmp : -cmp
      })
    : marcacoesFiltradas
  
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
            <p className="text-neutral-600 text-sm font-medium tracking-wide mb-1">
              {role === 1 ? 'Gestão de Coachings' : 'Gestão de Presenças'}
            </p>
            <h1 className="text-neutral-800 font-normal text-3xl leading-tight tracking-tight">
                Confirmação de Coachings
            </h1>
          </div>
          <div className="flex items-center gap-3">
            {role === 3 && (
              <button
                onClick={() => setShowNovaMarcacao(true)}
                className="flex items-center gap-2 px-5 py-2.5 bg-brand-800 text-white rounded-xl text-sm font-bold hover:bg-brand-900 transition-colors shadow-sm"
              >
                <Plus size={16} />
                Nova Marcação
              </button>
            )}
            {role === 2 && (
              <button
                onClick={() => setShowNovaDisponibilidade(true)}
                className="flex items-center gap-2 px-5 py-2.5 bg-brand-800 text-white rounded-xl text-sm font-bold hover:bg-brand-900 transition-colors shadow-sm"
              >
                <Plus size={16} />
                Nova Disponibilidade
              </button>
            )}
            {pendentes > 0 && (
              <div className="flex items-center gap-1.5 bg-amber-100 border border-amber-300 text-amber-700 px-3 py-1.5 rounded-full text-sm font-semibold">
                <AlertCircle size={14} />
                {pendentes} pendente{pendentes > 1 ? 's' : ''}
              </div>
            )}
            
            <button onClick={fetchMarcacoes} disabled={loading} title="Atualizar"
              className="w-9 h-9 rounded-full border border-neutral-600/30 flex items-center justify-center hover:bg-neutral-50 transition-colors disabled:opacity-40">
              <RefreshCw size={15} className={`text-neutral-600 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        {/* Filtros */}
        <div className="flex flex-wrap items-center gap-3 mb-6">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-neutral-600">
              Filtrar:
            </div>
            {/* Filtro modalidade */}
            <div className="relative">
              <select
                value={filtroModalidade}
                onChange={e => setFiltroModalidade(e.target.value)}
                className="appearance-none pl-3 pr-8 py-1.5 rounded-lg border border-neutral-600/25 text-xs font-medium text-neutral-800 bg-white focus:outline-none focus:border-brand-800 cursor-pointer"
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
                className="appearance-none pl-3 pr-8 py-1.5 rounded-lg border border-neutral-600/25 text-xs font-medium text-neutral-800 bg-white focus:outline-none focus:border-brand-800 cursor-pointer"
              >
                <option value="todos">Todos os estados</option>
                {Object.entries(STATUS_CFG).map(([id, cfg]) => (
                  <option key={id} value={id}>{cfg.label}</option>
                ))}
              </select>
            </div>
            <button
              onClick={() => setFiltro48h(v => !v)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs font-semibold transition-colors ${
                filtro48h
                  ? 'bg-brand-800 text-white border-brand-800'
                  : 'border-brand-800 text-brand-800 hover:bg-brand-100'
              }`}
            >
              <Clock size={11} />
              Próximas 48h
            </button>
            {(filtroEstado !== 'todos' || filtroModalidade !== 'todas' || filtro48h) && (
              <button
                onClick={() => { setFiltroEstado('todos'); setFiltroModalidade('todas'); setFiltro48h(false) }}
                className="text-xs text-red-500 font-medium hover:text-red-700 flex items-center gap-1"
              >
                <X size={11} /> Limpar filtros
              </button>
            )}
            <span className="ml-auto text-xs text-neutral-600">
              {marcacoesFiltradas.length} aula{marcacoesFiltradas.length !== 1 ? 's' : ''}
            </span>
          </div>

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
                        <span className="font-bold text-neutral-800 text-sm">{aula.modalidade}</span>
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
        <div className="rounded-2xl border border-neutral-600/20 overflow-hidden shadow-sm bg-white">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-neutral-50 border-b-2 border-neutral-600/20">
                {['Modalidade', 'Data', 'Hora', 'Duração', 'Tipo Aula', 'Sala', 'Estado', 'Ação'].map((col, i) => (
                  <th
                    key={col || i}
                    className="px-4 py-3.5 text-left text-xs font-bold text-brand-800 uppercase tracking-wider whitespace-nowrap"
                  >
                    {col && (
                      <span className="flex items-center gap-1">
                        {col}
                        {col && col !== '' && <ArrowUpDown size={10} className="text-brand-800/30" />}
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
                    <BookOpen size={40} className="mx-auto text-brand-800/15 mb-3" />
                    <p className="text-sm text-neutral-600 font-medium">
                      Não existem aulas para o estado selecionado.
                    </p>
                  </td>
                </tr>
              ) : (
                marcacoesOrdenadas.map((row, idx) => {
                  const isLoading = loadingId === row.id
                  const isPendente = row.id_estado === 1 || row.id_estado === 2

                  // Janela de confirmação de presença (role 2 e 3): estado Confirmada + aula já passou + ≤48h
                  const podeConfirmarPresenca = (() => {
                    if (role === 1 || row.id_estado !== 3 || !row._data_raw || row.ja_validou) return false
                    const fim = new Date(row._data_raw)
                    fim.setMinutes(fim.getMinutes() + (row.duracao_min || 60))
                    const diffHoras = (new Date() - fim) / (1000 * 60 * 60)
                    return diffHoras >= 0 && diffHoras <= 48
                  })()
                  const prazoExpiradoTabela = (() => {
                    if (role === 1 || row.id_estado !== 3 || !row._data_raw || row.ja_validou) return false
                    const fim = new Date(row._data_raw)
                    fim.setMinutes(fim.getMinutes() + (row.duracao_min || 60))
                    const diffHoras = (new Date() - fim) / (1000 * 60 * 60)
                    return diffHoras > 48
                  })()
                  return (
                    <tr
                      key={row.id ?? idx}
                      onClick={() => setModalAula(row)}
                      className={`border-b border-neutral-600/10 hover:bg-brand-50 transition-colors cursor-pointer ${idx % 2 === 0 ? '' : 'bg-brand-50'}`}
                    >
                      <td className="px-4 py-4">
                        <div className="flex items-center gap-2">
                          <div className="w-1.5 h-8 rounded-full bg-brand-500 shrink-0" />
                          <span className="font-semibold text-neutral-800">{row.modalidade}</span>
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
                      <td className="px-4 py-4" onClick={e => e.stopPropagation()}>
                        {isLoading ? (
                          <RefreshCw size={18} className="text-brand-800 animate-spin" />
                        ) : role === 1 && isPendente ? (
                          confirmId === row.id ? (
                            <div className="flex items-center gap-1.5">
                              <span className="text-xs text-neutral-500">Confirmar?</span>
                              <button onClick={() => { setConfirmId(null); handleReject(row.id) }}
                                className="w-7 h-7 rounded-lg bg-red-600 flex items-center justify-center hover:bg-red-700 transition-colors">
                                <Check size={12} strokeWidth={3} className="text-white" />
                              </button>
                              <button onClick={() => setConfirmId(null)}
                                className="w-7 h-7 rounded-lg bg-neutral-100 border border-neutral-200 flex items-center justify-center hover:bg-neutral-200 transition-colors">
                                <X size={12} strokeWidth={3} className="text-neutral-600" />
                              </button>
                            </div>
                          ) : (
                            <div className="flex gap-2">
                              <button onClick={() => handleConfirm(row.id)} title="Confirmar"
                                className="w-8 h-8 rounded-full border-2 border-brand-800 text-brand-800 flex items-center justify-center hover:bg-neutral-50 transition-colors active:scale-95">
                                <Check size={13} />
                              </button>
                              <button onClick={() => setConfirmId(row.id)} title="Rejeitar"
                                className="w-8 h-8 rounded-full border-2 border-red-400 text-red-500 flex items-center justify-center hover:bg-red-50 transition-colors active:scale-95">
                                <X size={13} />
                              </button>
                            </div>
                          )
                        ) : (role === 2 || role === 3) && isPendente ? (
                          confirmId === row.id ? (
                            <div className="flex items-center gap-1.5">
                              <span className="text-xs text-neutral-500">Confirmar?</span>
                              <button onClick={() => { setConfirmId(null); handleReject(row.id) }}
                                className="w-7 h-7 rounded-lg bg-red-600 flex items-center justify-center hover:bg-red-700 transition-colors">
                                <Check size={12} strokeWidth={3} className="text-white" />
                              </button>
                              <button onClick={() => setConfirmId(null)}
                                className="w-7 h-7 rounded-lg bg-neutral-100 border border-neutral-200 flex items-center justify-center hover:bg-neutral-200 transition-colors">
                                <X size={12} strokeWidth={3} className="text-neutral-600" />
                              </button>
                            </div>
                          ) : (
                            <button onClick={() => setConfirmId(row.id)}
                              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-100 text-red-700 border border-red-200 text-xs font-bold hover:bg-red-200 transition-colors"
                            >
                              <X size={12} strokeWidth={3} />
                              Cancelar
                            </button>
                          )
                        ) : podeConfirmarPresenca ? (
                          <button
                            onClick={() => handleConfirm(row.id)}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 text-white text-xs font-bold hover:bg-emerald-700 transition-colors"
                          >
                            <Check size={12} strokeWidth={3} />
                            Confirmar presen&ccedil;a
                          </button>
                        ) : row.ja_validou && row.id_estado === 3 ? (
                          <span className="text-xs text-brand-800 font-semibold bg-brand-100 px-2 py-1 rounded-lg">A aguardar a outra parte</span>
                        ) : prazoExpiradoTabela ? (
                          <span className="text-xs text-gray-400 font-medium">Prazo expirado</span>
                        ) : (
                          <span className="text-xs text-gray-300 font-['Sora']">—</span>
                        )}
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
                <p className="text-neutral-600 text-xs font-medium tracking-wide mb-0.5">As tuas janelas de coaching</p>
                <h2 className="text-neutral-800 font-semibold text-xl">Disponibilidades</h2>
              </div>
              <button
                onClick={() => setShowNovaDisponibilidade(true)}
                className="flex items-center gap-2 px-4 py-2 bg-brand-800 text-white rounded-xl text-sm font-bold hover:bg-brand-900 transition-colors shadow-sm"
              >
                <Plus size={15} />
                Nova Disponibilidade
              </button>
            </div>
            <div className="rounded-2xl border border-neutral-600/20 overflow-hidden shadow-sm bg-white">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-neutral-50 border-b-2 border-neutral-600/20">
                    {['Frequência', 'Data / Dia', 'Hora Início', 'Hora Fim', ''].map((col, i) => (
                      <th key={i} className="px-4 py-3.5 text-left text-xs font-bold text-neutral-600 uppercase tracking-wider">{col}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {loadingDisp ? (
                    [...Array(3)].map((_, i) => (
                      <tr key={i} className="animate-pulse border-b border-neutral-600/10">
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
                          className={`border-b border-neutral-600/10 hover:bg-brand-50 transition-colors ${idx % 2 === 0 ? '' : 'bg-brand-50'}`}
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
                            ) : confirmId === `disp_${d.id_disponibilidade}` ? (
                              <div className="flex items-center gap-1.5">
                                <span className="text-xs text-neutral-500">Confirmar?</span>
                                <button onClick={() => { setConfirmId(null); handleDeleteDisponibilidade(d.id_disponibilidade) }}
                                  className="w-7 h-7 rounded-lg bg-red-600 flex items-center justify-center hover:bg-red-700 transition-colors">
                                  <Check size={12} strokeWidth={3} className="text-white" />
                                </button>
                                <button onClick={() => setConfirmId(null)}
                                  className="w-7 h-7 rounded-lg bg-neutral-100 border border-neutral-200 flex items-center justify-center hover:bg-neutral-200 transition-colors">
                                  <X size={12} strokeWidth={3} className="text-neutral-600" />
                                </button>
                              </div>
                            ) : (
                              <button
                                onClick={() => setConfirmId(`disp_${d.id_disponibilidade}`)}
                                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-100 text-red-700 border border-red-200 text-xs font-bold hover:bg-red-200 transition-colors"
                              >
                                <X size={12} strokeWidth={2.5} />
                                Cancelar
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
        <ItemDetailModal
          item={modalAula}
          role={role}
          onClose={() => setModalAula(null)}
          onDelete={(modalAula.id_estado === 1 || modalAula.id_estado === 2) ? () => handleReject(modalAula.id) : undefined}
        />
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

      {salaPickerCtx && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={() => setSalaPickerCtx(null)}>
          <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" />
          <div className="relative bg-white rounded-2xl shadow-xl p-6 w-full max-w-sm font-['Sora']" onClick={e => e.stopPropagation()}>
            <h4 className="font-bold text-brand-800 text-base mb-4">Confirmar Coaching — Selecionar Sala</h4>
            {salaPickerCtx.salas.length === 0 ? (
              <p className="text-sm text-amber-600 mb-4">Sem salas disponíveis neste horário.</p>
            ) : (
              <select
                value={selectedSalaPicker}
                onChange={e => setSelectedSalaPicker(e.target.value)}
                className="w-full border border-neutral-600/25 rounded-xl px-3 py-2 text-sm mb-4 focus:outline-none focus:border-brand-800"
              >
                <option value="">Selecionar sala...</option>
                {salaPickerCtx.salas.map(s => <option key={s.id_sala} value={s.id_sala}>{s.nome}</option>)}
              </select>
            )}
            <div className="flex gap-2">
              <button onClick={() => setSalaPickerCtx(null)} className="flex-1 py-2.5 text-sm border border-neutral-600/25 rounded-xl text-neutral-600 hover:bg-neutral-50 transition-colors">
                Cancelar
              </button>
              <button
                onClick={handleConfirmComSala}
                disabled={!selectedSalaPicker}
                className="flex-1 py-2.5 text-sm bg-brand-800 text-white font-bold rounded-xl hover:bg-brand-900 transition-colors disabled:opacity-50"
              >
                Confirmar
              </button>
            </div>
          </div>
        </div>
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
