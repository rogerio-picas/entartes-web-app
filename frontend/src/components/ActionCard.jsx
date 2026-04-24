import { ChevronRight } from 'lucide-react'

export default function ActionCard({ label, icon: Icon, onClick, description, disabled }) {
    return (
        <button
            onClick={onClick}
            disabled={disabled}
            className="group relative bg-[#CCE8E6] hover:bg-[#B8E0DE] transition-all rounded-2xl p-6 text-left w-full h-[171px] flex flex-col justify-between overflow-hidden shadow-sm hover:shadow-md disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-[#CCE8E6] disabled:hover:shadow-sm"
        >
            <p className="font-bold text-[#000] text-[17px] leading-[143%] tracking-[0.17px] max-w-[280px] font-['Sora'] line-clamp-2">
                {label}
            </p>
            {description && (
                <p className="text-xs text-[#4A6362] line-clamp-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    {description}
                </p>
            )}
            <div className="flex items-end justify-between">
                <div className="flex items-center gap-1.5 text-xs font-semibold text-[#006A68] opacity-0 group-hover:opacity-100 transition-all translate-y-1 group-hover:translate-y-0">
                    Abrir <ChevronRight size={13} />
                </div>
                <div className="w-10 h-10 rounded-xl bg-black/10 group-hover:bg-[#006A68] transition-colors flex items-center justify-center">
                    <Icon size={20} className="text-black group-hover:text-white transition-colors" />
                </div>
            </div>
        </button>
    )
}
