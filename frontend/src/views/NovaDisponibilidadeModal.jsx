import { useState, useEffect } from 'react'
import { X, Clock, ChevronDown, AlertCircle, RefreshCw } from 'lucide-react'
import { disponibilidadeService } from '../services/disponibilidadeService'
import { modalidadeService } from '../services/modalidadeService'

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
            <label className="absolute -top-2.5 left-3 bg-[#F4FBF9] text-[11px] text-[#3F4948] font-medium px-1 z-10 font-['Sora']">
                {label}
            </label>
            {children}
        </div>
    )
}

const inputCls = "w-full border border-[#6F7978] rounded-lg px-4 py-3.5 text-sm text-[#161D1C] focus:outline-none focus:border-[#006A68] bg-white transition-colors font-['Sora']"

export default function NovaDisponibilidadeModal({ onClose, onSuccess }) {
    const [horaInicio, setHoraInicio]     = useState('')
    const [horaFim, setHoraFim]           = useState('')
    const [modalidade, setModalidade]     = useState('')
    const [modalidades, setModalidades]   = useState([])
    const [frequencia, setFrequencia]     = useState('unica')
    const [diaSemana, setDiaSemana]       = useState(1)
    const [data, setData]                 = useState('')
    const [saving, setSaving]             = useState(false)
    const [erro, setErro]                 = useState('')

    useEffect(() => {
        // This modal is only accessible to docentes. id_utilizador equals id_docente,
        // so we decode it from the JWT to filter only this docente's modalidades.
        const token = localStorage.getItem('token')
        const id_docente = token ? JSON.parse(atob(token.split('.')[1])).id : null
        modalidadeService.listar(id_docente)
            .then(list => {
                setModalidades(list)
                if (list.length > 0) setModalidade(list[0].id_modalidade)
            })
            .catch(() => {})
    }, [])

    async function handleCriar() {
        if (!horaInicio || !horaFim) {
            setErro('Hora de início e hora de fim são obrigatórios.')
            return
        }
        if (frequencia === 'unica' && !data) {
            setErro('A data é obrigatória para disponibilidade única.')
            return
        }
        setSaving(true)
        setErro('')
        try {
            const payload = { hora_inicio: horaInicio, hora_fim: horaFim }
            if (frequencia === 'semanal') {
                payload.dia_semana = diaSemana
            } else {
                payload.data_especifica = data
            }
            await disponibilidadeService.criar(payload)
            onSuccess?.()
        } catch (e) {
            setErro(e.message || 'Erro ao criar disponibilidade.')
        } finally {
            setSaving(false)
        }
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
            <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" />
            <div
                className="relative bg-[#F4FBF9] rounded-2xl shadow-2xl w-full max-w-2xl p-8 font-['Sora']"
                onClick={e => e.stopPropagation()}
            >
                {/* Close button */}
                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 w-9 h-9 rounded-full bg-[#BA1A1A] flex items-center justify-center text-white hover:bg-red-700 transition-colors"
                >
                    <X size={18} />
                </button>

                {/* Title */}
                <h2 className="text-center text-[#2D4948] font-normal text-3xl mb-3 tracking-tight">
                    Nova disponibilidade
                </h2>
                <div className="h-px bg-[#006A68] mb-8" />

                {/* Error */}
                {erro && (
                    <div className="mb-5 flex items-center gap-2 bg-red-50 text-red-700 text-sm px-4 py-3 rounded-xl border border-red-200">
                        <AlertCircle size={15} /> {erro}
                    </div>
                )}

                {/* Form grid */}
                <div className="grid grid-cols-2 gap-x-8 gap-y-7">
                    {/* Data — only editable for "Única" */}
                    <Field label="Data">
                        <input
                            type={frequencia === 'unica' ? 'date' : 'text'}
                            value={frequencia === 'unica' ? data : ''}
                            onChange={e => setData(e.target.value)}
                            placeholder="DD/MM/YYYY"
                            disabled={frequencia === 'semanal'}
                            className={`${inputCls} ${frequencia === 'semanal' ? 'opacity-40 cursor-not-allowed' : ''}`}
                        />
                    </Field>

                    {/* Hora de início */}
                    <Field label="Hora de início">
                        <input
                            type="time"
                            value={horaInicio}
                            onChange={e => setHoraInicio(e.target.value)}
                            placeholder="HH:mm"
                            className={inputCls}
                        />
                    </Field>

                    {/* Modalidade */}
                    <Field label="Modalidade">
                        <div className="relative">
                            <select
                                value={modalidade}
                                onChange={e => setModalidade(Number(e.target.value))}
                                className={`${inputCls} appearance-none cursor-pointer pr-10`}
                            >
                                
                                {modalidades.map(m => (
                                    <option key={m.id_modalidade} value={m.id_modalidade}>{m.nome}</option>
                                ))}
                            </select>
                            <ChevronDown size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#4A6362] pointer-events-none" />
                        </div>
                    </Field>

                    {/* Hora de fim */}
                    <Field label="Hora de fim">
                        <input
                            type="time"
                            value={horaFim}
                            onChange={e => setHoraFim(e.target.value)}
                            placeholder="HH:mm"
                            className={inputCls}
                        />
                    </Field>
                </div>

                {/* Frequência + day selector */}
                <div className="mt-8 grid grid-cols-2 gap-8 items-start">
                    <div>
                        <div className="flex items-center gap-2 mb-3">
                            <Clock size={17} className="text-[#006A68]" />
                            <span className="text-[#006A68] font-bold text-sm tracking-wide uppercase">Frequência</span>
                        </div>
                        <div className="flex gap-3">
                            <button
                                onClick={() => setFrequencia('semanal')}
                                className={`px-6 py-3 rounded-xl font-bold text-sm transition-colors
                                    ${frequencia === 'semanal'
                                        ? 'bg-[#006A68] text-white shadow-sm'
                                        : 'bg-[#CCE8E6] text-[#006A68] hover:bg-[#b5dbd9]'
                                    }`}
                            >
                                Semanal
                            </button>
                            <button
                                onClick={() => setFrequencia('unica')}
                                className={`px-6 py-3 rounded-xl font-bold text-sm transition-colors
                                    ${frequencia === 'unica'
                                        ? 'bg-[#006A68] text-white shadow-sm'
                                        : 'bg-[#CCE8E6] text-[#006A68] hover:bg-[#b5dbd9]'
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
                                className="w-full bg-[#2D4948] text-white rounded-xl px-5 py-3.5 text-sm font-bold appearance-none cursor-pointer focus:outline-none"
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
                        onClick={handleCriar}
                        disabled={saving}
                        className="py-3.5 rounded-2xl bg-[#006A68] text-white font-bold text-sm hover:bg-[#00504E] transition-colors disabled:opacity-50 flex items-center justify-center"
                    >
                        {saving ? <RefreshCw size={16} className="animate-spin" /> : 'Criar'}
                    </button>
                </div>
            </div>
        </div>
    )
}
