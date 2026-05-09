import { useState, useEffect, useRef } from 'react'
import { X, Calendar, Clock, Users, User, Loader2, AlertCircle } from 'lucide-react'
import { eventService } from '../services/eventService'
import { formatDate, formatTime } from '../utils/dateUtils'

function SectionLabel({ icon: Icon, children }) {
  return (
    <div className="flex items-center gap-2 mb-3">
      {Icon && <Icon size={13} className="text-brand-800" />}
      <span className="text-[10px] font-bold uppercase tracking-widest text-neutral-600">
        {children}
      </span>
    </div>
  )
}

function AvatarInitials({ nome, apelido }) {
  const initials = `${nome?.[0] ?? ''}${apelido?.[0] ?? ''}`.toUpperCase()
  return (
    <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-brand-200 text-brand-800 text-xs font-bold shrink-0">
      {initials}
    </span>
  )
}

function PersonRow({ nome, apelido, badge }) {
  return (
    <div className="flex items-center gap-3">
      <AvatarInitials nome={nome} apelido={apelido} />
      <span className="text-sm text-neutral-800 font-medium">{nome} {apelido}</span>
      {badge && (
        <span className="ml-auto text-[10px] font-bold uppercase tracking-wider text-neutral-600">
          {badge}
        </span>
      )}
    </div>
  )
}

export default function EventModal({ eventId, onClose }) {
  const [event, setEvent] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const backdropRef = useRef(null)

  useEffect(() => {
    setLoading(true)
    setError('')
    setEvent(null)
    eventService
      .getById(eventId)
      .then(setEvent)
      .catch((err) => setError(err.message || 'Erro ao carregar evento.'))
      .finally(() => setLoading(false))
  }, [eventId])

  useEffect(() => {
    function onKey(e) {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose])

  function handleBackdropClick(e) {
    if (e.target === backdropRef.current) onClose()
  }

  const coordinator = event?.coordenadora_evento?.[0]?.coordenadora?.utilizador
  const grupos = event?.grupo ?? []
  const alunosEvento = event?.evento_aluno ?? []

  return (
    <div
      ref={backdropRef}
      onClick={handleBackdropClick}
      className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 px-4 font-['Sora']"
    >
      <div className="bg-white rounded-2xl border border-neutral-600/20 shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto flex flex-col">

        {/* Header */}
        <div className="flex items-start justify-between gap-4 px-6 pt-6 pb-5 border-b border-neutral-600/10">
          <div className="flex flex-col gap-2 min-w-0">
            {loading ? (
              <div className="h-5 w-52 bg-neutral-50 rounded-full animate-pulse" />
            ) : (
              <h2 className="text-neutral-800 font-semibold text-lg leading-snug">
                {event?.nome ?? '—'}
              </h2>
            )}
            {!loading && event && (
              <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-brand-800 bg-brand-200 px-3 py-1 rounded-full self-start">
                <Calendar size={12} />
                {formatDate(event.data_de_realizacao)}
              </span>
            )}
          </div>

          <button
            onClick={onClose}
            className="shrink-0 p-1.5 text-neutral-600 hover:text-red-500 transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Body */}
        <div className="px-6 py-6 flex flex-col gap-7">

          {loading && (
            <div className="flex flex-col items-center justify-center py-16 gap-3 text-brand-800">
              <Loader2 className="animate-spin" size={28} />
              <p className="text-sm font-medium animate-pulse text-neutral-600">A carregar evento...</p>
            </div>
          )}

          {error && (
            <div className="flex items-center gap-3 bg-red-50 text-red-700 text-sm px-5 py-4 rounded-xl border border-red-200">
              <AlertCircle size={18} className="shrink-0" />
              <div>
                <p className="font-semibold">Ocorreu um problema</p>
                <p className="opacity-80">{error}</p>
              </div>
            </div>
          )}

          {!loading && event && (
            <>
              {event.descricao && (
                <div>
                  <SectionLabel>Descrição</SectionLabel>
                  <p className="text-sm text-neutral-600 leading-relaxed">{event.descricao}</p>
                </div>
              )}

              {coordinator && (
                <div>
                  <SectionLabel icon={User}>Coordenadora</SectionLabel>
                  <PersonRow nome={coordinator.nome} apelido={coordinator.apelido} />
                </div>
              )}

              {grupos.length > 0 && (
                <div>
                  <SectionLabel icon={Users}>Grupos ({grupos.length})</SectionLabel>
                  <div className="flex flex-col gap-3">
                    {grupos.map((grupo) => (
                      <div
                        key={grupo.id_grupo}
                        className="rounded-xl border border-neutral-600/10 bg-neutral-50/40 p-4 flex flex-col gap-3"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-semibold text-neutral-800 text-sm">{grupo.nome}</span>
                          {grupo.hora_atuacao && (
                            <span className="inline-flex items-center gap-1 text-xs font-semibold text-brand-800 bg-brand-200 px-2.5 py-1 rounded-full">
                              <Clock size={11} />
                              {formatTime(grupo.hora_atuacao)}
                            </span>
                          )}
                        </div>

                        {grupo.descricao && (
                          <p className="text-xs text-neutral-600 leading-relaxed">{grupo.descricao}</p>
                        )}

                        {grupo.docente_grupo?.length > 0 && (
                          <div className="flex flex-col gap-2">
                            <span className="text-[10px] font-bold uppercase tracking-widest text-neutral-600/60">Docentes</span>
                            {grupo.docente_grupo.map((dg, i) => (
                              <PersonRow
                                key={i}
                                nome={dg.docente.utilizador.nome}
                                apelido={dg.docente.utilizador.apelido}
                                badge="Docente"
                              />
                            ))}
                          </div>
                        )}

                        {grupo.aluno_grupo?.length > 0 && (
                          <div className="flex flex-col gap-2">
                            <span className="text-[10px] font-bold uppercase tracking-widest text-neutral-600/60">
                              Alunos ({grupo.aluno_grupo.length})
                            </span>
                            {grupo.aluno_grupo.map((ag, i) => (
                              <PersonRow
                                key={i}
                                nome={ag.aluno.utilizador.nome}
                                apelido={ag.aluno.utilizador.apelido}
                              />
                            ))}
                          </div>
                        )}

                        {grupo.aluno_grupo?.length === 0 && grupo.docente_grupo?.length === 0 && (
                          <p className="text-xs text-neutral-600/50 italic">Sem participantes atribuídos.</p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {alunosEvento.length > 0 && (
                <div>
                  <SectionLabel icon={Users}>Alunos inscritos ({alunosEvento.length})</SectionLabel>
                  <div className="flex flex-col gap-2">
                    {alunosEvento.map((ea, i) => (
                      <PersonRow
                        key={i}
                        nome={ea.aluno.utilizador.nome}
                        apelido={ea.aluno.utilizador.apelido}
                      />
                    ))}
                  </div>
                </div>
              )}

              {grupos.length === 0 && alunosEvento.length === 0 && !coordinator && !event.descricao && (
                <div className="text-center py-10 bg-neutral-50/30 rounded-xl border border-dashed border-neutral-600/10">
                  <p className="text-sm text-neutral-600">Sem informação adicional.</p>
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        {!loading && event && (
          <div className="px-6 py-4 border-t border-neutral-600/10 flex items-center justify-between">
            <span className="text-[10px] uppercase tracking-wider text-neutral-600/50 font-bold">
              ID #{event.id_evento}
            </span>
            <button
              onClick={onClose}
              className="text-sm font-semibold text-white px-5 py-2 rounded-xl transition-opacity hover:opacity-80"
              style={{ backgroundColor: '#006A68' }}
            >
              Fechar
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

