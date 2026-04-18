import { NavLink, useNavigate } from 'react-router-dom'
import { authService } from '../services/authService'

export default function Navbar() {
  const navigate = useNavigate()
  const user = authService.getUser()

  function handleLogout() {
    authService.logout()
    navigate('/login')
  }

  return (
    <nav className="fixed top-0 left-0 z-50 w-full bg-white/95 backdrop-blur border-b border-gray-200 px-6 py-4 shadow-sm">
      <div className="max-w-6xl mx-auto flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center">
            <span className="text-white text-sm font-bold">E</span>
          </div>
          <span className="text-gray-900 font-semibold text-lg">Entartes</span>
        </div>

        <div className="flex flex-col gap-4 md:flex-row md:items-center md:gap-6">
          <div className="flex flex-wrap items-center gap-3">
            <NavLink
              to="/inicio"
              className={({ isActive }) =>
                `text-sm font-medium ${isActive ? 'text-[#00504E]' : 'text-gray-600 hover:text-slate-900'}`
              }
            >
              Início
            </NavLink>
            <NavLink
              to="/horario"
              className={({ isActive }) =>
                `text-sm font-medium ${isActive ? 'text-[#00504E]' : 'text-gray-600 hover:text-slate-900'}`
              }
            >
              Horário
            </NavLink>
            <NavLink
              to="/events"
              className={({ isActive }) =>
                `text-sm font-medium ${isActive ? 'text-[#00504E]' : 'text-gray-600 hover:text-slate-900'}`
              }
            >
              Eventos
            </NavLink>
            <NavLink
              to="/aulas"
              className={({ isActive }) =>
                `text-sm font-medium ${isActive ? 'text-[#00504E]' : 'text-gray-600 hover:text-slate-900'}`
              }
            >
              Aulas
            </NavLink>
            <NavLink
              to="/escola"
              className={({ isActive }) =>
                `text-sm font-medium ${isActive ? 'text-[#00504E]' : 'text-gray-600 hover:text-slate-900'}`
              }
            >
              Escola
            </NavLink>
            <NavLink
              to="/profile"
              className={({ isActive }) =>
                `text-sm font-medium ${isActive ? 'text-[#00504E]' : 'text-gray-600 hover:text-slate-900'}`
              }
            >
              Perfil
            </NavLink>
          </div>

          <div className="flex items-center gap-4">
            {user && (
              <span className="text-sm text-gray-600">
                Olá, <span className="font-medium text-gray-900">{user.nome}</span>
              </span>
            )}
            <button
              onClick={handleLogout}
              className="text-sm text-gray-500 hover:text-red-600 transition-colors font-medium"
            >
              Sair
            </button>
          </div>
        </div>
      </div>
    </nav>
  )
}
