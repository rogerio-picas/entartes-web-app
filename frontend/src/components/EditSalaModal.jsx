import React, { useState } from 'react'
import { X, DoorOpen, Check } from 'lucide-react'
import coachingService from '../services/coachingService'

export default function EditSalaModal({ item, salas, onClose, onSuccess }) {
    const [loading, setLoading] = useState(false)
    const [erro, setErro] = useState('')
    const [idSala, setIdSala] = useState(item?.id_sala || '')

    if (!item) return null;

    async function handleSubmit() {
        if (!idSala) { setErro('Seleciona uma sala.'); return }
        setLoading(true)
        try {
            await coachingService.reatribuirSala(item.id, Number(idSala))
            onSuccess()
        } catch (e) {
            setErro(e.response?.data?.message || 'Erro ao mudar sala')
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 font-['Sora']" onClick={onClose}>
            <div className="absolute inset-0 bg-neutral-900/40 backdrop-blur-sm transition-opacity" />
            <div className="relative bg-white rounded-3xl shadow-2xl w-full max-w-sm overflow-hidden animate-in fade-in zoom-in-95 duration-200" onClick={e => e.stopPropagation()}>
                
                {/* Header Styling */}
                <div className="px-6 py-6 bg-gradient-to-br from-brand-50 to-white border-b border-brand-100 flex items-start justify-between">
                    <div>
                        <div className="flex items-center gap-2 mb-1.5">
                            <div className="w-8 h-8 rounded-full bg-brand-100 text-brand-800 flex items-center justify-center">
                                <DoorOpen size={16} />
                            </div>
                            <h3 className="font-bold text-xl text-neutral-800 tracking-tight">Mudar de Sala</h3>
                        </div>
                        <p className="text-xs text-neutral-500 font-medium ml-10">
                            Sala atual: <span className="font-bold text-brand-800">{item.sala || 'Nenhuma'}</span>
                        </p>
                    </div>
                    <button onClick={onClose} className="w-8 h-8 rounded-full bg-white/50 hover:bg-neutral-100 flex items-center justify-center text-neutral-500 transition-colors">
                        <X size={18} />
                    </button>
                </div>

                <div className="p-6">
                    {erro && (
                        <div className="mb-4 text-xs text-red-600 bg-red-50 px-3 py-2.5 rounded-xl border border-red-100 font-medium flex items-center gap-2">
                            <span className="w-1.5 h-1.5 rounded-full bg-red-500 shrink-0"></span>
                            {erro}
                        </div>
                    )}
                    
                    <div className="mb-6">
                        <label className="text-[11px] uppercase font-bold text-neutral-400 mb-3 block tracking-wider">Escolha a nova sala</label>
                        <div className="grid grid-cols-2 gap-2.5 max-h-[200px] overflow-y-auto pr-1 pb-1 custom-scrollbar">
                            {salas.map(s => {
                                const isSelected = String(idSala) === String(s.id_sala);
                                const isCurrent = String(item.id_sala) === String(s.id_sala) || item.sala === s.nome;
                                return (
                                    <button
                                        key={s.id_sala}
                                        onClick={() => setIdSala(s.id_sala)}
                                        disabled={isCurrent}
                                        className={`relative p-3 text-left border-2 rounded-xl transition-all duration-200 
                                            ${isSelected 
                                                ? 'border-brand-600 bg-brand-50 shadow-sm' 
                                                : isCurrent 
                                                    ? 'border-neutral-100 bg-neutral-50 opacity-50 cursor-not-allowed' 
                                                    : 'border-neutral-100 hover:border-brand-300 hover:bg-neutral-50'}`}
                                    >
                                        <div className="flex items-center justify-between">
                                            <span className={`font-semibold text-sm ${isSelected ? 'text-brand-800' : 'text-neutral-700'}`}>
                                                {s.nome}
                                            </span>
                                            {isSelected && <Check size={16} className="text-brand-600" />}
                                        </div>
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    <button
                        onClick={handleSubmit}
                        disabled={loading || !idSala || String(idSala) === String(item.id_sala)}
                        className="w-full py-3.5 bg-brand-800 text-white font-bold text-sm rounded-xl hover:bg-brand-900 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-md hover:shadow-lg flex items-center justify-center gap-2"
                    >
                        {loading ? 'A guardar...' : 'Confirmar Alteração'}
                    </button>
                </div>
            </div>
        </div>
    )
}
