import { Outlet } from 'react-router-dom'
import DashboardHeader from './DashboardHeader'

export default function DashboardLayout() {
  return (
    // min-h-screen garante que o fundo cubra a página toda
    <div className="min-h-screen flex flex-col bg-[#F8FAFA]"> 
      <DashboardHeader />
      
      <main className="flex-1 p-4 md:p-6 lg:p-8">
        {/* O Outlet renderiza a página atual */}
        <Outlet />
      </main>
    </div>
  )
}