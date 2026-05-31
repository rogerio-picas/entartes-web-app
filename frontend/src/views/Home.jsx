import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { authService } from '../services/authService'
import { api } from '../services/api'
import { formatDate, formatTime } from '../utils/dateUtils'
import coachingService from '../services/coachingService'
import { eventService } from '../services/eventService'

import { ClassCard, EventCard as SimpleEventCard } from '../components/Cards'
import EventModal from '../components/EventModal'
import NovoEventoModal from './NovoEventoModal'
import EditSalaModal from '../components/EditSalaModal'
import { ValidacaoModal, HistoricoModal } from '../components/EscolaModais'

import {
  CalendarCheck, CalendarDays, Clock,
  RefreshCw, Check, X, Plus,
  User, Star, Megaphone
} from 'lucide-react'

import {
  StatCard,
  LiveClassCard, CoachingCard, ConfirmedCard, RequisicaoCard, PresencaDocenteCard,
  SalasDoDiaWidget,
  PerfilModal, SectionHeader, ScrollRow, Toast
} from '../components/HomeWidgets'
import ItemDetailModal from '../components/ItemDetailModal'

// ── Presence confirmation card (aluno confirma a SUA presença) ──
function PresencaAlunoCard({ item, onConfirm, onReject, loading }) {
  return (
    <div className="bg-white border border-neutral-600/20 shadow-sm rounded-xl p-5 flex relative min-w-[340px]">
      <div className="flex-1 flex flex-col gap-1.5">
        <p className="text-sm"><span className="text-neutral-500 font-medium">Modalidade: </span>
          <span className="text-neutral-800 font-semibold">{item.modalidade}</span></p>
        <p className="text-sm"><span className="text-neutral-500 font-medium">Data: </span>
          <span className="text-neutral-800 font-semibold">{item.data}</span></p>
        <p className="text-sm"><span className="text-neutral-500 font-medium">Hora início: </span>
          <span className="text-neutral-800 font-semibold">{item.hora}</span></p>
        <p className="text-sm"><span className="text-neutral-500 font-medium">Duração: </span>
          <span className="text-neutral-800 font-semibold">{item.duracao}</span></p>
        <p className="text-sm"><span className="text-neutral-500 font-medium">Docente: </span>
          <span className="text-neutral-800 font-semibold">{item.docente}</span></p>
        <div className="flex items-center gap-1.5 mt-1">
          <Clock size={14} className="text-amber-600" />
          <span className="text-xs font-semibold text-amber-700">{item.tempoRestante || 'Nas próximas 48h'}</span>
        </div>
      </div>
      <div className="flex flex-col items-end justify-end gap-2">
        <div className="flex gap-2">
          <button onClick={() => onReject(item.id)} disabled={loading === item.id}
            className="w-14 h-14 bg-feedback-error border border-feedback-error-dark rounded-full flex items-center justify-center hover:opacity-90 transition-opacity">
            <X size={26} strokeWidth={3} className="text-white" />
          </button>
          <button onClick={() => onConfirm(item.id)} disabled={loading === item.id}
            className="w-14 h-14 bg-feedback-success border border-feedback-success-dark rounded-full flex items-center justify-center hover:opacity-90 transition-opacity">
            <Check size={26} strokeWidth={3} className="text-white" />
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Botão "Ver mais" para as listagens limitadas a 3 cards ──
function ViewMoreCard({ onClick, label = "Ver mais" }) {
  return (
    <button onClick={onClick} className="min-w-[200px] h-auto min-h-[180px] bg-brand-50/50 border-2 border-dashed border-brand-800/30 rounded-xl p-4 flex flex-col items-center justify-center gap-3 hover:bg-brand-200 transition-colors text-brand-800 shrink-0">
      <div className="w-12 h-12 rounded-full bg-brand-800 text-white flex items-center justify-center shadow-sm">
        <Plus size={24} />
      </div>
      <span className="text-sm font-bold text-center">{label}</span>
    </button>
  )
}

export default function Home() {
  const navigate = useNavigate()
  const user = authService.getUser()
  const role = user?.role

  const isAdmin = role === 1
  const isDocente = role === 2
  const isAluno = role === 3

  // Shared UI states
  const [loading, setLoading] = useState(true)
  const [loadingAction, setLoadingAction] = useState(null)
  const [toast, setToast] = useState(null)
  const [selectedEventId, setSelectedEventId] = useState(null)
  const [perfilAluno, setPerfilAluno] = useState(null)
  const [showNovoEvento, setShowNovoEvento] = useState(false)
  const [selectedItem, setSelectedItem] = useState(null)
  const [showPendentesModal, setShowPendentesModal] = useState(false)
  const [showConcluidasModal, setShowConcluidasModal] = useState(false)
  const [showAulasHojeModal, setShowAulasHojeModal] = useState(false)
  const [showEditSala, setShowEditSala] = useState(false)
  const [itemToEditRoom, setItemToEditRoom] = useState(null)

  // Shared Data
  const [eventos, setEventos] = useState([])
  const [aulasConfirmadas, setAulasConfirmadas] = useState([])
  const [salas, setSalas] = useState([])

  // Admin Data
  const [stats, setStats] = useState({ hoje: 0, porValidar: 0, concluidas: 0 })
  const [liveAulas, setLiveAulas] = useState([])
  const [ocupacaoSalas, setOcupacaoSalas] = useState([])

  // Admin/Docente Shared
  const [coachings48h, setCoachings48h] = useState([]) // For Docente: means Requisições
  const [presencasDocente, setPresencasDocente] = useState([]) // For Docente: Aulas concluidas aguardando conf docente

  // Aluno Data
  const [presencasAluno, setPresencasAluno] = useState([]) // Aulas concluidas aguardando conf aluno
  const [inscricoesAluno, setInscricoesAluno] = useState([])

  function showToast(msg, type = 'success') {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 3500)
  }

  const loadData = useCallback(async () => {
    setLoading(true)
    try {
      const now = new Date()

      // Always fetch events
      let evRes;
      if (isAdmin || isDocente) {
        evRes = await eventService.getAll().catch(() => []);
      } else {
        evRes = await eventService.getMyEvents().catch(() => []);
      }
      const evs = (Array.isArray(evRes) ? evRes : []).map(e => ({
        ...e,
        id: e.id_evento,
        _isEvent: true,
        data: formatDate(e.data_de_realizacao),
        hora: formatTime(e.data_de_realizacao),
        duracao: e.duracao_minutos ? `${e.duracao_minutos} min` : '—',
        // Outros campos já existem no objeto
      })).filter(e => {
        if (e.id_evento_estado === 5) return false;
        const eventDate = new Date(e.data_de_realizacao);
        const today = new Date(now);
        eventDate.setHours(0, 0, 0, 0);
        today.setHours(0, 0, 0, 0);
        return eventDate >= today;
      })
      setEventos(evs)

      const normalizeAula = (m) => {
        let dt = m.data ? new Date(m.data) : null;
        if (dt && m.hora_inicio) {
          const hr = new Date(m.hora_inicio);
          dt.setHours(hr.getHours(), hr.getMinutes(), 0, 0);
        }

        let resolvedIdEstado = m.id_estado;
        if (!resolvedIdEstado && m.estado) {
          const estadoStr = m.estado.toLowerCase();
          if (estadoStr.includes('pend') || estadoStr.includes('agend')) resolvedIdEstado = 1;
          else if (estadoStr.includes('valida')) resolvedIdEstado = 2;
          else if (estadoStr.includes('confirm')) resolvedIdEstado = 3;
          else if (estadoStr.includes('conclui') || estadoStr.includes('finaliz')) resolvedIdEstado = 4;
          else if (estadoStr.includes('cancel')) resolvedIdEstado = 5;
        }

        // Extrair nomes se forem objetos
        const modalidadeNome = typeof m.modalidade === 'object' ? m.modalidade.nome : (m.modalidade || '—');
        const docenteNome = typeof m.docente === 'object' ? m.docente.nome : (m.docente || '—');

        return {
          ...m,
          id: m.id_marcacao || m.id,
          _data_raw: dt || m.data,
          data: formatDate(m.data),
          hora: formatTime(m.hora_inicio),
          duracao: m.duracao_minutos ? `${m.duracao_minutos} min` : '—',
          modalidade: modalidadeNome,
          docente: role === 2
            ? (m.alunos?.length > 0 ? m.alunos.map(a => typeof a === 'object' ? a.nome : a).join(', ') : 'A aguardar aluno(s)')
            : docenteNome,
          sala: m.sala_atual || (typeof m.sala === 'object' ? m.sala.nome : (m.sala || '—')),
          tipo: m.numero_alunos_pretendidos > 1 ? 'Grupo' : 'Individual',
          alunos: m.alunos?.map(a => typeof a === 'object' ? a.nome : a) || [],
          ja_validou: m.ja_validou,
          id_estado: resolvedIdEstado,
          estado_nome: m.estado || m.estado_nome || '—',
          _type: 'aula',
        };
      }

      if (isAdmin) {
        const [pendentes, todasRes, ocupacaoSalasRes, salasRes] = await Promise.allSettled([
          coachingService.listarPedidosPendentes({ estados: '1,2' }),
          coachingService.listarPedidosPendentes({ estados: '1,2,3,4,5' }),
          api.get('/relatorio/ocupacao-salas'),
          api.get('/salas'),
        ])
        const rawPendentes = pendentes.status === 'fulfilled' ? (Array.isArray(pendentes.value) ? pendentes.value : (pendentes.value?.data || [])) : []
        const rawTodas = todasRes.status === 'fulfilled' ? (Array.isArray(todasRes.value) ? todasRes.value : (todasRes.value?.data || [])) : []
        const pedPendentes = rawPendentes.map(normalizeAula)
        const todas = rawTodas.map(normalizeAula)
        const ocupacao = ocupacaoSalasRes.status === 'fulfilled' && Array.isArray(ocupacaoSalasRes.value) ? ocupacaoSalasRes.value : []
        const fetchedSalas = salasRes.status === 'fulfilled' ? (Array.isArray(salasRes.value) ? salasRes.value : (salasRes.value?.data || [])) : []
        setSalas(fetchedSalas)

        setOcupacaoSalas(ocupacao)
        const limite48h = new Date(now.getTime() + 48 * 60 * 60 * 1000)
        const pendentes48h = pedPendentes.filter(a => {
          const dataAula = new Date(a._data_raw)
          return dataAula <= limite48h
        })
        setCoachings48h(pendentes48h)

        const hoje = todas.filter(a => new Date(a._data_raw).toDateString() === now.toDateString())
        const confirmadasHoje = hoje.filter(a => a.id_estado === 3)
        const concluidasHoje = hoje.filter(a => a.id_estado === 4)
        setStats({
          hoje: confirmadasHoje.length,
          porValidar: pedPendentes.length,
          concluidas: concluidasHoje.length
        })
        const sortAsc = (a, b) => new Date(a._data_raw) - new Date(b._data_raw);

        setLiveAulas(hoje.filter(a => a.id_estado === 3).sort(sortAsc)) // CONFIRMADA
        setAulasConfirmadas(todas.filter(a => a.id_estado === 3 && new Date(a._data_raw) >= now).sort(sortAsc))

      } else if (isDocente) {
        const res = await coachingService.listarMinhasAulas().catch(() => [])
        const raw = Array.isArray(res) ? res : (res?.data || [])
        const minhasAulas = raw.map(normalizeAula)

        // Docente não vê Pedidos Pendentes de Coaching (a Coordenação trata da confirmação).
        // Vê apenas Confirmadas e Concluídas.
        const sortAsc = (a, b) => new Date(a._data_raw) - new Date(b._data_raw);
        setAulasConfirmadas(minhasAulas.filter(a => {
          const d = new Date(a._data_raw)
          return a.id_estado === 3 && d >= now
        }).sort(sortAsc))

        // Aulas que o docente tem de "concluir" (validar presença pós-aula)
        // Apenas mostramos se for nas últimas 48h após o fim da aula
        setPresencasDocente(
          minhasAulas
            .filter(a => {
              const d = new Date(a._data_raw)
              const duracaoMinutos = Number(a.duracao_minutos) || 0
              const dataFim = new Date(d.getTime() + duracaoMinutos * 60 * 1000)
              const limite48h = new Date(dataFim.getTime() + 48 * 60 * 60 * 1000)
              return a.id_estado === 3 && dataFim <= now && now <= limite48h && !a.ja_validou
            })
            .map(a => {
              const d = new Date(a._data_raw)
              const duracaoMinutos = Number(a.duracao_minutos) || 0
              const dataFim = new Date(d.getTime() + duracaoMinutos * 60 * 1000)
              const limite48h = new Date(dataFim.getTime() + 48 * 60 * 60 * 1000)
              const diffMs = limite48h.getTime() - now.getTime()
              const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
              const diffMins = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60))
              let tempoRestante = 'A expirar nas próximas 48h'
              if (diffMs > 0) {
                if (diffHours > 0) {
                  tempoRestante = `${diffHours}h ${diffMins}m restantes`
                } else {
                  tempoRestante = `${diffMins}m restantes`
                }
              }
              return { ...a, tempoRestante }
            })
        )

      } else if (isAluno) {
        const res = await coachingService.listarMeusPedidos().catch(() => [])
        const raw = Array.isArray(res) ? res : (res?.data || [])
        const meusPedidos = raw.map(normalizeAula)

        // Pendentes e Confirmação
        setInscricoesAluno(meusPedidos.filter(a => a.id_estado === 1 || a.id_estado === 2))

        // Aulas Agendadas Efetivas (CONFIRMADAS no futuro)
        const sortAsc = (a, b) => new Date(a._data_raw) - new Date(b._data_raw);
        setAulasConfirmadas(meusPedidos.filter(a => {
          const d = new Date(a._data_raw)
          return a.id_estado === 3 && d >= now
        }).sort(sortAsc))

        // Aulas dadas, à espera da validação dupla (CONFIRMADAS no passado)
        // Apenas mostramos se for nas últimas 48h após o fim da aula
        setPresencasAluno(
          meusPedidos
            .filter(a => {
              const d = new Date(a._data_raw)
              const duracaoMinutos = Number(a.duracao_minutos) || 0
              const dataFim = new Date(d.getTime() + duracaoMinutos * 60 * 1000)
              const limite48h = new Date(dataFim.getTime() + 48 * 60 * 60 * 1000)
              return a.id_estado === 3 && dataFim <= now && now <= limite48h && !a.ja_validou
            })
            .map(a => {
              const d = new Date(a._data_raw)
              const duracaoMinutos = Number(a.duracao_minutos) || 0
              const dataFim = new Date(d.getTime() + duracaoMinutos * 60 * 1000)
              const limite48h = new Date(dataFim.getTime() + 48 * 60 * 60 * 1000)
              const diffMs = limite48h.getTime() - now.getTime()
              const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
              const diffMins = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60))
              let tempoRestante = 'Nas próximas 48h'
              if (diffMs > 0) {
                if (diffHours > 0) {
                  tempoRestante = `${diffHours}h ${diffMins}m restantes`
                } else {
                  tempoRestante = `${diffMins}m restantes`
                }
              }
              return { ...a, tempoRestante }
            })
        )
      }

    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }, [isAdmin, isDocente, isAluno])

  useEffect(() => { loadData() }, [loadData])

  // ── Actions (Admin) ──
  async function handleConfirmAdminDocente(id_marcacao, id_sala = null) {
    if (!isAdmin) return; // Coachings são confirmados apenas pelo admin
    if (!id_sala) {
      showToast('Tens de escolher uma sala primeiro!', 'error')
      return;
    }
    setLoadingAction(id_marcacao)
    try {
      await api.post('/coaching/confirmar-marcacao', { id_marcacao, id_sala })
      setCoachings48h(prev => prev.filter(a => a.id !== id_marcacao))
      setStats(s => ({ ...s, porValidar: Math.max(0, s.porValidar - 1) }))
      showToast('Coaching confirmado. A sala foi atribuída!', 'success')
      loadData()
    } catch (err) { showToast(err.response?.data?.message || 'Erro ao confirmar.', 'error') }
    finally { setLoadingAction(null) }
  }

  async function handleRejectAdminDocente(id_marcacao) {
    if (!isAdmin) return;
    setLoadingAction(id_marcacao)
    try {
      await api.post('/coaching/rejeitar-marcacao', { id_marcacao, motivo: 'Cancelado via Dashboard' })
      setCoachings48h(prev => prev.filter(a => a.id !== id_marcacao))
      setStats(s => ({ ...s, porValidar: Math.max(0, s.porValidar - 1) }))
      showToast('Coaching rejeitado.', 'success')
    } catch (err) { showToast(err.response?.data?.message || 'Erro ao rejeitar.', 'error') }
    finally { setLoadingAction(null) }
  }

  // ── Actions (Docente) ──
  async function handleConfirmPresencaDocente(id_marcacao) {
    setLoadingAction(id_marcacao)
    try {
      await api.post(`/coaching/docente/conclusao-sessao/${id_marcacao}`)
      setPresencasDocente(prev => prev.filter(a => a.id !== id_marcacao))
      showToast('Sessão validada com sucesso!', 'success')
      loadData()
    } catch (err) { showToast(err.response?.data?.message || 'Erro ao validar a sessão.', 'error') }
    finally { setLoadingAction(null) }
  }

  async function handleRejectDocente(id_marcacao) {
    setLoadingAction(id_marcacao)
    try {
      await api.post(`/coaching/cancelar-marcacao/${id_marcacao}`, { motivo: 'Cancelado via Dashboard (Docente)' })
      setPresencasDocente(prev => prev.filter(a => a.id !== id_marcacao))
      showToast('Presença rejeitada.', 'success')
      loadData()
    } catch (err) { showToast(err.response?.data?.message || 'Erro ao rejeitar.', 'error') }
    finally { setLoadingAction(null) }
  }

  // ── Actions (Aluno) ──
  async function handleConfirmarPresencaAluno(id_marcacao) {
    setLoadingAction(id_marcacao)
    try {
      await api.post(`/coaching/aluno/conclusao-sessao/${id_marcacao}`)
      setPresencasAluno(prev => prev.filter(a => a.id !== id_marcacao))
      showToast('Sessão validada da tua parte!', 'success')
      loadData()
    } catch (err) { showToast(err.response?.data?.message || 'Erro ao validar.', 'error') }
    finally { setLoadingAction(null) }
  }

  async function handleRecusarPresencaAluno(id) {
    setLoadingAction(id)
    try {
      // API aluno para cancelar um pedido
      await api.delete(`/coaching/pedido/${id}/cancelar`)
      setPresencasAluno(prev => prev.filter(a => a.id !== id))
      showToast('Pedido cancelado ou recusado.', 'success')
      loadData()
    } catch (err) { showToast(err.response?.data?.message || 'Erro ao cancelar.', 'error') }
    finally { setLoadingAction(null) }
  }

  // Profile simulation
  function handleVerPerfil(nomeAluno) {
    setPerfilAluno({ nome: nomeAluno, apelido: '', email: '—', telemovel: '—', codigo_username: '—' })
  }

  const handleCancelItem = async (item) => {
    try {
      const id = item.id || item.id_marcacao;
      if (item._type === 'evento' || item.id_evento) {
        await eventService.delete(item.id_evento || id)
      } else {
        if (isAdmin) {
          if (item.id_estado === 3) {
            await coachingService.cancelarMarcacaoConfirmada(id, 'Cancelado via Dashboard')
          } else {
            await coachingService.rejeitarMarcacao(id, 'Cancelado via Dashboard')
          }
        } else if (isDocente) {
          await coachingService.cancelarMarcacaoDocente(id, 'Cancelado via Dashboard')
        } else if (isAluno) {
          await coachingService.cancelarPedidoPendente(id)
        }
      }
      setSelectedItem(null)
      showToast('Cancelado com sucesso!', 'success')
      loadData()
    } catch (err) {
      showToast(err.response?.data?.message || err.message || 'Erro ao cancelar.', 'error')
    }
  }

  if (loading) return (
    <div className="flex items-center justify-center py-24 text-brand-800">
      <RefreshCw size={32} className="animate-spin" />
    </div>
  )

  return (
    <>
      <div className="font-['Sora'] space-y-10">

        {/* Header Conditional Render */}
        {isDocente && (
          <div className="mb-2">
            <p className="text-neutral-600 text-sm font-medium tracking-wide mb-1">Painel Docente</p>
            <h1 className="text-neutral-800 font-normal text-3xl leading-tight tracking-tight">
              O teu <span className="text-brand-800 font-semibold">Resumo</span>
            </h1>
          </div>
        )}

        {/* ── ADMIN: Stats Row + Charts + Buttons ──────────────── */}
        {isAdmin && (
          <div className="flex flex-col gap-4">
            <div className="flex flex-wrap gap-4 items-start justify-between">
              <div className="flex flex-wrap gap-3">
                <StatCard
                  count={stats.hoje}
                  label="aulas hoje"
                  color="text-brand-800"
                  bg="bg-brand-50"
                  border="border-brand-500"
                  onClick={() => setShowAulasHojeModal(true)}
                />
                <StatCard
                  count={stats.porValidar}
                  label="por validar"
                  color="text-feedback-pendente-textPendente"
                  bg="bg-feedback-pendente-pendenteLight"
                  onClick={() => setShowPendentesModal(true)}
                />
                <StatCard
                  count={stats.concluidas}
                  label="concluídas"
                  color="text-neutral-800"
                  bg="bg-brand-200"
                  onClick={() => setShowConcluidasModal(true)}
                />
              </div>
            </div>
            <div className="flex gap-4 flex-wrap flex-1">
              <div className="border border-brand-800 rounded-xl p-4 bg-white flex-1 min-w-[300px] max-w-full overflow-hidden">
                <p className="text-xs font-bold text-brand-800 mb-3">Ocupação de salas</p>
                <SalasDoDiaWidget onItemClick={setSelectedItem} />
              </div>
            </div>
          </div>
        )}

        {/* ── ADMIN/DOCENTE: pending requests 48h ──────────────── */}
        {(isAdmin || isDocente) && (
          <section>
            <SectionHeader icon={Clock} title={isAdmin ? "Coachings a validar a expirar em 48h" : "Coachings pendentes a expirar em 48h"} action="Ver todas" onAction={() => navigate('/aulas', { state: { filtro48h: true } })} />
            {coachings48h.length === 0 ? (
              <p className="text-sm text-neutral-600 italic">Sem coachings pendentes nas próximas 48h.</p>
            ) : (
              <ScrollRow>
                {coachings48h.slice(0, 3).map(a => (
                  isAdmin
                    ? <CoachingCard key={a.id} aula={a} onConfirm={handleConfirmAdminDocente} onReject={handleRejectAdminDocente} loading={loadingAction} />
                    : <RequisicaoCard key={a.id} item={a} onAccept={handleConfirmAdminDocente} onReject={handleRejectAdminDocente} loading={loadingAction} onVerPerfil={handleVerPerfil} />
                ))}
              </ScrollRow>
            )}
          </section>
        )}

        {/* ── DOCENTE: Presenças a confirmar ──────────────── */}
        {isDocente && (
          <section>
            <SectionHeader icon={CalendarCheck} title="Presenças a confirmar (48h)" action="Ver todas" onAction={() => navigate('/aulas')} />
            {presencasDocente.length === 0 ? (
              <p className="text-sm text-gray-400 italic">Sem presenças a confirmar.</p>
            ) : (
              <ScrollRow>
                {presencasDocente.slice(0, 3).map(item => (
                  <PresencaDocenteCard key={item.id} item={item} onConfirm={handleConfirmPresencaDocente} onReject={handleRejectDocente} loading={loadingAction} />
                ))}
              </ScrollRow>
            )}
          </section>
        )}

        {/* ── ALUNO: Presenças a confirmar ──────────────── */}
        {isAluno && presencasAluno.length > 0 && (
          <section>
            <SectionHeader icon={Clock} title="Presenças por confirmar" />
            <ScrollRow>
              {presencasAluno.slice(0, 3).map(item => (
                <PresencaAlunoCard key={item.id} item={item} onConfirm={handleConfirmarPresencaAluno} onReject={handleRecusarPresencaAluno} loading={loadingAction} />
              ))}
            </ScrollRow>
          </section>
        )}

        {/* ── ALUNO/DOCENTE: Aulas confirmadas using ClassCard, ADMIN: ConfirmedCard ──────────────── */}
        <section>
          <SectionHeader icon={CalendarCheck} title={isAluno ? "Os meus coachings" : "Próximos coachings confirmados"} action="Ver todas" onAction={() => navigate('/aulas', { state: { filtroEstado: '3' } })} />
          {aulasConfirmadas.length === 0 ? (
            <p className="text-sm text-neutral-600 italic">Sem coachings confirmados.</p>
          ) : (
            <ScrollRow>
              {aulasConfirmadas.slice(0, 3).map(a => (
                (isAdmin || isDocente)
                  ? <ConfirmedCard key={a.id} aula={a} onOpen={() => setSelectedItem(a)} role={role} />
                  : <ClassCard key={a.id} item={a} statusType="confirmada" onOpen={() => setSelectedItem(a)} />
              ))}
            </ScrollRow>
          )}
        </section>

        {/* ── ALUNO: Inscrições pendentes ──────────────── */}
        {isAluno && inscricoesAluno.length > 0 && (
          <section>
            <SectionHeader icon={CalendarCheck} title="Inscrições pendentes" action="Ver todas" onAction={() => navigate('/aulas')} />
            <ScrollRow>
              {inscricoesAluno.slice(0, 3).map((item, idx) => (
                <ClassCard key={item.id || idx} item={item} statusType="pendente" onOpen={() => setSelectedItem(item)} />
              ))}
            </ScrollRow>
          </section>
        )}

        {/* ── SHARED: Próximos eventos ──────────────── */}
        <section>
          <SectionHeader
            icon={isAdmin || isDocente ? CalendarDays : Megaphone}
            title={isAdmin || isDocente ? "Próximos eventos" : "Os meus eventos"}
            action="Ver todos"
            onAction={() => navigate('/eventos')}
          />
          {eventos.length === 0 ? (
            <p className="text-sm text-neutral-600 italic">Sem eventos agendados.</p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {eventos.slice(0, 3).map(item => (
                <SimpleEventCard key={item.id_evento} event={item} onOpen={() => setSelectedItem(item)} />
              ))}
            </div>
          )}
        </section>

      </div>

      {showNovoEvento && (
        <NovoEventoModal
          onClose={() => setShowNovoEvento(false)}
          onSuccess={(nome) => {
            setShowNovoEvento(false)
            showToast(`Evento "${nome}" criado com sucesso!`)
            loadData()
          }}
        />
      )}

      {selectedEventId && (
        <EventModal eventId={selectedEventId} onClose={() => setSelectedEventId(null)} />
      )}

      {perfilAluno && (
        <PerfilModal aluno={perfilAluno} onClose={() => setPerfilAluno(null)} />
      )}

      {selectedItem && (
        <ItemDetailModal
          item={selectedItem}
          role={role}
          onClose={() => setSelectedItem(null)}
          onDelete={
            (selectedItem.id_estado === 1 || selectedItem.id_estado === 2 || (isAdmin && selectedItem.id_estado === 3))
              ? () => handleCancelItem(selectedItem)
              : undefined
          }
          onChangeRoom={(isAdmin && !selectedItem.id_evento && !selectedItem._isEvent && selectedItem._type !== 'evento') ? (item) => {
            setItemToEditRoom(item);
            setShowEditSala(true);
          } : undefined}
          onNavigate={(item) => {
            if (item.id_evento || item._isEvent || item._type === 'evento') {
              navigate(`/eventos/${item.id}`);
            } else {
              navigate('/aulas');
            }
          }}
        />
      )}

      {showEditSala && itemToEditRoom && (
        <EditSalaModal
          item={itemToEditRoom}
          salas={salas}
          onClose={() => {
            setShowEditSala(false);
            setItemToEditRoom(null);
          }}
          onSuccess={() => {
            setShowEditSala(false);
            setItemToEditRoom(null);
            showToast('Sala alterada com sucesso!', 'success');
            loadData();
          }}
        />
      )}

      {toast && <Toast {...toast} onClose={() => setToast(null)} />}

      {showPendentesModal && (
        <ValidacaoModal onClose={() => setShowPendentesModal(false)} />
      )}

      {showConcluidasModal && (
        <HistoricoModal initialFiltro="4" onlyToday onClose={() => setShowConcluidasModal(false)} />
      )}

      {showAulasHojeModal && (
        <HistoricoModal initialFiltro="3" onlyToday onClose={() => setShowAulasHojeModal(false)} />
      )}
    </>
  )
}
