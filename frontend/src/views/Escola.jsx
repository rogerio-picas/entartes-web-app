import { useState } from 'react'
import { CalendarCheck, BookOpen, Clock, Coins } from 'lucide-react'
import { ValidacaoModal, HistoricoModal, CoachingModal, ExtratoModal } from '../components/EscolaModais'
import ActionCard from '../components/ActionCard'
import { authService } from '../services/authService'

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function Escola() {
    const [modal, setModal] = useState(null)
    const role = authService.getUser()?.role ?? 3

    const cards = [
        ...(role === 1 ? [{ key: 'validacao', label: 'Validação de Aulas', icon: CalendarCheck, description: 'Confirma as aulas pendentes das próximas 48h' }] : []),
        { key: 'historico', label: 'Histórico de Aulas', icon: BookOpen, description: 'Consulta o historial completo de marcações' },
        { key: 'coaching', label: 'Consultar Horas de Coaching', icon: Clock, description: 'Total de horas e sessões por docente' },
        { key: 'extrato', label: 'Consultar Extrato Mensal', icon: Coins, description: 'Sessões concluídas num intervalo de datas' },
    ]

    return (
        <>
            <div className="font-['Sora']">
                {/* Header */}
                <div className="mb-8">
                    <p className="text-neutral-600 text-sm font-medium tracking-wide mb-1">Serviços & Documentação</p>
                    <h1 className="text-neutral-800 font-normal text-3xl leading-tight tracking-tight flex items-center gap-3">
                        <span className="w-10 h-10 bg-brand-800 rounded-xl flex items-center justify-center shrink-0">
                            <BookOpen size={20} className="text-white" />
                        </span>
                        <span>Escola</span>
                    </h1>
                </div>

                {/* Content: Action Cards Grid */}
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

            {modal === 'validacao' && <ValidacaoModal onClose={() => setModal(null)} />}
            {modal === 'historico' && <HistoricoModal onClose={() => setModal(null)} />}
            {modal === 'coaching' && <CoachingModal onClose={() => setModal(null)} />}
            {modal === 'extrato' && <ExtratoModal onClose={() => setModal(null)} />}
        </>
    )
}

