import { useState, useEffect, useCallback } from 'react'
import {
  X, RefreshCw, User, Calendar, Clock, Plus, Search, ChevronRight, Music
} from 'lucide-react'
import { api } from '../services/api'

export default function DisponibilidadesModal({ onClose, onMarcar }) {
  const [slots, setSlots] = useState([])
  const [loading, setLoading] = useState(true)
  const [filtroData, setFiltroData] = useState('')

  const fetchSlots = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (filtroData) params.set('data', filtroData)
      const data = await api.get(`/coaching/disponibilidades/consultar?${params}`)
      setSlots(Array.isArray(data) ? data : data.data || [])
    } catch {
      setSlots([])
    } finally {
      setLoading(false)
    }
  }, [filtroData])

  useEffect(() => { fetchSlots() }, [fetchSlots])

  const DIAS = ['Domingo', 'Segunda-Feira', 'Terça-Feira', 'Quarta-Feira', 'Quinta-Feira', 'Sexta-Feira', 'Sábado']

  const fmtTime = (iso) => {
    if (!iso) return '—'
    const dt = new Date(iso)
    return isNaN(dt) ? String(iso).substring(11, 16) : dt.toISOString().substring(11, 16)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" />
      <div
        className="relative bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col"
        style={{ maxHeight: '85vh' }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="bg-[#EFF5F4] border-b-2 border-[#006A68] px-6 py-5 flex items-start justify-between shrink-0">
          <div>
            <p className="text-[#4A6362] text-xs font-medium tracking-widest uppercase mb-1">Coaching disponível</p>
            <h3 className="text-[#006A68] font-bold text-xl">Slots Disponíveis</h3>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/80 flex items-center justify-center hover:bg-white transition-colors text-[#4A6362]"
          >
            <X size={16} />
          </button>
        </div>

        {/* Filtro */}
        <div className="px-6 py-4 border-b border-gray-100 flex items-center gap-3 shrink-0">
          <div className="flex items-center gap-2 flex-1 max-w-xs px-3 py-2 rounded-xl border border-[#4a6362]/20 bg-[#F9FFFE] focus-within:border-[#006A68] transition-colors">
            <Calendar size={14} className="text-[#4A6362]" />
            <input
              type="date"
              value={filtroData}
              min={new Date().toISOString().split('T')[0]}
              onChange={e => setFiltroData(e.target.value)}
              className="flex-1 bg-transparent text-xs font-medium text-[#324B4A] focus:outline-none"
            />
          </div>
          {filtroData && (
            <button
              onClick={() => setFiltroData('')}
              className="text-xs text-red-500 font-medium hover:text-red-700 flex items-center gap-1"
            >
              <X size={11} /> Limpar
            </button>
          )}
          <button
            onClick={fetchSlots}
            disabled={loading}
            className="w-8 h-8 rounded-full border border-[#4a6362]/30 flex items-center justify-center hover:bg-[#EFF5F4] transition-colors disabled:opacity-40"
          >
            <RefreshCw size={14} className={`text-[#4A6362] ${loading ? 'animate-spin' : ''}`} />
          </button>
          <span className="text-xs text-gray-400 ml-auto">
            {!loading && `${slots.length} slot${slots.length !== 1 ? 's' : ''}`}
          </span>
        </div>

        {/* Lista */}
        <div className="overflow-y-auto flex-1 divide-y divide-gray-100">
          {loading ? (
            [...Array(4)].map((_, i) => (
              <div key={i} className="px-6 py-4 flex items-center gap-4 animate-pulse">
                <div className="w-10 h-10 rounded-full bg-gray-100 shrink-0" />
                <div className="flex-1 space-y-2">
                  <div className="h-3.5 bg-gray-100 rounded w-1/3" />
                  <div className="h-3 bg-gray-100 rounded w-1/2" />
                </div>
                <div className="h-8 w-20 bg-gray-100 rounded-lg" />
              </div>
            ))
          ) : slots.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 gap-3 text-gray-400">
              <Search size={32} strokeWidth={1.5} />
              <p className="text-sm font-medium">
                {filtroData ? 'Sem slots disponíveis para esta data.' : 'Sem slots de coaching disponíveis.'}
              </p>
              {filtroData && (
                <button onClick={() => setFiltroData('')} className="text-xs text-[#006A68] font-semibold hover:underline">
                  Ver todos os slots
                </button>
              )}
            </div>
          ) : (
            slots.map((slot, i) => {
              const dataOuDia = slot.data_especifica
                ? new Date(slot.data_especifica).toLocaleDateString('pt-PT', { weekday: 'long', day: 'numeric', month: 'long' })
                : (slot.dia_semana != null ? DIAS[slot.dia_semana] : '—')

              return (
                <div
                  key={slot.id_disponibilidade ?? i}
                  className="px-6 py-4 flex items-center gap-4 hover:bg-[#F4FBF9] transition-colors group"
                >
                  {/* Avatar docente */}
                  <div className="w-10 h-10 rounded-full bg-[#CCE8E6] flex items-center justify-center shrink-0 group-hover:bg-[#006A68] transition-colors">
                    <User size={16} className="text-[#006A68] group-hover:text-white transition-colors" />
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-[#324B4A] text-sm truncate">{slot.nome_docente}</p>
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-0.5">
                      <span className="flex items-center gap-1 text-xs text-gray-500">
                        <Calendar size={11} />
                        {dataOuDia}
                      </span>
                      <span className="flex items-center gap-1 text-xs text-gray-500">
                        <Clock size={11} />
                        {fmtTime(slot.hora_inicio)} – {fmtTime(slot.hora_fim)}
                      </span>
                    </div>
                    {/* Modalidades */}
                    {slot.modalidades && slot.modalidades.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-1.5">
                        {slot.modalidades.map(m => (
                          <span
                            key={m.id ?? m.id_modalidade}
                            className="text-[10px] bg-[#CCE8E6] text-[#006A68] px-2 py-0.5 rounded-full font-semibold flex items-center gap-0.5"
                          >
                            <Music size={9} />
                            {m.nome}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Botão Marcar */}
                  <button
                    onClick={() => onMarcar(slot)}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#006A68] text-white text-xs font-bold hover:bg-[#00504E] transition-colors shadow-sm whitespace-nowrap shrink-0"
                  >
                    <Plus size={13} strokeWidth={3} />
                    Marcar
                    <ChevronRight size={13} />
                  </button>
                </div>
              )
            })
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-100 shrink-0 flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl border border-gray-200 text-[#4A6362] text-sm font-semibold hover:bg-gray-50 transition-colors"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  )
}
