import { useNavigate, useLocation } from 'react-router-dom'
import { authService } from '../services/authService'
import { Home, GraduationCap, User, Bell, Calendar, LogOut, LayoutGrid, Clock, Star } from 'lucide-react'

export default function DashboardHeader({ unreadCount = 0, onBellClick }) {
    const navigate = useNavigate()
    const location = useLocation()
    const user = authService.getUser() || { nome: 'Ana Pinto' }
    const [firstName, ...rest] = (user.nome ?? '').split(' ')
    const lastName = rest.at(-1) ?? ''

    function handleLogout() {
        authService.logout()
        navigate('/login')
    }


    const isAdmin = user?.role === 1

    const navItems = [
        { label: 'Início', path: '/home', icon: Home },
        { label: 'Horário', path: '/horario', icon: Calendar },
        { label: 'Coachings', path: '/aulas', icon: Clock },
        ...(isAdmin ? [{ label: 'Painel de Gestão', path: '/gestao', icon: LayoutGrid }] : []),
        { label: 'Escola', path: '/escola', icon: GraduationCap },
        { label: 'Eventos', path: '/eventos', icon: Star },
        { label: 'Perfil', path: '/profile', icon: User },
    ]

    return (
        <nav className="bg-neutral-50 border-b-[3px] border-brand-800 px-6 py-4 flex items-center justify-between sticky top-0 z-30">

            {/* Left: Greeting */}
            <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-brand-800 flex items-center justify-center shrink-0">
                    <span className="text-brand-500 text-lg font-medium">{firstName?.[0] ?? 'A'}</span>
                </div>
                <div className="flex flex-col">
                    <span className="text-neutral-600 text-sm tracking-wide">Olá,</span>
                    <span className="text-black font-semibold text-xl leading-tight">
                        {firstName} {lastName}
                    </span>
                </div>
            </div>

            {/* Centre: Navigation */}
            <div className="hidden md:flex items-center justify-center gap-1">
                {navItems.map((item) => {
                    const isActive = location.pathname === item.path ||
                        (item.path === '/home' && location.pathname === '/')
                    const Icon = item.icon
                    return (
                        <button
                            key={item.label}
                            onClick={() => navigate(item.path)}
                            className="relative flex flex-col items-center justify-center min-w-[150px] px-2 h-16 group outline-none"
                        >
                            <div className={`flex items-center justify-center w-16 h-8 rounded-full mb-1 transition-colors
                                ${isActive ? 'bg-brand-200' : 'bg-transparent group-hover:bg-brand-200/50'}`}>
                                <Icon size={24} className={
                                    `transition-colors ${isActive ? 'text-neutral-800 fill-brand-800/20' :
                                        'text-brand-900 fill-transparent group-hover:text-brand-900 group-hover:fill-brand-800/50'}`} />
                            </div>
                            <span className={`text-sm font-semibold tracking-wide text-center leading-tight ${isActive ? 'text-neutral-800' : 'text-brand-900'}`}>
                                {item.label}
                            </span>
                        </button>
                    )
                })}
            </div>

            {/* Right: Actions */}
            <div className="flex items-center gap-3">
                {/* Bell with unread badge */}
                <button
                    onClick={onBellClick}
                    className="relative flex items-center justify-center w-10 h-10 bg-neutral-600 rounded-full hover:bg-brand-900 transition-colors"
                    title="Notificações"
                    aria-label={`Notificações${unreadCount > 0 ? ` — ${unreadCount} por ler` : ''}`}
                >
                    <Bell size={20} className="text-white" />
                    {unreadCount > 0 && (
                        <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 bg-feedback-error text-white text-[10px] font-bold rounded-full flex items-center justify-center border-2 border-neutral-50">
                            {unreadCount > 99 ? '99+' : unreadCount}
                        </span>
                    )}
                </button>

                <button
                    onClick={handleLogout}
                    className="flex items-center justify-center w-10 h-10 bg-brand-50 border border-brand-800 rounded-full hover:bg-red-50 hover:border-red-300 transition-colors group"
                    title="Terminar Sessão"
                >
                    <LogOut size={18} className="text-brand-800 group-hover:text-red-600 transition-colors" />
                </button>
            </div>
        </nav>
    )
}

