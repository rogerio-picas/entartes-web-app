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

import {
  CalendarCheck, CalendarDays, Clock,
  RefreshCw, Check, X, Plus,
  User, Star, Megaphone
} from 'lucide-react'

import {
  StatCard,
  LiveClassCard, CoachingCard, ConfirmedCard, RequisicaoCard, PresencaDocenteCard,
  RoomOccupancyWidget,
  PerfilModal, SectionHeader, ScrollRow, Toast
} from '../components/HomeWidgets'
import ItemDetailModal from '../components/ItemDetailModal'

// ── Presence confirmation card (aluno confirma a SUA presença) ──
function PresencaAlunoCard({ item, onConfirm, onReject, loading }) {
  return (
    <div className="bg-brand-50 border border-brand-800 rounded-xl p-4 flex relative min-w-[340px]">
      <div className="flex-1 flex flex-col gap-1.5">
        <p className="text-sm"><span className="text-brand-900 font-medium">Modalidade: </span>
          <span className="text-brand-800">{item.modalidade}</span></p>
        <p className="text-sm"><span className="text-brand-900 font-medium">Data: </span>
          <span className="text-brand-800">{item.data}</span></p>
        <p className="text-sm"><span className="text-brand-900 font-medium">Hora início: </span>
          <span className="text-brand-800">{item.hora}</span></p>
        <p className="text-sm"><span className="text-brand-900 font-medium">Duração: </span>
          <span className="text-brand-800">{item.duracao}</span></p>
        <p className="text-sm"><span className="text-brand-900 font-medium">Docente: </span>
          <span className="text-brand-800">{item.docente}</span></p>
        <div className="flex items-center gap-1.5 mt-1">
          <Clock size={15} className="text-brand-800" />
          <span className="text-xs font-semibold text-black">{item.tempoRestante || 'Nas próximas 48h'}</span>
        </div>
      </div>
      <div className="flex flex-col items-end justify-end gap-2">
        <div className="flex gap-2">
          <button onClick={() => onReject(item.id)} disabled={loading === item.id}
            className="w-12 h-12 bg-feedback-error border border-feedback-error-dark rounded-xl flex items-center justify-center hover:opacity-90">
            <X size={22} strokeWidth={3} className="text-white" />
          </button>
          <button onClick={() => onConfirm(item.id)} disabled={loading === item.id}
            className="w-12 h-12 bg-feedback-success border border-brand-800 rounded-xl flex items-center justify-center hover:opacity-90">
            <Check size={22} strokeWidth={3} className="text-white" />
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

  // Shared Data
  const [eventos, setEventos] = useState([])
  const [aulasConfirmadas, setAulasConfirmadas] = useState([])

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
      })).filter(e => e.id_evento_estado !== 5)
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
        const [pendentes, todasRes, ocupacaoSalasRes] = await Promise.allSettled([
          coachingService.listarPedidosPendentes({ estados: '1,2' }),
          coachingService.listarPedidosPendentes({ estados: '1,2,3,4,5' }),
          api.get('/relatorio/ocupacao-salas'),
        ])
        const rawPendentes = pendentes.status === 'fulfilled' ? (Array.isArray(pendentes.value) ? pendentes.value : (pendentes.value?.data || [])) : []
        const rawTodas = todasRes.status === 'fulfilled' ? (Array.isArray(todasRes.value) ? todasRes.value : (todasRes.value?.data || [])) : []
        const pedPendentes = rawPendentes.map(normalizeAula)
        const todas = rawTodas.map(normalizeAula)
        const ocupacao = ocupacaoSalasRes.status === 'fulfilled' && Array.isArray(ocupacaoSalasRes.value) ? ocupacaoSalasRes.value : []

        setOcupacaoSalas(ocupacao)
        const limite48h = new Date(now.getTime() + 48 * 60 * 60 * 1000)
        const pendentes48h = pedPendentes.filter(a => {
          const dataAula = new Date(a._data_raw)
          return dataAula <= limite48h
        })
        setCoachings48h(pendentes48h)

        const hoje = todas.filter(a => new Date(a._data_raw).toDateString() === now.toDateString())
        setStats({
          hoje: hoje.length,
          porValidar: pedPendentes.length,
          concluidas: todas.filter(a => a.id_estado === 4).length
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
        // Só marcacoes CONFIRMADA mas no passado (aulas dadas recentement). Ou seja, < now
        setPresencasDocente(minhasAulas.filter(a => {
          const d = new Date(a._data_raw)
          return a.id_estado === 3 && d < now
        }))

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
        setPresencasAluno(meusPedidos.filter(a => {
          const d = new Date(a._data_raw)
          return a.id_estado === 3 && d < now
        }))
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
            <h1 className="text-neutral-800 font-normal text-4xl leading-tight tracking-tight">
              O teu <span className="text-brand-800 font-semibold">Resumo</span>
            </h1>
          </div>
        )}

        {/* ── ADMIN: Stats Row + Charts + Buttons ──────────────── */}
        {isAdmin && (
          <div className="flex flex-wrap gap-4 items-start justify-between">
            <div className="flex flex-wrap gap-3">
              <StatCard count={stats.hoje} label="aulas hoje" color="text-neutral-800" bg="bg-brand-200" border="border-brand-800" />
              <StatCard count={stats.porValidar} label="por validar" color="text-feedback-info" bg="bg-feedback-info-light" border="border-feedback-info" />
              <StatCard count={stats.concluidas} label="concluída" color="text-feedback-error-dark" bg="bg-feedback-error-light" border="border-feedback-error-dark" />
            </div>
            <div className="flex flex-col gap-2 shrink-0">
              <button onClick={() => navigate('/aulas')}
                className="px-4 py-2.5 border border-brand-800 text-brand-800 text-sm font-semibold rounded-xl hover:bg-neutral-50 transition-colors whitespace-nowrap">
                Consultar Coachings
              </button>
              <button onClick={() => setShowNovoEvento(true)}
                className="flex items-center gap-2 px-4 py-2.5 bg-brand-800 text-white text-sm font-semibold rounded-xl hover:bg-brand-900 transition-colors">
                <Plus size={16} /> Novo evento
              </button>
            </div>
          </div>
        )}

        {isAdmin && (
          <div className="flex gap-4 flex-wrap flex-1">
            <div className="border border-brand-800 rounded-xl p-4 bg-white flex-1 min-w-[300px]">
              <p className="text-xs font-bold text-brand-800 mb-3">Ocupação de Salas (Hoje)</p>
              <RoomOccupancyWidget data={ocupacaoSalas} />
            </div>
          </div>
        )}

        {/* ── ADMIN/DOCENTE: pending requests 48h ──────────────── */}
        {(isAdmin || isDocente) && (
          <section>
            <SectionHeader icon={Clock} title={isAdmin ? "Coachings a validar a expirar em 48h" : "Coachings pendentes a expirar em 48h"} action="Ver todas" onAction={() => navigate('/coaching')} />
            {coachings48h.length === 0 ? (
              <p className="text-sm text-neutral-600 italic">Sem coachings pendentes nas próximas 48h.</p>
            ) : (
              <ScrollRow>
                {coachings48h.slice(0, 3).map(a => (
                  isAdmin
                    ? <CoachingCard key={a.id} aula={a} onConfirm={handleConfirmAdminDocente} onReject={handleRejectAdminDocente} loading={loadingAction} />
                    : <RequisicaoCard key={a.id} item={a} onAccept={handleConfirmAdminDocente} onReject={handleRejectAdminDocente} loading={loadingAction} onVerPerfil={handleVerPerfil} />
                ))}
                {coachings48h.length > 3 && <ViewMoreCard onClick={() => navigate('/aulas')} label="Ver mais pendentes" />}
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
                  <PresencaDocenteCard key={item.id} item={item} onConfirm={handleConfirmPresencaDocente} onReject={handleRejectAdminDocente} loading={loadingAction} />
                ))}
                {presencasDocente.length > 3 && <ViewMoreCard onClick={() => navigate('/aulas')} label="Ver mais presenças" />}
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
              {presencasAluno.length > 3 && <ViewMoreCard onClick={() => navigate('/aulas')} label="Ver mais presenças" />}
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
              {aulasConfirmadas.length > 3 && <ViewMoreCard onClick={() => navigate('/aulas', { state: { filtroEstado: '3' } })} label="Ver mais coachings" />}            </ScrollRow>
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
              {inscricoesAluno.length > 3 && <ViewMoreCard onClick={() => navigate('/aulas')} label="Ver mais inscrições" />}
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
              {eventos.length > 3 && <ViewMoreCard onClick={() => navigate('/eventos')} label="Ver todos os eventos" />}
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
            if (isAdmin || isDocente) {
              eventService.getAll().then(d => setEventos(Array.isArray(d) ? d.slice(0, 3) : []))
            } else {
              eventService.getMyEvents().then(d => setEventos(Array.isArray(d) ? d.slice(0, 3) : []))
            }
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
          onNavigate={(item) => {
            if (item.id_evento || item._isEvent || item._type === 'evento') {
              navigate(`/eventos/${item.id}`);
            } else {
              navigate('/aulas');
            }
          }}
        />
      )}

      {toast && <Toast {...toast} onClose={() => setToast(null)} />}
    </>
  )
}
