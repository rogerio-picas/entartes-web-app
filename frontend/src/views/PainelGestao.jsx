import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Network, CheckCircle2, Clock, BookOpen, User } from 'lucide-react'
import { notificacaoService } from '../services/notificacaoService'
import { authService } from '../services/authService'

const CARDS = [
    { label: 'Validação de Coachings',                   path: '/escola',              icon: CheckCircle2 },
    { label: 'Conclusão de Coachings',                   path: '/escola',              icon: BookOpen },
    { label: 'Consultar Horas de Coaching dos Alunos',   path: '/escola',              icon: Clock },
    { label: 'Consultar Horas de Coaching dos Docentes', path: '/escola',              icon: Clock },
    { label: 'Gestão de Utilizadores',                   path: '/gestao/utilizadores', icon: User },
    { label: "Gestão de FAQ's",                          path: null,                   icon: BookOpen },
    { label: 'Gerir Modalidades',                        path: '/modalidades',          icon: BookOpen },
]

function NavCard({ label, onClick, disabled }) {
    return (
        <button
            onClick={onClick}
            disabled={disabled}
            className="bg-brand-light rounded-2xl p-6 text-left w-full h-36
                flex items-start
                hover:brightness-95 active:scale-[0.98] transition-all
                disabled:opacity-40 disabled:cursor-not-allowed"
        >
            <span className="text-brand-darkest font-medium text-sm leading-snug">
                {label}
            </span>
        </button>
    )
}

function NotifSkeleton() {
    return (
        <div className="animate-pulse space-y-3 mt-2">
            {[...Array(9)].map((_, i) => (
                <div
                    key={i}
                    className="h-7 bg-brand-dark/20 rounded-lg"
                    style={{ width: `${70 + (i % 3) * 10}%` }}
                />
            ))}
        </div>
    )
}

export default function PainelGestao() {
    const navigate = useNavigate()
    const user = authService.getUser()

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
        <div className="max-w-[1400px] mx-auto font-['Sora']">
            {/* Header */}
            <div className="flex items-center gap-3 mb-8">
                <Network size={36} className="text-brand-dark" />
                <h1 className="text-brand-darkest font-normal text-4xl leading-tight tracking-tight">
                    Painel de Gestão
                </h1>
            </div>

            {/* Body */}
            <div className="grid grid-cols-[1fr_1fr_300px] gap-5 items-start">
                {/* Card grid */}
                <div className="col-span-2 grid grid-cols-2 gap-5">
                    {CARDS.map(card => (
                        <NavCard
                            key={card.label}
                            label={card.label}
                            disabled={!card.path}
                            onClick={() => card.path && navigate(card.path)}
                        />
                    ))}
                </div>

                {/* Centro de Notificações */}
                <div className="bg-brand-light rounded-2xl p-6">
                    <p className="text-brand-darkest font-medium text-sm mb-4">
                        Centro de Notificações
                    </p>
                    {loadingNotifs ? (
                        <NotifSkeleton />
                    ) : notifs.length === 0 ? (
                        <p className="text-sm text-brand-darkest/60">Sem notificações.</p>
                    ) : (
                        <ul className="space-y-2">
                            {notifs.map(n => (
                                <li
                                    key={n.id}
                                    className={`text-xs px-3 py-2 rounded-lg leading-snug
                                        ${n.lida
                                            ? 'bg-brand-dark/10 text-brand-darkest'
                                            : 'bg-white text-brand-darkest font-medium shadow-sm'
                                        }`}
                                >
                                    <span className="block truncate">{n.titulo}</span>
                                    <span className="text-brand-darkest/50 font-normal">{n.data}</span>
                                </li>
                            ))}
                        </ul>
                    )}
                </div>
            </div>
        </div>
    )
}
