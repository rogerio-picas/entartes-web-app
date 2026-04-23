import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import Login from './views/Login'
import Events from './views/Eventos'
import EventDetailsView from './views/EventDetailsView'
import Home from './views/Home'
import HomeDocente from './views/HomeDocente'
import HomeAdmin from './views/HomeAdmin'
import Aulas from './views/Aulas'
import Horario from './views/Horario'
import Escola from './views/Escola'
import Profile from './views/Profile'
import AulasAdmin from './views/AulasAdmin'
import ProtectedRoute from './components/ProtectedRoute'
import RoleRoute from './components/roleRoute'
import DashboardLayout from './components/DashboardLayout'
import { authService } from './services/authService'
import Modalidades from './views/Modalidades'
// import NovoEventoModal from './views/NovoEventoModal' // Importado mas não usado no código abaixo

function HomeRedirect() {
  const user = authService.getUser()
  const role = user?.role

  if (role === 1) return <Navigate to="/admin/home" replace />
  if (role === 2) return <Navigate to="/docente/home" replace />
  return <Navigate to="/aluno/home" replace />
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Rota Pública */}
        <Route path="/login" element={<Login />} />

        {/* Rotas Protegidas com Layout (Dashboard) */}
        <Route
          element={
            <ProtectedRoute>
              <DashboardLayout />
            </ProtectedRoute>
          }
        >
          {/* Redirecionamento Inicial */}
          <Route path="/" element={<HomeRedirect />} />
          <Route path="/home" element={<HomeRedirect />} />

          {/* Coordenadora (role 1) */}
          <Route 
            path="/admin/home" 
            element={<RoleRoute roles={[1]}><HomeAdmin /></RoleRoute>} 
          />
          <Route 
            path="/admin/aulas" 
            element={<RoleRoute roles={[1]}><AulasAdmin /></RoleRoute>} 
          />
          

          {/* Docente (role 2) */}
          <Route 
            path="/docente/home" 
            element={<RoleRoute roles={[2]}><HomeDocente /></RoleRoute>} 
          />

          {/* Aluno (role 3) */}
          <Route 
            path="/aluno/home" 
            element={<RoleRoute roles={[3]}><Home /></RoleRoute>} 
          />

          {/* Rotas Partilhadas / Gerais */}
          <Route path="/horario" element={<Horario />} />
          <Route path="/aulas" element={<Aulas />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="/eventos" element={<Events />} />
          <Route path="/eventos/:id" element={<EventDetailsView />} />
          <Route path="/modalidades" element={<Modalidades />} />
          
          {/* Escola (Apenas Admin e Docente) */}
          <Route 
            path="/escola" 
            element={<RoleRoute roles={[1, 2]}><Escola /></RoleRoute>} 
          />
        </Route>

        {/* Fallback para rotas inexistentes */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}