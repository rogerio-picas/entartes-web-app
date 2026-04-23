import { useState, useEffect, useRef } from 'react'
import {
    X, User, Mail, Phone, Lock, Eye, EyeOff,
    Check, RefreshCw, AlertCircle, ShieldCheck, Calendar
} from 'lucide-react'
import { api } from '../services/api'
import { authService } from '../services/authService'

// ─── Field wrapper ─────────────────────────────────────────────────────────────
function Field({ label, icon: Icon, error, children }) {
    return (
        <div className="flex flex-col gap-1.5">
            <label className="text-[11px] font-bold text-[#4A6362] uppercase tracking-wider flex items-center gap-1.5">
                {Icon && <Icon size={12} className="text-[#006A68]" />}
                {label}
            </label>
            {children}
            {error && (
                <p className="text-[11px] text-red-500 flex items-center gap-1">
                    <AlertCircle size={10} /> {error}
                </p>
            )}
        </div>
    )
}

const inputCls = (hasError) =>
    `w-full bg-white border rounded-xl px-4 py-3 text-sm text-[#161D1C] focus:outline-none transition-colors font-['Sora'] placeholder:text-gray-300
     ${hasError
        ? 'border-red-300 focus:border-red-500'
        : 'border-[#BEC9C7] focus:border-[#006A68]'}`

// ─── Password strength meter ──────────────────────────────────────────────────
function PasswordStrength({ password }) {
    if (!password) return null
    const checks = [
        password.length >= 8,
        /[A-Z]/.test(password),
        /[0-9]/.test(password),
        /[^A-Za-z0-9]/.test(password),
    ]
    const score = checks.filter(Boolean).length
    const labels = ['Fraca', 'Razoável', 'Boa', 'Forte']
    const colors = ['bg-red-400', 'bg-orange-400', 'bg-yellow-400', 'bg-emerald-500']
    return (
        <div className="mt-1.5">
            <div className="flex gap-1 mb-1">
                {[0, 1, 2, 3].map(i => (
                    <div
                        key={i}
                        className={`h-1 flex-1 rounded-full transition-all ${i < score ? colors[score - 1] : 'bg-gray-100'}`}
                    />
                ))}
            </div>
            <p className={`text-[10px] font-semibold ${score <= 1 ? 'text-red-500' : score === 2 ? 'text-orange-500' : score === 3 ? 'text-yellow-600' : 'text-emerald-600'}`}>
                Segurança: {labels[score - 1] ?? 'Muito fraca'}
            </p>
        </div>
    )
}

// ─── Lê o id do utilizador directamente do JWT (sem verificar assinatura) ─────
function getIdFromToken() {
    try {
        const token = localStorage.getItem('token')
        if (!token) return null
        const payload = JSON.parse(atob(token.split('.')[1]))
        return payload.id ?? null
    } catch {
        return null
    }
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function EditarPerfilModal({ onClose, onSuccess }) {
    const user = authService.getUser()
    const panelRef = useRef(null)

    const [tab, setTab] = useState('dados') // 'dados' | 'password'

    const [form, setForm] = useState({
        nome: '',
        apelido: '',
        email: '',
        telemovel: '',
        data_nascimento: '',
        nif: '',
    })

    const [passForm, setPassForm] = useState({
        password_atual: '',
        nova_password: '',
        confirmar_password: '',
    })
    const [showPass, setShowPass] = useState({ atual: false, nova: false, confirmar: false })

    const [loading, setLoading] = useState(true)
    const [loadError, setLoadError] = useState('')
    const [saving, setSaving] = useState(false)
    const [errors, setErrors] = useState({})
    const [passErrors, setPassErrors] = useState({})
    const [successMsg, setSuccessMsg] = useState('')

    // ── Carregar dados via GET /api/auth/me ───────────────────────────────────
    // Acessível a qualquer role autenticado — não depende de permissões de utilizador.
    useEffect(() => {
        api.get('/auth/me')
            .then(data => {
                setForm({
                    nome: data.nome ?? '',
                    apelido: data.apelido ?? '',
                    email: data.email ?? '',
                    telemovel: data.telemovel ?? '',
                    data_nascimento: data.data_nascimento
                        ? new Date(data.data_nascimento).toISOString().split('T')[0]
                        : '',
                    nif: data.nif ?? '',
                })
                // Actualiza localStorage para o header mostrar o nome correcto
                const stored = authService.getUser()
                localStorage.setItem('user', JSON.stringify({
                    ...stored,
                    id_utilizador: data.id_utilizador,
                    nome: data.nome,
                    apelido: data.apelido,
                }))
            })
            .catch(err => setLoadError(err.message || 'Erro ao carregar os teus dados.'))
            .finally(() => setLoading(false))
    }, [])

    // Fechar com Escape
    useEffect(() => {
        const onKey = (e) => { if (e.key === 'Escape') onClose() }
        document.addEventListener('keydown', onKey)
        return () => document.removeEventListener('keydown', onKey)
    }, [onClose])

    // Fechar ao clicar fora
    useEffect(() => {
        const onClick = (e) => {
            if (panelRef.current && !panelRef.current.contains(e.target)) onClose()
        }
        const t = setTimeout(() => document.addEventListener('mousedown', onClick), 100)
        return () => { clearTimeout(t); document.removeEventListener('mousedown', onClick) }
    }, [onClose])

    function set(k, v) { setForm(prev => ({ ...prev, [k]: v })); setErrors(prev => ({ ...prev, [k]: '' })) }
    function setPass(k, v) { setPassForm(prev => ({ ...prev, [k]: v })); setPassErrors(prev => ({ ...prev, [k]: '' })) }

    function validateDados() {
        const e = {}
        if (!form.nome.trim()) e.nome = 'Nome é obrigatório'
        if (form.telemovel) {
            const t = form.telemovel.replace(/\s/g, '')
            if (!/^[239]\d{8}$/.test(t)) e.telemovel = 'Telemóvel inválido (9 dígitos, começa por 9, 2 ou 3)'
        }
        return e
    }

    function validatePassword() {
        const e = {}
        if (!passForm.password_atual) e.password_atual = 'Insere a password atual'
        if (!passForm.nova_password) e.nova_password = 'Insere a nova password'
        else if (passForm.nova_password.length < 8) e.nova_password = 'Mínimo 8 caracteres'
        if (passForm.nova_password !== passForm.confirmar_password) e.confirmar_password = 'As passwords não coincidem'
        return e
    }

    // ── Guardar dados pessoais ────────────────────────────────────────────────
    // PUT /api/users/perfil/dados-pessoais/:id  (role [1,2,3])
    async function handleSaveDados() {
        const e = validateDados()
        if (Object.keys(e).length) { setErrors(e); return }
        const id = getIdFromToken()
        if (!id) { setErrors({ _global: 'Sessão inválida. Faz logout e volta a entrar.' }); return }
        setSaving(true)
        setSuccessMsg('')
        try {
            await api.put(`/users/perfil/dados-pessoais/${id}`, {
                nome: form.nome.trim(),
                apelido: form.apelido.trim() || undefined,
                telemovel: form.telemovel.trim() || undefined,
            })
            // Reflectir alterações no localStorage (header actualiza o nome)
            const stored = authService.getUser()
            localStorage.setItem('user', JSON.stringify({
                ...stored,
                id_utilizador: id,
                nome: form.nome.trim(),
                apelido: form.apelido.trim() || stored?.apelido,
            }))
            setSuccessMsg('Dados guardados com sucesso!')
            onSuccess?.()
            setTimeout(() => setSuccessMsg(''), 3000)
        } catch (err) {
            setErrors({ _global: err.response?.data?.error || err.message || 'Erro ao guardar dados.' })
        } finally {
            setSaving(false)
        }
    }

    // ── Alterar password ──────────────────────────────────────────────────────
    // PUT /api/users/perfil/password/:id  (role [1,2,3])
    // Body esperado pelo userProfileService: { oldPassword, newPassword }
    async function handleSavePassword() {
        const e = validatePassword()
        if (Object.keys(e).length) { setPassErrors(e); return }
        const id = getIdFromToken()
        if (!id) { setPassErrors({ _global: 'Sessão inválida. Faz logout e volta a entrar.' }); return }
        setSaving(true)
        setSuccessMsg('')
        try {
            await api.put(`/users/perfil/password/${id}`, {
                oldPassword: passForm.password_atual,
                newPassword: passForm.nova_password,
            })
            setPassForm({ password_atual: '', nova_password: '', confirmar_password: '' })
            setSuccessMsg('Password alterada com sucesso!')
            setTimeout(() => setSuccessMsg(''), 3000)
        } catch (err) {
            setPassErrors({ _global: err.response?.data?.error || err.message || 'Erro ao alterar password.' })
        } finally {
            setSaving(false)
        }
    }

    const TABS = [
        { key: 'dados', label: 'Dados pessoais', icon: User },
        { key: 'password', label: 'Password', icon: Lock },
    ]

    return (
        <>
            {/* Backdrop */}
            <div className="fixed inset-0 z-40 bg-black/25 backdrop-blur-[2px]" aria-hidden />

            {/* Side panel */}
            <aside
                ref={panelRef}
                className="fixed top-0 right-0 h-full z-50 w-[520px] max-w-[95vw] bg-[#F4FBF9] shadow-2xl flex flex-col font-['Sora']"
                style={{ borderLeft: '3px solid #006A68' }}
            >
                {/* Header */}
                <div className="bg-[#EFF5F4] px-8 pt-8 pb-0 shrink-0">
                    <div className="flex items-start justify-between mb-5">
                        <div>
                            <p className="text-xs font-semibold text-[#4A6362] uppercase tracking-widest mb-1">
                                Configurações de Conta
                            </p>
                            <h2 className="text-2xl font-bold text-[#006A68]">Editar Perfil</h2>
                        </div>
                        <button
                            onClick={onClose}
                            className="w-9 h-9 rounded-full hover:bg-[#CCE8E6] flex items-center justify-center text-[#4A6362] transition-colors mt-1"
                        >
                            <X size={18} />
                        </button>
                    </div>

                    {/* Avatar + nome */}
                    <div className="flex items-center gap-4 mb-6">
                        <div className="w-14 h-14 rounded-full bg-[#006A68] flex items-center justify-center shrink-0 shadow-md">
                            <span className="text-[#9CF1EE] text-xl font-bold">
                                {(form.nome || user?.nome || '?')[0]?.toUpperCase()}
                            </span>
                        </div>
                        <div>
                            <p className="font-bold text-[#324B4A] text-base leading-tight">
                                {`${form.nome} ${form.apelido}`.trim() || user?.nome}
                            </p>
                            <p className="text-xs text-[#4A6362] mt-0.5">{form.email || '—'}</p>
                        </div>
                    </div>

                    {/* Tabs */}
                    <div className="flex border-b border-[#BEC9C7]">
                        {TABS.map(t => {
                            const Icon = t.icon
                            const active = tab === t.key
                            return (
                                <button
                                    key={t.key}
                                    onClick={() => { setTab(t.key); setSuccessMsg(''); setErrors({}); setPassErrors({}) }}
                                    className={`flex items-center gap-2 px-5 py-3 text-sm font-semibold border-b-2 transition-all -mb-px
                                        ${active
                                            ? 'border-[#006A68] text-[#006A68]'
                                            : 'border-transparent text-[#4A6362] hover:text-[#006A68]'}`}
                                >
                                    <Icon size={14} />
                                    {t.label}
                                </button>
                            )
                        })}
                    </div>
                </div>

                {/* Body */}
                <div className="flex-1 overflow-y-auto px-8 py-7 space-y-5">

                    {successMsg && (
                        <div className="flex items-center gap-2.5 bg-emerald-50 text-emerald-700 text-sm px-4 py-3 rounded-xl border border-emerald-200 font-semibold">
                            <Check size={16} className="shrink-0" /> {successMsg}
                        </div>
                    )}

                    {loading ? (
                        <div className="flex items-center justify-center py-16">
                            <RefreshCw size={24} className="text-[#006A68] animate-spin" />
                        </div>
                    ) : loadError ? (
                        <div className="flex items-center gap-2 bg-red-50 text-red-700 text-sm px-4 py-3 rounded-xl border border-red-200">
                            <AlertCircle size={14} className="shrink-0" /> {loadError}
                        </div>
                    ) : tab === 'dados' ? (

                        /* ── Tab: Dados Pessoais ── */
                        <>
                            {errors._global && (
                                <div className="flex items-center gap-2 bg-red-50 text-red-700 text-sm px-4 py-3 rounded-xl border border-red-200">
                                    <AlertCircle size={14} className="shrink-0" /> {errors._global}
                                </div>
                            )}

                            <div className="grid grid-cols-2 gap-4">
                                <Field label="Nome" icon={User} error={errors.nome}>
                                    <input
                                        value={form.nome}
                                        onChange={e => set('nome', e.target.value)}
                                        placeholder="João"
                                        className={inputCls(errors.nome)}
                                    />
                                </Field>
                                <Field label="Apelido" error={errors.apelido}>
                                    <input
                                        value={form.apelido}
                                        onChange={e => set('apelido', e.target.value)}
                                        placeholder="Silva"
                                        className={inputCls(false)}
                                    />
                                </Field>
                            </div>

                            {/* Email — só leitura */}
                            <Field label="Email" icon={Mail}>
                                <input
                                    type="email"
                                    value={form.email}
                                    readOnly
                                    disabled
                                    className={`${inputCls(false)} bg-gray-100 cursor-not-allowed opacity-70`}
                                />
                            </Field>

                            <div className="grid grid-cols-2 gap-4">
                                <Field label="Telemóvel" icon={Phone} error={errors.telemovel}>
                                    <input
                                        value={form.telemovel}
                                        onChange={e => set('telemovel', e.target.value)}
                                        placeholder="912 345 678"
                                        className={inputCls(errors.telemovel)}
                                    />
                                </Field>
                                {/* NIF — só leitura */}
                                <Field label="NIF">
                                    <input
                                        value={form.nif}
                                        readOnly
                                        disabled
                                        className={`${inputCls(false)} bg-gray-100 cursor-not-allowed opacity-70`}
                                    />
                                </Field>
                            </div>

                            {/* Data de nascimento — só leitura */}
                            <Field label="Data de Nascimento" icon={Calendar}>
                                <input
                                    type="date"
                                    value={form.data_nascimento}
                                    readOnly
                                    disabled
                                    className={`${inputCls(false)} bg-gray-100 cursor-not-allowed opacity-70`}
                                />
                            </Field>

                            <div className="flex items-start gap-2.5 bg-[#CCE8E6]/50 border border-[#80D5D2] rounded-xl px-4 py-3">
                                <ShieldCheck size={15} className="text-[#006A68] shrink-0 mt-0.5" />
                                <p className="text-xs text-[#324B4A] leading-relaxed">
                                    Podes alterar o nome, apelido e telemóvel. Email, NIF e data de nascimento são dados fixos do sistema.
                                    Os teus dados são protegidos e nunca partilhados com terceiros.
                                </p>
                            </div>
                        </>

                    ) : (

                        /* ── Tab: Password ── */
                        <>
                            {passErrors._global && (
                                <div className="flex items-center gap-2 bg-red-50 text-red-700 text-sm px-4 py-3 rounded-xl border border-red-200">
                                    <AlertCircle size={14} className="shrink-0" /> {passErrors._global}
                                </div>
                            )}

                            <Field label="Password Atual" icon={Lock} error={passErrors.password_atual}>
                                <div className="relative">
                                    <input
                                        type={showPass.atual ? 'text' : 'password'}
                                        value={passForm.password_atual}
                                        onChange={e => setPass('password_atual', e.target.value)}
                                        placeholder="••••••••"
                                        className={`${inputCls(passErrors.password_atual)} pr-11`}
                                    />
                                    <button type="button"
                                        onClick={() => setShowPass(s => ({ ...s, atual: !s.atual }))}
                                        className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[#4A6362] hover:text-[#006A68] transition-colors"
                                    >
                                        {showPass.atual ? <EyeOff size={16} /> : <Eye size={16} />}
                                    </button>
                                </div>
                            </Field>

                            <div className="border-t border-dashed border-[#BEC9C7] pt-5 space-y-4">
                                <p className="text-xs font-bold text-[#4A6362] uppercase tracking-wider">Nova password</p>

                                <Field label="Nova Password" error={passErrors.nova_password}>
                                    <div className="relative">
                                        <input
                                            type={showPass.nova ? 'text' : 'password'}
                                            value={passForm.nova_password}
                                            onChange={e => setPass('nova_password', e.target.value)}
                                            placeholder="Mínimo 8 caracteres"
                                            className={`${inputCls(passErrors.nova_password)} pr-11`}
                                        />
                                        <button type="button"
                                            onClick={() => setShowPass(s => ({ ...s, nova: !s.nova }))}
                                            className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[#4A6362] hover:text-[#006A68] transition-colors"
                                        >
                                            {showPass.nova ? <EyeOff size={16} /> : <Eye size={16} />}
                                        </button>
                                    </div>
                                    <PasswordStrength password={passForm.nova_password} />
                                </Field>

                                <Field label="Confirmar Nova Password" error={passErrors.confirmar_password}>
                                    <div className="relative">
                                        <input
                                            type={showPass.confirmar ? 'text' : 'password'}
                                            value={passForm.confirmar_password}
                                            onChange={e => setPass('confirmar_password', e.target.value)}
                                            placeholder="Repete a nova password"
                                            className={`${inputCls(passErrors.confirmar_password)} pr-11`}
                                        />
                                        <button type="button"
                                            onClick={() => setShowPass(s => ({ ...s, confirmar: !s.confirmar }))}
                                            className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[#4A6362] hover:text-[#006A68] transition-colors"
                                        >
                                            {showPass.confirmar ? <EyeOff size={16} /> : <Eye size={16} />}
                                        </button>
                                    </div>
                                    {passForm.confirmar_password && passForm.nova_password === passForm.confirmar_password && (
                                        <p className="text-[11px] text-emerald-600 flex items-center gap-1 mt-1">
                                            <Check size={10} /> As passwords coincidem
                                        </p>
                                    )}
                                </Field>
                            </div>

                            <div className="bg-[#CCE8E6]/40 border border-[#80D5D2] rounded-xl px-4 py-3 space-y-1.5">
                                <p className="text-[11px] font-bold text-[#4A6362] uppercase tracking-wider mb-2">Requisitos</p>
                                {[
                                    ['Mínimo 8 caracteres', passForm.nova_password.length >= 8],
                                    ['Pelo menos uma maiúscula', /[A-Z]/.test(passForm.nova_password)],
                                    ['Pelo menos um número', /[0-9]/.test(passForm.nova_password)],
                                    ['Pelo menos um símbolo', /[^A-Za-z0-9]/.test(passForm.nova_password)],
                                ].map(([label, met]) => (
                                    <div key={label} className="flex items-center gap-2">
                                        <div className={`w-4 h-4 rounded-full flex items-center justify-center shrink-0 transition-colors ${met ? 'bg-emerald-500' : 'bg-gray-200'}`}>
                                            {met && <Check size={9} className="text-white" strokeWidth={3} />}
                                        </div>
                                        <span className={`text-xs ${met ? 'text-emerald-700 font-medium' : 'text-[#4A6362]'}`}>{label}</span>
                                    </div>
                                ))}
                            </div>
                        </>
                    )}
                </div>

                {/* Footer */}
                {!loading && (
                    <div className="px-8 py-6 border-t border-[#BEC9C7] shrink-0 flex gap-3">
                        <button
                            onClick={onClose}
                            className="flex-1 py-3.5 rounded-2xl border border-[#BEC9C7] text-[#4A6362] font-semibold text-sm hover:bg-[#EFF5F4] transition-colors"
                        >
                            Cancelar
                        </button>
                        <button
                            onClick={tab === 'dados' ? handleSaveDados : handleSavePassword}
                            disabled={saving}
                            className="flex-1 py-3.5 rounded-2xl bg-[#006A68] text-white font-bold text-sm hover:bg-[#00504E] transition-colors disabled:opacity-60 flex items-center justify-center gap-2"
                        >
                            {saving
                                ? <><RefreshCw size={16} className="animate-spin" /> A guardar...</>
                                : <><Check size={16} /> Guardar</>
                            }
                        </button>
                    </div>
                )}
            </aside>
        </>
    )
}