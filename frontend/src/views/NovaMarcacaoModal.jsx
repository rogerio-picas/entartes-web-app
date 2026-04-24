import { useState, useEffect } from 'react'
import { X, ChevronRight, ChevronLeft, Music, User, CalendarDays, Clock, Check, Loader2, AlertCircle } from 'lucide-react'
import { api } from '../services/api'

const DURACOES = [30, 60, 90, 120]

function StepIndicator({ step }) {
  const steps = ['Modalidade', 'Disponibilidades', 'Horário', 'Confirmar']
  return (
    <div className="flex items-center gap-0 mb-8">
      {steps.map((label, i) => {
        const idx = i + 1
        const done = step > idx
        const active = step === idx
        return (
          <div key={idx} className="flex items-center flex-1">
            <div className="flex flex-col items-center flex-1">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold border-2 transition-all
                ${done ? 'bg-[#006A68] border-[#006A68] text-white' : active ? 'bg-white border-[#006A68] text-[#006A68]' : 'bg-white border-gray-200 text-gray-400'}`}>
                {done ? <Check size={14} strokeWidth={3} /> : idx}
              </div>
              <span className={`text-[10px] mt-1 font-semibold tracking-wide text-center ${active ? 'text-[#006A68]' : done ? 'text-[#006A68]/70' : 'text-gray-400'}`}>
                {label}
              </span>
            </div>
            {i < steps.length - 1 && (
              <div className={`h-0.5 flex-1 mt-[-14px] ${step > idx ? 'bg-[#006A68]' : 'bg-gray-200'}`} />
            )}
          </div>
        )
      })}
    </div>
  )
}

export default function NovaMarcacaoModal({ onClose, onSuccess, initialSlot }) {
  const [step, setStep] = useState(1)
  const [loadingMod, setLoadingMod] = useState(true)
  const [loadingSlots, setLoadingSlots] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [erro, setErro] = useState('')

  // Dados
  const [modalidades, setModalidades] = useState([])
  const [slots, setSlots] = useState([])

  // Seleções
  const [modalidadeSel, setModalidadeSel] = useState(null)
  const [data, setData] = useState('')
  const [docenteSel, setDocenteSel] = useState(null)
  const [slotSel, setSlotSel] = useState(null)
  const [duracao, setDuracao] = useState(60)
  const [horaSel, setHoraSel] = useState('')
  const [numAlunos, setNumAlunos] = useState(1)

  // ── Passo 1: carregar modalidades ──
  useEffect(() => {
    setLoadingMod(true)
    api.get('/modalidades?docentes=true')
      .then(r => {
        let mods = Array.isArray(r) ? r : r.data || []
        if (initialSlot && initialSlot.id_docente) {
          mods = mods.filter(m => m.docente_modalidade && m.docente_modalidade.some(d => d.id_docente === initialSlot.id_docente))
        }
        setModalidades(mods)
      })
      .catch(() => setErro('Não foi possível carregar as modalidades.'))
      .finally(() => setLoadingMod(false))
  }, [initialSlot])

  // ── Passo 2: carregar disponibilidades para a modalidade escolhida ──
  useEffect(() => {
    if (step !== 2 || !modalidadeSel) return
    setLoadingSlots(true)
    setSlots([])

    // Podemos omitir a "data" na query se quisermos mostrar os slots genéricos dessa modalidade
    // const params = new URLSearchParams({ id_modalidade: modalidadeSel.id_modalidade })
    api.get(`/coaching/disponibilidades/consultar?`) //${params}
      .then(r => setSlots(Array.isArray(r) ? r : r.data || []))
      .catch(() => setErro('Não foi possível consultar as disponibilidades.'))
      .finally(() => setLoadingSlots(false))
  }, [step, modalidadeSel])

  const DIAS = ['Domingo', 'Segunda-Feira', 'Terça-Feira', 'Quarta-Feira', 'Quinta-Feira', 'Sexta-Feira', 'Sábado']

  // Função auxiliar para garantir que a data não salta de dia por causa do fuso horário
  const formatLocalYYYYMMDD = (d) => {
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  }

  // Calcula a próxima data válida para um slot (hoje ou futura)
  const proximaDataDoSlot = (slot) => {
    const hoje = new Date()
    hoje.setHours(0, 0, 0, 0)

    if (slot.data_especifica) {
      const d = new Date(slot.data_especifica)
      d.setHours(0, 0, 0, 0)
      const dataStr = d >= hoje ? formatLocalYYYYMMDD(d) : null
      console.log('[DEBUG proximaDataDoSlot] data_especifica:', slot.data_especifica, '->', dataStr);
      return dataStr;
    }

    if (slot.dia_semana != null) {
      const alvo = Number(slot.dia_semana)
      const d = new Date(hoje)
      // Avançar até ao próximo dia da semana (pode ser hoje mesmo)
      while (d.getDay() !== alvo) {
        d.setDate(d.getDate() + 1)
      }
      const dataStr = formatLocalYYYYMMDD(d)
      console.log('[DEBUG proximaDataDoSlot] dia_semana:', slot.dia_semana, '->', dataStr);
      return dataStr;
    }

    return null
  }

  // Filtrar slots: remover data_especifica já passadas
  const slotsFuturos = slots.filter(slot => {
    if (slot.data_especifica) {
      const hoje = new Date(); hoje.setHours(0, 0, 0, 0)
      return new Date(slot.data_especifica) >= hoje
    }
    return true // dia_semana é sempre futuro
  })

  // Calcular horas possíveis dentro do slot do docente selecionado
  const horasPossiveis = (() => {
    if (!slotSel || !duracao) return []
    const parse = (s) => {
      if (!s) return null
      const d = new Date(s)
      return isNaN(d) ? null : d
    }
    const inicio = parse(slotSel.hora_inicio)
    const fim = parse(slotSel.hora_fim)
    if (!inicio || !fim) return []
    const horas = []
    const cursor = new Date(inicio)
    while (new Date(cursor.getTime() + duracao * 60000) <= fim) {
      horas.push(cursor.toISOString().substring(11, 19)) // "HH:MM:SS"
      cursor.setMinutes(cursor.getMinutes() + 30)
    }
    return horas
  })()

  const formatHora = (iso) => {
    if (!iso) return ''
    const d = new Date(iso)
    if (isNaN(d)) return iso.substring(11, 16)
    return d.toISOString().substring(11, 16)
  }

  // ── Submeter ──
  const handleSubmit = async () => {
    setErro('')

    console.log('[DEBUG handleSubmit] Validação:', {
      modalidadeSel: !!modalidadeSel,
      docenteSel: !!docenteSel,
      slotSel: !!slotSel,
      data,
      horaSel
    });

    if (!modalidadeSel || !docenteSel || !slotSel || !data || !horaSel) {
      setErro('Preenche todos os campos antes de confirmar.')
      return
    }
    setSubmitting(true)

    const payload = {
      id_docente: docenteSel.id_docente,
      id_modalidade: modalidadeSel.id_modalidade,
      data_a_realizar: data,
      hora_inicio: horaSel,
      duracao_minutos: duracao,
      numero_alunos_pretendidos: numAlunos,
    };
    console.log('[DEBUG handleSubmit] Payload a enviar:', payload);

    try {
      await api.post('/coaching/marcacao/solicitar', payload)
      onSuccess?.()
      onClose()
    } catch (err) {
      setErro(err.response?.data?.message || err.message || 'Erro ao solicitar a marcação.')
    } finally {
      setSubmitting(false)
    }
  }

  const verificarDataSelecionada = () => {
    if (!slotSel || !data) return true;
    const d = new Date(data);
    if (isNaN(d)) return true;

    // Se o slot tem data específica, deve bater certo
    if (slotSel.data_especifica) {
      const dSpec = new Date(slotSel.data_especifica);
      const isValido = d.toDateString() === dSpec.toDateString();
      console.log('[DEBUG verificarDataSelecionada] Data específica:', {
        data_input: data,
        d_toDateString: d.toDateString(),
        dSpec_toDateString: dSpec.toDateString(),
        isValido
      });
      return isValido;
    }

    // Se tem dia da semana, a data tem de ser desse dia
    if (slotSel.dia_semana != null) {
      const isValido = d.getDay() === slotSel.dia_semana;
      console.log('[DEBUG verificarDataSelecionada] Dia da semana:', {
        data_input: data,
        d_getDay: d.getDay(),
        slot_dia_semana: slotSel.dia_semana,
        isValido
      });
      return isValido;
    }

    return true;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" />
      <div
        className="relative bg-white rounded-2xl shadow-2xl w-full max-w-xl overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="bg-[#EFF5F4] border-b-2 border-[#006A68] px-6 py-5 flex items-start justify-between">
          <div>
            <p className="text-[#4A6362] text-xs font-medium tracking-widest uppercase mb-1">Nova Marcação</p>
            <h3 className="text-[#006A68] font-bold text-xl">Solicitar Sessão de Coaching</h3>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/80 flex items-center justify-center hover:bg-white transition-colors text-[#4A6362]"
          >
            <X size={16} />
          </button>
        </div>

        {/* Body */}
        <div className="px-6 py-6">
          <StepIndicator step={step} />

          {/* Erro global */}
          {erro && (
            <div className="flex items-start gap-2 mb-4 px-4 py-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">
              <AlertCircle size={16} className="shrink-0 mt-0.5" />
              {erro}
            </div>
          )}

          {/* ── PASSO 1: Modalidade ── */}
          {step === 1 && (
            <div>
              <p className="text-sm font-semibold text-[#324B4A] mb-4">Escolhe a modalidade que pretendes praticar:</p>
              {loadingMod ? (
                <div className="flex justify-center py-8">
                  <Loader2 size={28} className="text-[#006A68] animate-spin" />
                </div>
              ) : modalidades.length === 0 ? (
                <p className="text-gray-400 text-sm text-center py-6">Nenhuma modalidade disponível.</p>
              ) : (
                <div className="grid grid-cols-2 gap-3">
                  {modalidades.map(m => (
                    <button
                      key={m.id_modalidade}
                      onClick={() => { setModalidadeSel(m); setErro(''); setStep(2); }}
                      className={`flex items-center gap-3 p-4 rounded-xl border-2 text-left transition-all
                        ${modalidadeSel?.id_modalidade === m.id_modalidade
                          ? 'border-[#006A68] bg-[#EFF5F4]'
                          : 'border-gray-200 hover:border-[#006A68]/40 hover:bg-[#EFF5F4]/50'}`}
                    >
                      <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0
                        ${modalidadeSel?.id_modalidade === m.id_modalidade ? 'bg-[#006A68]' : 'bg-[#CCE8E6]'}`}>
                        <Music size={16} className={modalidadeSel?.id_modalidade === m.id_modalidade ? 'text-white' : 'text-[#006A68]'} />
                      </div>
                      <div>
                        <p className="font-bold text-[#324B4A] text-sm">{m.nome}</p>
                        {m.docente_modalidade && (
                          <p className="text-xs text-gray-500">{m.docente_modalidade.length} docente{m.docente_modalidade.length !== 1 ? 's' : ''}</p>
                        )}
                      </div>
                      <ChevronRight size={16} className="text-gray-400 ml-auto shrink-0" />
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ── PASSO 2: Disponibilidades ── */}
          {step === 2 && (
            <div>
              <p className="text-sm font-semibold text-[#324B4A] mb-4">Escolhe um horário disponível para {modalidadeSel?.nome}:</p>

              <div className="max-h-64 overflow-y-auto pr-1 space-y-2">
                {loadingSlots ? (
                  <div className="flex justify-center py-8">
                    <Loader2 size={28} className="text-[#006A68] animate-spin" />
                  </div>
                ) : slotsFuturos.length === 0 ? (
                  <div className="text-center py-6 text-sm text-gray-400 bg-gray-50 rounded-xl border border-dashed border-gray-200">
                    Nenhum horário disponível para esta modalidade.
                  </div>
                ) : (
                  slotsFuturos.map((slot, i) => {
                    const proximaData = proximaDataDoSlot(slot)
                    const dataOuDia = slot.data_especifica
                      ? new Date(slot.data_especifica + 'T12:00:00').toLocaleDateString('pt-PT', { weekday: 'long', day: 'numeric', month: 'long' })
                      : (slot.dia_semana != null
                        ? `${DIAS[slot.dia_semana]}${proximaData ? ' · ' + new Date(proximaData + 'T12:00:00').toLocaleDateString('pt-PT', { day: 'numeric', month: 'short' }) : ''}`
                        : '—')

                    return (
                      <button
                        key={slot.id_disponibilidade ?? i}
                        onClick={() => {
                          setSlotSel(slot);
                          setDocenteSel({ id_docente: slot.id_docente, nome_docente: slot.nome_docente });
                          setData(proximaData || ''); setHoraSel(''); setErro('');
                          setStep(3);
                        }}
                        className="w-full px-4 py-3 flex flex-wrap sm:flex-nowrap items-center gap-4 hover:bg-[#F4FBF9] bg-white border border-gray-200 rounded-xl transition-colors text-left group"
                      >
                        <div className="w-10 h-10 rounded-full bg-[#CCE8E6] flex items-center justify-center shrink-0 group-hover:bg-[#006A68] transition-colors">
                          <User size={16} className="text-[#006A68] group-hover:text-white transition-colors" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-bold text-[#324B4A] text-sm truncate">{slot.nome_docente}</p>
                          <div className="flex items-center gap-3 mt-1">
                            <span className="flex items-center gap-1 text-xs text-gray-500">
                              <CalendarDays size={12} /> {dataOuDia}
                            </span>
                            <span className="flex items-center gap-1 text-xs text-gray-500">
                              <Clock size={12} /> {formatHora(slot.hora_inicio)} – {formatHora(slot.hora_fim)}
                            </span>
                          </div>
                        </div>
                        <ChevronRight size={16} className="text-gray-400 shrink-0" />
                      </button>
                    )
                  })
                )}
              </div>
            </div>
          )}

          {/* ── PASSO 3: Horário ── */}
          {step === 3 && slotSel && (
            <div className="space-y-5">
              <div className="p-3 bg-[#EFF5F4] rounded-xl flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-[#006A68] flex items-center justify-center shrink-0">
                  <User size={16} className="text-white" />
                </div>
                <div>
                  <p className="font-bold text-[#006A68] text-sm">{docenteSel?.nome_docente}</p>
                  <p className="text-xs text-[#4A6362]">
                    Disponibilidade: {slotSel.data_especifica
                      ? new Date(slotSel.data_especifica).toLocaleDateString('pt-PT')
                      : (slotSel.dia_semana != null ? DIAS[slotSel.dia_semana] : '')} ({formatHora(slotSel.hora_inicio)} - {formatHora(slotSel.hora_fim)})
                  </p>
                </div>
              </div>

              {/* Data (preenchida automaticamente) */}
              <div>
                <label className="block text-xs font-semibold text-[#4A6362] uppercase tracking-wide mb-1.5">Data da sessão</label>
                <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl border border-[#006A68]/30 bg-[#EFF5F4] text-sm text-[#324B4A] font-semibold">
                  <CalendarDays size={15} className="text-[#006A68] shrink-0" />
                  {data ? new Date(data + 'T12:00:00').toLocaleDateString('pt-PT', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }) : '—'}
                </div>
                <p className="text-[10px] text-[#4A6362] mt-1">Data preenchida automaticamente com base na disponibilidade selecionada.</p>
              </div>

              {/* Duração */}
              <div>
                <label className="block text-xs font-semibold text-[#4A6362] uppercase tracking-wide mb-1.5">Duração</label>
                <div className="flex flex-wrap gap-2">
                  {DURACOES.map(d => (
                    <button
                      key={d}
                      onClick={() => { setDuracao(d); setHoraSel('') }}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-all
                        ${duracao === d ? 'bg-[#006A68] text-white border-[#006A68]' : 'border-gray-200 text-[#4A6362] hover:border-[#006A68]'}`}
                    >
                      {d} min
                    </button>
                  ))}
                </div>
              </div>

              {/* Nº alunos */}
              <div>
                <label className="block text-xs font-semibold text-[#4A6362] uppercase tracking-wide mb-1.5">Tipo de sessão</label>
                <div className="flex gap-2">
                  {[1, 2, 3].map(n => (
                    <button
                      key={n}
                      onClick={() => setNumAlunos(n)}
                      className={`flex-1 py-2 rounded-lg text-xs font-bold border transition-all
                        ${numAlunos === n ? 'bg-[#006A68] text-white border-[#006A68]' : 'border-gray-200 text-[#4A6362] hover:border-[#006A68]'}`}
                    >
                      {n === 1 ? 'Individual' : `Grupo (${n})`}
                    </button>
                  ))}
                </div>
              </div>

              {/* Hora de início */}
              <div>
                <label className="block text-xs font-semibold text-[#4A6362] uppercase tracking-wide mb-1.5">Hora de Início</label>
                {horasPossiveis.length === 0 ? (
                  <div className="text-center py-3 text-xs text-gray-400 bg-gray-50 rounded-xl border border-dashed border-gray-200">
                    Não é possível encaixar {duracao} min neste slot. Escolhe uma duração menor.
                  </div>
                ) : (
                  <div className="grid grid-cols-4 gap-2">
                    {horasPossiveis.map(h => (
                      <button
                        key={h}
                        onClick={() => { setHoraSel(h); setErro('') }}
                        className={`py-2 text-sm font-semibold rounded-lg border transition-all
                          ${horaSel === h ? 'bg-[#006A68] text-white border-[#006A68]' : 'border-gray-200 text-[#324B4A] hover:border-[#006A68]'}`}
                      >
                        {h.substring(0, 5)}
                      </button>
                    ))}
                  </div>
                )}
              </div>

            </div>
          )}

          {/* ── PASSO 4: Confirmação ── */}
          {step === 4 && (
            <div className="space-y-4">
              <p className="text-sm font-semibold text-[#324B4A] mb-2">Confirma os detalhes da tua marcação:</p>
              <div className="bg-[#EFF5F4] rounded-2xl p-5 space-y-3 border border-[#006A68]/10">
                <Row icon={Music} label="Modalidade" value={modalidadeSel?.nome} />
                <Row icon={User} label="Docente" value={docenteSel?.nome_docente} />
                <Row icon={CalendarDays} label="Data" value={new Date(data + 'T00:00:00').toLocaleDateString('pt-PT', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })} />
                <Row icon={Clock} label="Hora" value={horaSel?.substring(0, 5)} />
                <Row icon={Clock} label="Duração" value={`${duracao} minutos`} />
                <Row icon={User} label="Tipo" value={numAlunos === 1 ? 'Individual' : `Grupo (${numAlunos} alunos)`} />
              </div>
              <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 text-xs text-amber-700 flex items-start gap-2">
                <AlertCircle size={14} className="shrink-0 mt-0.5" />
                O teu pedido ficará <strong className="ml-1">Agendado</strong> e será confirmado pela coordenação.
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 pb-6 flex items-center justify-between gap-3">
          {step > 1 ? (
            <button
              onClick={() => { setStep(s => s - 1); setErro('') }}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-gray-200 text-[#4A6362] text-sm font-semibold hover:bg-gray-50 transition-colors"
            >
              <ChevronLeft size={16} />
              Anterior
            </button>
          ) : (
            <div />
          )}

          {step < 4 ? (
            <button
              disabled={
                (step === 1 && !modalidadeSel) ||
                (step === 2 && !slotSel) ||
                (step === 3 && (!data || !horaSel || !verificarDataSelecionada()))
              }
              onClick={() => { setStep(s => s + 1); setErro('') }}
              className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-[#006A68] text-white text-sm font-bold hover:bg-[#00504E] transition-colors shadow-sm disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Seguinte
              <ChevronRight size={16} />
            </button>
          ) : (
            <button
              disabled={submitting}
              onClick={handleSubmit}
              className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-[#006A68] text-white text-sm font-bold hover:bg-[#00504E] transition-colors shadow-sm disabled:opacity-60"
            >
              {submitting ? <Loader2 size={15} className="animate-spin" /> : <Check size={15} strokeWidth={3} />}
              {submitting ? 'A enviar...' : 'Confirmar pedido'}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

function Row({ icon: Icon, label, value }) {
  return (
    <div className="flex items-center gap-3">
      <div className="w-7 h-7 rounded-lg bg-[#CCE8E6] flex items-center justify-center shrink-0">
        <Icon size={13} className="text-[#006A68]" />
      </div>
      <div className="flex-1 flex items-center justify-between">
        <span className="text-xs text-[#4A6362] font-semibold uppercase tracking-wide">{label}</span>
        <span className="text-sm font-bold text-[#324B4A] text-right">{value || '—'}</span>
      </div>
    </div>
  )
}
