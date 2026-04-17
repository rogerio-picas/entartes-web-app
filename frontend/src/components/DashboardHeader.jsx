import { useNavigate, useLocation } from 'react-router-dom'
import { authService } from '../services/authService'
import { Home, CalendarDays, Users, GraduationCap, User, Bell, Calendar, LogOut } from 'lucide-react'

export default function DashboardHeader() {
  const navigate = useNavigate()
  const location = useLocation()
  const user = authService.getUser() || { nome: 'Ana Pinto' } 
  const [firstName, lastName] = user.nome.split(' ')

  function handleLogout() {
    authService.logout()
    navigate('/login')
  }

  const navItems = [
    { label: 'Início',   path: '/',         icon: Home },
    { label: 'Eventos',  path: '/events',   icon: Calendar },
    { label: 'Horário',  path: '/horario',  icon: CalendarDays }, // Ajustado de /schedule para /horario
    { label: 'Aulas',    path: '/aulas',    icon: Users },        // Ajustado de /classes para /aulas
    { label: 'Escola',   path: '/escola',   icon: GraduationCap }, // Ajustado de /school para /escola
    { label: 'Perfil',   path: '/profile',  icon: User },
  ]

  return (
    <nav className="bg-[#EFF5F4] border-b-[3px] border-brand-dark px-6 py-4 flex items-center justify-between sticky top-0 z-50">
      
      {/* Esquerda: Perfil / Saudação */}
      <div className="flex items-center gap-3">
        <div className="w-12 h-12 rounded-full bg-brand-dark flex items-center justify-center">
          <span className="text-[#9CF1EE] text-lg font-medium">{firstName[0]}</span>
        </div>
        <div className="flex flex-col">
          <span className="text-secondary-dark text-sm tracking-wide">Bem-vindo</span>
          <span className="text-black font-semibold text-xl leading-tight">
            {firstName} {lastName || ''}
          </span>
        </div>
      </div>

      {/* Centro: Links de Navegação */}
      <div className="hidden md:flex items-center justify-center gap-2">
        {navItems.map((item) => {
          const isActive = location.pathname === item.path || (item.path === '/' && location.pathname === '/home');
          const Icon = item.icon
          return (
            <button
              key={item.label}
              onClick={() => navigate(item.path)}
              className="relative flex flex-col items-center justify-center w-[90px] h-16 group outline-none"
            >
              <div 
                className={`flex items-center justify-center w-16 h-8 rounded-full mb-1 transition-colors ${
                  isActive ? 'bg-brand-light' : 'bg-transparent group-hover:bg-brand-light/50'
                }`}
              >
                <Icon 
                  size={20} 
                  className={isActive ? 'text-[#324B4A]' : 'text-brand-darkest group-hover:text-[#324B4A]'} 
                />
              </div>
              <span className={`text-xs font-medium tracking-wide ${isActive ? 'text-[#324B4A]' : 'text-brand-darkest'}`}>
                {item.label}
              </span>

              {/* Badge (Notificações pequenas do menu nav) */}
              {item.badge && (
                <div className="absolute top-1 right-5 flex items-center justify-center min-w-[16px] h-4 px-1 bg-[#B3261E] rounded-full text-white text-[10px] font-medium border border-[#EFF5F4]">
                  {item.badge}
                </div>
              )}
            </button>
          )
        })}
      </div>

      {/* Direita: Ações */}
      <div className="flex items-center gap-3">
        <button className="flex items-center justify-center w-10 h-10 bg-[#4A6362] rounded-full hover:bg-[#3A504F] transition-colors" title="Notificações">
          <Bell size={20} className="text-white" />
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
