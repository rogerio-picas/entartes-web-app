import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import Login from './views/Login'
import Events from './views/Eventos'
import Home from './views/Home'
import HomeDocente from './views/HomeDocente'
import HomeAdmin from './views/HomeAdmin'
import Aulas from './views/Aulas'
import Horario from './views/Horario'
import Escola from './views/Escola'
import Profile from './views/Profile'
import AulasAdmin     from './views/AulasAdmin'
import EventDetailsView from './views/EventDetailsView'
import NovoEventoModal from './views/NovoEventoModal'

import ProtectedRoute from './components/ProtectedRoute'
import RoleRoute from './components/RoleRoute'
import DashboardLayout from './components/DashboardLayout'
import { authService } from './services/authService'

function HomeRedirect() {
  const user = authService.getUser()
  const role = user?.role // Pode ser 1, 2, 3 ou undefined

  if (role === 1) return <Navigate to="/admin/home" replace />
  if (role === 2) return <Navigate to="/docente/home" replace />
  
  // Se não caiu nos acima, assume-se que é Aluno (role 3 ou erro)
  return <Navigate to="/aluno/home" replace />
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />

        <Route element={
          <ProtectedRoute><DashboardLayout /></ProtectedRoute>
        }>
          <Route path="/" element={<HomeRedirect />} />
          <Route path="/home" element={<HomeRedirect />} />

          {/* Coordenadora (role 1) */}
          <Route path="/admin/home"
            element={<RoleRoute roles={[1]}><HomeAdmin /></RoleRoute>} />
          <Route path="/admin/aulas"
            element={<RoleRoute roles={[1]}><AulasAdmin /></RoleRoute>} />

          {/* Docente (role 2) */}
          <Route path="/docente/home"
            element={<RoleRoute roles={[2]}><HomeDocente /></RoleRoute>} />

          {/* Aluno (role 3) */}
          <Route path="/aluno/home"
            element={<RoleRoute roles={[3]}><Home /></RoleRoute>} />

          {/* Partilhadas */}
          <Route path="/horario" element={<Horario />} />
          <Route path="/aulas" element={<Aulas />} />
          <Route path="/escola"
            element={<RoleRoute roles={[1,2]}><Escola /></RoleRoute>} />
          <Route path="/profile" element={<Profile />} />
          <Route path="/eventos" element={<Events />} />
          <Route path="/eventos/:id" element={<EventDetailsView />} />
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}


