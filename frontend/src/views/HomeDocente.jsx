import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Clock, CalendarCheck, Megaphone, Loader2, Check, X,
  User, ChevronRight, AlertCircle, RefreshCw
} from 'lucide-react'
import { ClassCard, EventCard, DashboardSection } from '../components/Cards'
import EventModal from '../views/NovoEventoModal'
import { aulasService } from '../services/aulasService'
import { eventService } from '../services/eventService'
import { api } from '../services/api'

// ── Mini perfil modal ─────────────────────────────────────────
function PerfilModal({ aluno, onClose }) {
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

// ── Requisição card (docente aceita/rejeita pedido de aula) ───
function RequisicaoCard({ item, onAccept, onReject, loading, onVerPerfil }) {
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
        {/* Perfil do aluno clicável */}
        {item.alunos?.length > 0 && (
          <button onClick={() => onVerPerfil(item.alunos[0])}
            className="flex items-center gap-2 mt-1 bg-[#CCE8E6] rounded-lg px-2.5 py-1.5 w-fit
              hover:bg-[#006A68]/20 transition-colors">
            <div className="w-6 h-6 rounded-full bg-[#006A68] flex items-center justify-center">
              <User size={13} className="text-white" />
            </div>
            <span className="text-xs font-semibold text-[#006A68]">{item.alunos[0]}</span>
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

// ── Presença a confirmar (docente confirma que a aula aconteceu) ─
function PresencaCard({ item, onConfirm, onReject, loading }) {
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

function ScrollRow({ children }) {
  return (
    <div className="w-full overflow-x-auto pb-2 hide-scrollbar">
      <div className="flex gap-4 w-max">{children}</div>
    </div>
  )
}

export default function HomeDocente() {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [loadingAction, setLoadingAction] = useState(null)
  const [requisicoes, setRequisicoes] = useState([])
  const [presencas, setPresencas] = useState([])
  const [aulasConfirmadas, setAulasConfirmadas] = useState([])
  const [eventos, setEventos] = useState([])
  const [selectedEventId, setSelectedEventId] = useState(null)
  const [perfilAluno, setPerfilAluno] = useState(null)

  const loadAll = useCallback(async () => {
    setLoading(true)
    try {
      const [aulasRes, evRes] = await Promise.allSettled([
        aulasService.getTodas(),
        eventService.getAll(),
      ])
      const todas = aulasRes.status === 'fulfilled' ? aulasRes.value : []
      const now = new Date()
      const in48h = new Date(now.getTime() + 48 * 3600000)

      // Requisições = pedidos pendentes nas próximas 48h
      setRequisicoes(todas.filter(a => {
        const d = new Date(a._data_raw)
        return a.id_estado === 1 && d >= now && d <= in48h
      }))

      // Presenças = aulas concluídas aguardando confirmação docente
      setPresencas(todas.filter(a => {
        const d = new Date(a._data_raw)
        return a.id_estado === 4 && d >= new Date(now - 48*3600000)
      }))

      // Aulas confirmadas futuras
      setAulasConfirmadas(todas.filter(a => {
        const d = new Date(a._data_raw)
        return a.id_estado === 2 && d >= now
      }))

      setEventos(evRes.status === 'fulfilled' && Array.isArray(evRes.value)
        ? evRes.value.slice(0,3) : [])
    } catch(e) { console.error(e) }
    finally { setLoading(false) }
  }, [])

  useEffect(() => { loadAll() }, [loadAll])

  async function handleAccept(id) {
    setLoadingAction(id)
    try {
      await aulasService.updateEstado(id, 2) // confirmada
      setRequisicoes(prev => prev.filter(a => a.id !== id))
    } catch(e) { console.error(e) }
    finally { setLoadingAction(null) }
  }

  async function handleReject(id) {
    setLoadingAction(id)
    try {
      await aulasService.updateEstado(id, 3) // cancelada
      setRequisicoes(prev => prev.filter(a => a.id !== id))
    } catch(e) { console.error(e) }
    finally { setLoadingAction(null) }
  }

  async function handleConfirmPresenca(id) {
    setLoadingAction(id)
    try {
      await aulasService.updateEstado(id, 4)
      setPresencas(prev => prev.filter(a => a.id !== id))
    } catch(e) { console.error(e) }
    finally { setLoadingAction(null) }
  }

  // Simulated perfil lookup — in real app fetch from /api/users
  function handleVerPerfil(nomeAluno) {
    setPerfilAluno({ nome: nomeAluno, apelido: '', email: '—', telemovel: '—', codigo_username: '—' })
  }

  if (loading) return (
    <div className="flex items-center justify-center py-24 text-[#006A68]">
      <Loader2 size={32} className="animate-spin" />
    </div>
  )

  return (
    <>
      <div className="font-['Sora']">
        <div className="mb-8">
          <p className="text-[#4A6362] text-sm font-medium tracking-wide mb-1">Painel Docente</p>
          <h1 className="text-[#324B4A] font-normal text-4xl leading-tight tracking-tight">
            O teu <span className="text-[#006A68] font-semibold">Resumo</span>
          </h1>
        </div>

        {/* 1. Requisições a expirar 48h */}
        <section className="mb-8">
          <div className="flex items-center gap-3 mb-4">
            <Clock size={28} className="text-brand-dark" />
            <h2 className="text-2xl font-bold text-black">Requisições a expirar em 48h</h2>
          </div>
          {requisicoes.length === 0
            ? <p className="text-sm text-gray-400 italic">Sem requisições pendentes.</p>
            : <ScrollRow>
                {requisicoes.map(item => (
                  <RequisicaoCard key={item.id} item={item}
                    onAccept={handleAccept} onReject={handleReject}
                    loading={loadingAction} onVerPerfil={handleVerPerfil} />
                ))}
              </ScrollRow>
          }
        </section>

        {/* 2. Presenças a confirmar */}
        <section className="mb-8">
          <div className="flex items-center gap-3 mb-4">
            <CalendarCheck size={28} className="text-brand-dark" />
            <h2 className="text-2xl font-bold text-black">Presenças a confirmar (48h)</h2>
          </div>
          {presencas.length === 0
            ? <p className="text-sm text-gray-400 italic">Sem presenças a confirmar.</p>
            : <ScrollRow>
                {presencas.map(item => (
                  <PresencaCard key={item.id} item={item}
                    onConfirm={handleConfirmPresenca} onReject={handleReject}
                    loading={loadingAction} />
                ))}
              </ScrollRow>
          }
        </section>

        {/* 3. Próximas aulas confirmadas */}
        <section className="mb-8">
          <div className="flex items-center gap-3 mb-4">
            <CalendarCheck size={28} className="text-brand-dark" />
            <h2 className="text-2xl font-bold text-black">Próximas aulas confirmadas</h2>
          </div>
          {aulasConfirmadas.length === 0
            ? <p className="text-sm text-gray-400 italic">Sem aulas confirmadas agendadas.</p>
            : <ScrollRow>
                {aulasConfirmadas.map(item => (
                  <ClassCard key={item.id} item={item} statusType="confirmada" />
                ))}
              </ScrollRow>
          }
        </section>

        {/* 4. Próximos eventos */}
        <section className="mb-10">
          <div className="flex items-center gap-3 mb-4">
            <Megaphone size={28} className="text-brand-dark" />
            <h2 className="text-2xl font-bold text-black">Próximos eventos</h2>
          </div>
          {eventos.length === 0
            ? <p className="text-sm text-gray-400 italic">Sem eventos agendados.</p>
            : <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {eventos.map(item => (
                  <EventCard key={item.id_evento} event={item}
                    onOpen={() => setSelectedEventId(item.id_evento)} />
                ))}
              </div>
          }
        </section>
      </div>

      {selectedEventId && (
        <EventModal eventId={selectedEventId} onClose={() => setSelectedEventId(null)} />
      )}
      {perfilAluno && (
        <PerfilModal aluno={perfilAluno} onClose={() => setPerfilAluno(null)} />
      )}
    </>
  )
}