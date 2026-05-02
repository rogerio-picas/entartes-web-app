import { useState } from 'react'
import { UserCog, BellRing, Music2, LifeBuoy, LogOut, ChevronRight } from 'lucide-react'
import { authService } from '../services/authService'
import { useNavigate } from 'react-router-dom'
import EditarPerfilModal from '../components/EditarPerfilModal'

export default function ProfileManagement() {
  const navigate = useNavigate()
  const [showEditarPerfil, setShowEditarPerfil] = useState(false)

  // Pegamos no utilizador e role
  const user = authService.getUser()
  const role = user?.role ?? 3

  const handleLogout = () => {
    authService.logout()
    navigate('/login')
  }

  // Lista de opções dinâmica
  const profileOptions = [
    {
      title: 'Alterar dados pessoais',
      icon: UserCog,
      onClick: () => setShowEditarPerfil(true),
    },
    {
      title: 'Gestão de Notificações',
      icon: BellRing,
      onClick: () => console.log('Notificações')
    },
    // Apenas mostra "Gerir Modalidades" se não for aluno (role 3)
    ...(role !== 3 ? [{
      title: 'Gerir modalidades',
      icon: Music2,
      onClick: () => navigate('/modalidades')
    }] : []),
    {
      title: 'Ajuda e Suporte',
      icon: LifeBuoy,
      onClick: () => console.log('Suporte')
    },
  ]

  return (
    <div className="font-['Sora'] pb-10">
      {/* Page Header */}
      <div className="mb-8">
        <p className="text-neutral-600 text-sm font-medium tracking-wide mb-1">
          Configurações de Conta
        </p>
        <h1 className="text-neutral-800 font-normal text-4xl leading-tight tracking-tight">
          Gestão de <span className="text-brand-800 font-semibold">Perfil</span>
        </h1>
      </div>

      {/* Options Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {profileOptions.map((option, index) => {
          const Icon = option.icon
          return (
            <button
              key={index}
              onClick={option.onClick}
              className="flex items-center justify-between p-6 rounded-[20px] bg-brand-200 hover:bg-brand-500 transition-colors group text-left"
            >
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-brand-800 flex items-center justify-center text-brand-500 group-hover:scale-110 transition-transform">
                  <Icon size={24} />
                </div>
                <h3 className="text-brand-800 text-[20px] font-semibold leading-tight">
                  {option.title}
                </h3>
              </div>
              <div className="text-brand-800/40 group-hover:text-brand-800 transition-colors">
                <ChevronRight size={24} strokeWidth={2.5} />
              </div>
            </button>
          )
        })}
      </div>

      {/* Logout Section */}
      <div className="mt-12 pt-8 border-t border-neutral-600/10 flex flex-col items-center text-center">
        <button
          onClick={handleLogout}
          className="flex items-center justify-center gap-3 w-full max-w-[400px] h-[56px] rounded-xl bg-feedback-error-light text-feedback-error-dark hover:bg-feedback-error-light transition-colors font-semibold text-base"
        >
          <LogOut size={20} />
          Terminar Sessão
        </button>
        <p className="mt-4 text-xs text-neutral-600 opacity-60 px-2 max-w-[400px]">
          Ao sair, terás de introduzir as tuas credenciais novamente para aceder ao dashboard.
        </p>
      </div>

      {/* Modal - Renderizado fora da grid para evitar problemas de z-index */}
      {showEditarPerfil && (
        <EditarPerfilModal
          onClose={() => setShowEditarPerfil(false)}
          onSuccess={() => {
            window.dispatchEvent(new Event('profile-updated'))
            setShowEditarPerfil(false)
          }}
        />
      )}
    </div>
  )
}

