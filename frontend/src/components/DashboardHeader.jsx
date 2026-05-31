import { useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { authService } from '../services/authService'
import { Home, GraduationCap, User, Bell, Calendar, LogOut, LayoutGrid, Clock, Star, Menu, X } from 'lucide-react'

export default function DashboardHeader({ unreadCount = 0, onBellClick }) {
    const navigate = useNavigate()
    const location = useLocation()
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
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
        <>
            <nav className="bg-neutral-50 border-b-[3px] border-brand-800 px-4 py-3 flex items-center justify-between sticky top-0 z-30 overflow-x-hidden">

                {/* Left: Hamburger & Greeting */}
                <div className="flex items-center gap-2.5 shrink-0">
                    <button
                        onClick={() => setIsMobileMenuOpen(true)}
                        className="md:hidden w-10 h-10 rounded-full hover:bg-brand-200/50 flex items-center justify-center text-brand-900 transition-colors cursor-pointer"
                        title="Menu"
                        aria-label="Abrir Menu"
                    >
                        <Menu size={22} />
                    </button>
                    <button
                        onClick={() => navigate('/profile')}
                        className="w-11 h-11 rounded-full bg-brand-800 flex items-center justify-center shrink-0 hover:bg-brand-900 hover:scale-105 transition-all cursor-pointer outline-none focus:ring-2 focus:ring-brand-500"
                        title="Ver Perfil"
                    >
                        <span className="text-brand-500 text-[15px] font-medium">{firstName?.[0] ?? 'A'}</span>
                    </button>
                    <div className="flex flex-col">
                        <span className="text-neutral-600 text-xs tracking-wide">Olá,</span>
                        <span className="text-black font-semibold text-base leading-tight">
                            {firstName} {lastName}
                        </span>
                        <span className="text-brand-800 text-[9px] font-bold uppercase tracking-wider mt-0.5 leading-none">
                            {user?.role === 1 ? 'Coordenador/a' : user?.role === 2 ? 'Docente' : 'Aluno'}
                        </span>
                    </div>
                </div>

                {/* Centre: Navigation */}
                <div className="hidden md:flex items-center justify-center gap-0.5">
                    {navItems.map((item) => {
                        const isActive = location.pathname === item.path ||
                            (item.path === '/home' && location.pathname === '/')
                        const Icon = item.icon
                        return (
                            <button
                                key={item.label}
                                onClick={() => navigate(item.path)}
                                className="relative flex flex-col items-center justify-center min-w-[130px] px-2 h-14 group outline-none"
                            >
                                <div className={`flex items-center justify-center w-14 h-7 rounded-full mb-1 transition-colors
                                ${isActive ? 'bg-brand-200' : 'bg-transparent group-hover:bg-brand-200/50'}`}>
                                    <Icon size={22} className={
                                        `transition-colors ${isActive ? 'text-neutral-800 fill-brand-800/20' :
                                            'text-brand-900 fill-transparent group-hover:text-brand-900 group-hover:fill-brand-800/50'}`} />
                                </div>
                                <span className={`text-xs font-semibold tracking-wide text-center leading-tight ${isActive ? 'text-neutral-800' : 'text-brand-900'}`}>
                                    {item.label}
                                </span>
                            </button>
                        )
                    })}
                </div>

                {/* Right: Actions */}
                <div className="flex items-center gap-2.5 shrink-0">
                    {/* Bell with unread badge */}
                    <button
                        onClick={onBellClick}
                        className="relative flex items-center justify-center w-9 h-9 bg-neutral-600 rounded-full hover:bg-brand-900 transition-colors"
                        title="Notificações"
                        aria-label={`Notificações${unreadCount > 0 ? ` — ${unreadCount} por ler` : ''}`}
                    >
                        <Bell size={18} className="text-white" />
                        {unreadCount > 0 && (
                            <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 bg-feedback-error text-white text-[10px] font-bold rounded-full flex items-center justify-center border-2 border-neutral-50">
                                {unreadCount > 99 ? '99+' : unreadCount}
                            </span>
                        )}
                    </button>

                    <button
                        onClick={handleLogout}
                        className="flex items-center justify-center w-9 h-9 bg-brand-50 border border-brand-800 rounded-full hover:bg-red-50 hover:border-red-300 transition-colors group"
                        title="Terminar Sessão"
                    >
                        <LogOut size={16} className="text-brand-800 group-hover:text-red-600 transition-colors" />
                    </button>
                </div>
            </nav>

            {/* Mobile Menu Backdrop */}
            <div
                className={`fixed inset-0 bg-black/40 backdrop-blur-[2px] z-40 transition-opacity duration-300 md:hidden ${isMobileMenuOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
                    }`}
                onClick={() => setIsMobileMenuOpen(false)}
            />

            {/* Mobile Menu Drawer */}
            <aside
                className={`fixed top-0 left-0 bottom-0 h-full w-[280px] max-w-[85vw] bg-white z-50 shadow-2xl flex flex-col transform transition-transform duration-300 ease-out md:hidden ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'
                    }`}
            >
                {/* Header */}
                <div className="bg-neutral-50 border-b-[3px] border-brand-800 px-5 py-4 flex items-center justify-between shrink-0">
                    <div className="flex items-center gap-2">
                        <span className="font-bold text-brand-800 text-base font-['Sora'] leading-tight">Navegação</span>
                    </div>
                    <button
                        onClick={() => setIsMobileMenuOpen(false)}
                        className="w-8 h-8 rounded-full hover:bg-brand-200 flex items-center justify-center text-neutral-600 transition-colors cursor-pointer"
                        aria-label="Fechar Menu"
                    >
                        <X size={18} />
                    </button>
                </div>

                {/* Navigation Links */}
                <div className="flex-1 overflow-y-auto px-4 py-4 flex flex-col gap-1.5">
                    {navItems.map((item) => {
                        const isActive = location.pathname === item.path ||
                            (item.path === '/home' && location.pathname === '/')
                        const Icon = item.icon
                        return (
                            <button
                                key={item.label}
                                onClick={() => {
                                    navigate(item.path)
                                    setIsMobileMenuOpen(false)
                                }}
                                className={`flex items-center gap-3.5 w-full px-4 py-3.5 rounded-xl font-semibold text-sm transition-all duration-200 text-left outline-none cursor-pointer ${isActive
                                    ? 'bg-brand-200 text-neutral-800'
                                    : 'text-brand-900 hover:bg-brand-200/40 hover:text-neutral-800'
                                    }`}
                            >
                                <Icon size={20} className={isActive ? 'text-neutral-800' : 'text-brand-900'} />
                                <span>{item.label}</span>
                            </button>
                        )
                    })}
                </div>

                {/* Footer / User info */}
                <div className="p-4 border-t border-neutral-100 flex items-center gap-3">
                    <button
                        onClick={handleLogout}
                        className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-brand-50 border border-brand-800 hover:bg-red-50 hover:border-red-300 text-brand-800 hover:text-red-600 font-semibold text-sm transition-colors cursor-pointer"
                    >
                        <LogOut size={16} />
                        <span>Terminar Sessão</span>
                    </button>
                </div>
            </aside>
        </>
    )
}
