import { UserCog, BellRing, Music2, LifeBuoy, LogOut } from 'lucide-react'
import { authService } from '../services/authService'
import { useNavigate } from 'react-router-dom'

export default function ProfileManagement() {
  const navigate = useNavigate()

  const handleLogout = () => {
    authService.logout()
    navigate('/login')
  }

  const profileOptions = [
    { title: 'Alterar dados pessoais', icon: UserCog },
    { title: 'Gestão de Notificações', icon: BellRing },
    { title: 'Gerir modalidades', icon: Music2 },
    { title: 'Ajuda e Suporte', icon: LifeBuoy },
  ]

  return (
    <div className="font-['Sora']">
      
      {/* Cabeçalho da Página (Consistente com Home, Aulas e Eventos) */}
      <div className="mb-8">
        <p className="text-[#4A6362] text-sm font-medium tracking-wide mb-1">Configurações de Conta</p>
        <h1 className="text-[#324B4A] font-normal text-4xl leading-tight tracking-tight">
          Gestão de <span className="text-[#006A68] font-semibold">Perfil</span>
        </h1>
      </div>

      {/* Grid de Opções */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {profileOptions.map((option, index) => {
          const Icon = option.icon
          return (
            <button
              key={index}
              className="flex items-center justify-between p-6 rounded-[20px] bg-[#CCE8E6] hover:bg-[#B8E0DE] transition-colors group text-left"
            >
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-[#006A68] flex items-center justify-center text-[#9CF1EE] group-hover:scale-110 transition-transform">
                  <Icon size={24} />
                </div>
                <h3 className="text-[#006A68] text-[20px] font-semibold leading-tight">
                  {option.title}
                </h3>
              </div>
              <div className="text-[#006A68]/40 group-hover:text-[#006A68] transition-colors">
                <svg width="24" height="24" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                </svg>
              </div>
            </button>
          )
        })}
      </div>

      {/* Ação de Sair (Redesenhada para o padrão do sistema) */}
      <div className="mt-12 pt-8 border-t border-[#4a6362]/10">
        <button 
          onClick={handleLogout}
          className="flex items-center justify-center gap-3 w-full max-w-[400px] h-[56px] rounded-xl bg-[#FFDAD6] text-[#410002] hover:bg-[#FFB4AB] transition-colors font-semibold text-base"
        >
          <LogOut size={20} />
          Terminar Sessão
        </button>
        <p className="mt-4 text-xs text-[#4A6362] opacity-60 px-2">
          Ao sair, terás de introduzir as tuas credenciais novamente para aceder ao dashboard.
        </p>
      </div>
    </div>
  )
}