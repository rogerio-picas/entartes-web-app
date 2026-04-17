import { Outlet } from 'react-router-dom'
import DashboardHeader from './DashboardHeader'

export default function DashboardLayout() {
  return (
    // min-h-screen garante que o fundo cubra a página toda
    // bg-[#F8FAFA] define a cor de fundo global
    <div className="min-h-screen flex flex-col bg-[#F8FAFA]"> 
      
      {/* O Header fica fixo no topo (fora do limite de 1400px se quiseres que ele estique) */}
      <DashboardHeader />

      {/* O main é o contentor principal. 
        O flex-1 garante que ele empurre o rodapé (se houver) para baixo.
        O p-6 até lg:p-10 dá o "respiro" lateral e superior.
      */}
      <main className="flex-1 p-6 md:p-8 lg:p-10">
        
        {/* Esta div é a "âncora" de segurança:
          - max-w-[1400px]: impede o conteúdo de esticar demais em monitores gigantes.
          - mx-auto: centraliza o conteúdo horizontalmente.
        */}
        <div className="max-w-[1400px] mx-auto"> 
          <Outlet /> 
        </div>

      </main>
    </div>
  )
}