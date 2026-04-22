import { useState } from 'react'
import { X, Check, AlertCircle, RefreshCw } from 'lucide-react'
import { api } from '../services/api'

function Field({ label, value, onChange, type = 'text', placeholder, multiline = false }) {
    const base = 'w-full bg-white border border-[#6F7978] rounded-lg px-4 py-3 text-sm text-[#161D1C] focus:outline-none focus:border-[#006A68] transition-colors'
    return (
        <div className="relative">
            <label className="absolute -top-2.5 left-3 bg-[#F4FBF9] text-[11px] text-[#3F4948] font-medium px-1 z-10">
                {label}
            </label>
            {multiline ? (
                <textarea
                    value={value} onChange={e => onChange(e.target.value)}
                    placeholder={placeholder} rows={3}
                    className={`${base} resize-none`}
                />
            ) : (
                <input
                    type={type} value={value}
                    onChange={e => onChange(e.target.value)}
                    placeholder={placeholder}
                    className={base}
                />
            )}
        </div>
    )
}

export default function NovoEventoModal({ onClose, onSuccess }) {
    const [step, setStep] = useState(1) // 1=detalhes, 2=confirmação
    const [loading, setLoading] = useState(false)
    const [erro, setErro] = useState('')

    // Detalhes
    const [nome, setNome] = useState('')
    const [data, setData] = useState('')
    const [hora, setHora] = useState('19:00')
    const [descricao, setDescricao] = useState('')
    const [local, setLocal] = useState('')
    // const [whatsapp, setWhatsapp] = useState('') // TODO: aguarda suporte backend

    // TODO: FAQs — aguarda tabela backend
    // const [faqs, setFaqs] = useState([])
    // const [faqPergunta, setFaqPergunta] = useState('')
    // const [faqResposta, setFaqResposta] = useState('')
    // const [faqGeral, setFaqGeral] = useState(false)
    // const [expandedFaq, setExpandedFaq] = useState(null)

    async function handleSubmit() {
        if (!nome.trim()) { setErro('O nome do evento é obrigatório.'); return }
        setLoading(true)
        setErro('')
        try {
            await api.post('/evento', {
                nome: nome.trim(),
                descricao: descricao || null,
                data_de_realizacao: data ? new Date(data).toISOString() : null,
                local: local || null,
                // hora_inicio: hora || null,         // TODO: aguarda suporte backend
                // link_whatsapp: whatsapp || null,   // TODO: aguarda tabela backend
            })
            onSuccess(nome)
        } catch (e) {
            setErro(e.message || 'Erro ao criar evento.')
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
            <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" />
            <div
                className="relative bg-[#F4FBF9] rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col overflow-hidden"
                onClick={e => e.stopPropagation()}
            >
                {/* Header */}
                <div className="px-8 pt-8 pb-0 shrink-0">
                    <div className="flex items-center justify-between mb-1">
                        <span />
                        <button onClick={onClose} className="w-8 h-8 rounded-full hover:bg-[#CCE8E6] flex items-center justify-center text-[#4A6362]">
                            <X size={17} />
                        </button>
                    </div>
                    <h2 className="text-4xl font-bold text-[#00504E] text-center font-['Sora'] mb-4">Novo evento</h2>
                    <div className="border-t border-[#006A68]" />
                </div>

                {/* Body */}
                <div className="flex-1 overflow-y-auto px-8 py-6 space-y-5">
                    {erro && (
                        <div className="flex items-center gap-2 bg-red-50 text-red-700 text-sm px-4 py-3 rounded-xl border border-red-200">
                            <AlertCircle size={15} /> {erro}
                        </div>
                    )}

                    {/* Detalhes */}
                    <p className="text-sm font-medium text-[#000]">Detalhes</p>
                    <div className="flex gap-4 flex-wrap">
                        <div className="flex-1 min-w-[180px]">
                            <Field label="Nome" value={nome} onChange={setNome} placeholder="Nome do evento" />
                        </div>
                        <div className="flex-1 min-w-[150px]">
                            <Field label="Data" value={data} onChange={setData} type="date" />
                        </div>
                    </div>

                    <Field label="Local" value={local} onChange={setLocal} placeholder="Ex: Auditório Principal, Lisboa..." />
                    <Field label="Descrição" value={descricao} onChange={setDescricao} placeholder="Descrição do evento" multiline />

                    {/* WhatsApp — TODO: aguarda suporte backend */}
                    {/* <Field label="Link Whatsapp" value={whatsapp} onChange={setWhatsapp} placeholder="https://chat.whatsapp.com/..." /> */}

                    {/* FAQs — TODO: aguarda tabela backend */}
                </div>

                {/* Footer */}
                <div className="px-8 pb-8 pt-4 shrink-0 flex justify-end">
                    <button
                        onClick={handleSubmit}
                        disabled={loading}
                        className="flex items-center gap-2 px-8 py-4 bg-[#006A68] text-white font-semibold rounded-2xl hover:bg-[#00504E] transition-colors disabled:opacity-60 text-base"
                    >
                        {loading ? <RefreshCw size={18} className="animate-spin" /> : <Check size={18} />}
                        Continuar
                    </button>
                </div>
            </div>
        </div>
    )
}