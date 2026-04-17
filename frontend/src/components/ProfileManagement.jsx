export default function ProfileManagement() {
  return (
    <section className="bg-white rounded-[28px] border border-slate-200 shadow-sm overflow-hidden">
      <div className="bg-[#EFF5F4] border-b-[3px] border-[#006A68] px-6 py-5">
        <div className="flex flex-wrap items-center gap-4">
          <div className="relative w-[50px] h-[48px] rounded-full bg-[#006A68] flex items-center justify-center text-[#9CF1EE] text-[16px] font-medium">
            A
          </div>
          <div className="flex-1 min-w-[180px]">
            <p className="text-[#4A6362] text-sm">Bem-vinda</p>
            <h2 className="text-black text-[24px] font-semibold">Ana Pinto</h2>
          </div>
          <button className="w-[49px] h-[48px] rounded-full bg-[#4A6362] inline-flex items-center justify-center text-white">
            <div className="w-[24px] h-[24px] bg-white rounded-sm" />
          </button>
        </div>
      </div>

      <div className="px-6 py-8">
        <div className="flex items-center gap-4 mb-8">
          <div className="w-[52px] h-[52px] bg-[#00504E] rounded-lg" />
          <h1 className="text-[#324863] text-[36px] font-normal leading-[44px]">Gestão de Perfil</h1>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="rounded-[12px] bg-[#CCE8E6] p-6">
            <h3 className="text-[#006A68] text-[20px] font-semibold leading-[28.6px] tracking-[0.17px]">
              Alterar dados pessoais
            </h3>
          </div>
          <div className="rounded-[12px] bg-[#CCE8E6] p-6">
            <h3 className="text-[#006A68] text-[20px] font-semibold leading-[28.6px] tracking-[0.17px]">
              Gestão de Notificações
            </h3>
          </div>
          <div className="rounded-[12px] bg-[#CCE8E6] p-6">
            <h3 className="text-[#006A68] text-[20px] font-semibold leading-[28.6px] tracking-[0.17px]">
              Gerir modalidades
            </h3>
          </div>
          <div className="rounded-[12px] bg-[#CCE8E6] p-6">
            <h3 className="text-[#006A68] text-[20px] font-semibold leading-[28.6px] tracking-[0.17px]">
              Ajuda e Suporte
            </h3>
          </div>
        </div>

        <div className="mt-10">
          <button className="w-full max-w-[468px] h-[50px] rounded-[8px] bg-[#FFDAD6] text-[#4A4459] text-[14px] font-medium">
            Terminar Sessão
          </button>
        </div>
      </div>
    </section>
  )
}
