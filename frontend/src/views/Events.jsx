import { useState, useEffect } from 'react'
import { eventService } from '../services/eventService'
import { Calendar as CalendarIcon, AlertCircle, Loader2 } from 'lucide-react'

// Funções auxiliares mantidas
function formatDate(dateStr) {
  if (!dateStr) return '—'
  return new Date(dateStr).toLocaleDateString('pt-PT', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  })
}

function EventCard({ event }) {
  return (
    <div className="bg-white rounded-xl border border-[#4a6362]/20 shadow-sm hover:shadow-md transition-all p-6 flex flex-col gap-3 group">
      <div className="flex items-start justify-between gap-2">
        <h3 className="text-[#324B4A] font-semibold text-lg leading-snug group-hover:text-[#006A68] transition-colors">
          {event.nome}
        </h3>
        <span className="shrink-0 inline-flex items-center gap-1.5 text-xs font-semibold text-[#006A68] bg-[#CCE8E6] px-2.5 py-1 rounded-full">
          <CalendarIcon size={12} />
          {formatDate(event.data_de_realizacao)}
        </span>
      </div>

      {event.descricao && (
        <p className="text-[#4A6362] text-sm leading-relaxed line-clamp-3 font-['Sora']">
          {event.descricao}
        </p>
      )}

      <div className="mt-auto pt-4 border-t border-[#4a6362]/10 flex items-center justify-between">
        <span className="text-[10px] uppercase tracking-wider text-gray-400 font-bold">ID #{event.id_evento}</span>
        <button className="text-xs font-semibold text-[#006A68] hover:underline">Ver detalhes</button>
      </div>
    </div>
  )
}

export default function Events() {
  const [events, setEvents] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    eventService
      .getAll()
      .then((data) => setEvents(Array.isArray(data) ? data : []))
      .catch((err) => setError(err.message || 'Erro ao carregar eventos.'))
      .finally(() => setLoading(false))
  }, [])

  return (
    // Removidas divs externas de navegação. O Layout já cuida disso.
    <div className="font-['Sora']">
      
      {/* Cabeçalho de Conteúdo (Seguindo o padrão de Aulas) */}
      <div className="mb-8">
        <p className="text-[#4A6362] text-sm font-medium tracking-wide mb-1">Agenda Cultural & Académica</p>
        <h1 className="text-[#324B4A] font-normal text-4xl leading-tight tracking-tight">
          Próximos <span className="text-[#006A68] font-semibold">Eventos</span>
        </h1>
      </div>

      {/* Estado: Carregando */}
      {loading && (
        <div className="flex flex-col items-center justify-center py-24 gap-3 text-[#006A68]">
          <Loader2 className="animate-spin" size={32} />
          <p className="text-sm font-medium animate-pulse">A carregar eventos...</p>
        </div>
      )}

      {/* Estado: Erro */}
      {error && (
        <div className="flex items-center gap-3 bg-red-50 text-red-700 text-sm px-5 py-4 rounded-xl border border-red-200 mb-8">
          <AlertCircle size={18} />
          <div className="flex-1">
            <p className="font-semibold">Ocorreu um problema</p>
            <p className="opacity-80">{error}</p>
          </div>
          <button 
            onClick={() => window.location.reload()} 
            className="text-xs font-bold underline px-2 py-1 hover:bg-red-100 rounded transition-colors"
          >
            Tentar novamente
          </button>
        </div>
      )}

      {/* Estado: Lista Vazia */}
      {!loading && !error && events.length === 0 && (
        <div className="text-center py-24 bg-[#EFF5F4]/30 rounded-3xl border-2 border-dashed border-[#4a6362]/10">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-[#CCE8E6] text-[#006A68] mb-4">
            <CalendarIcon size={32} />
          </div>
          <p className="text-[#324B4A] font-semibold text-xl">Nenhum evento encontrado</p>
          <p className="text-[#4A6362] text-sm mt-2">Ainda não existem eventos agendados no sistema.</p>
        </div>
      )}

      {/* Estado: Lista de Eventos */}
      {!loading && events.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3 gap-6">
          {events.map((event) => (
            <EventCard key={event.id_evento} event={event} />
          ))}
        </div>
      )}
    </div>
  )
}