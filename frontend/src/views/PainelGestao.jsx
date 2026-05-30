import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Network, CheckCircle2, BookOpen, User } from 'lucide-react'
import { authService } from '../services/authService'
import {
    ValidacaoCoachingModal, ListagemCoachingModal, HorasCoachingModal
} from '../components/EscolaModais'
import ActionCard from '../components/ActionCard'

const normalizeHorasDocente = d => d.map(r => ({
    id:           r.id_docente,
    nome:         r.nome ?? `Docente #${r.id_docente}`,
    modalidades:  r.modalidades ?? [],
    totalSessoes: r._count ?? 0,
    totalMinutos: r._sum?.duracao_minutos ?? 0,
}))

const CARDS = [
    { label: 'Validação de Coachings',                   modal: 'validacao', icon: CheckCircle2, description: 'Validar sessões de coaching pendentes' },
    { label: 'Listagem de Coaching',                      modal: 'historico', icon: BookOpen,     description: 'Consultar listagem de sessões de coaching' },
    { label: 'Consultar Horas de Coaching dos Alunos',   modal: 'coaching',  icon: BookOpen,     description: 'Ver total de horas de coaching dos alunos' },
    { label: 'Consultar Horas de Coaching dos Docentes', modal: 'docentes',  icon: BookOpen,     description: 'Ver total de horas de coaching dos docentes' },
    { label: 'Gestão de Utilizadores',                   path: '/gestao/utilizadores', icon: User,       description: 'Gerir contas de alunos e docentes' },
    { label: 'Gerir Modalidades',                        path: '/modalidades',         icon: BookOpen,   description: 'Configurar modalidades disponíveis' },
]

export default function PainelGestao() {
    const navigate = useNavigate()
    const user = authService.getUser()
    const [modal, setModal] = useState(null)

    useEffect(() => {
        if (user?.role !== 1) navigate('/', { replace: true })
    }, [user, navigate])

    return (
        <>
            <div className="max-w-[1400px] mx-auto font-['Sora']">
                {/* Header */}
                <div className="flex items-center gap-3 mb-8">
                    <Network size={36} className="text-brand-800" />
                    <h1 className="text-brand-900 font-normal text-3xl leading-tight tracking-tight">
                        Painel de Gestão
                    </h1>
                </div>

                {/* Body */}
                <div>
                    {/* Card grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                        {CARDS.map(card => (
                            <ActionCard
                                key={card.label}
                                label={card.label}
                                icon={card.icon}
                                description={card.description}
                                disabled={!card.modal && !card.path}
                                onClick={() => {
                                    if (card.modal) setModal(card.modal)
                                    else if (card.path) navigate(card.path)
                                }}
                            />
                        ))}
                    </div>
                </div>
            </div>

            {modal === 'validacao' && <ValidacaoCoachingModal onClose={() => setModal(null)} />}
            {modal === 'historico' && <ListagemCoachingModal onClose={() => setModal(null)} />}
            {modal === 'coaching'  && <HorasCoachingModal title="Consultar Horas de Coaching dos Alunos" endpoint="/relatorio/alunos" exportFilename="horas_coaching_alunos" showDateFilter onClose={() => setModal(null)} />}
            {modal === 'docentes'  && <HorasCoachingModal title="Consultar Horas de Coaching dos Docentes" endpoint="/relatorio/horas-docente" normalize={normalizeHorasDocente} exportFilename="horas_coaching_docentes" showDateFilter onClose={() => setModal(null)} />}
        </>
    )
}
