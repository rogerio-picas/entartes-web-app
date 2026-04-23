import { useState } from 'react'
import { X, Plus, ChevronRight, Check, AlertCircle, RefreshCw, Trash2 } from 'lucide-react'
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
                    value={value}
                    onChange={e => onChange(e.target.value)}
                    placeholder={placeholder}
                    rows={3}
                    className={`${base} resize-none`}
                />
            ) : (
                <input
                    type={type}
                    value={value}
                    onChange={e => onChange(e.target.value)}
                    placeholder={placeholder}
                    className={base}
                />
            )}
        </div>
    )
}

export default function NovoEventoModal({ onClose, onSuccess }) {
    const [loading, setLoading] = useState(false)
    const [erro, setErro] = useState('')

    const [nome, setNome] = useState('')
    const [data, setData] = useState('')
    const [hora, setHora] = useState('19:00')
    const [descricao, setDescricao] = useState('')
    const [whatsapp, setWhatsapp] = useState('')
    const [local, setLocal] = useState('')

    // FAQs
    const [faqs, setFaqs] = useState([])
    const [faqPergunta, setFaqPergunta] = useState('')
    const [faqResposta, setFaqResposta] = useState('')
    const [faqGeral, setFaqGeral] = useState(false)
    const [expandedFaq, setExpandedFaq] = useState(null)
    const [showFaqForm, setShowFaqForm] = useState(false)

    function addFaq() {
        if (!faqPergunta.trim()) return

        setFaqs(prev => [
            ...prev,
            {
                id: Date.now(),
                pergunta: faqPergunta,
                resposta: faqResposta,
                geral: faqGeral
            }
        ])

        setFaqPergunta('')
        setFaqResposta('')
        setFaqGeral(false)
        setShowFaqForm(false)
    }

    function removeFaq(id) {
        setFaqs(prev => prev.filter(f => f.id !== id))
    }

    async function handleSubmit() {
        if (!nome.trim()) {
            setErro('O nome do evento é obrigatório.')
            return
        }

        setLoading(true)
        setErro('')

        try {
            await api.post('/evento', {
                nome: nome.trim(),
                descricao: descricao || null,
                data_de_realizacao: data ? new Date(data).toISOString() : null,
                hora_inicio: hora || null,
                link_whatsapp: whatsapp || null,
                local: local || null,
                faqs: faqs // Enviando a lista de FAQs se a sua API suportar
            })

            onSuccess?.(nome)
            onClose() // Fecha o modal após sucesso
        } catch (e) {
            setErro(e.response?.data?.message || e.message || 'Erro ao criar evento.')
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={onClose} />

            <div
                className="relative bg-[#F4FBF9] rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col overflow-hidden"
                onClick={e => e.stopPropagation()}
            >
                {/* Header */}
                <div className="px-8 pt-8 pb-0 shrink-0">
                    <div className="flex items-center justify-between mb-1">
                        <button
                            onClick={onClose}
                            className="w-8 h-8 rounded-full hover:bg-[#CCE8E6] flex items-center justify-center text-[#4A6362]"
                        >
                            <X size={17} />
                        </button>
                    </div>
                    <h2 className="text-4xl font-bold text-[#00504E] text-center font-['Sora'] mb-4">
                        Novo evento
                    </h2>
                </div>

                {/* Body */}
                <div className="flex-1 overflow-y-auto px-8 py-6 space-y-5">
                    {erro && (
                        <div className="flex items-center gap-2 bg-red-50 text-red-700 text-sm px-4 py-3 rounded-xl border border-red-200">
                            <AlertCircle size={15} /> {erro}
                        </div>
                    )}

                    <p className="text-sm font-medium text-[#000]">Detalhes</p>

                    <div className="flex gap-4 flex-wrap">
                        <div className="flex-1 min-w-[180px]">
                            <Field label="Nome" value={nome} onChange={setNome} placeholder="Nome do evento" />
                        </div>
                        <div className="flex-1 min-w-[150px]">
                            <Field label="Data" value={data} onChange={setData} type="date" />
                        </div>
                        <div className="flex-1 min-w-[130px]">
                            <Field label="Hora de início" value={hora} onChange={setHora} type="time" />
                        </div>
                    </div>

                    <Field label="Local" value={local} onChange={setLocal} placeholder="Ex: Auditório Principal..." />
                    <Field label="Descrição" value={descricao} onChange={setDescricao} placeholder="Descrição do evento" multiline />
                    <Field label="Link Whatsapp" value={whatsapp} onChange={setWhatsapp} placeholder="https://chat.whatsapp.com/..." />

                    {/* FAQs Section */}
                    <div>
                        <p className="text-sm font-medium text-[#000] mb-3">FAQ's</p>

                        <div className="space-y-1 mb-3">
                            {faqs.map((faq) => (
                                <div key={faq.id} className="flex flex-col">
                                    <div 
                                        className="flex items-center gap-2 px-3 py-2 hover:bg-[#CCE8E6]/50 rounded-lg cursor-pointer"
                                        onClick={() => setExpandedFaq(expandedFaq === faq.id ? null : faq.id)}
                                    >
                                        <ChevronRight
                                            size={14}
                                            className={`transition-transform ${expandedFaq === faq.id ? 'rotate-90' : ''}`}
                                        />
                                        <span className="flex-1 text-sm text-[#161D1C]">
                                            {faq.pergunta}
                                        </span>
                                        {faq.geral && (
                                            <span className="text-[10px] bg-[#CCE8E6] text-[#006A68] px-1.5 py-0.5 rounded">Geral</span>
                                        )}
                                        <button
                                            onClick={(e) => { e.stopPropagation(); removeFaq(faq.id); }}
                                            className="text-red-400 hover:text-red-600 p-1"
                                        >
                                            <Trash2 size={13} />
                                        </button>
                                    </div>

                                    {expandedFaq === faq.id && (
                                        <div className="ml-6 px-3 py-2 text-sm text-[#4A6362] bg-white/60 rounded-lg mb-2">
                                            {faq.resposta || <span className="italic opacity-50">Sem resposta...</span>}
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>

                        {!showFaqForm ? (
                            <button
                                onClick={() => setShowFaqForm(true)}
                                type="button"
                                className="flex items-center gap-1.5 text-[#006A68] text-sm font-medium"
                            >
                                <Plus size={16} /> Adicionar Pergunta
                            </button>
                        ) : (
                            <div className="bg-white rounded-xl p-4 space-y-3 border border-[#BEC9C7]">
                                <Field label="Pergunta" value={faqPergunta} onChange={setFaqPergunta} placeholder="Escreve a pergunta" />
                                <Field label="Resposta" value={faqResposta} onChange={setFaqResposta} placeholder="Escreve a resposta" multiline />
                                
                                <div className="flex items-center justify-between">
                                    <label className="flex items-center gap-2 text-sm cursor-pointer select-none">
                                        <div
                                            onClick={() => setFaqGeral(!faqGeral)}
                                            className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${
                                                faqGeral ? 'bg-[#006A68] border-[#006A68]' : 'border-[#3F4948]'
                                            }`}
                                        >
                                            {faqGeral && <Check size={11} className="text-white" strokeWidth={3} />}
                                        </div>
                                        FAQ geral
                                    </label>
                                    <div className="flex gap-3">
                                        <button onClick={() => setShowFaqForm(false)} className="text-sm text-gray-500 hover:underline">Cancelar</button>
                                        <button onClick={addFaq} className="text-sm font-medium text-[#006A68] hover:underline">Guardar</button>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* Footer */}
                <div className="px-8 pb-8 pt-4 shrink-0 flex justify-end">
                    <button
                        onClick={handleSubmit}
                        disabled={loading}
                        className="flex items-center gap-2 px-8 py-4 bg-[#006A68] text-white font-semibold rounded-2xl hover:bg-[#00504E] transition-colors disabled:opacity-60 text-base"
                    >
                        {loading ? <RefreshCw size={18} className="animate-spin" /> : <Check size={18} />}
                        Criar Evento
                    </button>
                </div>
            </div>
        </div>
    )
}