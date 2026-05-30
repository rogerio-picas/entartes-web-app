import { useState } from 'react'
import { X, Plus, ChevronRight, Check, AlertCircle, RefreshCw, Trash2, Lock, Globe } from 'lucide-react'
import { api } from '../services/api'
import { formatTime, formatDateForInput, toWallClockISO } from '../utils/dateUtils'

function Field({ label, value, onChange, type = 'text', placeholder, multiline = false, erro, ...props }) {
    const base = `w-full bg-white border rounded-lg px-4 py-3 text-sm text-neutral-900 focus:outline-none transition-colors ${erro ? 'border-red-500 focus:border-red-500' : 'border-neutral-500 focus:border-brand-800'}`

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
            {erro && (
                <p className="text-[10px] text-red-600 mt-1 flex items-center gap-1 whitespace-nowrap">
                    <span className="inline-block w-3 h-3 rounded-full bg-red-500 text-white text-[8px] flex items-center justify-center font-bold">!</span>
                    {erro}
                </p>
            )}
        </div>
    )
}

export default function NovoEventoModal({ onClose, onSuccess, selectedDate, initialData }) {
    const [loading, setLoading] = useState(false)
    const [erro, setErro] = useState('')
    const [erroHora, setErroHora] = useState('')

    const [nome, setNome] = useState(initialData?.nome || '')
    const [data, setData] = useState(() => {
        if (initialData?.data_de_realizacao) return formatDateForInput(initialData.data_de_realizacao)
        if (selectedDate) return formatDateForInput(selectedDate)
        return formatDateForInput(new Date())
    })

    // Extrair hora do data_de_realizacao sem conversão de timezone
    const [hora, setHora] = useState(initialData?.data_de_realizacao ? formatTime(initialData.data_de_realizacao) : '19:00')

    // Duração decomposta em Horas e Minutos
    const initialDuration = initialData?.duracao_minutos || 60
    const [duracaoHoras, setDuracaoHoras] = useState(Math.floor(initialDuration / 60))
    const [duracaoMinutos, setDuracaoMinutos] = useState(initialDuration % 60)

    let initialDescricao = initialData?.descricao || ''
    let initialFaqsList = []

    if (initialDescricao.includes('---FAQS---')) {
        const parts = initialDescricao.split('---FAQS---')
        initialDescricao = parts[0].trim()
        try {
            initialFaqsList = JSON.parse(parts[1].trim())
        } catch (e) {
            console.error("Erro ao fazer parse dos FAQs:", e)
        }
    }

    const [descricao, setDescricao] = useState(initialDescricao)
    const [whatsapp, setWhatsapp] = useState(initialData?.link_whatsapp || '')
    const [local, setLocal] = useState(initialData?.local || '')
    const [privado, setPrivado] = useState(initialData?.privado ?? false)

    // FAQs
    const [faqs, setFaqs] = useState(initialFaqsList)
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

        if (hora < '08:30' || hora > '21:30') {
            setErro('A hora do evento tem de estar entre 08:30 e 21:30.')
            setErroHora('Fora do horário permitido (08:30–21:30)')
            return
        }

        const todayStr = formatDateForInput(new Date())
        const currentTimeStr = `${new Date().getHours().toString().padStart(2, '0')}:${new Date().getMinutes().toString().padStart(2, '0')}`

        if (data === todayStr && hora < currentTimeStr) {
            setErro('A hora de início não pode ser no passado.')
            return
        }

        setLoading(true)
        setErro('')

        try {
            const totalMinutos = (Number(duracaoHoras) * 60) + Number(duracaoMinutos)

            let finalDescricao = descricao || ''
            if (faqs && faqs.length > 0) {
                finalDescricao += (finalDescricao ? '\n\n' : '') + '---FAQS---\n' + JSON.stringify(faqs)
            }

            const payload = {
                nome: nome.trim(),
                descricao: finalDescricao || null,
                data_de_realizacao: toWallClockISO(data, hora),
                duracao_minutos: totalMinutos,
                link_whatsapp: whatsapp || null,
                local: local || null,
                privado: privado,
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

    const todayStr = formatDateForInput(new Date())
    const currentTimeStr = `${new Date().getHours().toString().padStart(2, '0')}:${new Date().getMinutes().toString().padStart(2, '0')}`

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={onClose} />

            <div
                className="relative bg-brand-50 rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col overflow-hidden"
                onClick={e => e.stopPropagation()}
            >
                {/* Header */}
                <div className="px-8 pt-8 pb-0 shrink-0">
                    <div className="flex items-center justify-end mb-1">
                        <button
                            onClick={onClose}
                            className="w-8 h-8 rounded-full hover:bg-brand-200 flex items-center justify-center text-neutral-600"
                        >
                            <X size={17} />
                        </button>
                    </div>
                    <h2 className="text-3xl font-bold text-brand-900 text-center font-['Sora'] mb-4">
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
                            <Field
                                label="Data"
                                value={data}
                                onChange={(val) => {
                                    setData(val)
                                    if (val === todayStr && hora < currentTimeStr) {
                                        setHora(currentTimeStr)
                                    }
                                }}
                                type="date"
                                min={todayStr}
                            />
                        </div>
                        <div className="flex-1 min-w-[130px]">
                            <Field
                                label="Início"
                                value={hora}
                                onChange={(val) => {
                                    if (data === todayStr && val < currentTimeStr) {
                                        setHora(currentTimeStr)
                                    } else {
                                        setHora(val)
                                    }
                                    if (val && (val < '08:30' || val > '21:30')) {
                                        setErroHora('Fora do horário permitido (08:30–21:30)')
                                    } else {
                                        setErroHora('')
                                    }
                                }}
                                type="time"
                                min={data === todayStr && currentTimeStr > '08:30' ? currentTimeStr : '08:30'}
                                max="21:30"
                                erro={erroHora}
                            />
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

                    {/* Toggle Privado/Público */}
                    <div
                        onClick={() => setPrivado(p => !p)}
                        className={`flex items-center gap-3 px-4 py-3 rounded-xl border-2 cursor-pointer select-none transition-all ${privado
                                ? 'border-brand-800 bg-brand-50'
                                : 'border-neutral-300 bg-white hover:border-neutral-400'
                            }`}
                    >
                        <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 transition-colors ${privado ? 'bg-brand-800 text-white' : 'bg-neutral-100 text-neutral-500'
                            }`}>
                            {privado ? <Lock size={16} /> : <Globe size={16} />}
                        </div>
                        <div className="flex-1">
                            <p className="text-sm font-semibold text-neutral-900">
                                {privado ? 'Evento Privado' : 'Evento Público'}
                            </p>
                            <p className="text-xs text-neutral-500">
                                {privado
                                    ? 'Só participantes inscritos podem ver este evento'
                                    : 'Qualquer utilizador pode ver este evento'}
                            </p>
                        </div>
                        <div className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-colors shrink-0 ${privado ? 'bg-brand-800 border-brand-800' : 'border-neutral-400'
                            }`}>
                            {privado && <Check size={11} className="text-white" strokeWidth={3} />}
                        </div>
                    </div>

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
                                            className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${faqGeral ? 'bg-brand-800 border-brand-800' : 'border-neutral-700'
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

