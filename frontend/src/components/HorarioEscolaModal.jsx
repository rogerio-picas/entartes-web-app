import React, { useState, useEffect } from 'react'
import { Calendar, Clock, Save, X, CalendarCheck, Check } from 'lucide-react'
import { api } from '../services/api'

const DIAS = ['Domingo', 'Segunda-Feira', 'Terça-Feira', 'Quarta-Feira', 'Quinta-Feira', 'Sexta-Feira', 'Sábado']

export default function HorarioEscolaModal({ onClose }) {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [toast, setToast] = useState(null)

  const [form, setForm] = useState({
    data_inicio: '',
    data_fim: '',
    hora_inicio: '09:00',
    hora_fim: '18:00',
    dias_semana: []
  })

  useEffect(() => {
    carregarHorario()
  }, [])

  async function carregarHorario() {
    setLoading(true)
    try {
      const data = await api.get('/configuracao/horario-letivo')
      if (data && data.data_inicio) {
        setForm({
          data_inicio: data.data_inicio.split('T')[0],
          data_fim: data.data_fim.split('T')[0],
          hora_inicio: data.hora_inicio || '09:00',
          hora_fim: data.hora_fim || '18:00',
          dias_semana: data.dias_semana || []
        })
      }
    } catch (err) {
      showToast('Erro ao carregar o horário letivo', 'error')
    } finally {
      setLoading(false)
    }
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setSaving(true)
    try {
      await api.put('/configuracao/horario-letivo', form)
      showToast('Horário atualizado com sucesso!', 'success')
      setTimeout(() => onClose(), 1500)
    } catch (err) {
      showToast(err.response?.data?.message || 'Erro ao guardar horário letivo.', 'error')
    } finally {
      setSaving(false)
    }
  }

  function toggleDia(diaIdx) {
    setForm(prev => {
      const dias = prev.dias_semana.includes(diaIdx)
        ? prev.dias_semana.filter(d => d !== diaIdx)
        : [...prev.dias_semana, diaIdx]
      return { ...prev, dias_semana: dias }
    })
  }

  function showToast(msg, type = 'success') {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 3000)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-brand-900/40 backdrop-blur-sm font-['Sora']">
      <div className="bg-white rounded-3xl w-full max-w-xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        <div className="px-6 py-5 border-b border-brand-800/10 flex justify-between items-center bg-brand-50/50">
          <div>
            <h2 className="text-xl font-semibold text-brand-900">Horário letivo</h2>
            <p className="text-xs text-brand-800 mt-1">Configura o ano letivo e os horários de funcionamento da escola</p>
          </div>
          <button onClick={onClose} className="p-2 text-brand-800 hover:bg-brand-200 rounded-xl transition-colors">
            <X size={20} />
          </button>
        </div>

        <div className="p-6 overflow-y-auto">
          {loading ? (
            <div className="flex justify-center py-10">
              <div className="animate-spin text-brand-800"><CalendarCheck size={32} /></div>
            </div>
          ) : (
            <form id="horario-form" onSubmit={handleSubmit} className="space-y-6">

              {/* Ano Letivo */}
              <div className="space-y-3">
                <h3 className="text-sm font-bold text-brand-900 flex items-center gap-2">
                  <Calendar size={16} /> Ano Letivo
                </h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-brand-800 mb-1">Data Início</label>
                    <input
                      type="date"
                      required
                      value={form.data_inicio}
                      onChange={e => setForm({ ...form, data_inicio: e.target.value })}
                      className="w-full bg-brand-50 border border-brand-800/20 text-brand-900 text-sm rounded-xl px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-brand-800/30"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-brand-800 mb-1">Data Fim</label>
                    <input
                      type="date"
                      required
                      value={form.data_fim}
                      onChange={e => setForm({ ...form, data_fim: e.target.value })}
                      className="w-full bg-brand-50 border border-brand-800/20 text-brand-900 text-sm rounded-xl px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-brand-800/30"
                    />
                  </div>
                </div>
              </div>

              {/* Horário Diário */}
              <div className="space-y-3">
                <h3 className="text-sm font-bold text-brand-900 flex items-center gap-2">
                  <Clock size={16} /> Horário Diário
                </h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-brand-800 mb-1">Hora de Abertura</label>
                    <input
                      type="time"
                      required
                      value={form.hora_inicio}
                      onChange={e => setForm({ ...form, hora_inicio: e.target.value })}
                      className="w-full bg-brand-50 border border-brand-800/20 text-brand-900 text-sm rounded-xl px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-brand-800/30"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-brand-800 mb-1">Hora de Fecho</label>
                    <input
                      type="time"
                      required
                      value={form.hora_fim}
                      onChange={e => setForm({ ...form, hora_fim: e.target.value })}
                      className="w-full bg-brand-50 border border-brand-800/20 text-brand-900 text-sm rounded-xl px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-brand-800/30"
                    />
                  </div>
                </div>
              </div>

              {/* Dias da Semana */}
              <div className="space-y-3">
                <h3 className="text-sm font-bold text-brand-900 flex items-center gap-2">
                  <CalendarCheck size={16} /> Dias da Semana
                </h3>
                <p className="text-xs text-neutral-500 mb-2">Seleciona os dias em que a escola está aberta para coachings:</p>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {DIAS.map((nomeDia, idx) => {
                    const ativo = form.dias_semana.includes(idx)
                    return (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => toggleDia(idx)}
                        className={`flex items-center justify-between px-3 py-2 rounded-lg border text-sm transition-all ${ativo
                          ? 'bg-brand-800 text-white border-brand-800 font-medium'
                          : 'bg-white text-neutral-600 border-neutral-200 hover:border-brand-800/40'
                          }`}
                      >
                        {nomeDia}
                        {ativo && <Check size={14} />}
                      </button>
                    )
                  })}
                </div>
              </div>

            </form>
          )}
        </div>

        <div className="px-6 py-4 border-t border-brand-800/10 bg-brand-50/30 flex justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2.5 text-sm font-semibold text-neutral-600 hover:bg-neutral-100 rounded-xl transition-colors"
          >
            Cancelar
          </button>
          <button
            form="horario-form"
            type="submit"
            disabled={saving || loading || form.dias_semana.length === 0}
            className="flex items-center gap-2 px-6 py-2.5 bg-brand-800 text-white text-sm font-bold rounded-xl hover:bg-brand-900 transition-colors disabled:opacity-50"
          >
            {saving ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Save size={16} />}
            {saving ? 'A guardar...' : 'Guardar Horário'}
          </button>
        </div>
      </div>

      {/* Simple Toast */}
      {toast && (
        <div className={`fixed bottom-6 right-6 z-[60] flex items-center gap-2 px-4 py-3 rounded-lg shadow-xl text-white text-sm font-medium ${toast.type === 'error' ? 'bg-red-500' : 'bg-emerald-500'}`}>
          {toast.msg}
        </div>
      )}
    </div>
  )
}
