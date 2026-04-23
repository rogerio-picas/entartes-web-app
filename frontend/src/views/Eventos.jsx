import { useState, useEffect } from 'react'
import { eventService } from '../services/eventService'
import { Calendar as CalendarIcon, AlertCircle, Loader2, Plus } from 'lucide-react'
import { EventCard } from '../components/Cards'
import { useNavigate } from 'react-router-dom'
import NovoEventoModal from './NovoEventoModal'
import { authService } from '../services/authService'

export default function Events() {
  const [events, setEvents] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [showNovo, setShowNovo] = useState(false)

  const navigate = useNavigate()

  const user = authService.getUser()
  const isAdmin = user?.role === 1

  function loadEvents() {
    setLoading(true)
    const fetchPromise = isAdmin ? eventService.getAll() : eventService.getMyEvents()
    fetchPromise
      .then((data) => setEvents(Array.isArray(data) ? data : []))
      .catch((err) => setError(err.message || 'Erro ao carregar eventos.'))
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    loadEvents()
  }, [])

  return (
    <div className="font-['Sora']">

      {/* Header */}
      <div className="mb-8 flex items-end justify-between">
        <div>
          <p className="text-[#4A6362] text-sm mb-1">Agenda Cultural & Académica</p>
          <h1 className="text-[#324B4A] text-4xl">
            Próximos <span className="text-[#006A68] font-semibold">Eventos</span>
          </h1>
        </div>

        {isAdmin && (
          <button
            onClick={() => setShowNovo(true)}
            className="flex items-center gap-2 px-5 py-2.5 bg-[#006A68] text-white rounded-xl hover:bg-[#00504E]"
          >
            <Plus size={16} /> Criar Evento
          </button>
        )}
      </div>

      {/* Loading */}
      {loading && (
        <div className="flex flex-col items-center py-24 gap-3 text-[#006A68]">
          <Loader2 className="animate-spin" size={32} />
          <p>A carregar eventos...</p>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="flex gap-3 bg-red-50 text-red-700 px-5 py-4 rounded-xl border mb-8">
          <AlertCircle size={18} />
          <div className="flex-1">
            <p className="font-semibold">Erro</p>
            <p>{error}</p>
          </div>
          <button onClick={() => window.location.reload()}>
            Tentar novamente
          </button>
        </div>
      )}

      {/* Empty */}
      {!loading && !error && events.length === 0 && (
        <div className="text-center py-24">
          <CalendarIcon size={32} />
          <p>Nenhum evento encontrado</p>
        </div>
      )}

      {/* List */}
      {!loading && events.length > 0 && (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {events.map((event) => (
            <EventCard
              key={event.id_evento}
              event={event}
              onOpen={() => navigate(`/eventos/${event.id_evento}`)}
            />
          ))}
        </div>
      )}

      {/* Modal */}
      {showNovo && (
        <NovoEventoModal
          onClose={() => setShowNovo(false)}
          onSuccess={() => {
            setShowNovo(false)
            loadEvents()
          }}
        />
      )}
    </div>
  )
}