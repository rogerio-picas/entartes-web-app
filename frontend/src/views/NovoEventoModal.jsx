import { useState } from 'react'
import { X, Plus, ChevronRight, Check, AlertCircle, RefreshCw, Trash2 } from 'lucide-react'
import { api } from '../services/api'
import { formatTime, formatDateForInput, toWallClockISO } from '../utils/dateUtils'

function Field({ label, value, onChange, type = 'text', placeholder, multiline = false, ...props }) {
    const base = 'w-full bg-white border border-neutral-500 rounded-lg px-4 py-3 text-sm text-neutral-900 focus:outline-none focus:border-brand-800 transition-colors'

    return (
        <div className="relative">
            <label className="absolute -top-2.5 left-3 bg-brand-50 text-[11px] text-neutral-700 font-medium px-1 z-10">
                {label}
            </label>

            {multiline ? (
                <textarea
                    value={value}
                    onChange={e => onChange(e.target.value)}
                    placeholder={placeholder}
                    rows={3}
                    className={`${base} resize-none`}
                    {...props}
                />
            ) : (
                <input
                    type={type}
                    value={value}
                    onChange={e => onChange(e.target.value)}
                    placeholder={placeholder}
                    className={base}
                    {...props}
                />
            )}
        </div>
    )
}

export default function NovoEventoModal({ onClose, onSuccess, selectedDate, initialData }) {
    const [loading, setLoading] = useState(false)
    const [erro, setErro] = useState('')

    const [nome, setNome] = useState(initialData?.nome || '')
    const [data, setData] = useState(() => {
        if (initialData?.data_de_realizacao) return formatDateForInput(initialData.data_de_realizacao)
        if (selectedDate) return formatDateForInput(selectedDate)
        return ''
    })
    
    // Extrair hora do data_de_realizacao sem conversão de timezone
    const [hora, setHora] = useState(initialData?.data_de_realizacao ? formatTime(initialData.data_de_realizacao) : '19:00')
    
    // Duração decomposta em Horas e Minutos
    const initialDuration = initialData?.duracao_minutos || 60
    const [duracaoHoras, setDuracaoHoras] = useState(Math.floor(initialDuration / 60))
    const [duracaoMinutos, setDuracaoMinutos] = useState(initialDuration % 60)
    
    const [descricao, setDescricao] = useState(initialData?.descricao || '')
    const [whatsapp, setWhatsapp] = useState(initialData?.link_whatsapp || '')
    const [local, setLocal] = useState(initialData?.local || '')

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
            const totalMinutos = (Number(duracaoHoras) * 60) + Number(duracaoMinutos)
            
            const payload = {
                nome: nome.trim(),
                descricao: descricao || null,
                data_de_realizacao: toWallClockISO(data, hora),
                duracao_minutos: totalMinutos,
                link_whatsapp: whatsapp || null,
                local: local || null,
                faqs: faqs
            }

            if (initialData) {
                await api.put(`/evento/${initialData.id_evento || initialData.id}`, payload)
            } else {
                await api.post('/evento', payload)
            }

            onSuccess?.(nome)
            onClose()
        } catch (e) {
            setErro(e.response?.data?.message || e.message || 'Erro ao guardar evento.')
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={onClose} />

            <div
                className="relative bg-brand-50 rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col overflow-hidden"
                onClick={e => e.stopPropagation()}
            >
                {/* Header */}
                <div className="px-8 pt-8 pb-0 shrink-0">
                    <div className="flex items-center justify-between mb-1">
                        <button
                            onClick={onClose}
                            className="w-8 h-8 rounded-full hover:bg-brand-200 flex items-center justify-center text-neutral-600"
                        >
                            <X size={17} />
                        </button>
                    </div>
                    <h2 className="text-4xl font-bold text-brand-900 text-center font-['Sora'] mb-4">
                        {initialData ? 'Editar evento' : 'Novo evento'}
                    </h2>
                </div>

                {/* Body */}
                <div className="flex-1 overflow-y-auto px-8 py-6 space-y-5">
                    {erro && (
                        <div className="flex items-center gap-2 bg-red-50 text-red-700 text-sm px-4 py-3 rounded-xl border border-red-200">
                            <AlertCircle size={15} /> {erro}
                        </div>
                    )}

                    <p className="text-sm font-medium text-black">Detalhes</p>

                    <div className="flex gap-4 flex-wrap">
                        <div className="flex-1 min-w-[180px]">
                            <Field label="Nome" value={nome} onChange={setNome} placeholder="Nome do evento" />
                        </div>
                        <div className="flex-1 min-w-[150px]">
                            <Field label="Data" value={data} onChange={setData} type="date" min={formatDateForInput(new Date())} />
                        </div>
                        <div className="flex-1 min-w-[130px]">
                            <Field label="Início" value={hora} onChange={setHora} type="time" />
                        </div>
                        <div className="flex-1 min-w-[200px] flex gap-2">
                            <div className="flex-1">
                                <Field label="Dur. (Horas)" value={duracaoHoras} onChange={setDuracaoHoras} type="number" min="0" />
                            </div>
                            <div className="flex-1">
                                <Field label="Dur. (Min)" value={duracaoMinutos} onChange={setDuracaoMinutos} type="number" min="0" max="59" />
                            </div>
                        </div>
                    </div>

                    <Field label="Local" value={local} onChange={setLocal} placeholder="Ex: Auditório Principal..." />
                    <Field label="Descrição" value={descricao} onChange={setDescricao} placeholder="Descrição do evento" multiline />
                    <Field label="Link Whatsapp" value={whatsapp} onChange={setWhatsapp} placeholder="https://chat.whatsapp.com/..." />

                    {/* FAQs Section */}
                    <div>
                        <p className="text-sm font-medium text-black mb-3">FAQ's</p>

                        <div className="space-y-1 mb-3">
                            {faqs.map((faq) => (
                                <div key={faq.id} className="flex flex-col">
                                    <div 
                                        className="flex items-center gap-2 px-3 py-2 hover:bg-brand-200/50 rounded-lg cursor-pointer"
                                        onClick={() => setExpandedFaq(expandedFaq === faq.id ? null : faq.id)}
                                    >
                                        <ChevronRight
                                            size={14}
                                            className={`transition-transform ${expandedFaq === faq.id ? 'rotate-90' : ''}`}
                                        />
                                        <span className="flex-1 text-sm text-neutral-900">
                                            {faq.pergunta}
                                        </span>
                                        {faq.geral && (
                                            <span className="text-[10px] bg-brand-200 text-brand-800 px-1.5 py-0.5 rounded">Geral</span>
                                        )}
                                        <button
                                            onClick={(e) => { e.stopPropagation(); removeFaq(faq.id); }}
                                            className="text-red-400 hover:text-red-600 p-1"
                                        >
                                            <Trash2 size={13} />
                                        </button>
                                    </div>

                                    {expandedFaq === faq.id && (
                                        <div className="ml-6 px-3 py-2 text-sm text-neutral-600 bg-white/60 rounded-lg mb-2">
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
                                className="flex items-center gap-1.5 text-brand-800 text-sm font-medium"
                            >
                                <Plus size={16} /> Adicionar Pergunta
                            </button>
                        ) : (
                            <div className="bg-white rounded-xl p-4 space-y-3 border border-neutral-400">
                                <Field label="Pergunta" value={faqPergunta} onChange={setFaqPergunta} placeholder="Escreve a pergunta" />
                                <Field label="Resposta" value={faqResposta} onChange={setFaqResposta} placeholder="Escreve a resposta" multiline />
                                
                                <div className="flex items-center justify-between">
                                    <label className="flex items-center gap-2 text-sm cursor-pointer select-none">
                                        <div
                                            onClick={() => setFaqGeral(!faqGeral)}
                                            className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${
                                                faqGeral ? 'bg-brand-800 border-brand-800' : 'border-neutral-700'
                                            }`}
                                        >
                                            {faqGeral && <Check size={11} className="text-white" strokeWidth={3} />}
                                        </div>
                                        FAQ geral
                                    </label>
                                    <div className="flex gap-3">
                                        <button onClick={() => setShowFaqForm(false)} className="text-sm text-gray-500 hover:underline">Cancelar</button>
                                        <button onClick={addFaq} className="text-sm font-medium text-brand-800 hover:underline">Guardar</button>
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
                        className="flex items-center gap-2 px-8 py-4 bg-brand-800 text-white font-semibold rounded-2xl hover:bg-brand-900 transition-colors disabled:opacity-60 text-base"
                    >
                        {loading ? <RefreshCw size={18} className="animate-spin" /> : <Check size={18} />}
                        {initialData ? 'Guardar Alterações' : 'Criar Evento'}
                    </button>
                </div>
            </div>
        </div>
    )
}

