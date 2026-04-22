import { useNavigate } from 'react-router-dom'
import { useState, useEffect } from 'react'


import {  ClassCard, EventCard, DashboardSection } from '../components/Cards'
import { Clock, CalendarCheck, Megaphone, Loader2, Check, X, AlertCircle } from 'lucide-react'

import EventModal from '../components/EventModal'
import { eventService } from '../services/eventService'
import coachingService from '../services/coachingService'
import { authService } from '../services/authService'

export default function Home() {
  const navigate = useNavigate();
  const role = authService.getUser()?.role ?? 3;
  
  const [presencas, setPresencas] = useState([])
  const [emValidacao, setEmValidacao] = useState([])
  const [confirmadas, setConfirmadas] = useState([])
  const [pendentes, setPendentes] = useState([])
  const [eventos, setEventos] = useState([])
  const [loading, setLoading] = useState(true)
  const [loadingAction, setLoadingAction] = useState(null)
  const [selectedEventId, setSelectedEventId] = useState(null)
  const [refreshKey, setRefreshKey] = useState(0)

  useEffect(() => {
    async function loadDashboardData() {
      try {
        setLoading(true)
        const [
          marcacoesData,
          eventosData
        ] = await Promise.allSettled([
          role === 2 ? coachingService.listarMinhasAulas() : coachingService.listarMeusPedidos(),
          eventService.getAll()
        ])

        const rawMarcacoes = marcacoesData.status === 'fulfilled' ? (Array.isArray(marcacoesData.value) ? marcacoesData.value : (marcacoesData.value?.data || [])) : [];
        const evs = eventosData.status === 'fulfilled' && Array.isArray(eventosData.value) ? eventosData.value : [];

        // Normalizar dados
        const normalizadas = rawMarcacoes.map(m => {
            let dt = new Date(m.data);
            if (m.hora_inicio) {
               const hr = new Date(m.hora_inicio);
               dt.setHours(hr.getHours(), hr.getMinutes(), 0, 0);
            }
            return {
                ...m,
                id: m.id_marcacao,
                // Se for Docente, o cartão passa a exibir o nome dos alunos em vez do próprio nome
                docente: role === 2 
                    ? (m.alunos?.length > 0 ? m.alunos.map(a => a.nome).join(', ') : 'A aguardar aluno(s)') 
                    : (m.docente || '—'),
                status: (m.estado || '').toLowerCase(),
                dateTime: dt,
                ja_validou: m.ja_validou
            };
        });

        const now = new Date();
        const past48h = new Date(now.getTime() - 48 * 60 * 60 * 1000);

        // Categorizar pelos 4 estados (separando as aulas passadas das futuras)
        setPresencas(normalizadas.filter(m => m.id_estado === 3 && m.dateTime <= now && m.dateTime >= past48h));
        setEmValidacao(normalizadas.filter(m => m.id_estado === 2));
        setConfirmadas(normalizadas.filter(m => m.id_estado === 3 && m.dateTime > now));
        setPendentes(normalizadas.filter(m => m.id_estado === 1));
        setEventos(evs);
        
      } catch (err) {
        console.error("Erro fatal ao carregar Dashboard:", err)
      } finally {
        setLoading(false)
      }
    }
    loadDashboardData()
  }, [role, refreshKey])

  const handleValidarConclusao = async (id) => {
    try {
      if (role === 2) {
        await coachingService.validarConclusaoSessaoDocente(id)
      } else {
        await coachingService.validarConclusaoSessaoAluno(id)
      }
      setRefreshKey(prev => prev + 1)
    } catch (err) {
      alert(err.response?.data?.message || err.message || 'Erro ao validar presença.')
    }
  }

  return (
    <div className="font-['Sora']">
      <div className="mb-8">
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
            {/* Secção 1 - Presenças a confirmar (Destaque para Docente) */}
            {(role === 2 || presencas.length > 0) && (
              <DashboardSection title="Presenças a confirmar (48h)" icon={Clock}>
                {presencas.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 px-6 md:px-0">
                    {presencas.map((item) => (
                    <div key={`pres-${item.id}`} className="flex flex-col gap-2">
                      <ClassCard item={item} statusType="confirmada" />
                      {item.ja_validou ? (
                        <div className="w-full py-2.5 bg-[#E3E9E8] border border-[#BEC9C7] text-[#4A6362] text-center font-bold text-sm rounded-xl cursor-default">
                          A aguardar {role === 2 ? 'aluno(s)' : 'docente'}
                        </div>
                      ) : (
                        <button
                          onClick={() => handleValidarConclusao(item.id)}
                          className="w-full py-2.5 bg-[#049A59] text-white font-bold text-sm rounded-xl hover:bg-[#037A47] shadow-sm transition-colors"
                        >
                          Validar Presença
                        </button>
                      )}
                    </div>
                    ))}
                  </div>
                ) : (
                  <p className="px-6 md:px-0 text-sm text-gray-400 italic font-['Sora']">
                    Nenhuma presença pendente de validação nas últimas 48h.
                  </p>
                )}
              </DashboardSection>
            )}

            {/* Secção 2 - Em Validação */}
            <DashboardSection title="À espera de confirmação (Em Validação)" icon={Clock}>
              {emValidacao.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 px-6 md:px-0">
                  {emValidacao.map((item) => (
                    <ClassCard key={`val-${item.id}`} item={item} statusType="em_validacao" />
                  ))}
                </div>
              ) : (
                <p className="px-6 md:px-0 text-sm text-gray-400 italic font-['Sora']">
                  Nenhuma aula a aguardar validação final.
                </p>
              )}
            </DashboardSection>

            {/* Secção 3 - Confirmadas */}
            <DashboardSection title="Próximas aulas confirmadas" icon={CalendarCheck}>
              {confirmadas.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 px-6 md:px-0">
                  {confirmadas.map((item) => (
                    <ClassCard key={`conf-${item.id}`} item={item} statusType="confirmada" />
                  ))}
                </div>
              ) : (
                <p className="px-6 md:px-0 text-sm text-gray-400 italic font-['Sora']">
                  Sem aulas confirmadas.
                </p>
              )}
            </DashboardSection>

            {/* Secção 4 - Pendentes */}
            <DashboardSection title="Pedidos Pendentes" icon={Clock}>
              {pendentes.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 px-6 md:px-0">
                  {pendentes.map((item) => (
                    <ClassCard key={`pend-${item.id}`} item={item} statusType="pendente" />
                  ))}
                </div>
              ) : (
                <p className="px-6 md:px-0 text-sm text-gray-400 italic font-['Sora']">
                  Nenhum pedido de marcação pendente.
                </p>
              )}
            </DashboardSection>

            {/* Secção 4 - Eventos */}
            <section className="mb-10 w-full max-w-[1280px] mx-auto">
              <div className="flex items-center gap-3 mb-4">
                <Megaphone size={28} className="text-brand-dark" />
                <h2 className="text-2xl font-bold text-black font-sans">Próximos eventos</h2>
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