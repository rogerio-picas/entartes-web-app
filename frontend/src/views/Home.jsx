import { useNavigate } from 'react-router-dom'
import { useState, useEffect } from 'react'


import {  ClassCard, EventCard, DashboardSection } from '../components/Cards'
import { Clock, CalendarCheck, Megaphone, Loader2, Check, X, AlertCircle } from 'lucide-react'
import EventModal from '../components/EventModal'

import { eventService } from '../services/eventService'
import { api } from '../services/api'
import { authService } from '../services/authService'

// ── Presence confirmation card (aluno confirma a SUA presença) ──
function PresencaCard({ item, onConfirm, onReject, loading }) {
  return (
    <div className="bg-brand-bg border border-brand-dark rounded-xl p-4 flex relative">
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
  const [presencas, setPresencas] = useState([])
  const [aulas, setAulas] = useState([])
  const [inscricoes, setInscricoes] = useState([])
  const [eventos, setEventos] = useState([])
  const [loading, setLoading] = useState(true)
  const [loadingAction, setLoadingAction] = useState(null)
  const [selectedEventId, setSelectedEventId] = useState(null)

  useEffect(() => {
  async function load() {
    setLoading(true)
    try {
      const results = await Promise.allSettled([
        api.get('/horario/minhas-aulas'),
        eventService.getAll(),
      ])

      // Pegamos a resposta das aulas (índice 0)
      const aulasRes = results[0];
      // Pegamos a resposta dos eventos (índice 1)
      const eventosRes = results[1];

      // Extraímos os dados com segurança
      // Se usar Axios, o dado está em .data. Se for fetch puro, ajuste para onde está o array.
      const todasAsAulas = (aulasRes.status === 'fulfilled' && Array.isArray(aulasRes.value.data)) 
        ? aulasRes.value.data 
        : [];

      const todosOsEventos = (eventosRes.status === 'fulfilled' && Array.isArray(eventosRes.value)) 
        ? eventosRes.value 
        : [];

      setPresencas(todasAsAulas.filter(a => a.id_estado === 4))
      setAulas(todasAsAulas.filter(a => a.id_estado === 2))
      setInscricoes(todasAsAulas.filter(a => a.id_estado === 1))
      setEventos(todosOsEventos)

    } catch (err) { 
      console.error("Erro ao carregar dados da Home:", err) 
    } finally { 
      setLoading(false) 
    }
  }
  load()
}, [])

  async function handleConfirmarPresenca(id) {
    setLoadingAction(id)
    try {
      await fetch(`/api/aulas/${id}/estado`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('token')}` },
        body: JSON.stringify({ id_estado: 4 })
      })
      setPresencas(prev => prev.filter(p => p.id !== id))
    } catch(e) { console.error(e) }
    finally { setLoadingAction(null) }
  }

  async function handleRejeitarPresenca(id) {
    setLoadingAction(id)
    try {
      await fetch(`/api/aulas/${id}/estado`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('token')}` },
        body: JSON.stringify({ id_estado: 3 })
      })
      setPresencas(prev => prev.filter(p => p.id !== id))
    } catch(e) { console.error(e) }
    finally { setLoadingAction(null) }
  }

  return (
    <div className="font-['Sora']">
      <div className="mb-8">
        <p className="text-[#4A6362] text-sm font-medium tracking-wide mb-1">Painel Geral</p>
        <h1 className="text-[#324B4A] font-normal text-4xl leading-tight tracking-tight">
          O teu <span className="text-[#006A68] font-semibold">Resumo</span>
        </h1>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 gap-3 text-[#006A68]">
          <Loader2 className="animate-spin" size={32} />
          <p className="text-sm font-medium animate-pulse">A carregar...</p>
        </div>
      ) : (
        <main className="flex flex-col gap-6">

          {/* Presenças a confirmar */}
          <DashboardSection title="Presenças a confirmar (48h)" icon={Clock}>
            {presencas.length > 0 ? presencas.map(item => (
              <PresencaCard key={item.id} item={item}
                onConfirm={handleConfirmarPresenca}
                onReject={handleRejeitarPresenca}
                loading={loadingAction} />
            )) : (
              <p className="px-6 md:px-0 text-sm text-gray-400 italic">
                Sem presenças a confirmar de momento.</p>
            )}
          </DashboardSection>

           {/* Próximas aulas confirmadas */}
          <DashboardSection title="Próximas aulas confirmadas" icon={CalendarCheck}>
            {aulas.length > 0 ? aulas.map(item => (
              <ClassCard key={item.id} item={item} statusType="confirmada" />
            )) : (
              <p className="px-6 md:px-0 text-sm text-gray-400 italic">
                Sem aulas confirmadas agendadas.
              </p>
            )}
          </DashboardSection>

          {/* Inscrições aguardar validação */}
          <DashboardSection title="Inscrições a aguardar validação" icon={Clock}>
            {inscricoes.length > 0 ? inscricoes.map(item => (
              <ClassCard key={item.id} item={item} statusType="pendente" />
            )) : (
              <p className="px-6 md:px-0 text-sm text-gray-400 italic">
                Nenhuma inscrição pendente.
              </p>
            )}
          </DashboardSection>

          {/* Próximos eventos */}
          <section className="mb-10">
            <div className="flex items-center gap-3 mb-4">
              <Megaphone size={28} className="text-brand-dark" />
              <h2 className="text-2xl font-bold text-black">Próximos eventos</h2>
            </div>

            {eventos.length > 0 ? (
              <div className="flex flex-col gap-6">

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                  {eventos.slice(0, 3).map(item => (
                    <EventCard
                      key={item.id_evento || item.id}
                      event={item}
                      onOpen={() => setSelectedEventId(item.id_evento || item.id)}
                    />
                  ))}
                </div>

                <div className="flex justify-start">
                  <button
                    onClick={() => navigate('/Events')}
                    className="group flex items-center gap-2 text-[#006A68] font-semibold text-sm hover:gap-3 transition-all"
                  >
                    Ver todos os eventos
                    <span className="bg-[#CCE8E6] p-1 rounded-full group-hover:bg-[#006A68] group-hover:text-white transition-colors">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                        <path d="M9 18l6-6-6-6" />
                      </svg>
                    </span>
                  </button>
                </div>

              </div>
            ) : (
              <p className="text-sm text-gray-400 italic">
                Sem eventos de momento.
              </p>
            )}
          </section>

                    {/* Modal de evento */}
          {selectedEventId && (
            <EventModal
              eventId={selectedEventId}
              onClose={() => setSelectedEventId(null)}
            />
          )}

        </main>
      )}
    </div>
  )
}
