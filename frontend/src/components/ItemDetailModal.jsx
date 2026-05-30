import React from 'react'
import { X, CalendarDays, Clock, MapPin, User, Music, BookOpen, Trash2, Pencil, DoorOpen } from 'lucide-react'
import { parseDate, addMinutesToTime } from '../utils/dateUtils'

// Cores de exemplo (podem ser passadas via props ou mantidas como padrão)
const STATUS_COLOR = {
    1: 'bg-amber-100 text-amber-700 border-amber-200',
    2: 'bg-blue-100 text-blue-700 border-blue-200',
    3: 'bg-emerald-100 text-emerald-700 border-emerald-200',
    4: 'bg-brand-200 text-brand-800 border-brand-800',
    5: 'bg-red-100 text-red-700 border-red-200',
}

const STATUS_LABEL = {
    1: 'Pendente',
    2: 'Em Validação',
    3: 'Confirmada',
    4: 'Concluída',
    5: 'Cancelada',
}

function InfoItem({ icon: Icon, label, value }) {
    return (
        <div className="flex items-start gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-brand-200 flex items-center justify-center shrink-0 mt-0.5">
                {Icon && <Icon size={14} className="text-brand-800" />}
            </div>
            <div>
                <p className="text-[10px] uppercase tracking-wider text-neutral-600 font-semibold">{label}</p>
                <p className="text-sm font-medium text-gray-800">{String(value || '—')}</p>
            </div>
        </div>
    )
}

export default function ItemDetailModal({
    item,
    onClose,
    role,
    onEdit,
    onDelete,
    onChangeRoom,
    onNavigate,
    navigateLabel = "Ver Detalhes"
}) {
    if (!item) return null

    // Lógica de cores baseada no tipo
    const isEvent = item._isEvent || item.id_evento
    const isDisponibilidade = item._isDisponibilidade

    let color = { bg: '#F4FBF9', border: '#80D5D2', text: '#006A68' }
    if (isEvent) color = { bg: '#EFF1F1', border: '#BEC9C7', text: '#324B4A' }

    const statusClass = STATUS_COLOR[item.id_estado] ?? 'bg-gray-50 text-gray-600 border-gray-200'
    const statusLabel = STATUS_LABEL[item.id_estado] ?? item.estado_nome ?? '—'

    // Permissões de Ação (lógica vinda do Horario.jsx)
    let canEdit = !!onEdit;
    let canDelete = !!onDelete;
    let canChangeRoom = !!onChangeRoom;

    // Verificar se o item está no passado (data estritamente anterior a hoje)
    const startValue = item.start || item.data || item.data_de_realizacao || item._data_raw;
    const itemDate = parseDate(startValue);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const isPast = itemDate && itemDate < today;

    if (isPast) {
        canEdit = false;
        canDelete = false;
    }

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4" onClick={onClose}>
            <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
            <div
                className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-200 font-['Sora']"
                onClick={e => e.stopPropagation()}
            >
                <div
                    className="px-6 py-5 flex items-start justify-between"
                    style={{ backgroundColor: color.bg, borderBottom: `2px solid ${color.border}` }}
                >
                    <div>
                        <p className="text-xs font-semibold uppercase tracking-widest mb-1" style={{ color: color.text }}>
                            {isEvent ? 'Evento' : (isDisponibilidade ? 'Disponibilidade' : 'Aula')}
                        </p>
                        <h3 className="font-bold text-xl" style={{ color: color.text }}>
                            {item.modalidade || item.nome || 'Detalhes'}
                        </h3>
                    </div>
                    <button onClick={onClose} className="w-8 h-8 rounded-full bg-white/70 flex items-center justify-center text-gray-500 hover:bg-white transition-colors">
                        <X size={16} />
                    </button>
                </div>

                <div className="px-6 py-6 space-y-5">
                    {!isEvent && !isDisponibilidade && (
                        <span className={`inline-flex items-center text-xs font-bold px-3 py-1.5 rounded-full border ${statusClass}`}>
                            {statusLabel}
                        </span>
                    )}

                    <div className="grid grid-cols-2 gap-4">
                        <InfoItem icon={CalendarDays} label="Data" value={item.data} />
                        {isDisponibilidade ? (
                            <>
                                <InfoItem icon={Clock} label="Hora de Início" value={item.hora_inicio} />
                                <InfoItem icon={Clock} label="Hora de Fim" value={item.hora_fim} />
                            </>
                        ) : (
                            <InfoItem icon={Clock} label="Hora" value={item.hora || item.hora_inicio} />
                        )}
                        {(item.duracao || item.duracao_minutos) && (
                            <InfoItem
                                icon={Clock}
                                label={isEvent ? "Duração Prevista" : "Duração"}
                                value={item.duracao || `${item.duracao_minutos} min`}
                            />
                        )}
                        {isEvent && (item.duracao_minutos || item.duracao) && (() => {
                            const dur = Number(item.duracao_minutos || item.duracao || 60);
                            const startStr = item.hora || item.hora_inicio || (item.data_de_realizacao ? String(item.data_de_realizacao).substring(11, 16) : '00:00');
                            if (isNaN(dur)) return null;
                            const endStr = addMinutesToTime(startStr, dur);
                            return <InfoItem icon={Clock} label="Data prevista de fim" value={endStr} />;
                        })()}

                        {(item.sala || item.estudio) && <InfoItem icon={MapPin} label="Local" value={item.sala || item.estudio} />}
                        {item.docente && (
                            <InfoItem
                                icon={User}
                                label={role === 2 && !isEvent && !isDisponibilidade ? "Aluno(s)" : "Professor"}
                                value={item.docente}
                            />
                        )}
                        {item.modalidade && <InfoItem icon={Music} label="Modalidade" value={item.modalidade} />}
                        {(item.tipo_aula || item.tipo) && <InfoItem icon={BookOpen} label="Tipo" value={item.tipo_aula || item.tipo || 'Individual'} />}
                    </div>

                    {item.descricao && (
                        <div className="pt-2 border-t border-gray-100">
                            <p className="text-[10px] text-neutral-600 uppercase font-semibold mb-1">Descrição</p>
                            <p className="text-sm text-gray-600 leading-relaxed">{item.descricao}</p>
                        </div>
                    )}

                    {item.alunos?.length > 0 && (
                        <div className="pt-2">
                            <p className="text-[10px] text-neutral-600 uppercase font-semibold mb-2">
                                Alunos ({item.alunos.length})
                            </p>
                            <div className="flex flex-wrap gap-1.5">
                                {item.alunos.map((a, i) => (
                                    <span key={i} className="text-xs bg-brand-200 text-brand-800 px-2.5 py-1 rounded-full font-medium">
                                        {String(a)}
                                    </span>
                                ))}
                            </div>
                        </div>
                    )}
                </div>

                <div className="px-6 pb-6 pt-2 flex flex-col gap-2">
                    <div className="flex gap-2 w-full">
                        {canDelete && (
                            <button
                                onClick={() => { 
                                    const proceed = onDelete(item);
                                    if (proceed !== false) onClose();
                                }}
                                className="flex-1 py-2.5 rounded-xl bg-red-50 text-red-600 border border-red-200 font-semibold text-sm hover:bg-red-100 transition-colors flex items-center justify-center gap-2"
                            >
                                <Trash2 size={16} />
                                {item._type === 'aula' || item.id_marcacao ? 'Cancelar' : 'Eliminar'}
                            </button>
                        )}
                        {canChangeRoom && (
                            <button
                                onClick={() => { onChangeRoom(item); onClose(); }}
                                className="flex-1 py-2.5 rounded-xl bg-indigo-50 text-indigo-600 border border-indigo-200 font-semibold text-sm hover:bg-indigo-100 transition-colors flex items-center justify-center gap-2"
                            >
                                <DoorOpen size={16} />
                                Mudar Sala
                            </button>
                        )}
                        {canEdit && (
                            <button
                                onClick={() => { onEdit(item); onClose(); }}
                                className="flex-1 py-2.5 rounded-xl bg-blue-50 text-blue-600 border border-blue-200 font-semibold text-sm hover:bg-blue-100 transition-colors flex items-center justify-center gap-2"
                            >
                                <Pencil size={16} />
                                Editar
                            </button>
                        )}
                    </div>

                    <div className="flex gap-2 w-full">
                        {onNavigate && (
                            <button
                                onClick={() => { onNavigate(item); onClose(); }}
                                className="flex-1 py-2.5 rounded-xl bg-brand-800 text-white font-semibold text-sm hover:bg-brand-900 transition-colors shadow-sm"
                            >
                                {navigateLabel}
                            </button>
                        )}
                        <button
                            onClick={onClose}
                            className={`py-2.5 rounded-xl font-semibold text-sm transition-colors shadow-sm ${onNavigate ? 'flex-1 bg-gray-100 text-gray-700 hover:bg-gray-200' : 'w-full bg-brand-800 text-white hover:bg-brand-900'}`}
                        >
                            Fechar
                        </button>
                    </div>
                </div>
            </div>
        </div>
    )
}

