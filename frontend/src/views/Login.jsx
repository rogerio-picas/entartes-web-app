import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { authService } from '../services/authService'

const TEAL = '#3d7272'

function DancerLogo() {
  return (
    <div className="flex flex-col items-center mb-10">
      {/* Dancer silhouette */}
      <svg
        viewBox="0 0 120 130"
        width="110"
        height="110"
        fill="none"
        stroke="#444"
        strokeWidth="1.1"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        {/* Head */}
        <ellipse cx="72" cy="14" rx="7" ry="7.5" />
        {/* Neck + body */}
        <path d="M72 21.5 C70 32 63 46 52 60" />
        {/* Right arm — flows up-right with ribbon curl */}
        <path d="M69 30 C79 24 91 19 100 15 C107 12 111 8 109 3" />
        {/* Left arm — extends left */}
        <path d="M67 34 C56 28 40 23 22 18" />
        {/* Front leg — down */}
        <path d="M52 60 C46 72 41 84 38 98" />
        {/* Back leg — extends right */}
        <path d="M52 60 C65 55 79 53 92 52 C101 51 107 49 109 45" />
      </svg>

      {/* Brand name */}
      <div className="text-center leading-tight">
        <div
          className="text-2xl tracking-widest"
          style={{ fontWeight: 300, color: '#555', letterSpacing: '0.15em' }}
        >
          en&apos;artes
          <sup className="text-xs align-super" style={{ fontWeight: 400 }}>®</sup>
        </div>
        <div
          className="text-xs tracking-widest mt-0.5"
          style={{ color: '#aaa', letterSpacing: '0.25em', fontWeight: 300 }}
        >
          escola de dança
        </div>
      </div>
    </div>
  )
}

function FloatingInput({ id, name, label, type = 'text', value, onChange, autoComplete, rightSlot }) {
  const [focused, setFocused] = useState(false)
  const floated = focused || value.length > 0

  return (
    <div
      className="relative rounded transition-colors duration-150"
      style={{
        border: `1px solid ${focused ? TEAL : '#d1d5db'}`,
      }}
    >
      <label
        htmlFor={id}
        className="absolute left-3 pointer-events-none transition-all duration-150"
        style={{
          top: floated ? '7px' : '50%',
          transform: floated ? 'none' : 'translateY(-50%)',
          fontSize: floated ? '11px' : '14px',
          color: focused ? TEAL : '#9ca3af',
          lineHeight: 1,
        }}
      >
        {label}
      </label>

      <input
        id={id}
        name={name}
        type={type}
        value={value}
        onChange={onChange}
        autoComplete={autoComplete}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        className="w-full bg-transparent outline-none text-gray-800 text-sm px-3 pb-3"
        style={{ paddingTop: '22px', paddingRight: rightSlot ? '44px' : '12px' }}
      />

      {rightSlot && (
        <div className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
          {rightSlot}
        </div>
      )}
    </div>
  )
}

function EyeOffIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
      <path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24" />
      <line x1="1" y1="1" x2="23" y2="23" />
    </svg>
  )
}

function EyeIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  )
}

export default function Login() {
  const navigate = useNavigate()
  const [form, setForm] = useState({ codigo_username: '', password: '' })
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  function handleChange(e) {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }))
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await authService.login(form.codigo_username, form.password)
      navigate('/home')
    } catch (err) {
      setError(err.message || 'Credenciais inválidas.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center px-6 py-12"
      style={{ backgroundColor: '#f2f2f2' }}
    >
      <DancerLogo />

      <div className="w-full max-w-sm">
        <h1
          className="text-2xl font-bold text-center mb-2"
          style={{ color: TEAL }}
        >
          Bem-vindo
        </h1>
        <p className="text-sm text-gray-500 text-center mb-7">
          Para continuar por favor insira os seus dados.
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <FloatingInput
            id="username"
            name="codigo_username"
            label="Código username"
            value={form.codigo_username}
            onChange={handleChange}
            autoComplete="username"
          />

          <FloatingInput
            id="password"
            name="password"
            label="Palavra-passe"
            type={showPassword ? 'text' : 'password'}
            value={form.password}
            onChange={handleChange}
            autoComplete="current-password"
            rightSlot={
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                className="hover:text-gray-600 transition-colors"
                tabIndex={-1}
              >
                {showPassword ? <EyeIcon /> : <EyeOffIcon />}
              </button>
            }
          />

          {error && (
            <p className="text-xs text-red-500 text-center">{error}</p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full text-white font-semibold py-3.5 rounded text-sm tracking-wide transition-opacity disabled:opacity-60 mt-1"
            style={{ backgroundColor: TEAL }}
          >
            {loading ? 'A entrar…' : 'Entrar'}
          </button>
        </form>
      </div>

      <p className="mt-12 text-xs text-center" style={{ color: '#bbb' }}>
        © Copyright 2026 En&apos;tartes® – Marca registada Nacional 577041 | Todos os direitos reservados
      </p>
    </div>
  )
}
