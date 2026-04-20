import { Clock, CalendarCheck, CalendarDays, X, Check, Megaphone, User, Calendar as CalendarIcon, MapPin } from 'lucide-react'

function formatDate(dateStr) {
  if (!dateStr) return '—'
  return new Date(dateStr).toLocaleDateString('pt-PT', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  })
}

export function EventCard({ event, onOpen }) {
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

      <div className="flex items-center gap-1.5 text-sm text-[#4A6362] font-medium">
        <MapPin size={14} />
        {event.local || 'Local a definir'}
      </div>

      {event.descricao && (
        <p className="text-[#4A6362] text-sm leading-relaxed line-clamp-3 font-['Sora']">
          {event.descricao}
        </p>
      )}

      <div className="mt-auto pt-4 border-t border-[#4a6362]/10 flex items-center justify-between">
        <span className="text-[10px] uppercase tracking-wider text-gray-400 font-bold">ID #{event.id_evento}</span>
        <button onClick={onOpen} className="text-xs font-semibold text-[#006A68] hover:underline">Ver detalhes</button>
      </div>
    </div>
  )
}

// Cartão: Presenças a confirmar a expirar
export function ActionCard({ item, onAccept, onReject }) {
  return (
    <div className="bg-brand-bg border border-brand-dark rounded-xl p-4 flex relative min-w-[340px]">
      <div className="flex-1 flex flex-col gap-1.5">
        <p className="text-sm">
          <span className="text-brand-darkest font-medium">Modalidade: </span>
          <span className="text-brand-dark">{item.modalidade}</span>
        </p>
        <p className="text-sm">
          <span className="text-brand-darkest font-medium">Data: </span>
          <span className="text-brand-dark">{item.data}</span>
        </p>
        <p className="text-sm">
          <span className="text-brand-darkest font-medium">Duração: </span>
          <span className="text-brand-dark">{item.duracao}</span>
        </p>
        <p className="text-sm">
          <span className="text-brand-darkest font-medium">Hora início: </span>
          <span className="text-brand-dark">{item.hora}</span>
        </p>
        <p className="text-sm">
          <span className="text-brand-darkest font-medium">Tipo: </span>
          <span className="text-brand-dark">{item.tipo}</span>
        </p>
      </div>

      <div className="flex flex-col items-end justify-between">
        <div className="flex items-center gap-1.5 pt-1">
          <Clock size={16} className="text-brand-dark" />
          <span className="text-xs font-semibold text-black">{item.tempoRestante}</span>
        </div>

        <div className="flex gap-2">
          <button 
            onClick={onReject}
            className="w-12 h-12 bg-[#BA1A1A] border border-[#93000A] rounded-xl flex items-center justify-center hover:opacity-90 transition-opacity"
          >
            <X size={24} strokeWidth={3} className="text-white" />
          </button>
          <button 
            onClick={onAccept}
            className="w-12 h-12 bg-[#049A59] border border-brand-dark rounded-xl flex items-center justify-center hover:opacity-90 transition-opacity"
          >
            <Check size={24} strokeWidth={3} className="text-white" />
          </button>
        </div>
      </div>
    </div>
  )
}

// Cartão: Próximas aulas / Inscrições aguardar
export function ClassCard({ item, statusType }) {
  const isConfirmada = statusType === 'confirmada'
  
  return (
    <div className="bg-brand-bg border border-brand-dark rounded-xl p-5 flex flex-col justify-between min-w-[340px]">
      <div className="flex justify-between items-start mb-4">
        <div className="flex flex-col gap-1 w-2/3">
          <p className="text-sm">
             <span className="text-brand-darkest font-medium">Modalidade: </span>
             <span className="text-brand-dark">{item.modalidade}</span>
          </p>
          <p className="text-sm">
             <span className="text-brand-darkest font-medium">Data: </span>
             <span className="text-brand-dark">{item.data}</span>
          </p>
          <p className="text-sm">
             <span className="text-brand-darkest font-medium">Hora início: </span>
             <span className="text-brand-dark">{item.hora}</span>
          </p>
          <p className="text-sm">
             <span className="text-brand-darkest font-medium">Duração: </span>
             <span className="text-brand-dark">{item.duracao}</span>
          </p>
          <p className="text-sm">
             <span className="text-brand-darkest font-medium">Estúdio: </span>
             <span className="text-brand-dark">{item.estudio}</span>
          </p>
          <p className="text-sm">
             <span className="text-brand-darkest font-medium">Tipo: </span>
             <span className="text-brand-dark">{item.tipo}</span>
          </p>
        </div>

        <div className="flex flex-col items-center justify-start mt-2">
           <div className="w-14 h-14 rounded-full border-4 border-brand-dark flex items-center justify-center bg-white mb-2 relative overflow-hidden">
             <User size={30} className="text-brand-dark mt-3" />
           </div>
           <span className="text-[#00504E] text-xs text-center leading-tight">Docente<br/><span className="font-bold">{item.docente}</span></span>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <div className={`px-4 py-0.5 rounded-full border text-sm font-medium text-white ${
          isConfirmada 
            ? 'bg-[#049A59] border-[#0A7659]' 
            : 'bg-[#FF9500] border-[#B93815]'
        }`}>
          {isConfirmada ? 'Confirmada' : 'Pendente'}
        </div>
        <button className="px-5 py-0.5 rounded-full bg-brand-accent border border-brand-dark text-white text-sm font-medium hover:brightness-95 transition-all">
          Ver mais
        </button>
      </div>
    </div>
  )
}

function formatEventDate(dateStr) {
  if (!dateStr) return 'Data por definir'
  const dateObj = new Date(dateStr)
  const dateFormatted = dateObj.toLocaleDateString('pt-PT', {
    weekday: 'long',
    day: 'numeric',
    month: 'long'
  })
  const capitalizedDate = dateFormatted.charAt(0).toUpperCase() + dateFormatted.slice(1)
  const timeFormatted = dateObj.toLocaleTimeString('pt-PT', {
    hour: '2-digit',
    minute: '2-digit'
  })
  return `${capitalizedDate} às ${timeFormatted}`
}

// Cartão: Eventos Rápidos
export function EventDashCard({ item }) {
  return (
    <div className="bg-brand-bg border border-brand-dark rounded-xl p-5 flex flex-col justify-between min-w-[340px] flex-1">
      <div>
        <div className="flex items-center gap-3 mb-4">
          <Megaphone size={28} className="text-brand-dark" />
          <h3 className="text-brand-dark font-bold text-lg leading-tight">{item.nome}</h3>
        </div>

        <div className="flex flex-col gap-2 mb-4">
          <p className="text-brand-dark font-semibold text-sm">
            {item.dataLonga || formatEventDate(item.data_de_realizacao)}
          </p>
          <p className="text-sm">
            <span className="text-brand-darkest font-medium">Duração: </span>
            <span className="text-brand-dark">{item.duracao || 'A definir'}</span>
          </p>
          <p className="text-sm">
             <span className="text-brand-darkest font-medium">Local: </span>
             <span className="text-brand-darkest">{item.local || 'Lugar a anunciar'}</span>
          </p>
        </div>
        <p className="text-xs text-[#6F7978] leading-relaxed mb-6">
          {item.descricao || 'Nenhuma descrição detalhada disponível para este evento.'}
        </p>
      </div>

      <div className="flex justify-end mt-auto">
        <button className="px-5 py-0.5 rounded-full bg-brand-accent border border-brand-dark text-white text-sm font-semibold hover:brightness-95 transition-all">
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
        <Icon size={28} className="text-brand-dark" />
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
