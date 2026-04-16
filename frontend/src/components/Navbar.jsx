import { useNavigate } from 'react-router-dom'
import { authService } from '../services/authService'

export default function Navbar() {
  const navigate = useNavigate()
  const user = authService.getUser()

  function handleLogout() {
    authService.logout()
    navigate('/login')
  }

  return (
    <nav className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center">
          <span className="text-white text-sm font-bold">E</span>
        </div>
        <span className="text-gray-900 font-semibold text-lg">Entartes</span>
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
    </nav>
  )
}
