import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Network, CheckCircle2, BookOpen, User } from 'lucide-react'
import { notificacaoService } from '../services/notificacaoService'
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
    { label: "Gestão de FAQ's",                          icon: BookOpen,     description: 'Em breve disponível' },
    { label: 'Gerir Modalidades',                        path: '/modalidades',         icon: BookOpen,   description: 'Configurar modalidades disponíveis' },
]

function NotifSkeleton() {
    return (
        <div className="animate-pulse space-y-3 mt-2">
            {[...Array(9)].map((_, i) => (
                <div
                    key={i}
                    className="h-7 bg-brand-800/20 rounded-lg"
                    style={{ width: `${70 + (i % 3) * 10}%` }}
                />
            ))}
        </div>
    )
}

export default function PainelGestao() {
    const navigate = useNavigate()
    const user = authService.getUser()
    const [modal, setModal] = useState(null)

    useEffect(() => {
        if (user?.role !== 1) navigate('/', { replace: true })
    }, [user, navigate])

    const [notifs, setNotifs] = useState([])
    const [loadingNotifs, setLoadingNotifs] = useState(true)

    useEffect(() => {
        notificacaoService.getAll()
            .then(data => setNotifs(data.slice(0, 9)))
            .catch(() => setNotifs([]))
            .finally(() => setLoadingNotifs(false))
    }, [])

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
                <div className="grid grid-cols-[1fr_1fr_300px] gap-5 items-start">
                    {/* Card grid */}
                    <div className="col-span-2 grid grid-cols-2 gap-5">
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

                    {/* Centro de Notificações */}
                    <div className="bg-brand-200 rounded-2xl p-6">
                        <p className="text-brand-900 font-medium text-sm mb-4">
                            Centro de Notificações
                        </p>
                        {loadingNotifs ? (
                            <NotifSkeleton />
                        ) : notifs.length === 0 ? (
                            <p className="text-sm text-brand-900/60">Sem notificações.</p>
                        ) : (
                            <ul className="space-y-2">
                                {notifs.map(n => (
                                    <li
                                        key={n.id}
                                        className={`text-xs px-3 py-2 rounded-lg leading-snug
                                            ${n.lida
                                                ? 'bg-brand-800/10 text-brand-900'
                                                : 'bg-white text-brand-900 font-medium shadow-sm'
                                            }`}
                                    >
                                        <span className="block truncate">{n.titulo}</span>
                                        <span className="text-brand-900/50 font-normal">{n.data}</span>
                                    </li>
                                ))}
                            </ul>
                        )}
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
