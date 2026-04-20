import { useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react'
import { Clock, CalendarCheck, Megaphone, Loader2 } from 'lucide-react'
// REMOVIDO: import DashboardHeader from '../components/DashboardHeader'
import { ActionCard, ClassCard, EventCard, DashboardSection } from '../components/Cards'
import { eventService } from '../services/eventService'
import { api } from '../services/api'

export default function Home() {
  const navigate = useNavigate();
  const [presencas, setPresencas] = useState([])
  const [aulas, setAulas] = useState([])
  const [inscricoes, setInscricoes] = useState([])
  const [eventos, setEventos] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function loadDashboardData() {
      try {
        setLoading(true)
        const [
          presencasData,
          aulasData,
          inscricoesData,
          eventosData
        ] = await Promise.allSettled([
          api.get('/presencas/expirar'),
          api.get('/aulas/confirmadas'),
          api.get('/inscricoes/pendentes'),
          eventService.getAll()
        ])

        setPresencas(presencasData.status === 'fulfilled' && Array.isArray(presencasData.value) ? presencasData.value : [])
        setAulas(aulasData.status === 'fulfilled' && Array.isArray(aulasData.value) ? aulasData.value : [])
        setInscricoes(inscricoesData.status === 'fulfilled' && Array.isArray(inscricoesData.value) ? inscricoesData.value : [])
        setEventos(eventosData.status === 'fulfilled' && Array.isArray(eventosData.value) ? eventosData.value : [])
        
      } catch (err) {
        console.error("Erro fatal ao carregar Dashboard:", err)
      } finally {
        setLoading(false)
      }
    }
    loadDashboardData()
  }, [])

  return (
    /* REMOVIDO: div com min-h-screen e DashboardHeader interno. 
       O conteúdo agora flui dentro do max-w-1400px definido nas páginas anteriores ou no Layout. */
    <div className="font-['Sora']">
      
      {/* Título de Boas-vindas opcional (já que o Header diz "Bem-vindo") */}
      <div className="mb-8 px-6 md:px-0">
        <p className="text-[#4A6362] text-sm font-medium tracking-wide mb-1">Painel Geral</p>
        <h1 className="text-[#324B4A] font-normal text-4xl leading-tight tracking-tight">
          O teu <span className="text-[#006A68] font-semibold">Resumo</span>
        </h1>
      </div>

      <main className="flex flex-col gap-6">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3 text-[#006A68]">
            <Loader2 className="animate-spin" size={32} />
            <p className="text-sm font-medium animate-pulse">A atualizar o teu dashboard...</p>
          </div>
        ) : (
          <>
            {/* Secção 1 - Presenças */}
            <DashboardSection title="Presenças a confirmar (48h)" icon={Clock}>
              {presencas.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 px-6 md:px-0">
                  {presencas.map((item) => (
                    <ActionCard 
                      key={`act-${item.id}`} 
                      item={item} 
                      onAccept={() => console.log('Aceite')} 
                      onReject={() => console.log('Rejeitado')} 
                    />
                  ))}
                </div>
              ) : (
                <p className="px-6 md:px-0 text-sm text-gray-400 italic font-['Sora']">
                  Sem presenças a expirar neste momento.
                </p>
              )}
            </DashboardSection>

            {/* Secção 2 - Aulas */}
            <DashboardSection title="Próximas aulas confirmadas" icon={CalendarCheck}>
              {aulas.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 px-6 md:px-0">
                  {aulas.map((item) => (
                    <ClassCard key={`class-${item.id}`} item={item} statusType={item.status || 'confirmada'} />
                  ))}
                </div>
              ) : (
                <p className="px-6 md:px-0 text-sm text-gray-400 italic font-['Sora']">
                  Sem aulas confirmadas agendadas.
                </p>
              )}
            </DashboardSection>

            {/* Secção 3 - Inscrições */}
            <DashboardSection title="Aguardar validação" icon={Clock}>
              {inscricoes.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 px-6 md:px-0">
                  {inscricoes.map((item) => (
                    <ClassCard key={`pend-${item.id}`} item={item} statusType={item.status || 'pendente'} />
                  ))}
                </div>
              ) : (
                <p className="px-6 md:px-0 text-sm text-gray-400 italic font-['Sora']">
                  Nenhuma inscrição pendente.
                </p>
              )}
            </DashboardSection>

            {/* Secção 4 - Eventos */}
            <section className="mb-10 w-full max-w-[1280px] mx-auto">
              <div className="flex items-center gap-3 mb-4">
                <Megaphone size={28} className="text-brand-dark" />
                <h2 className="text-2xl font-bold text-black font-sans">Próximos eventos</h2>
              </div>

              {eventos.length > 0 ? (
                <div className="flex flex-col gap-6">
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                    {eventos.slice(0, 3).map((item) => (
                      <EventCard key={`evt-${item.id_evento || item.id}`} event={item} onOpen={() => navigate(`/eventos/${item.id_evento || item.id}`)} />
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
                <p className="text-sm text-gray-400 italic font-['Sora']">
                  Sem eventos agendados de momento.
                </p>
              )}
            </section>
          </>
        )}
      </main>
    </div>
  )
}