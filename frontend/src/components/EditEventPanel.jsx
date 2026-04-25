import { X, Check, RefreshCw, AlertCircle } from 'lucide-react'
import { api } from '../services/api'
import { formatTime } from '../utils/dateUtils'

export default function EditEventPanel({ onClose, onSuccess, initialEvent }) {
    const [nome, setNome] = useState(initialEvent ? initialEvent.nome : '')
    const [descricao, setDescricao] = useState(initialEvent ? (initialEvent.descricao || '') : '')
    const [local, setLocal] = useState(initialEvent ? (initialEvent.local || '') : '')

    // Format date string for input type="date"
    const getInitialDate = () => {
        if (!initialEvent || !initialEvent.data_de_realizacao) return ''
        const s = String(initialEvent.data_de_realizacao)
        return s.split('T')[0]
    }
    const [dataRealizacao, setDataRealizacao] = useState(getInitialDate())
    const [hora, setHora] = useState(initialEvent?.data_de_realizacao ? formatTime(initialEvent.data_de_realizacao) : '19:00')

    // Duração decomposta em Horas e Minutos
    const initialDuration = initialEvent?.duracao_minutos || 60
    const [duracaoHoras, setDuracaoHoras] = useState(Math.floor(initialDuration / 60))
    const [duracaoMinutos, setDuracaoMinutos] = useState(initialDuration % 60)

    const [whatsapp, setWhatsapp] = useState(initialEvent?.link_whatsapp || '')

    const [loading, setLoading] = useState(false)
    const [erro, setErro] = useState('')

    async function handleSave() {
        if (!nome.trim()) { setErro('O nome do evento é obrigatório.'); return }
        setLoading(true)
        setErro('')

        try {
            const totalMinutos = (Number(duracaoHoras) * 60) + Number(duracaoMinutos)

            const payload = {
                nome: nome.trim(),
                descricao: descricao.trim() || undefined,
                local: local.trim() || undefined,
                data_de_realizacao: dataRealizacao ? new Date(`${dataRealizacao}T${hora}:00`).toISOString() : undefined,
                duracao_minutos: totalMinutos,
                link_whatsapp: whatsapp || undefined
            }

            await api.put(`/evento/${initialEvent.id_evento}`, payload)
            onSuccess()
        } catch (e) {
            setErro(e.response?.data?.error || e.message || 'Erro ao guardar dados do evento.')
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className={`fixed top-0 right-0 h-full z-[60] w-[483px] max-w-[95vw] bg-[#F4FBF9] shadow-2xl flex flex-col transform transition-transform duration-300 ease-out border-l border-[#006A68]/20`}>
            {/* Header */}
            <div className="px-9 pt-10 pb-4 border-b border-[#006A68] shrink-0">
                <div className="flex items-center justify-between mb-1">
                    <h2 className="text-2xl font-bold text-[#006A68] font-['Sora']">Editar Evento</h2>
                    <button onClick={onClose} className="w-8 h-8 rounded-full hover:bg-[#CCE8E6] flex items-center justify-center text-[#4A6362]">
                        <X size={17} />
                    </button>
                </div>
            </div>

            <div className="flex-1 overflow-y-auto px-9 py-5 space-y-5 font-['Sora']">
                {erro && (
                    <div className="flex items-center gap-2 bg-red-50 text-red-700 text-sm px-3 py-2.5 rounded-xl border border-red-200">
                        <AlertCircle size={14} /> {erro}
                    </div>
                )}

                <p className="text-sm font-medium text-[#000]">Detalhes principais</p>

                <div className="relative">
                    <input
                        value={nome} onChange={e => setNome(e.target.value)}
                        placeholder="Nome do evento"
                        className="w-full bg-white border border-[#6F7978] rounded-lg px-4 py-3 text-sm text-[#161D1C] focus:outline-none focus:border-[#006A68]"
                    />
                </div>

                <div className="relative">
                    <textarea
                        value={descricao} onChange={e => setDescricao(e.target.value)}
                        placeholder="Descrição opcional"
                        rows={4}
                        className="w-full bg-white border border-[#6F7978] rounded-lg px-4 py-3 text-sm text-[#161D1C] focus:outline-none focus:border-[#006A68] resize-none"
                    />
                </div>

                <div className="relative">
                    <input
                        value={local} onChange={e => setLocal(e.target.value)}
                        placeholder="Local (Ex: Auditório Principal)"
                        className="w-full bg-white border border-[#6F7978] rounded-lg px-4 py-3 text-sm text-[#161D1C] focus:outline-none focus:border-[#006A68]"
                    />
                </div>

                <div className="relative grid grid-cols-2 gap-4">
                    <div>
                        <label className="text-xs text-[#4A6362] font-semibold mb-1 block">Data</label>
                        <input
                            type="date"
                            value={dataRealizacao} onChange={e => setDataRealizacao(e.target.value)}
                            className="w-full bg-white border border-[#6F7978] rounded-lg px-4 py-3 text-sm text-[#161D1C] focus:outline-none focus:border-[#006A68]"
                        />
                    </div>
                    <div>
                        <label className="text-xs text-[#4A6362] font-semibold mb-1 block">Hora</label>
                        <input
                            type="time"
                            value={hora} onChange={e => setHora(e.target.value)}
                            className="w-full bg-white border border-[#6F7978] rounded-lg px-4 py-3 text-sm text-[#161D1C] focus:outline-none focus:border-[#006A68]"
                        />
                    </div>
                </div>

                <div className="relative grid grid-cols-2 gap-4">
                    <div>
                        <label className="text-xs text-[#4A6362] font-semibold mb-1 block">Duração (Horas)</label>
                        <input
                            type="number"
                            value={duracaoHoras} onChange={e => setDuracaoHoras(e.target.value)}
                            min="0"
                            className="w-full bg-white border border-[#6F7978] rounded-lg px-4 py-3 text-sm text-[#161D1C] focus:outline-none focus:border-[#006A68]"
                        />
                    </div>
                    <div>
                        <label className="text-xs text-[#4A6362] font-semibold mb-1 block">Duração (Minutos)</label>
                        <input
                            type="number"
                            value={duracaoMinutos} onChange={e => setDuracaoMinutos(e.target.value)}
                            min="0" max="59"
                            className="w-full bg-white border border-[#6F7978] rounded-lg px-4 py-3 text-sm text-[#161D1C] focus:outline-none focus:border-[#006A68]"
                        />
                    </div>
                </div>

                <div className="relative">
                    <label className="text-xs text-[#4A6362] font-semibold mb-1 block">Link WhatsApp</label>
                    <input
                        value={whatsapp} onChange={e => setWhatsapp(e.target.value)}
                        placeholder="https://chat.whatsapp.com/..."
                        className="w-full bg-white border border-[#6F7978] rounded-lg px-4 py-3 text-sm text-[#161D1C] focus:outline-none focus:border-[#006A68]"
                    />
                </div>
            </div>

            <div className="px-9 py-6 border-t border-[#BEC9C7] shrink-0">
                <button
                    onClick={handleSave}
                    disabled={loading}
                    className="w-full py-4 bg-[#006A68] text-white font-semibold rounded-2xl hover:bg-[#00504E] transition-colors disabled:opacity-60 flex items-center justify-center gap-2"
                >
                    {loading ? <RefreshCw size={18} className="animate-spin" /> : <Check size={18} />}
                    Guardar Alterações
                </button>
            </div>
        </div>
    )
}
