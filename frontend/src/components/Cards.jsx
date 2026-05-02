import { Clock, CalendarCheck, CalendarDays, X, Check, Megaphone, User, Calendar as CalendarIcon, MapPin } from 'lucide-react'
import { formatDate } from '../utils/dateUtils'

export function EventCard({ event, onOpen }) {
  return (
    <div className="bg-white rounded-xl border border-neutral-600/20 shadow-sm hover:shadow-md transition-all p-6 flex flex-col gap-3 group">
      <div className="flex items-start justify-between gap-2">
        <h3 className="text-neutral-800 font-semibold text-lg leading-snug group-hover:text-brand-800 transition-colors">
          {event.nome}
        </h3>
        <span className="shrink-0 inline-flex items-center gap-1.5 text-xs font-semibold text-brand-800 bg-brand-200 px-2.5 py-1 rounded-full">
          <CalendarIcon size={12} />
          {formatDate(event.data_de_realizacao)}
          {event.data_de_realizacao && <span className="opacity-80">às {String(event.data_de_realizacao).substring(11, 16)}</span>}
        </span>
      </div>

      <div className="flex items-center gap-1.5 text-sm text-neutral-600 font-medium">
        <MapPin size={14} />
        {event.local || 'Local a definir'}
      </div>

      {event.descricao && (
        <p className="text-neutral-600 text-sm leading-relaxed line-clamp-3 font-['Sora']">
          {event.descricao.split('---FAQS---')[0].trim()}
        </p>
      )}

      <div className="mt-auto pt-4 border-t border-neutral-600/10 flex items-center justify-end">
        <button onClick={onOpen} className="text-xs font-semibold text-brand-800 hover:underline">Ver detalhes</button>
      </div>
    </div>
  )
}

// Cartão: Presenças a confirmar a expirar
export function ActionCard({ item, onAccept, onReject }) {
  return (
    <div className="bg-brand-50 border border-brand-800 rounded-xl p-4 flex relative min-w-[340px]">
      <div className="flex-1 flex flex-col gap-1.5">
        <p className="text-sm">
          <span className="text-brand-900 font-medium">Modalidade: </span>
          <span className="text-brand-800">{item.modalidade}</span>
        </p>
        <p className="text-sm">
          <span className="text-brand-900 font-medium">Data: </span>
          <span className="text-brand-800">{item.data}</span>
        </p>
        <p className="text-sm">
          <span className="text-brand-900 font-medium">Duração: </span>
          <span className="text-brand-800">{item.duracao}</span>
        </p>
        <p className="text-sm">
          <span className="text-brand-900 font-medium">Hora início: </span>
          <span className="text-brand-800">{item.hora}</span>
        </p>
        <p className="text-sm">
          <span className="text-brand-900 font-medium">Tipo: </span>
          <span className="text-brand-800">{item.tipo}</span>
        </p>
      </div>

      <div className="flex flex-col items-end justify-between">
        <div className="flex items-center gap-1.5 pt-1">
          <Clock size={16} className="text-brand-800" />
          <span className="text-xs font-semibold text-black">{item.tempoRestante}</span>
        </div>

        <div className="flex gap-2">
          <button
            onClick={onReject}
            className="w-12 h-12 bg-feedback-error border border-feedback-error-dark rounded-xl flex items-center justify-center hover:opacity-90 transition-opacity"
          >
            <X size={24} strokeWidth={3} className="text-white" />
          </button>
          <button
            onClick={onAccept}
            className="w-12 h-12 bg-feedback-success border border-brand-800 rounded-xl flex items-center justify-center hover:opacity-90 transition-opacity"
          >
            <Check size={24} strokeWidth={3} className="text-white" />
          </button>
        </div>
      </div>
    </div>
  )
}

// Cartão: Próximas aulas / Inscrições aguardar
export function ClassCard({ item, statusType, onOpen }) {
  const isConfirmada = statusType === 'confirmada'

  return (
    <div className="bg-brand-50 border border-brand-800 rounded-xl p-5 flex flex-col justify-between min-w-[340px]">
      <div className="flex justify-between items-start mb-4">
        <div className="flex flex-col gap-1 w-2/3">
          <p className="text-sm">
            <span className="text-brand-900 font-medium">Modalidade: </span>
            <span className="text-brand-800">{item.modalidade}</span>
          </p>
          <p className="text-sm">
            <span className="text-brand-900 font-medium">Data: </span>
            <span className="text-brand-800">{item.data}</span>
          </p>
          <p className="text-sm">
            <span className="text-brand-900 font-medium">Hora início: </span>
            <span className="text-brand-800">{item.hora}</span>
          </p>
          <p className="text-sm">
            <span className="text-brand-900 font-medium">Duração: </span>
            <span className="text-brand-800">{item.duracao}</span>
          </p>
          <p className="text-sm">
            <span className="text-brand-900 font-medium">Estúdio: </span>
            <span className="text-brand-800">{item.estudio || item.sala}</span>
          </p>
          <p className="text-sm">
            <span className="text-brand-900 font-medium">Tipo: </span>
            <span className="text-brand-800">{item.tipo || 'Individual'}</span>
          </p>
        </div>

        <div className="flex flex-col items-center justify-start mt-2">
          <div className="w-14 h-14 rounded-full border-4 border-brand-800 flex items-center justify-center bg-white mb-2 relative overflow-hidden">
            <User size={30} className="text-brand-800" />
          </div>
          <span className="text-brand-900 text-xs text-center leading-tight">Docente<br /><span className="font-bold">{item.docente}</span></span>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <div className={`px-4 py-0.5 rounded-full border text-sm font-medium text-white ${isConfirmada
          ? 'bg-feedback-success border-feedback-success-dark'
          : 'bg-feedback-warning border-feedback-error-dark'
          }`}>
          {isConfirmada ? 'Confirmada' : 'Pendente'}
        </div>
        <button
          onClick={onOpen}
          className="px-5 py-0.5 rounded-full bg-brand-500 border border-brand-800 text-white text-sm font-medium hover:brightness-95 transition-all"
        >
          Ver mais
        </button>
      </div>
    </div>
  )
}


// Cartão: Eventos Rápidos
export function EventDashCard({ item }) {
  return (
    <div className="bg-brand-50 border border-brand-800 rounded-xl p-5 flex flex-col justify-between min-w-[340px] flex-1">
      <div>
        <div className="flex items-center gap-3 mb-4">
          <Megaphone size={28} className="text-brand-800" />
          <h3 className="text-brand-800 font-bold text-lg leading-tight">{item.nome}</h3>
        </div>

        <div className="flex flex-col gap-2 mb-4">
          <p className="text-brand-800 font-semibold text-sm">
            {item.dataLonga || formatDate(item.data_de_realizacao)}
            {item.data_de_realizacao && <span className="opacity-80 ml-1">às {String(item.data_de_realizacao).substring(11, 16)}</span>}
          </p>
          <p className="text-sm">
            <span className="text-brand-900 font-medium">Duração: </span>
            <span className="text-brand-800">{item.duracao || 'A definir'}</span>
          </p>
          <p className="text-sm">
            <span className="text-brand-900 font-medium">Local: </span>
            <span className="text-brand-900">{item.local || 'Lugar a anunciar'}</span>
          </p>
        </div>
        <p className="text-xs text-neutral-500 leading-relaxed mb-6 line-clamp-3">
          {item.descricao ? item.descricao.split('---FAQS---')[0].trim() : 'Nenhuma descrição detalhada disponível para este evento.'}
        </p>
      </div>

      <div className="flex justify-end mt-auto">
        <button className="px-5 py-0.5 rounded-full bg-brand-500 border border-brand-800 text-white text-sm font-semibold hover:brightness-95 transition-all">
          Ver mais
        </button>
      </div>
    </div>
  )
}

// Wrapper das Secções
export function DashboardSection({ title, icon: Icon, children }) {
  return (
    <section className="mb-10 w-full max-w-[1280px] mx-auto">
      <div className="flex items-center gap-3 mb-4 px-6 md:px-0">
        <Icon size={28} className="text-brand-800" />
        <h2 className="text-2xl font-bold text-black font-sans">{title}</h2>
      </div>

      {/* Scroll horizontal Container */}
      <div className="w-full overflow-x-auto pb-4 hide-scrollbar">
        <div className="flex gap-4 px-6 md:px-0 w-max">
          {children}
        </div>
      </div>
    </section>
  )
}


