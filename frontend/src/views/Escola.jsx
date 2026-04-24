import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import {
    CalendarCheck, BookOpen, Clock, Coins,
    ChevronRight, RefreshCw, Megaphone
} from 'lucide-react'
import { api } from '../services/api'
import {
    ValidacaoModal, HistoricoModal, CoachingModal, ExtratoModal, formatDate
} from '../components/EscolaModais'
import ActionCard from '../components/ActionCard'

// ─── Novidades panel ──────────────────────────────────────────────────────────
function Novidades() {
    const [anuncios, setAnuncios] = useState([])
    const [loading, setLoading] = useState(true)
    const [selected, setSelected] = useState(null)

    useEffect(() => {
        api.get('/anuncios')
            .then(d => setAnuncios(Array.isArray(d) ? d : []))
            .catch(() => setAnuncios([]))
            .finally(() => setLoading(false))
    }, [])

    return (
        <div className="bg-[#CCE8E6] rounded-2xl p-5 flex flex-col h-full min-h-[400px]">
            <div className="flex items-center gap-2 mb-4">
                <Megaphone size={18} className="text-[#006A68]" />
                <h3 className="font-bold text-black text-[17px] tracking-[0.17px] font-['Sora']">Novidades</h3>
            </div>

            {loading ? (
                <div className="flex-1 flex items-center justify-center">
                    <RefreshCw size={20} className="text-[#006A68] animate-spin" />
                </div>
            ) : anuncios.length === 0 ? (
                <div className="flex flex-col gap-3 flex-1">
                    {[...Array(9)].map((_, i) => (
                        <div key={i} className="h-[38px] rounded-xl bg-[#B0CCCA] opacity-80" />
                    ))}
                </div>
            ) : (
                <ul className="flex flex-col gap-2.5 flex-1 overflow-y-auto hide-scrollbar">
                    {anuncios.map(a => (
                        <li key={a.id_anuncio}>
                            <button
                                onClick={() => setSelected(selected?.id_anuncio === a.id_anuncio ? null : a)}
                                className="w-full text-left bg-[#B0CCCA] hover:bg-[#006A68]/20 transition-colors rounded-xl px-3.5 py-2.5"
                            >
                                <div className="flex items-start justify-between gap-2">
                                    <p className="text-xs font-bold text-[#324B4A] leading-snug line-clamp-1">{a.titulo}</p>
                                    <ChevronRight size={12} className={`shrink-0 text-[#4A6362] mt-0.5 transition-transform ${selected?.id_anuncio === a.id_anuncio ? 'rotate-90' : ''}`} />
                                </div>
                                {a.data_envio && (
                                    <p className="text-[10px] text-[#4A6362] mt-0.5">{formatDate(a.data_envio)}</p>
                                )}
                            </button>
                            {selected?.id_anuncio === a.id_anuncio && (
                                <div className="bg-white/60 rounded-xl px-3.5 py-2.5 mt-1 text-xs text-[#324B4A] leading-relaxed">
                                    {a.mensagem ?? 'Sem conteúdo.'}
                                </div>
                            )}
                        </li>
                    ))}
                </ul>
            )}
        </div>
    )
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function Escola() {
    const [modal, setModal] = useState(null)

    const cards = [
        { key: 'validacao', label: 'Validação de Aulas',        icon: CalendarCheck, description: 'Confirma as aulas pendentes das próximas 48h' },
        { key: 'historico', label: 'Histórico de Aulas',         icon: BookOpen,      description: 'Consulta o historial completo de marcações' },
        { key: 'coaching',  label: 'Consultar Horas de Coaching', icon: Clock,        description: 'Total de horas e sessões por docente' },
        { key: 'extrato',   label: 'Consultar Extrato Mensal',   icon: Coins,         description: 'Sessões concluídas num intervalo de datas' },
    ]

    return (
        <>
            <div className="font-['Sora']">
                {/* Header */}
                <div className="mb-8">
                    <p className="text-[#4A6362] text-sm font-medium tracking-wide mb-1">Serviços & Documentação</p>
                    <h1 className="text-[#324B4A] font-normal text-4xl leading-tight tracking-tight flex items-center gap-3">
                        <span className="w-10 h-10 bg-[#006A68] rounded-xl flex items-center justify-center shrink-0">
                            <BookOpen size={20} className="text-white" />
                        </span>
                        <span>Escola</span>
                    </h1>
                </div>

                {/* Content: 2-col grid + Novidades */}
                <div className="flex flex-col lg:flex-row gap-6">
                    <div className="flex-1">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                            {cards.map(card => (
                                <ActionCard
                                    key={card.key}
                                    label={card.label}
                                    icon={card.icon}
                                    description={card.description}
                                    onClick={() => setModal(card.key)}
                                />
                            ))}
                        </div>
                    </div>
                    <div className="w-full lg:w-[302px] shrink-0">
                        <Novidades />
                    </div>
                </div>
            </div>

            {modal === 'validacao' && <ValidacaoModal onClose={() => setModal(null)} />}
            {modal === 'historico' && <HistoricoModal onClose={() => setModal(null)} />}
            {modal === 'coaching'  && <CoachingModal  onClose={() => setModal(null)} />}
            {modal === 'extrato'   && <ExtratoModal   onClose={() => setModal(null)} />}
        </>
    )
}
