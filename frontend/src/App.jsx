import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import Login from './views/Login'
import Events from './views/Eventos'
import Home from './views/Home'
import Aulas from './views/Aulas'
import Horario from './views/Horario'
import Escola from './views/Escola'
import Profile from './views/Profile'
import HomeAdmin      from './views/HomeAdmin'
import AulasAdmin     from './views/AulasAdmin'
import EventDetailsView from './views/EventDetailsView'
import NovoEventoModal from './views/NovoEventoModal'

import ProtectedRoute from './components/ProtectedRoute'
import DashboardLayout from './components/DashboardLayout' 

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Rota Pública */}
        <Route path="/login" element={<Login />} />
        
        {/* Rotas Privadas com Header */}
        <Route
          element={
            <ProtectedRoute>
              <DashboardLayout />
            </ProtectedRoute>
          }
        >
          
          {/* Todas as rotas abaixo herdam o Header automaticamente */}
          <Route path="/"  element={<Home />} />  
          <Route path="/home" element={<Navigate to="/" replace />} />
          <Route path="/horario" element={<Horario />} />
          <Route path="/aulas" element={<Aulas  />} />
          <Route path="/escola" element={<Escola />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="/eventos" element={<Events />} />
          <Route path="/eventos/:id" element={<EventDetailsView />} />
        </Route>

        {/* Fallback para rotas inexistentes */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}