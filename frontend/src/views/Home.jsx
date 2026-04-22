import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { authService } from '../services/authService'
import { api } from '../services/api'
import { aulasService, mapMarcacao } from '../services/aulasService'
import { eventService } from '../services/eventService'

import { ClassCard, EventCard as SimpleEventCard } from '../components/Cards'
import EventModal from '../components/EventModal'
import NovoEventoModal from './NovoEventoModal'

import {
  CalendarCheck, CalendarDays, Clock, CheckCircle2, XCircle,
  AlertCircle, RefreshCw, Check, X, Plus, ChevronRight,
  Users, MapPin, Music, User, TrendingUp, Star, Megaphone
} from 'lucide-react'

// Widgets Extracted
import {
  StatCard, ModalityChart, CoachingHoursChart, EnrollmentChart,
  LiveClassCard, CoachingCard, ConfirmedCard, RequisicaoCard, PresencaDocenteCard,
  PerfilModal, SectionHeader, ScrollRow, Toast, formatDate, formatTime, formatDuration, timeRemaining
} from '../components/HomeWidgets'

// ── Presence confirmation card (aluno confirma a SUA presença) ──
function PresencaAlunoCard({ item, onConfirm, onReject, loading }) {
  return (
    <div className="bg-brand-bg border border-brand-dark rounded-xl p-4 flex relative min-w-[340px]">
      <div className="flex-1 flex flex-col gap-1.5">
        <p className="text-sm"><span className="text-brand-darkest font-medium">Modalidade: </span>
          <span className="text-brand-dark">{item.modalidade}</span></p>
        <p className="text-sm"><span className="text-brand-darkest font-medium">Data: </span>
          <span className="text-brand-dark">{item.data}</span></p>
        <p className="text-sm"><span className="text-brand-darkest font-medium">Hora início: </span>
          <span className="text-brand-dark">{item.hora}</span></p>
        <p className="text-sm"><span className="text-brand-darkest font-medium">Duração: </span>
          <span className="text-brand-dark">{item.duracao}</span></p>
        <p className="text-sm"><span className="text-brand-darkest font-medium">Docente: </span>
          <span className="text-brand-dark">{item.docente}</span></p>
        <div className="flex items-center gap-1.5 mt-1">
          <Clock size={13} className="text-brand-dark" />
          <span className="text-xs font-semibold text-black">{item.tempoRestante || 'Nas próximas 48h'}</span>
        </div>
      </div>
      <div className="flex flex-col items-end justify-end gap-2">
        <div className="flex gap-2">
          <button onClick={() => onReject(item.id)} disabled={loading === item.id}
            className="w-12 h-12 bg-[#BA1A1A] border border-[#93000A] rounded-xl flex items-center justify-center hover:opacity-90">
            <X size={22} strokeWidth={3} className="text-white" />
          </button>
          <button onClick={() => onConfirm(item.id)} disabled={loading === item.id}
            className="w-12 h-12 bg-[#049A59] border border-brand-dark rounded-xl flex items-center justify-center hover:opacity-90">
            <Check size={22} strokeWidth={3} className="text-white" />
          </button>
        </div>
      </div>
    </div>
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

  // Shared Data
  const [eventos, setEventos] = useState([])
  const [aulasConfirmadas, setAulasConfirmadas] = useState([])

  // Admin Data
  const [stats, setStats] = useState({ hoje: 0, porValidar: 0, concluidas: 0 })
  const [liveAulas, setLiveAulas] = useState([])
  const [horasData, setHorasData] = useState([])
  const [alunosData, setAlunosData] = useState([])

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
      const in48h = new Date(now.getTime() + 48 * 3600000)

      // Always fetch events
      const evRes = await eventService.getAll().catch(() => [])
      const evs = Array.isArray(evRes) ? evRes : []
      setEventos(evs.slice(0, 3))

      if (isAdmin || isDocente) {
        const [todasRes, horasRes, alunosRes] = await Promise.allSettled([
          aulasService.getTodas(),
          isAdmin ? api.get('/relatorio/horas-docente') : Promise.resolve([]),
          isAdmin ? api.get('/relatorio/alunos') : Promise.resolve([]),
        ])

        const todas = todasRes.status === 'fulfilled' ? todasRes.value : []

        if (isAdmin) {
          const horas = horasRes.status === 'fulfilled' && Array.isArray(horasRes.value) ? horasRes.value : []
          const alunos = alunosRes.status === 'fulfilled' && Array.isArray(alunosRes.value) ? alunosRes.value : []
          setHorasData(horas)
          setAlunosData(alunos)

          const hoje = todas.filter(a => new Date(a._data_raw).toDateString() === now.toDateString())
          setStats({
              hoje: hoje.length,
              porValidar: todas.filter(a => a.id_estado === 1).length,
              concluidas: todas.filter(a => a.id_estado === 4).length
          })
          setLiveAulas(hoje.filter(a => a.id_estado === 2).slice(0, 3))
        }

        // Shared logic for Admin & Docente: id_estado === 1 in 48h
        setCoachings48h(todas.filter(a => {
            const d = new Date(a._data_raw)
            return a.id_estado === 1 && d >= now && d <= in48h
        }).slice(0, 3)) // Docentes see requisicoes, Admins see "Coachings a validar"

        if (isDocente) {
          setPresencasDocente(todas.filter(a => {
            const d = new Date(a._data_raw)
            return a.id_estado === 4 && d >= new Date(now - 48*3600000)
          }))
        }

        setAulasConfirmadas(todas.filter(a => {
            const d = new Date(a._data_raw)
            return a.id_estado === 2 && d >= now
        }).slice(0, 3))

      } else if (isAluno) {
        // Aluno fetch logic
        const aulasRes = await api.get('/horario/minhas-aulas').catch(() => [])
        const objArray = Array.isArray(aulasRes?.data) ? aulasRes.data : Array.isArray(aulasRes) ? aulasRes : []
        const minhas = objArray.map(mapMarcacao)

        setPresencasAluno(minhas.filter(a => a.id_estado === 4))
        setAulasConfirmadas(minhas.filter(a => a.id_estado === 2))
        setInscricoesAluno(minhas.filter(a => a.id_estado === 1))
      }

    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }, [isAdmin, isDocente, isAluno])

  useEffect(() => { loadData() }, [loadData])


  // Actions (Admin & Docente)
  async function handleConfirmAdminDocente(id, id_sala = null) {
    setLoadingAction(id)
    try {
      await aulasService.updateEstado(id, 2)
      if (isAdmin && id_sala) {
        await api.patch(`/aulas/${id}/sala`, { id_sala }).catch(() => {})
      }
      setCoachings48h(prev => prev.filter(a => a.id !== id))
      if (isAdmin) setStats(s => ({ ...s, porValidar: Math.max(0, s.porValidar - 1) }))
      showToast(isAdmin ? 'Coaching confirmado!' : 'Requisição aceite com sucesso!')
    } catch { showToast('Erro na ação.', 'error') }
    finally { setLoadingAction(null) }
  }

  async function handleRejectAdminDocente(id) {
    setLoadingAction(id)
    try {
      await aulasService.updateEstado(id, 3) 
      setCoachings48h(prev => prev.filter(a => a.id !== id))
      if (isAdmin) setStats(s => ({ ...s, porValidar: Math.max(0, s.porValidar - 1) }))
      showToast('Cancelado com sucesso.', 'success')
    } catch { showToast('Erro na ação.', 'error') }
    finally { setLoadingAction(null) }
  }

  async function handleConfirmPresencaDocente(id) {
    setLoadingAction(id)
    try {
      await aulasService.updateEstado(id, 4)
      setPresencasDocente(prev => prev.filter(a => a.id !== id))
    } catch(e) { showToast('Erro ao validar.', 'error') }
    finally { setLoadingAction(null) }
  }


  // Actions (Aluno)
  async function handleConfirmarPresencaAluno(id) {
    setLoadingAction(id)
    try {
      await api.patch(`/aulas/${id}/estado`, { novoEstadoId: 5 })
      setPresencasAluno(prev => prev.filter(a => a.id !== id))
      showToast('Presença confirmada!', 'success')
    } catch (err) { showToast('Erro ao confirmar.', 'error') }
    finally { setLoadingAction(null) }
  }

  async function handleRecusarPresencaAluno(id) {
    setLoadingAction(id)
    try {
      await api.patch(`/aulas/${id}/estado`, { novoEstadoId: 6 }) // Ex: "Marcou falta"
      setPresencasAluno(prev => prev.filter(a => a.id !== id))
      showToast('Falta marcada.', 'success')
    } catch (err) { showToast('Erro ao rejeitar.', 'error') }
    finally { setLoadingAction(null) }
  }

  // Profile simulation
  function handleVerPerfil(nomeAluno) {
    setPerfilAluno({ nome: nomeAluno, apelido: '', email: '—', telemovel: '—', codigo_username: '—' })
  }

  if (loading) return (
    <div className="flex items-center justify-center py-24 text-[#006A68]">
        <RefreshCw size={32} className="animate-spin" />
    </div>
  )

  return (
    <>
      <div className="font-['Sora'] space-y-10">

        {/* Header Conditional Render */}
        {isDocente && (
          <div className="mb-2">
            <p className="text-[#4A6362] text-sm font-medium tracking-wide mb-1">Painel Docente</p>
            <h1 className="text-[#324B4A] font-normal text-4xl leading-tight tracking-tight">
              O teu <span className="text-[#006A68] font-semibold">Resumo</span>
            </h1>
          </div>
        )}

        {/* ── ADMIN: Stats Row + Charts + Buttons ──────────────── */}
        {isAdmin && (
          <div className="flex flex-wrap gap-4 items-start">
            <div className="flex flex-wrap gap-3">
                <StatCard count={stats.hoje} label="aulas hoje" color="text-[#324B4A]" bg="bg-[#CCE8E6]" border="border-[#006A68]" />
                <StatCard count={stats.porValidar} label="por validar" color="text-[#324863]" bg="bg-[#D2E4FF]" border="border-[#324863]" />
                <StatCard count={stats.concluidas} label="concluída" color="text-[#93000A]" bg="bg-[#FFDAD6]" border="border-[#93000A]" />
            </div>

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

            <div className="flex flex-col gap-2 shrink-0">
                <button onClick={() => navigate('/aulas')}
                    className="px-4 py-2.5 border border-[#006A68] text-[#006A68] text-sm font-semibold rounded-xl hover:bg-[#EFF5F4] transition-colors whitespace-nowrap">
                    Consultar Coachings
                </button>
                <button onClick={() => setShowNovoEvento(true)}
                    className="flex items-center gap-2 px-4 py-2.5 bg-[#006A68] text-white text-sm font-semibold rounded-xl hover:bg-[#00504E] transition-colors">
                    <Plus size={16} /> Novo evento
                </button>
            </div>
          </div>
        )}

        {/* ── ADMIN: Live Aulas ──────────────── */}
        {isAdmin && liveAulas.length > 0 && (
          <section>
              <SectionHeader icon={Star} title="Aulas a decorrer" action="Ver todas" onAction={() => navigate('/aulas')} />
              <ScrollRow>
                  {liveAulas.map((a, i) => <LiveClassCard key={a.id} aula={a} idx={i} />)}
              </ScrollRow>
          </section>
        )}

        {/* ── ADMIN/DOCENTE: pending requests 48h ──────────────── */}
        {(isAdmin || isDocente) && (
          <section>
            <SectionHeader icon={Clock} title={isAdmin ? "Coachings a validar a expirar em 48h" : "Requisições a expirar em 48h"} />
            {coachings48h.length === 0 ? (
                <p className="text-sm text-[#4A6362] italic">Sem pendentes nas próximas 48h.</p>
            ) : (
                <ScrollRow>
                    {coachings48h.map(a => (
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
            <SectionHeader icon={CalendarCheck} title="Presenças a confirmar (48h)" />
            {presencasDocente.length === 0 ? (
                <p className="text-sm text-gray-400 italic">Sem presenças a confirmar.</p>
            ) : (
                <ScrollRow>
                    {presencasDocente.map(item => (
                        <PresencaDocenteCard key={item.id} item={item} onConfirm={handleConfirmPresencaDocente} onReject={handleRejectAdminDocente} loading={loadingAction} />
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
              {presencasAluno.map(item => (
                <PresencaAlunoCard key={item.id} item={item} onConfirm={handleConfirmarPresencaAluno} onReject={handleRecusarPresencaAluno} loading={loadingAction} />
              ))}
            </ScrollRow>
          </section>
        )}

        {/* ── ALUNO/DOCENTE: Aulas confirmadas using ClassCard, ADMIN: ConfirmedCard ──────────────── */}
        <section>
            <SectionHeader icon={CalendarCheck} title={isAluno ? "As minhas aulas" : "Próximas aulas confirmadas"} action={isAdmin ? "Ver todas" : null} onAction={isAdmin ? () => navigate('/aulas') : null} />
            {aulasConfirmadas.length === 0 ? (
                <p className="text-sm text-[#4A6362] italic">Sem aulas confirmadas agendadas.</p>
            ) : (
                <ScrollRow>
                    {aulasConfirmadas.map(a => (
                        isAdmin 
                        ? <ConfirmedCard key={a.id} aula={a} />
                        : <ClassCard key={a.id} item={a} statusType="confirmada" />
                    ))}
                </ScrollRow>
            )}
        </section>

        {/* ── ALUNO: Inscrições pendentes ──────────────── */}
        {isAluno && inscricoesAluno.length > 0 && (
          <section>
            <SectionHeader icon={CalendarCheck} title="Inscrições pendentes" />
            <ScrollRow>
              {inscricoesAluno.map((item, idx) => (
                <ClassCard key={item.id || idx} item={item} statusType="pendente" />
              ))}
            </ScrollRow>
          </section>
        )}

        {/* ── SHARED: Próximos eventos ──────────────── */}
        <section>
            <SectionHeader
                icon={isAdmin ? CalendarDays : Megaphone}
                title={isAluno ? "Descobrir eventos" : "Próximos eventos"}
                action={isAdmin ? "Ver todos" : null}
                onAction={isAdmin ? () => navigate('/events') : null}
            />
            {eventos.length === 0 ? (
                <p className="text-sm text-[#4A6362] italic">Sem eventos agendados.</p>
            ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                    {eventos.map(item => (
                      <SimpleEventCard key={item.id_evento} event={item} onOpen={() => setSelectedEventId(item.id_evento)} />
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
                  eventService.getAll().then(d => setEventos(Array.isArray(d) ? d.slice(0, 3) : []))
              }}
          />
      )}

      {selectedEventId && (
        <EventModal eventId={selectedEventId} onClose={() => setSelectedEventId(null)} />
      )}

      {perfilAluno && (
        <PerfilModal aluno={perfilAluno} onClose={() => setPerfilAluno(null)} />
      )}

      {toast && <Toast {...toast} onClose={() => setToast(null)} />}
    </>
  )
}