import { useState, useEffect } from 'react'
import { eventService } from '../services/eventService'
import { Calendar as CalendarIcon, AlertCircle, Loader2, Plus, Search, Filter, ChevronLeft, ChevronRight } from 'lucide-react'
import { EventCard } from '../components/Cards'
import { useNavigate } from 'react-router-dom'
import NovoEventoModal from './NovoEventoModal'
import { authService } from '../services/authService'

export default function Events() {
  const [ativos, setAtivos] = useState({ data: [], meta: { totalItems: 0, totalPages: 0 } })
  const [passados, setPassados] = useState({ data: [], meta: { totalItems: 0, totalPages: 0 } })
  const [cancelados, setCancelados] = useState({ data: [], meta: { totalItems: 0, totalPages: 0 } })

  const [loadingAtivos, setLoadingAtivos] = useState(true)
  const [loadingPassados, setLoadingPassados] = useState(true)
  const [loadingCancelados, setLoadingCancelados] = useState(true)
  
  const [error, setError] = useState('')
  const [showNovo, setShowNovo] = useState(false)
  const [refreshCounter, setRefreshCounter] = useState(0)

  // Filter & Pagination States
  const [searchTerm, setSearchTerm] = useState('')
  const [sortBy, setSortBy] = useState('date_asc')
  
  const [pageAtivos, setPageAtivos] = useState(1)
  const [pagePassados, setPagePassados] = useState(1)
  const [pageCancelados, setPageCancelados] = useState(1)
  const itemsPerPage = 6

  const navigate = useNavigate()

  const user = authService.getUser()
  const isAdmin = user?.role === 1

  // Reset pages when filters change
  useEffect(() => {
    setPageAtivos(1)
    setPagePassados(1)
    setPageCancelados(1)
  }, [searchTerm, sortBy])

  // Load Ativos
  useEffect(() => {
    setLoadingAtivos(true)
    eventService.getPaginated({ estado: 'ativos', page: pageAtivos, limit: itemsPerPage, search: searchTerm, sortBy })
      .then(res => { setAtivos(res); setError('') })
      .catch(err => setError(err.message || 'Erro ao carregar eventos ativos.'))
      .finally(() => setLoadingAtivos(false))
  }, [pageAtivos, searchTerm, sortBy, refreshCounter])

  // Load Passados
  useEffect(() => {
    setLoadingPassados(true)
    eventService.getPaginated({ estado: 'passados', page: pagePassados, limit: itemsPerPage, search: searchTerm, sortBy })
      .then(res => { setPassados(res); setError('') })
      .catch(err => setError(err.message || 'Erro ao carregar eventos passados.'))
      .finally(() => setLoadingPassados(false))
  }, [pagePassados, searchTerm, sortBy, refreshCounter])

  // Load Cancelados
  useEffect(() => {
    setLoadingCancelados(true)
    eventService.getPaginated({ estado: 'cancelados', page: pageCancelados, limit: itemsPerPage, search: searchTerm, sortBy })
      .then(res => { setCancelados(res); setError('') })
      .catch(err => setError(err.message || 'Erro ao carregar eventos cancelados.'))
      .finally(() => setLoadingCancelados(false))
  }, [pageCancelados, searchTerm, sortBy, refreshCounter])

  const triggerReload = () => setRefreshCounter(prev => prev + 1)

  const loading = loadingAtivos || loadingPassados || loadingCancelados
  const totalEvents = (ativos.meta?.totalItems || 0) + (passados.meta?.totalItems || 0) + (cancelados.meta?.totalItems || 0)

  // Pagination UI Component
  const PaginationControls = ({ currentPage, totalPages, setPage }) => {
    if (totalPages <= 1) return null

    return (
      <div className="flex items-center justify-center gap-4 mt-6">
        <button 
          onClick={() => setPage(p => Math.max(1, p - 1))}
          disabled={currentPage === 1}
          className="p-2 rounded-xl border border-neutral-200 bg-white hover:bg-neutral-50 disabled:opacity-40 disabled:cursor-not-allowed text-brand-800 transition-colors shadow-sm"
        >
          <ChevronLeft size={20} />
        </button>
        <span className="text-sm text-neutral-600 font-medium">
          Página {currentPage} de {totalPages}
        </span>
        <button 
          onClick={() => setPage(p => Math.min(totalPages, p + 1))}
          disabled={currentPage === totalPages}
          className="p-2 rounded-xl border border-neutral-200 bg-white hover:bg-neutral-50 disabled:opacity-40 disabled:cursor-not-allowed text-brand-800 transition-colors shadow-sm"
        >
          <ChevronRight size={20} />
        </button>
      </div>
    )
  }

  return (
    <div className="font-['Sora'] pb-12">

      {/* Header & Filters */}
      <div className="mb-8">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-6">
          <div>
            <p className="text-neutral-600 text-sm mb-1">Agenda Cultural & Académica</p>
            <h1 className="text-neutral-800 text-4xl">
              Próximos <span className="text-brand-800 font-semibold">Eventos</span>
            </h1>
          </div>

          {isAdmin && (
            <button
              onClick={() => setShowNovo(true)}
              className="flex items-center justify-center gap-2 px-5 py-2.5 bg-brand-800 text-white rounded-xl hover:bg-brand-900 shrink-0 shadow-sm transition-colors"
            >
              <Plus size={16} /> Criar Evento
            </button>
          )}
        </div>

        {/* Filters Bar */}
        <div className="flex flex-col sm:flex-row gap-4 bg-white p-4 rounded-2xl border border-brand-800/10 shadow-sm">
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-400" size={18} />
            <input 
              type="text" 
              placeholder="Pesquisar por nome, local ou descrição..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-neutral-50 border border-neutral-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-800/20 focus:border-brand-800 transition-all"
            />
          </div>
          <div className="relative sm:w-56 shrink-0">
            <Filter className="absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-400" size={18} />
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-neutral-50 border border-neutral-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-800/20 focus:border-brand-800 appearance-none transition-all cursor-pointer"
            >
              <option value="date_asc">Data: Mais Próximos</option>
              <option value="date_desc">Data: Mais Distantes</option>
            </select>
          </div>
        </div>
      </div>

      {/* Loading */}
      {loading && totalEvents === 0 && (
        <div className="flex flex-col items-center justify-center py-24 gap-4 text-brand-800">
          <Loader2 className="animate-spin" size={36} />
          <p className="font-medium animate-pulse">A carregar agenda...</p>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="flex gap-4 bg-feedback-error-light/30 text-feedback-error-dark p-6 rounded-2xl border border-feedback-error-light mb-8 items-start shadow-sm">
          <AlertCircle size={24} className="shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="font-bold text-lg mb-1">Ocorreu um erro</p>
            <p className="opacity-90 text-sm">{error}</p>
          </div>
          <button 
            onClick={() => triggerReload()}
            className="px-4 py-2 bg-feedback-error-light/50 hover:bg-feedback-error-light rounded-lg text-sm font-semibold transition-colors"
          >
            Tentar novamente
          </button>
        </div>
      )}

      {/* Empty State Geral */}
      {!loading && !error && totalEvents === 0 && !searchTerm && (
        <div className="text-center py-24 bg-white rounded-3xl border border-dashed border-neutral-300">
          <CalendarIcon size={48} className="mx-auto text-neutral-300 mb-4" />
          <p className="text-lg font-semibold text-neutral-700">A agenda está vazia</p>
          <p className="text-sm text-neutral-500 mt-1">Nenhum evento foi criado até ao momento.</p>
        </div>
      )}

      {/* Empty State de Pesquisa */}
      {!loading && !error && totalEvents === 0 && searchTerm && (
        <div className="text-center py-24 bg-white/50 rounded-3xl border border-dashed border-brand-800/20">
          <Search size={48} className="mx-auto text-brand-800/30 mb-4" />
          <p className="text-lg font-semibold text-neutral-700">Sem resultados</p>
          <p className="text-sm text-neutral-500 mt-1">Não encontrámos eventos com a pesquisa "{searchTerm}"</p>
          <button 
            onClick={() => setSearchTerm('')}
            className="mt-4 text-sm font-semibold text-brand-800 hover:underline"
          >
            Limpar pesquisa
          </button>
        </div>
      )}

      {/* Eventos Ativos */}
      {(ativos.data.length > 0 || loadingAtivos) && (
        <div className="mb-12 relative">
          {loadingAtivos && ativos.data.length > 0 && (
             <div className="absolute inset-0 bg-white/50 z-10 flex items-center justify-center rounded-2xl">
                <Loader2 className="animate-spin text-brand-800" size={32} />
             </div>
          )}
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {ativos.data.map((event) => (
              <EventCard
                key={event.id_evento}
                event={event}
                onOpen={() => navigate(`/eventos/${event.id_evento}`)}
              />
            ))}
          </div>
          <PaginationControls 
            currentPage={ativos.meta.currentPage} 
            totalPages={ativos.meta.totalPages} 
            setPage={setPageAtivos} 
          />
        </div>
      )}

      {/* Eventos Passados */}
      {(passados.data.length > 0 || loadingPassados) && (
        <div className="mt-16 relative">
          <div className="flex items-center gap-3 mb-6">
            <h2 className="text-neutral-800 text-2xl font-bold">
              Eventos <span className="text-brand-800">Passados</span>
            </h2>
            <span className="px-2.5 py-1 bg-neutral-200 text-neutral-600 text-xs font-bold rounded-full">
              {passados.meta.totalItems}
            </span>
          </div>
          {loadingPassados && passados.data.length > 0 && (
             <div className="absolute inset-0 top-12 bg-white/50 z-10 flex items-center justify-center rounded-2xl">
                <Loader2 className="animate-spin text-brand-800" size={32} />
             </div>
          )}
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 opacity-80 hover:opacity-100 transition-opacity">
            {passados.data.map((event) => (
              <EventCard
                key={event.id_evento}
                event={event}
                onOpen={() => navigate(`/eventos/${event.id_evento}`)}
              />
            ))}
          </div>
          <PaginationControls 
            currentPage={passados.meta.currentPage} 
            totalPages={passados.meta.totalPages} 
            setPage={setPagePassados} 
          />
        </div>
      )}

      {/* Eventos Cancelados */}
      {(cancelados.data.length > 0 || loadingCancelados) && (
        <div className="mt-16 relative">
          <div className="flex items-center gap-3 mb-6">
            <h2 className="text-neutral-800 text-2xl font-bold">
              Eventos <span className="text-feedback-error">Cancelados</span>
            </h2>
            <span className="px-2.5 py-1 bg-feedback-error-light text-feedback-error-dark text-xs font-bold rounded-full">
              {cancelados.meta.totalItems}
            </span>
          </div>
          {loadingCancelados && cancelados.data.length > 0 && (
             <div className="absolute inset-0 top-12 bg-white/50 z-10 flex items-center justify-center rounded-2xl">
                <Loader2 className="animate-spin text-brand-800" size={32} />
             </div>
          )}
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 opacity-60 hover:opacity-100 transition-opacity">
            {cancelados.data.map((event) => (
              <EventCard
                key={event.id_evento}
                event={event}
                onOpen={() => navigate(`/eventos/${event.id_evento}`)}
              />
            ))}
          </div>
          <PaginationControls 
            currentPage={cancelados.meta.currentPage} 
            totalPages={cancelados.meta.totalPages} 
            setPage={setPageCancelados} 
          />
        </div>
      )}

      {/* Modal */}
      {showNovo && (
        <NovoEventoModal
          onClose={() => setShowNovo(false)}
          onSuccess={() => {
            setShowNovo(false)
            triggerReload()
          }}
        />
      )}
    </div>
  )
}
