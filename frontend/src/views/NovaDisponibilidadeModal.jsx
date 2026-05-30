import { useState } from 'react'
import { X, Clock, ChevronDown, AlertCircle, RefreshCw } from 'lucide-react'
import { disponibilidadeService } from '../services/disponibilidadeService'
import { formatDateForInput } from '../utils/dateUtils'

// Normaliza uma hora para o formato HH:mm que o <input type="time"> espera
function parseHoraParaInput(raw) {
    if (!raw) return ''
    // ISO timestamp: "1970-01-01T14:00:00.000Z" â†’ pega os 5 chars da hora em UTC
    if (String(raw).includes('T')) {
        const d = new Date(raw)
        if (!isNaN(d)) {
            const h = String(d.getUTCHours()).padStart(2, '0')
            const m = String(d.getUTCMinutes()).padStart(2, '0')
            return `${h}:${m}`
        }
    }
    // Já está em formato HH:mm ou HH:mm:ss
    return String(raw).substring(0, 5)
}

const DIAS_SEMANA = [
    { value: 0, label: 'Domingo' },
    { value: 1, label: 'Segunda-Feira' },
    { value: 2, label: 'Terça-Feira' },
    { value: 3, label: 'Quarta-Feira' },
    { value: 4, label: 'Quinta-Feira' },
    { value: 5, label: 'Sexta-Feira' },
    { value: 6, label: 'Sábado' },
]

function Field({ label, children }) {
    return (
        <div className="relative">
            <label className="absolute -top-2.5 left-3 bg-brand-50 text-[11px] text-neutral-700 font-medium px-1 z-10 font-['Sora']">
                {label}
            </label>
            {children}
        </div>
    )
}

const inputCls = "w-full border border-neutral-500 rounded-lg px-4 py-3.5 text-sm text-neutral-900 focus:outline-none focus:border-brand-800 bg-white transition-colors font['Sora']"

export default function NovaDisponibilidadeModal({ onClose, onSuccess, selectedDate, initialData }) {
    const [horaInicio, setHoraInicio] = useState(parseHoraParaInput(initialData?.hora_inicio) || '09:00')
    const [horaFim, setHoraFim] = useState(parseHoraParaInput(initialData?.hora_fim) || '10:00')
    const [frequencia, setFrequencia] = useState(
        initialData
            ? (initialData.data_especifica ? 'unica' : 'semanal')
            : (selectedDate ? 'unica' : 'semanal')
    )
    const [diaSemana, setDiaSemana] = useState(initialData?.dia_semana ?? 1)
    const [data, setData] = useState(() => {
        if (initialData?.data_especifica) return formatDateForInput(initialData.data_especifica)
        if (selectedDate) return formatDateForInput(selectedDate)
        return ''
    })
    const [saving, setSaving] = useState(false)
    const [erro, setErro] = useState('')
    const [erroHoraInicio, setErroHoraInicio] = useState('')
    const [erroHoraFim, setErroHoraFim] = useState('')

    const HORA_MIN = '08:30'
    const HORA_MAX = '21:30'

    function validarHora(valor, isInicio) {
        if (!valor) return ''
        if (valor < HORA_MIN || valor > HORA_MAX)
            return `Fora do horário permitido (${HORA_MIN}–${HORA_MAX})`
        if (!isInicio && horaInicio && valor <= horaInicio)
            return 'Deve ser posterior à hora de início'
        return ''
    }

    const isEdit = !!initialData
    const handleSave = async () => {
        const eIni = validarHora(horaInicio, true)
        const eFim = validarHora(horaFim, false)
        setErroHoraInicio(eIni)
        setErroHoraFim(eFim)
        if (!horaInicio || !horaFim) return setErro('Horários são obrigatórios.')
        if (eIni || eFim) return setErro('Corrija os horários assinalados.')
        if (horaFim <= horaInicio) return setErro('A hora de fim tem de ser posterior à hora de início.')
        if (frequencia === 'unica') {
            if (!data) return setErro('Data é obrigatória.')
            const selected = new Date(data)
            selected.setHours(0, 0, 0, 0)
            const today = new Date()
            today.setHours(0, 0, 0, 0)

            if (selected < today) {
                return setErro('A data específica não pode ser inferior à data atual.')
            }

            // Se for hoje, a hora de início tem de ser superior à hora atual
            if (selected.getTime() === today.getTime()) {
                const now = new Date()
                const [h, m] = horaInicio.split(':').map(Number)
                const start = new Date()
                start.setHours(h, m, 0, 0)
                if (start < now) {
                    return setErro('A hora de início não pode ser inferior à hora atual.')
                }
            }
        }

        setSaving(true)
        setErro('')

        try {
            const payload = {
                hora_inicio: horaInicio,
                hora_fim: horaFim
                // Nota: id_modalidade foi removido da tabela disponibilidade conforme pedido para reverter
            }
            if (frequencia === 'semanal') {
                payload.dia_semana = diaSemana
                payload.data_especifica = null
            } else {
                payload.data_especifica = data
                payload.dia_semana = null
            }

            if (isEdit) {
                await disponibilidadeService.editar(initialData.id_disponibilidade, payload)
            } else {
                await disponibilidadeService.criar(payload)
            }

            onSuccess?.()
            onClose()
        } catch (e) {
            setErro(e.message || `Erro ao ${isEdit ? 'editar' : 'criar'} disponibilidade.`)
        } finally {
            setSaving(false)
        }
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
            <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" />
            <div
                className="relative bg-brand-50 rounded-2xl shadow-2xl w-full max-w-2xl p-8 font-['Sora']"
                onClick={e => e.stopPropagation()}
            >
                {/* Close button */}
                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 w-9 h-9 rounded-full bg-feedback-error flex items-center justify-center text-white hover:bg-red-700 transition-colors"
                >
                    <X size={18} />
                </button>

                {/* Title */}
                <h2 className="text-center text-brand-900 font-normal text-3xl mb-3 tracking-tight">
                    {isEdit ? 'Editar disponibilidade' : 'Nova disponibilidade'}
                </h2>
                <div className="h-px bg-brand-800 mb-8" />

                {/* Error */}
                {erro && (
                    <div className="mb-5 flex items-center gap-2 bg-red-50 text-red-700 text-sm px-4 py-3 rounded-xl border border-red-200">
                        <AlertCircle size={15} /> {erro}
                    </div>
                )}

                {/* Form grid */}
                <div className="grid grid-cols-2 gap-x-8 gap-y-7">
                    {/* Data only editable for "unica" */}
                    <Field label="Data">
                        <input
                            type={frequencia === 'unica' ? 'date' : 'text'}
                            value={frequencia === 'unica' ? data : ''}
                            onChange={e => setData(e.target.value)}
                            placeholder="DD/MM/YYYY"
                            disabled={frequencia === 'semanal'}
                            min={formatDateForInput(new Date())}
                            className={`${inputCls} ${frequencia === 'semanal' ? 'opacity-40 cursor-not-allowed' : ''}`}
                        />
                    </Field>

                    {/* empty cell to keep Data on the left */}
                    <div />

                    {/* Hora de início */}
                    <Field label="Hora de início">
                        <input
                            type="time"
                            value={horaInicio}
                            onChange={e => {
                                const v = e.target.value
                                setHoraInicio(v)
                                setErroHoraInicio(validarHora(v, true))
                            }}
                            placeholder="HH:mm"
                            min="08:30"
                            max="21:30"
                            className={`${inputCls} ${erroHoraInicio ? 'border-red-500 focus:border-red-500' : ''}`}
                        />
                        {erroHoraInicio && (
                            <p className="text-[10px] text-red-600 mt-1 flex items-center gap-1 whitespace-nowrap">
                                <span className="inline-block w-3 h-3 rounded-full bg-red-500 text-white text-[8px] flex items-center justify-center font-bold">!</span>
                                {erroHoraInicio}
                            </p>
                        )}
                    </Field>

                    {/* Hora de fim */}
                    <Field label="Hora de fim">
                        <input
                            type="time"
                            value={horaFim}
                            onChange={e => {
                                const v = e.target.value
                                setHoraFim(v)
                                setErroHoraFim(validarHora(v, false))
                            }}
                            placeholder="HH:mm"
                            min="08:30"
                            max="21:30"
                            className={`${inputCls} ${erroHoraFim ? 'border-red-500 focus:border-red-500' : ''}`}
                        />
                        {erroHoraFim && (
                            <p className="text-[10px] text-red-600 mt-1 flex items-center gap-1 whitespace-nowrap">
                                <span className="inline-block w-3 h-3 rounded-full bg-red-500 text-white text-[8px] flex items-center justify-center font-bold">!</span>
                                {erroHoraFim}
                            </p>
                        )}
                    </Field>
                </div>

                {/* Frequência + day selector */}
                <div className="mt-8 grid grid-cols-2 gap-8 items-start">
                    <div>
                        <div className="flex items-center gap-2 mb-3">
                            <Clock size={17} className="text-brand-800" />
                            <span className="text-brand-800 font-bold text-sm tracking-wide uppercase">Frequência</span>
                        </div>
                        <div className="flex gap-3">
                            <button
                                onClick={() => setFrequencia('semanal')}
                                className={`px-6 py-3 rounded-xl font-bold text-sm transition-colors
                                    ${frequencia === 'semanal'
                                        ? 'bg-brand-800 text-white shadow-sm'
                                        : 'bg-brand-200 text-brand-800 hover:bg-brand-200'
                                    }`}
                            >
                                Semanal
                            </button>
                            <button
                                onClick={() => setFrequencia('unica')}
                                className={`px-6 py-3 rounded-xl font-bold text-sm transition-colors
                                    ${frequencia === 'unica'
                                        ? 'bg-brand-800 text-white shadow-sm'
                                        : 'bg-brand-200 text-brand-800 hover:bg-brand-200'
                                    }`}
                            >
                                Única
                            </button>
                        </div>
                    </div>

                    {frequencia === 'semanal' && (
                        <div className="relative self-end">
                            <select
                                value={diaSemana}
                                onChange={e => setDiaSemana(Number(e.target.value))}
                                className="w-full bg-brand-900 text-white rounded-xl px-5 py-3.5 text-sm font-bold appearance-none cursor-pointer focus:outline-none"
                            >
                                {DIAS_SEMANA.map(d => (
                                    <option key={d.value} value={d.value}>{d.label}</option>
                                ))}
                            </select>
                            <ChevronDown size={16} className="absolute right-4 top-1/2 -translate-y-1/2 text-white pointer-events-none" />
                        </div>
                    )}
                </div>

                {/* Actions */}
                <div className="mt-10 grid grid-cols-2 gap-4">
                    <button
                        onClick={onClose}
                        className="py-3.5 rounded-2xl border border-gray-300 text-gray-700 font-medium text-sm hover:bg-gray-50 transition-colors"
                    >
                        Cancelar
                    </button>
                    <button
                        onClick={handleSave}
                        disabled={saving}
                        className="py-3.5 rounded-2xl bg-brand-800 text-white font-bold text-sm hover:bg-brand-900 transition-colors disabled:opacity-50 flex items-center justify-center"
                    >
                        {saving ? <RefreshCw size={16} className="animate-spin" /> : (isEdit ? 'Guardar' : 'Criar')}
                    </button>
                </div>
            </div>
        </div>
    )
}


