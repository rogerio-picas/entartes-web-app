import React, { useState } from 'react'
import { X } from 'lucide-react'
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
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4" onClick={onClose}>
            <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
            <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden" onClick={e => e.stopPropagation()}>
                <div className="px-6 py-5 bg-[#F4FBF9] border-b-2 border-[#80D5D2] flex items-center justify-between">
                    <h3 className="font-bold text-lg text-[#006A68]">Mudar Sala</h3>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X size={18} /></button>
                </div>
                <div className="p-6 space-y-4">
                    {erro && <div className="text-xs text-red-600 bg-red-50 p-2 rounded border border-red-100">{erro}</div>}
                    <div>
                        <label className="text-[10px] uppercase font-bold text-gray-500 mb-1 block">Sala Atual: {item.sala || 'Nenhuma'}</label>
                        <select
                            value={idSala}
                            onChange={e => setIdSala(e.target.value)}
                            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#006A68]"
                        >
                            <option value="">Selecionar nova sala...</option>
                            {salas.map(s => <option key={s.id_sala} value={s.id_sala}>{s.nome}</option>)}
                        </select>
                    </div>
                    <button
                        onClick={handleSubmit}
                        disabled={loading}
                        className="w-full py-2.5 bg-[#006A68] text-white font-bold rounded-xl hover:bg-[#00504E] disabled:opacity-50 transition-colors"
                    >
                        {loading ? 'A guardar...' : 'Confirmar Alteração'}
                    </button>
                </div>
            </div>
        </div>
    )
}
