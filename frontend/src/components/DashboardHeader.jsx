import { useNavigate, useLocation } from 'react-router-dom'
import { authService } from '../services/authService'
import { Home, CalendarDays, Users, GraduationCap, User, Bell, Calendar, LogOut , LayoutGrid} from 'lucide-react'

export default function DashboardHeader({ unreadCount = 0, onBellClick }) {
    const navigate = useNavigate()
    const location = useLocation()
    const user = authService.getUser() || {}
    const role = user.role ?? 3    
    const [firstName, ...rest] = (user.nome ?? '').split(' ')
    const lastName = rest.at(-1) ?? ''
    

    function handleLogout() {
        authService.logout()
        navigate('/login')
    }

  
  const navItems = role === 1
  ? [
      { label: 'Início',   path: '/admin/home',  icon: Home },
      { label: 'Horário',  path: '/horario',      icon: Calendar },
      { label: 'Aulas',    path: '/admin/aulas',  icon: CalendarDays },
      { label: 'Escola',   path: '/escola',       icon: GraduationCap },
      { label: 'Eventos',  path: '/eventos',      icon: CalendarDays },
      { label: 'Grupos',   path: '/grupos',       icon: LayoutGrid },
      { label: 'Perfil',   path: '/profile',      icon: User },
    ]
  : role === 2
  ? [
      { label: 'Início',   path: '/docente/home', icon: Home },
      { label: 'Horário',  path: '/horario',      icon: Calendar },
      { label: 'Aulas',    path: '/aulas',        icon: CalendarDays },
      { label: 'Escola',   path: '/escola',       icon: GraduationCap },
      { label: 'Eventos',  path: '/eventos',      icon: CalendarDays },
      { label: 'Perfil',   path: '/profile',      icon: User },
    ]
  : [
      { label: 'Início',   path: '/aluno/home',   icon: Home },
      { label: 'Horário',  path: '/horario',      icon: Calendar },
      { label: 'Aulas',    path: '/aulas',        icon: CalendarDays },
      { label: 'Eventos',  path: '/eventos',      icon: CalendarDays },
      { label: 'Perfil',   path: '/profile',      icon: User },
    ]

  return (
        <nav className="bg-[#EFF5F4] border-b-[3px] border-brand-dark px-6 py-4 flex items-center justify-between sticky top-0 z-30">
 
            {/* Left: Greeting */}
            <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-brand-dark flex items-center justify-center shrink-0">
                    <span className="text-[#9CF1EE] text-lg font-medium">{firstName?.[0] ?? 'A'}</span>
                </div>
                <div className="flex flex-col">
                    <span className="text-[#4A6362] text-sm tracking-wide">Bem-vinda</span>
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
                            className="relative flex flex-col items-center justify-center w-[88px] h-16 group outline-none"
                        >
                            <div className={`flex items-center justify-center w-16 h-8 rounded-full mb-1 transition-colors
                                ${isActive ? 'bg-brand-light' : 'bg-transparent group-hover:bg-brand-light/50'}`}>
                                <Icon size={20} className={isActive ? 'text-[#324B4A]' : 'text-brand-darkest group-hover:text-[#324B4A]'} />
                            </div>
                            <span className={`text-xs font-medium tracking-wide ${isActive ? 'text-[#324B4A]' : 'text-brand-darkest'}`}>
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
                    className="relative flex items-center justify-center w-10 h-10 bg-[#4A6362] rounded-full hover:bg-[#3A504F] transition-colors"
                    title="Notificações"
                    aria-label={`Notificações${unreadCount > 0 ? ` — ${unreadCount} por ler` : ''}`}
                >
                    <Bell size={20} className="text-white" />
                    {unreadCount > 0 && (
                        <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 bg-[#B3261E] text-white text-[10px] font-bold rounded-full flex items-center justify-center border-2 border-[#EFF5F4]">
                            {unreadCount > 99 ? '99+' : unreadCount}
                        </span>
                    )}
                </button>
 
                <button
                    onClick={handleLogout}
                    className="flex items-center justify-center w-10 h-10 bg-brand-bg border border-brand-dark rounded-full hover:bg-red-50 hover:border-red-300 transition-colors group"
                    title="Terminar Sessão"
                >
                    <LogOut size={18} className="text-brand-dark group-hover:text-red-600 transition-colors" />
                </button>
            </div>
        </nav>
    )
}