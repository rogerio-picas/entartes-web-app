import { useState, useEffect, useRef } from 'react'
import { X, Check, AlertCircle, RefreshCw, Eye, EyeOff, Plus, UserMinus } from 'lucide-react'
import { utilizadorService } from '../services/utilizadorService'
import { modalidadeService } from '../services/modalidadeService'

const USER_TYPES = [
    { value: 3, label: 'Aluno' },
    { value: 2, label: 'Docente' },
    { value: 1, label: 'Coordenador/a' },
]

function Field({ label, error, children }) {
    return (
        <div className="relative">
            <label className="absolute -top-2.5 left-3 bg-brand-50 text-[11px] text-neutral-700 font-medium px-1 z-10">
                {label}
            </label>
            {children}
            {error && <p className="mt-1 text-[11px] text-red-600">{error}</p>}
        </div>
    )
}

const inputCls = (hasError) =>
    `w-full bg-white border ${hasError ? 'border-red-400' : 'border-neutral-500'} rounded-lg px-4 py-3 text-sm text-neutral-900 focus:outline-none focus:border-brand-800 transition-colors`

export default function NovoUtilizadorModal({ onClose, onSuccess, utilizador }) {
    const isEdit = !!utilizador

    const [form, setForm] = useState({
        id_tipo: utilizador?.id_tipo ?? '',
        nome: utilizador?.nome ?? '',
        apelido: utilizador?.apelido ?? '',
        email: utilizador?.email ?? '',
        codigo_username: utilizador?.codigo_username ?? '',
        password: '',
        telemovel: utilizador?.telemovel ?? '',
        nif: utilizador?.nif ?? '',
        data_nascimento: utilizador?.data_nascimento
            ? utilizador.data_nascimento.split('T')[0]
            : '',
        descricao: utilizador?.descricao ?? '',
        coaching: utilizador?.aluno?.coaching ?? false,
    })
    const [errors, setErrors] = useState({})
    const [loading, setLoading] = useState(false)
    const [serverError, setServerError] = useState('')
    const [showPassword, setShowPassword] = useState(false)

    const [allModalidades, setAllModalidades] = useState([])
    const [selectedModalidades, setSelectedModalidades] = useState([])
    const [addingModalidadeId, setAddingModalidadeId] = useState('')
    const originalModalidadeIds = useRef([])

    useEffect(() => {
        modalidadeService.listar(null, true, true)
            .then(list => {
                setAllModalidades(list.map(m => ({ id_modalidade: m.id_modalidade, nome: m.nome })))
                if (isEdit && utilizador.id_tipo === 2) {
                    const current = list
                        .filter(m => m.docente_modalidade?.some(d => d.id_docente === utilizador.id_utilizador))
                        .map(m => ({ id_modalidade: m.id_modalidade, nome: m.nome }))
                    setSelectedModalidades(current)
                    originalModalidadeIds.current = current.map(m => m.id_modalidade)
                }
                if (isEdit && utilizador.id_tipo === 3) {
                    const current = list
                        .filter(m => m.aluno_modalidade?.some(a => a.id_utilizador === utilizador.id_utilizador))
                        .map(m => ({ id_modalidade: m.id_modalidade, nome: m.nome }))
                    setSelectedModalidades(current)
                    originalModalidadeIds.current = current.map(m => m.id_modalidade)
                }
            })
            .catch(() => {})
    }, [])

    const availableModalidades = allModalidades.filter(
        m => !selectedModalidades.some(s => s.id_modalidade === m.id_modalidade)
    )

    function addModalidade() {
        if (!addingModalidadeId) return
        const m = allModalidades.find(m => m.id_modalidade === parseInt(addingModalidadeId))
        if (m) {
            setSelectedModalidades(prev => [...prev, m])
            setAddingModalidadeId('')
            if (errors.modalidades) setErrors(e => ({ ...e, modalidades: '' }))
        }
    }

    function removeModalidade(id) {
        setSelectedModalidades(prev => prev.filter(m => m.id_modalidade !== id))
    }

    function set(field, value) {
        setForm(f => ({ ...f, [field]: value }))
        if (errors[field]) setErrors(e => ({ ...e, [field]: '' }))
    }

    function validate() {
        const e = {}
        if (!form.id_tipo) e.id_tipo = 'Selecione um tipo de utilizador.'
        if (!form.email.trim()) {
            e.email = 'O email é obrigatório.'
        } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
            e.email = 'Formato de email inválido.'
        }
        if (!form.codigo_username.trim()) e.codigo_username = 'O nome de utilizador é obrigatório.'
        if (!isEdit && !form.password) e.password = 'A password é obrigatória.'
        if (form.password && form.password.length < 6) e.password = 'A password deve ter pelo menos 6 caracteres.'
        if (form.telemovel && !/^[0-9]{9}$/.test(form.telemovel)) e.telemovel = 'Formato inválido (9 dígitos).'
        if (form.nif && !/^[0-9]{9}$/.test(form.nif)) e.nif = 'NIF inválido (9 dígitos).'
        if (!form.data_nascimento) e.data_nascimento = 'A data de nascimento é obrigatória.'
        if (form.descricao.length > 200) e.descricao = 'Máximo de 200 caracteres.'
        if (parseInt(form.id_tipo) === 2 && selectedModalidades.length === 0)
            e.modalidades = 'Selecione pelo menos uma modalidade.'
        return e
    }

    async function syncDocenteModalidades(id_utilizador) {
        const selectedIds = selectedModalidades.map(m => m.id_modalidade)
        const toAdd = selectedIds.filter(id => !originalModalidadeIds.current.includes(id))
        const toRemove = originalModalidadeIds.current.filter(id => !selectedIds.includes(id))
        await Promise.all([
            ...toAdd.map(id => modalidadeService.associarDocente(id, id_utilizador)),
            ...toRemove.map(id => modalidadeService.desassociarDocente(id, id_utilizador)),
        ])
    }

    async function syncAlunoModalidades(id_utilizador) {
        const selectedIds = selectedModalidades.map(m => m.id_modalidade)
        const toAdd = selectedIds.filter(id => !originalModalidadeIds.current.includes(id))
        const toRemove = originalModalidadeIds.current.filter(id => !selectedIds.includes(id))
        await Promise.all([
            ...toAdd.map(id => modalidadeService.associarAluno(id, id_utilizador)),
            ...toRemove.map(id => modalidadeService.desassociarAluno(id, id_utilizador)),
        ])
    }

    async function handleSubmit() {
        const e = validate()
        if (Object.keys(e).length > 0) { setErrors(e); return }
        setLoading(true)
        setServerError('')
        try {
            const payload = {
                id_tipo: parseInt(form.id_tipo),
                email: form.email.trim(),
                codigo_username: form.codigo_username.trim(),
                ...(form.nome.trim() && { nome: form.nome.trim() }),
                ...(form.apelido.trim() && { apelido: form.apelido.trim() }),
                ...(form.telemovel && { telemovel: form.telemovel.trim() }),
                ...(form.nif && { nif: form.nif.trim() }),
                data_nascimento: form.data_nascimento,
                ...(form.descricao.trim() && { descricao: form.descricao.trim() }),
                ...(parseInt(form.id_tipo) === 3 && { coaching: form.coaching }),
            }
            if (!isEdit) payload.password = form.password
            else if (form.password) payload.password = form.password

            let userId
            if (isEdit) {
                await utilizadorService.atualizar(utilizador.id_utilizador, payload)
                userId = utilizador.id_utilizador
            } else {
                const result = await utilizadorService.criar(payload)
                userId = result.data.id_utilizador
            }

            if (parseInt(form.id_tipo) === 2) {
                await syncDocenteModalidades(userId)
            }
            if (parseInt(form.id_tipo) === 3) {
                await syncAlunoModalidades(userId)
            }

            onSuccess(isEdit)
        } catch (err) {
            setServerError(err.message || 'Erro ao guardar utilizador.')
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
            <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" />
            <div
                className="relative bg-brand-50 rounded-2xl shadow-2xl w-full max-w-lg flex flex-col overflow-hidden max-h-[90vh]"
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
                        {isEdit ? 'Editar utilizador' : 'Novo utilizador'}
                    </h2>
                    <div className="border-t border-brand-800" />
                </div>

                {/* Body */}
                <div className="flex-1 overflow-y-auto px-8 py-6 space-y-5">
                    {serverError && (
                        <div className="flex items-center gap-2 bg-red-50 text-red-700 text-sm px-4 py-3 rounded-xl border border-red-200">
                            <AlertCircle size={15} /> {serverError}
                        </div>
                    )}

                    {/* Tipo */}
                    <Field label="Tipo de utilizador *" error={errors.id_tipo}>
                        <select
                            value={form.id_tipo}
                            onChange={e => {
                                const newType = e.target.value
                                set('id_tipo', newType)
                                setSelectedModalidades([])
                                setAddingModalidadeId('')
                                setErrors(prev => ({ ...prev, modalidades: '' }))
                            }}
                            disabled={isEdit}
                            className={inputCls(!!errors.id_tipo) + ' appearance-none' + (isEdit ? ' opacity-50 cursor-not-allowed' : '')}
                        >
                            <option value="">Selecionar tipo...</option>
                            {USER_TYPES.map(t => (
                                <option key={t.value} value={t.value}>{t.label}</option>
                            ))}
                        </select>
                    </Field>

                    {/* Nome + Apelido */}
                    <div className="grid grid-cols-2 gap-4">
                        <Field label="Nome" error={errors.nome}>
                            <input
                                type="text"
                                value={form.nome}
                                onChange={e => set('nome', e.target.value)}
                                placeholder="Nome"
                                className={inputCls(false)}
                            />
                        </Field>
                        <Field label="Apelido" error={errors.apelido}>
                            <input
                                type="text"
                                value={form.apelido}
                                onChange={e => set('apelido', e.target.value)}
                                placeholder="Apelido"
                                className={inputCls(false)}
                            />
                        </Field>
                    </div>

                    {/* Email */}
                    <Field label="Email *" error={errors.email}>
                        <input
                            type="email"
                            value={form.email}
                            onChange={e => set('email', e.target.value)}
                            placeholder="email@exemplo.com"
                            className={inputCls(!!errors.email)}
                        />
                    </Field>

                    {/* Username */}
                    <Field label="Nome de utilizador *" error={errors.codigo_username}>
                        <input
                            type="text"
                            value={form.codigo_username}
                            onChange={e => set('codigo_username', e.target.value)}
                            placeholder="username"
                            className={inputCls(!!errors.codigo_username)}
                        />
                    </Field>

                    {/* Password */}
                    <Field label={isEdit ? 'Nova password (opcional)' : 'Password *'} error={errors.password}>
                        <div className="relative">
                            <input
                                type={showPassword ? 'text' : 'password'}
                                value={form.password}
                                onChange={e => set('password', e.target.value)}
                                placeholder={isEdit ? 'Deixar em branco para não alterar' : 'Mínimo 6 caracteres'}
                                className={inputCls(!!errors.password) + ' pr-12'}
                            />
                            <button
                                type="button"
                                onClick={() => setShowPassword(v => !v)}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-600 hover:text-brand-800"
                            >
                                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                            </button>
                        </div>
                    </Field>

                    {/* Telemóvel + NIF */}
                    <div className="grid grid-cols-2 gap-4">
                        <Field label="Telemóvel" error={errors.telemovel}>
                            <input
                                type="text"
                                value={form.telemovel}
                                onChange={e => set('telemovel', e.target.value)}
                                placeholder="9xxxxxxxx"
                                className={inputCls(!!errors.telemovel)}
                            />
                        </Field>
                        <Field label="NIF" error={errors.nif}>
                            <input
                                type="text"
                                value={form.nif}
                                onChange={e => set('nif', e.target.value)}
                                placeholder="9 dígitos"
                                className={inputCls(!!errors.nif)}
                            />
                        </Field>
                    </div>

                    {/* Data de nascimento */}
                    <Field label="Data de nascimento *" error={errors.data_nascimento}>
                        <input
                            type="date"
                            value={form.data_nascimento}
                            onChange={e => set('data_nascimento', e.target.value)}
                            className={inputCls(!!errors.data_nascimento)}
                        />
                    </Field>

                    {/* Modalidades — apenas para Docente */}
                    {parseInt(form.id_tipo) === 2 && (
                        <div>
                            <p className={`text-sm font-medium mb-3 ${errors.modalidades ? 'text-red-600' : 'text-black'}`}>
                                Modalidades *
                            </p>

                            {selectedModalidades.length > 0 && (
                                <div className="flex flex-wrap gap-2 mb-3">
                                    {[...selectedModalidades].sort((a, b) => a.nome.localeCompare(b.nome)).map(m => (
                                        <span
                                            key={m.id_modalidade}
                                            className="inline-flex items-center gap-1.5 text-xs bg-brand-200 text-brand-800 px-2.5 py-1 rounded-full font-medium"
                                        >
                                            {m.nome}
                                            <button
                                                onClick={() => removeModalidade(m.id_modalidade)}
                                                className="hover:text-red-600 transition-colors"
                                            >
                                                <UserMinus size={12} />
                                            </button>
                                        </span>
                                    ))}
                                </div>
                            )}

                            {availableModalidades.length > 0 && (
                                <div className="flex gap-2">
                                    <div className="relative flex-1">
                                        <label className="absolute -top-2.5 left-3 bg-brand-50 text-[11px] text-neutral-700 font-medium px-1 z-10">
                                            Adicionar modalidade
                                        </label>
                                        <select
                                            value={addingModalidadeId}
                                            onChange={e => setAddingModalidadeId(e.target.value)}
                                            className="w-full bg-white border border-neutral-500 rounded-lg px-4 py-3 text-sm text-neutral-900 focus:outline-none focus:border-brand-800 transition-colors appearance-none"
                                        >
                                            <option value="">Selecionar...</option>
                                            {availableModalidades.map(m => (
                                                <option key={m.id_modalidade} value={m.id_modalidade}>
                                                    {m.nome}
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                    <button
                                        onClick={addModalidade}
                                        disabled={!addingModalidadeId}
                                        className="self-end w-11 h-11 rounded-xl bg-brand-800 text-white flex items-center justify-center hover:bg-brand-900 transition-colors disabled:opacity-40"
                                    >
                                        <Plus size={18} />
                                    </button>
                                </div>
                            )}

                            {errors.modalidades && (
                                <p className="mt-2 text-[11px] text-red-600">{errors.modalidades}</p>
                            )}

                            {availableModalidades.length === 0 && selectedModalidades.length === 0 && (
                                <p className="text-xs text-neutral-600">Nenhuma modalidade disponível.</p>
                            )}
                        </div>
                    )}

                    {/* Modalidades — apenas para Aluno */}
                    {parseInt(form.id_tipo) === 3 && (
                        <div>
                            <p className="text-sm font-medium mb-3 text-black">
                                Modalidades
                            </p>

                            {selectedModalidades.length > 0 && (
                                <div className="flex flex-wrap gap-2 mb-3">
                                    {[...selectedModalidades].sort((a, b) => a.nome.localeCompare(b.nome)).map(m => (
                                        <span
                                            key={m.id_modalidade}
                                            className="inline-flex items-center gap-1.5 text-xs bg-brand-200 text-brand-800 px-2.5 py-1 rounded-full font-medium"
                                        >
                                            {m.nome}
                                            <button
                                                onClick={() => removeModalidade(m.id_modalidade)}
                                                className="hover:text-red-600 transition-colors"
                                            >
                                                <UserMinus size={12} />
                                            </button>
                                        </span>
                                    ))}
                                </div>
                            )}

                            {availableModalidades.length > 0 && (
                                <div className="flex gap-2">
                                    <div className="relative flex-1">
                                        <label className="absolute -top-2.5 left-3 bg-brand-50 text-[11px] text-neutral-700 font-medium px-1 z-10">
                                            Adicionar modalidade
                                        </label>
                                        <select
                                            value={addingModalidadeId}
                                            onChange={e => setAddingModalidadeId(e.target.value)}
                                            className="w-full bg-white border border-neutral-500 rounded-lg px-4 py-3 text-sm text-neutral-900 focus:outline-none focus:border-brand-800 transition-colors appearance-none"
                                        >
                                            <option value="">Selecionar...</option>
                                            {availableModalidades.map(m => (
                                                <option key={m.id_modalidade} value={m.id_modalidade}>
                                                    {m.nome}
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                    <button
                                        onClick={addModalidade}
                                        disabled={!addingModalidadeId}
                                        className="self-end w-11 h-11 rounded-xl bg-brand-800 text-white flex items-center justify-center hover:bg-brand-900 transition-colors disabled:opacity-40"
                                    >
                                        <Plus size={18} />
                                    </button>
                                </div>
                            )}

                            {availableModalidades.length === 0 && selectedModalidades.length === 0 && (
                                <p className="text-xs text-neutral-600">Nenhuma modalidade disponível.</p>
                            )}
                        </div>
                    )}

                    {/* Coaching — apenas para Aluno */}
                    {parseInt(form.id_tipo) === 3 && (
                        <div className="flex items-center justify-between px-4 py-3 bg-white border border-neutral-500 rounded-lg">
                            <span className="text-sm text-neutral-900">Coaching</span>
                            <button
                                type="button"
                                onClick={() => set('coaching', !form.coaching)}
                                className={`relative w-11 h-6 rounded-full transition-colors ${form.coaching ? 'bg-brand-800' : 'bg-neutral-500/40'}`}
                            >
                                <span
                                    className={`absolute left-1 top-1 w-4 h-4 bg-white rounded-full shadow transition-transform ${form.coaching ? 'translate-x-5' : 'translate-x-0'}`}
                                />
                            </button>
                        </div>
                    )}

                    {/* Descrição */}
                    <div className="relative">
                        <label className="absolute -top-2.5 left-3 bg-brand-50 text-[11px] text-neutral-700 font-medium px-1 z-10">
                            Descrição
                        </label>
                        <textarea
                            value={form.descricao}
                            onChange={e => set('descricao', e.target.value)}
                            placeholder="Descrição opcional..."
                            rows={2}
                            maxLength={200}
                            className={inputCls(!!errors.descricao) + ' resize-none'}
                        />
                        <div className="flex justify-between mt-1">
                            {errors.descricao
                                ? <p className="text-[11px] text-red-600">{errors.descricao}</p>
                                : <span />
                            }
                            <span className={`text-[11px] ${form.descricao.length > 180 ? 'text-amber-600' : 'text-neutral-600/50'}`}>
                                {form.descricao.length}/200
                            </span>
                        </div>
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
                        {isEdit ? 'Guardar' : 'Criar utilizador'}
                    </button>
                </div>
            </div>
        </div>
    )
}


