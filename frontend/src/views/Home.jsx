import { useState, useEffect } from 'react'
import { Clock, CalendarCheck, Megaphone } from 'lucide-react'
import DashboardHeader from '../components/DashboardHeader'
import { ActionCard, ClassCard, EventDashCard, DashboardSection } from '../components/Cards'
import { eventService } from '../services/eventService'
import { api } from '../services/api' // Faremos fetch direto de api.js para as que não têm service

export default function Home() {
  // Estados para as várias secções da Home
  const [presencas, setPresencas] = useState([])
  const [aulas, setAulas] = useState([])
  const [inscricoes, setInscricoes] = useState([])
  const [eventos, setEventos] = useState([])
  const [loading, setLoading] = useState(true)

  // Fetch a todos os endpoints em paralelo
  useEffect(() => {
    async function loadDashboardData() {
      try {
        setLoading(true)
        
        // Chamadas da API (prontas para a equipa do backend)
        // Se as rotas abaixo derem NotFound, o catch trata de deixar um array vazio
        const [
          presencasData,
          aulasData,
          inscricoesData,
          eventosData
        ] = await Promise.allSettled([
          api.get('/presencas/expirar'),   // Rota a ser desenvolvida pelo backend
          api.get('/aulas/confirmadas'),   // Rota a ser desenvolvida pelo backend
          api.get('/inscricoes/pendentes'),// Rota a ser desenvolvida pelo backend
          eventService.getAll()            // Rota de eventos que já existe
        ])

        // Guardar dados (se a promessa foi cumprida (fulfilled), guardamos, caso contrário array vazio [fallback seguro])
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
    <div className="min-h-screen bg-white font-sans text-brand-darkest pb-20">
      {/* Aqui invocamos o novo header global isolado */}
      <DashboardHeader />

      <main className="pt-10 flex flex-col gap-2">
        {loading ? (
          <div className="flex w-full items-center justify-center p-20">
            <span className="text-gray-400">A carregar os teus dados...</span>
          </div>
        ) : (
          <>
            {/* Secção 1 */}
            <DashboardSection title="Presenças a confirmar a expirar em 48h" icon={Clock}>
              {presencas.length > 0 ? (
                presencas.map((item) => (
                  <ActionCard 
                    key={`act-${item.id}`} 
                    item={item} 
                    onAccept={() => console.log('Aceite')} 
                    onReject={() => console.log('Rejeitado')} 
                  />
                ))
              ) : (
                <p className="px-6 text-sm text-gray-500">Sem presenças a expirar neste momento.</p>
              )}
            </DashboardSection>

            {/* Secção 2 */}
            <DashboardSection title="Próximas aulas confirmadas" icon={CalendarCheck}>
              {aulas.length > 0 ? (
                aulas.map((item) => (
                  <ClassCard key={`class-${item.id}`} item={item} statusType={item.status || 'confirmada'} />
                ))
              ) : (
                <p className="px-6 text-sm text-gray-500">Sem aulas confirmadas agendadas para os próximos dias.</p>
              )}
            </DashboardSection>

            {/* Secção 3 */}
            <DashboardSection title="Inscrições a aguardar validação" icon={Clock}>
              {inscricoes.length > 0 ? (
                inscricoes.map((item) => (
                  <ClassCard key={`pend-${item.id}`} item={item} statusType={item.status || 'pendente'} />
                ))
              ) : (
                <p className="px-6 text-sm text-gray-500">Nenhuma inscrição pendente encontrada.</p>
              )}
            </DashboardSection>

            {/* Secção 4 */}
            <DashboardSection title="Próximos eventos" icon={Megaphone}>
              {eventos.length > 0 ? (
                eventos.map((item) => (
                  <EventDashCard key={`evt-${item.id_evento || item.id}`} item={item} />
                ))
              ) : (
                <p className="px-6 text-sm text-gray-500">A nossa grelha de eventos está vazia de momento. Fica atento!</p>
              )}
            </DashboardSection>
          </>
        )}
      </main>
    </div>
  )
}
