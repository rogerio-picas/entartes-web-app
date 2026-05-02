import { useState, useEffect } from 'react'
import { X, Check, AlertCircle, RefreshCw, Plus, UserMinus } from 'lucide-react'
import { modalidadeService } from '../services/modalidadeService'

function Field({ label, value, onChange, placeholder }) {
    return (
        <div className="relative">
            <label className="absolute -top-2.5 left-3 bg-brand-50 text-[11px] text-neutral-700 font-medium px-1 z-10">
                {label}
            </label>
            <input
                type="text"
                value={value}
                onChange={e => onChange(e.target.value)}
                placeholder={placeholder}
                className="w-full bg-white border border-neutral-500 rounded-lg px-4 py-3 text-sm text-neutral-900 focus:outline-none focus:border-brand-800 transition-colors"
            />
        </div>
    )
}

export default function NovaModalidadeModal({ onClose, onSuccess, modalidade }) {
    const isEdit = !!modalidade
    const [nome, setNome] = useState(modalidade?.nome ?? '')
    const [loading, setLoading] = useState(false)
    const [erro, setErro] = useState('')

    const [allDocentes, setAllDocentes] = useState([])
    const [selectedDocentes, setSelectedDocentes] = useState(
        modalidade?.docente_modalidade?.map(d => ({
            id_docente: d.id_docente,
            nome: d.nome,
            apelido: d.apelido,
        })) ?? []
    )
    const originalIds = modalidade?.docente_modalidade?.map(d => d.id_docente) ?? []
    const [addingId, setAddingId] = useState('')

    useEffect(() => {
        modalidadeService.listarDocentes()
            .then(list => setAllDocentes(list))
            .catch(() => {})
    }, [])

    const availableDocentes = allDocentes.filter(
        d => !selectedDocentes.some(s => s.id_docente === d.id_docente)
    )

    function addDocente() {
        if (!addingId) return
        const d = allDocentes.find(d => d.id_docente === parseInt(addingId))
        if (!d) return
        setSelectedDocentes(prev => [...prev, { id_docente: d.id_docente, nome: d.nome, apelido: d.apelido, codigo_username: d.codigo_username }])
        setAddingId('')
    }

    function removeDocente(id_docente) {
        setSelectedDocentes(prev => prev.filter(d => d.id_docente !== id_docente))
    }

    async function syncDocentes(id_modalidade) {
        const selectedIds = selectedDocentes.map(d => d.id_docente)
        const toAdd = selectedIds.filter(id => !originalIds.includes(id))
        const toRemove = originalIds.filter(id => !selectedIds.includes(id))
        await Promise.all([
            ...toAdd.map(id => modalidadeService.associarDocente(id_modalidade, id)),
            ...toRemove.map(id => modalidadeService.desassociarDocente(id_modalidade, id)),
        ])
    }

    async function handleSubmit() {
        if (!nome.trim()) { setErro('O nome da modalidade é obrigatório.'); return }
        setLoading(true)
        setErro('')
        try {
            let id_modalidade
            if (isEdit) {
                await modalidadeService.atualizar(modalidade.id_modalidade, nome.trim())
                id_modalidade = modalidade.id_modalidade
            } else {
                const created = await modalidadeService.criar(nome.trim())
                id_modalidade = created.id_modalidade
            }
            await syncDocentes(id_modalidade)
            onSuccess(nome.trim())
        } catch (e) {
            setErro(e.message || 'Erro ao guardar modalidade.')
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
            <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" />
            <div
                className="relative bg-brand-50 rounded-2xl shadow-2xl w-full max-w-md flex flex-col overflow-hidden"
                onClick={e => e.stopPropagation()}
            >
                {/* Header */}
                <div className="px-8 pt-8 pb-0 shrink-0">
                    <div className="flex items-center justify-between mb-1">
                        <span />
                        <button onClick={onClose} className="w-8 h-8 rounded-full hover:bg-brand-200 flex items-center justify-center text-neutral-600">
                            <X size={17} />
                        </button>
                    </div>
                    <h2 className="text-4xl font-bold text-brand-900 text-center font-['Sora'] mb-4">
                        {isEdit ? 'Editar modalidade' : 'Nova modalidade'}
                    </h2>
                    <div className="border-t border-brand-800" />
                </div>

                {/* Body */}
                <div className="flex-1 overflow-y-auto px-8 py-6 space-y-6">
                    {erro && (
                        <div className="flex items-center gap-2 bg-red-50 text-red-700 text-sm px-4 py-3 rounded-xl border border-red-200">
                            <AlertCircle size={15} /> {erro}
                        </div>
                    )}

                    <Field label="Nome" value={nome} onChange={setNome} placeholder="Nome da modalidade" />

                    {/* Docentes */}
                    <div>
                        <p className="text-sm font-medium text-black mb-3">Docentes</p>

                        {selectedDocentes.length > 0 && (
                            <div className="flex flex-wrap gap-2 mb-3">
                                {selectedDocentes.map(d => (
                                    <span
                                        key={d.id_docente}
                                        className="inline-flex items-center gap-1.5 text-xs bg-brand-200 text-brand-800 px-2.5 py-1 rounded-full font-medium"
                                    >
                                        {[d.nome, d.apelido].filter(Boolean).join(' ') || d.codigo_username}
                                        <button
                                            onClick={() => removeDocente(d.id_docente)}
                                            className="hover:text-red-600 transition-colors"
                                        >
                                            <UserMinus size={12} />
                                        </button>
                                    </span>
                                ))}
                            </div>
                        )}

                        {availableDocentes.length > 0 && (
                            <div className="flex gap-2">
                                <div className="relative flex-1">
                                    <label className="absolute -top-2.5 left-3 bg-brand-50 text-[11px] text-neutral-700 font-medium px-1 z-10">
                                        Adicionar docente
                                    </label>
                                    <select
                                        value={addingId}
                                        onChange={e => setAddingId(e.target.value)}
                                        className="w-full bg-white border border-neutral-500 rounded-lg px-4 py-3 text-sm text-neutral-900 focus:outline-none focus:border-brand-800 transition-colors appearance-none"
                                    >
                                        <option value="">Selecionar...</option>
                                        {availableDocentes.map(d => (
                                            <option key={d.id_docente} value={d.id_docente}>
                                                {[d.nome, d.apelido].filter(Boolean).join(' ') || d.codigo_username}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                                <button
                                    onClick={addDocente}
                                    disabled={!addingId}
                                    className="self-end w-11 h-11 rounded-xl bg-brand-800 text-white flex items-center justify-center hover:bg-brand-900 transition-colors disabled:opacity-40"
                                >
                                    <Plus size={18} />
                                </button>
                            </div>
                        )}

                        {availableDocentes.length === 0 && selectedDocentes.length === 0 && (
                            <p className="text-xs text-neutral-600">Nenhum docente disponível.</p>
                        )}
                    </div>
                </div>

                {/* Footer */}
                <div className="px-8 pb-8 pt-2 shrink-0 flex justify-end">
                    <button
                        onClick={handleSubmit}
                        disabled={loading}
                        className="flex items-center gap-2 px-8 py-4 bg-brand-800 text-white font-semibold rounded-2xl hover:bg-brand-900 transition-colors disabled:opacity-60 text-base font-['Sora']"
                    >
                        {loading ? <RefreshCw size={18} className="animate-spin" /> : <Check size={18} />}
                        Guardar
                    </button>
                </div>
            </div>
        </div>
    )
}


