import { useState, useEffect, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { api } from '../services/api'
import { ArrowLeft, Loader2, AlertCircle, Plus, Megaphone, Send, Users, Clock, Trash2, Calendar, MapPin, Edit2, X, UserPlus, MessageCircle, ChevronRight, Lock, Globe } from 'lucide-react'
import CriarGrupoPanel from '../components/CriarGrupoPanel'
import EditEventPanel from '../components/EditEventPanel'
import AddEventMemberPanel from '../components/AddEventMemberPanel'
import { Toast } from '../components/HomeWidgets'
import { authService } from '../services/authService'

import { formatDate, addMinutesToTime } from '../utils/dateUtils'

export default function EventDetailsView() {
    const { id } = useParams()
    const navigate = useNavigate()
    const user = authService.getUser()
    const isAdmin = user?.role === 1 // Apenas Admin (Role 1) tem permissões de edição
    const [event, setEvent] = useState(null)
    const [groups, setGroups] = useState([])
    const [selectedGroup, setSelectedGroup] = useState(null)
    const [announcements, setAnnouncements] = useState([])
    const [participants, setParticipants] = useState({ alunos: [], docentes: [] })

    // Docente participante do evento pode gerir grupos
    const isDocenteOfEvent = user?.role === 2 && participants.docentes.some(d => d.id_utilizador === user?.id_utilizador)
    const canManageGroups = isAdmin || isDocenteOfEvent || (user?.role === 2 && event && !event.privado)

    const [loading, setLoading] = useState(true)
    const [error, setError] = useState('')

    // UI states
    const [showCreateGroup, setShowCreateGroup] = useState(false)
    const [showEditEvent, setShowEditEvent] = useState(false)
    const [showAddMember, setShowAddMember] = useState(false)
    const [showParticipants, setShowParticipants] = useState(false)
    const [editGroupData, setEditGroupData] = useState(null)
    const [newMsg, setNewMsg] = useState('')
    const [msgTitle, setMsgTitle] = useState('')
    const [posting, setPosting] = useState(false)

    // Modal UI states
    const [modalNewMsg, setModalNewMsg] = useState('')
    const [modalMsgTitle, setModalMsgTitle] = useState('')

    const [editingAnuncio, setEditingAnuncio] = useState(null)
    const [toast, setToast] = useState(null)
    const [confirmCtx, setConfirmCtx] = useState(null)

    const showToast = (title, type = 'success') => {
        setToast({ title, type })
        setTimeout(() => setToast(null), 3000)
    }

    // Load initial Event Details and Groups
    const loadEventData = useCallback(async () => {
        try {
            setLoading(true)
            const [evData, grpData] = await Promise.allSettled([
                api.get(`/evento/${id}`),
                api.get(`/evento/${id}/grupos`)
            ])

            if (evData.status === 'fulfilled') setEvent(evData.value)
            else {
                const err = evData.reason
                const status = err?.response?.status || err?.status
                if (status === 403) {
                    setError('Não tens permissão para ver este evento privado.')
                } else {
                    setError('Erro ao carregar o evento principal.')
                }
            }

            if (grpData.status === 'fulfilled') setGroups(grpData.value || [])

            // Load participants
            try {
                const pData = await api.get(`/evento/${id}/participantes`)
                setParticipants({ alunos: pData.alunos || [], docentes: pData.docentes || [] })
            } catch { }
        } catch (e) {
            setError(e.message || 'Erro inesperado ao contactar base de dados.')
        } finally {
            setLoading(false)
        }
    }, [id])

    // Load Announcements (Event only)
    const loadEventAnnouncements = useCallback(async () => {
        try {
            const data = await api.get(`/anuncios/evento/${id}`)
            setAnnouncements(Array.isArray(data) ? data : [])
        } catch (e) {
            setAnnouncements([])
        }
    }, [id])

    // Load Announcements for Modal (Group only)
    const [groupAnnouncements, setGroupAnnouncements] = useState([])
    const loadGroupAnnouncements = useCallback(async (groupId) => {
        try {
            const data = await api.get(`/anuncios/grupo/${groupId}`)
            setGroupAnnouncements(Array.isArray(data) ? data : [])
        } catch (e) {
            setGroupAnnouncements([])
        }
    }, [])

    useEffect(() => {
        loadEventData()
    }, [loadEventData])

    useEffect(() => {
        loadEventAnnouncements()
    }, [loadEventAnnouncements])

    useEffect(() => {
        if (selectedGroup) {
            loadGroupAnnouncements(selectedGroup.id_grupo)
        } else {
            setGroupAnnouncements([])
        }
    }, [selectedGroup, loadGroupAnnouncements])

    const handlePostAnnouncement = async (isGroupContext = false) => {
        const payloadMsg = isGroupContext ? modalNewMsg : newMsg
        const payloadTitle = isGroupContext ? modalMsgTitle : msgTitle
        if (!payloadMsg.trim() && !payloadTitle.trim()) return

        setPosting(true)
        try {
            await api.post(`/anuncios`, {
                titulo: payloadTitle,
                mensagem: payloadMsg,
                id_evento: isGroupContext ? null : parseInt(id),
                id_grupo: isGroupContext ? selectedGroup.id_grupo : null
            })
            if (isGroupContext) {
                setModalMsgTitle('')
                setModalNewMsg('')
                loadGroupAnnouncements(selectedGroup.id_grupo)
            } else {
                setMsgTitle('')
                setNewMsg('')
                loadEventAnnouncements()
            }
            showToast(isGroupContext ? 'Anúncio publicado no grupo!' : 'Anúncio publicado no evento!')
        } catch (e) {
            showToast(e.response?.data?.error || e.message || 'Não foi possível publicar.', 'error')
        } finally {
            setPosting(false)
        }
    }

    const handleDeleteGroup = (groupId) => {
        setConfirmCtx({
            message: 'Apagar este grupo? Todos os alertas e membros serão perdidos para sempre.',
            onConfirm: async () => {
                try {
                    await api.delete(`/evento/${id}/grupos/${groupId}`)
                    setSelectedGroup(null)
                    loadEventData()
                    showToast('Grupo apagado com sucesso!')
                } catch (e) {
                    showToast('Não foi possível eliminar o grupo: ' + (e.message || ''), 'error')
                }
            }
        })
    }

    const handleDeleteAnuncio = (id_anuncio, isGroupContext) => {
        setConfirmCtx({
            message: 'Apagar este anúncio permanentemente?',
            onConfirm: async () => {
                try {
                    await api.delete(`/anuncios/${id_anuncio}`)
                    if (isGroupContext) loadGroupAnnouncements(selectedGroup.id_grupo)
                    else loadEventAnnouncements()
                    showToast('Anúncio eliminado.')
                } catch (e) {
                    showToast('Erro ao apagar anúncio: ' + (e.response?.data?.error || e.message), 'error')
                }
            }
        })
    }

    const handleSaveEditAnuncio = async () => {
        if (!editingAnuncio.mensagem.trim() && !editingAnuncio.titulo?.trim()) return
        try {
            await api.put(`/anuncios/${editingAnuncio.id_anuncio}`, {
                titulo: editingAnuncio.titulo,
                mensagem: editingAnuncio.mensagem
            })
            if (editingAnuncio.isGroupContext) loadGroupAnnouncements(selectedGroup.id_grupo)
            else loadEventAnnouncements()
            setEditingAnuncio(null)
            showToast('Anúncio atualizado com sucesso!')
        } catch (e) {
            showToast('Erro ao editar anúncio: ' + (e.response?.data?.error || e.message), 'error')
        }
    }

    const handleDeleteEvent = () => {
        setConfirmCtx({
            message: `Eliminar o evento "${event?.nome}"? Isto afetará todas as inscrições e anúncios associados.`,
            onConfirm: async () => {
                try {
                    await api.delete(`/evento/${id}`)
                    navigate('/eventos')
                } catch (err) {
                    showToast('Erro ao eliminar evento: ' + (err.response?.data?.error || err.message), 'error')
                }
            }
        })
    }

    const handleRemoveParticipant = (participantId, type, name) => {
        setConfirmCtx({
            message: `Pretende realmente remover o ${type} ${name} deste evento? Esta ação irá também removê-lo de quaisquer grupos associados ao evento.`,
            onConfirm: async () => {
                try {
                    const endpoint = type === 'aluno'
                        ? `/evento/${id}/participantes/alunos/${participantId}`
                        : `/evento/${id}/participantes/docentes/${participantId}`;
                    await api.delete(endpoint)
                    loadEventData()
                    showToast('Participante removido do evento com sucesso!')
                } catch (e) {
                    showToast('Não foi possível remover o participante: ' + (e.response?.data?.error || e.message), 'error')
                }
            }
        })
    }

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[70vh] gap-3 text-brand-800">
                <Loader2 className="animate-spin" size={32} />
                <p className="text-sm font-medium animate-pulse">A carregar...</p>
            </div>
        )
    }

    if (error && !event) {
        return (
            <div className="p-10 font-['Sora']">
                <div className="flex flex-col items-center gap-3 bg-feedback-error-light/30 text-feedback-error-dark text-sm px-5 py-6 rounded-xl border border-feedback-error-light">
                    <AlertCircle size={32} />
                    <p className="font-semibold text-lg">Ocorreu um problema</p>
                    <p className="opacity-80">{error}</p>
                    <button onClick={() => navigate('/eventos')} className="mt-4 px-4 py-2 bg-feedback-error text-white rounded hover:bg-feedback-error-dark transition">Voltar aos eventos</button>
                </div>
            </div>
        )
    }

    const isPastOrCancelled = event?.id_evento_estado === 4 || event?.id_evento_estado === 5 || (event?.data_de_realizacao && new Date(event.data_de_realizacao) < new Date());

    const isMemberOfSelectedGroup = isAdmin || (selectedGroup && (
        selectedGroup.aluno_grupo?.some(ag => ag.id_aluno === user?.id_utilizador) ||
        selectedGroup.docente_grupo?.some(dg => dg.id_docente === user?.id_utilizador)
    ));

    let cleanDescricao = event?.descricao || ''
    let faqsList = []

    if (cleanDescricao.includes('---FAQS---')) {
        const parts = cleanDescricao.split('---FAQS---')
        cleanDescricao = parts[0].trim()
        try {
            faqsList = JSON.parse(parts[1].trim())
        } catch (e) {
            console.error("Erro ao fazer parse dos FAQs:", e)
        }
    }

    return (
        <div className="font-['Sora'] bg-brand-50 min-h-screen flex flex-col">

            {/* Header da Página */}
            <div className="bg-white border-b border-brand-800/20 px-8 py-6 mb-6">
                <button onClick={() => navigate('/eventos')} className="flex items-center gap-2 text-neutral-600 hover:text-brand-800 text-sm font-semibold mb-4 w-fit transition-colors">
                    <ArrowLeft size={16} /> Voltar à Agenda
                </button>
                <div className="flex justify-between items-end">
                    <div>
                        <h1 className="text-3xl font-bold text-neutral-800 leading-tight mb-2 flex items-center gap-3">
                            {event?.nome || 'Evento sem nome'}
                            {event?.privado ? (
                                <span className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full bg-brand-800 text-white">
                                    <Lock size={11} /> Privado
                                </span>
                            ) : (
                                <span className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full bg-neutral-100 text-neutral-600 border border-neutral-200">
                                    <Globe size={11} /> Público
                                </span>
                            )}
                        </h1>
                        <p className="text-neutral-600 flex items-center gap-2 text-sm font-medium">
                            <Calendar size={15} /> {formatDate(event?.data_de_realizacao)}
                        </p>
                        <p className="text-neutral-600 flex items-center gap-2 text-sm font-medium mt-1.5">
                            <MapPin size={15} /> {event?.local || 'Local a definir'}
                        </p>
                        {event?.data_de_realizacao && (
                            <>
                                <p className="text-neutral-600 flex items-center gap-2 text-sm font-medium mt-1.5">
                                    <Clock size={15} /> Hora de Início: {event.data_de_realizacao.substring(11, 16)}
                                </p>
                                {event.duracao_minutos && (
                                    <p className="text-neutral-600 flex items-center gap-2 text-sm font-medium mt-1.5">
                                        <Clock size={15} /> Hora prevista de fim: {addMinutesToTime(event.data_de_realizacao.substring(11, 16), event.duracao_minutos)}
                                    </p>
                                )}
                            </>
                        )}

                        {/* Botao discreto de participantes - apenas em eventos privados */}
                        {event?.privado && (
                            <button
                                onClick={() => setShowParticipants(true)}
                                className="mt-2.5 inline-flex items-center gap-1.5 text-xs text-brand-800 font-semibold hover:underline"
                            >
                                <Users size={13} />
                                {participants.alunos.length + participants.docentes.length} participantes inscritos
                            </button>
                        )}
                    </div>

                    {isAdmin && !isPastOrCancelled && (
                        <div className="flex items-center gap-3">
                            {event?.privado && (
                                <button
                                    onClick={() => setShowAddMember(true)}
                                    className="flex items-center gap-2 px-4 py-2.5 bg-brand-200 text-brand-800 hover:bg-brand-200 rounded-xl text-sm font-semibold transition-colors border border-brand-800/30"
                                >
                                    <UserPlus size={16} /> Adicionar Membro
                                </button>
                            )}
                            <button
                                onClick={() => setShowEditEvent(true)}
                                className="flex items-center gap-2 px-4 py-2.5 bg-brand-50 text-brand-800 hover:bg-brand-200 rounded-xl text-sm font-semibold transition-colors border border-brand-800/20"
                            >
                                <Edit2 size={16} /> Editar Evento
                            </button>
                            <button
                                onClick={handleDeleteEvent}
                                className="flex items-center gap-2 px-4 py-2.5 bg-feedback-error-light/30 text-feedback-error-dark hover:bg-feedback-error-light/60 rounded-xl text-sm font-semibold transition-colors border border-feedback-error-light"
                            >
                                <Trash2 size={16} /> Eliminar
                            </button>
                        </div>
                    )}
                </div>
            </div>

            {/* Layout Divisório 70/30 */}
            <div className="flex-1 flex flex-col lg:flex-row max-w-7xl w-full mx-auto px-4 lg:px-8 gap-8 pb-10">

                {/* 70% Mural Principal */}
                <div className="flex-1 flex flex-col gap-6">

                    {/* === INFORMAÇÕES DO EVENTO === */}
                    {(cleanDescricao || event?.link_whatsapp || faqsList.length > 0) && (
                        <div className="bg-white rounded-2xl border border-brand-800/20 p-6 flex flex-col gap-4 shadow-sm">
                            {cleanDescricao && (
                                <div>
                                    <h3 className="text-lg font-bold text-neutral-800 mb-2">Sobre o Evento</h3>
                                    <p className="text-sm text-neutral-600 whitespace-pre-wrap leading-relaxed">{cleanDescricao}</p>
                                </div>
                            )}

                            {event?.link_whatsapp && (
                                <div className="mt-2">
                                    <a
                                        href={event.link_whatsapp}
                                        target="_blank"
                                        rel="noreferrer"
                                        className="inline-flex items-center gap-2 bg-[#25D366] text-white px-5 py-2.5 rounded-xl font-bold text-sm hover:bg-[#1DA851] transition-colors shadow-sm"
                                    >
                                        <MessageCircle size={18} /> Entrar no Grupo de WhatsApp
                                    </a>
                                </div>
                            )}

                            {faqsList.length > 0 && (
                                <div className="mt-4 pt-4 border-t border-brand-800/10">
                                    <h3 className="text-lg font-bold text-neutral-800 mb-4">Perguntas Frequentes</h3>
                                    <div className="flex flex-col gap-2">
                                        {faqsList.map((faq, idx) => (
                                            <details key={faq.id || idx} className="group bg-neutral-50 border border-neutral-200 rounded-xl overflow-hidden cursor-pointer open:bg-brand-50 transition-colors">
                                                <summary className="flex items-center justify-between p-4 font-semibold text-neutral-800 select-none group-open:text-brand-800">
                                                    <span className="flex items-center gap-2">
                                                        {faq.pergunta}
                                                        {faq.geral && <span className="text-[10px] bg-brand-200 text-brand-800 px-1.5 py-0.5 rounded ml-2">Geral</span>}
                                                    </span>
                                                    <ChevronRight size={18} className="text-brand-800 transition-transform group-open:rotate-90" />
                                                </summary>
                                                <div className="px-4 pb-4 text-sm text-neutral-600 leading-relaxed border-t border-brand-800/10 pt-3">
                                                    {faq.resposta || <span className="italic opacity-50">Sem resposta...</span>}
                                                </div>
                                            </details>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {/* === MURAL DE ANÚNCIOS === */}
                    <div className="bg-white rounded-2xl border border-brand-800/20 p-6 flex items-center justify-between shadow-sm">
                        <div className="flex items-center gap-3">
                            <Megaphone size={28} className="text-brand-800" />
                            <div>
                                <h2 className="text-xl font-bold text-neutral-800">
                                    Mural de Anúncios
                                </h2>
                            </div>
                        </div>
                    </div>

                    {/* Caixa de Criação de Anúncios — apenas Admin */}
                    {isAdmin && !isPastOrCancelled && (
                        <div className="bg-white rounded-2xl border border-brand-800/20 p-5 shadow-sm">
                            <input
                                type="text"
                                placeholder="Título do anúncio..."
                                value={msgTitle}
                                onChange={(e) => setMsgTitle(e.target.value)}
                                className="w-full bg-transparent border-b border-gray-200 pb-2 mb-3 text-sm font-semibold text-black placeholder:text-gray-400 focus:outline-none"
                            />
                            <textarea
                                placeholder="O que precisas de anunciar a todos os alunos deste evento?"
                                value={newMsg}
                                onChange={(e) => setNewMsg(e.target.value)}
                                className="w-full bg-transparent text-sm resize-none focus:outline-none placeholder:text-neutral-600/60 min-h-[60px]"
                            />
                            <div className="flex justify-end mt-2">
                                <button
                                    onClick={() => handlePostAnnouncement(false)}
                                    disabled={posting || (!newMsg && !msgTitle)}
                                    className="flex items-center gap-2 bg-brand-800 text-white px-4 py-2 rounded-xl text-sm font-bold hover:bg-brand-900 transition-colors disabled:opacity-50"
                                >
                                    {posting ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
                                    Publicar
                                </button>
                            </div>
                        </div>
                    )}

                    {/* Feed de Anúncios */}
                    <div className="flex flex-col gap-4">
                        {announcements.length === 0 ? (
                            <div className="text-center py-10">
                                <p className="text-neutral-600 italic text-sm">Ainda não existem anúncios publicados neste contexto.</p>
                            </div>
                        ) : (
                            announcements.map((anuncio, idx) => {
                                const isEditing = editingAnuncio?.id_anuncio === anuncio.id_anuncio && !editingAnuncio?.isGroupContext
                                return (
                                    <div key={idx} className="bg-white p-5 rounded-2xl shadow-sm border border-transparent hover:border-brand-800/20 transition-all flex flex-col gap-3">
                                        <div className="flex justify-between items-start">
                                            <div className="flex items-center gap-2">
                                                <div className="w-8 h-8 rounded-full bg-brand-200 text-brand-800 flex items-center justify-center font-bold text-xs">A</div>
                                                <div className="flex flex-col">
                                                    <span className="text-xs font-bold text-neutral-800">Admin / Coordenadora</span>
                                                    <span className="text-[10px] text-gray-400">{formatDate(anuncio.data_envio)}</span>
                                                </div>
                                            </div>
                                            {isAdmin && !isEditing && !isPastOrCancelled && (
                                                <div className="flex items-center gap-2 opacity-0 hover:opacity-100 focus-within:opacity-100 transition-opacity" style={{ opacity: 1 }}> {/* Forced opacity to be visible right away for discoverability or keep on hover */}
                                                    <button onClick={() => setEditingAnuncio({ ...anuncio, isGroupContext: false })} className="text-brand-800 hover:text-brand-900 p-1"><Edit2 size={14} /></button>
                                                    <button onClick={() => handleDeleteAnuncio(anuncio.id_anuncio, false)} className="text-feedback-error hover:text-feedback-error-dark p-1"><Trash2 size={14} /></button>
                                                </div>
                                            )}
                                        </div>
                                        <div>
                                            {isEditing ? (
                                                <div className="flex flex-col gap-2 mt-2">
                                                    <input value={editingAnuncio.titulo || ''} onChange={e => setEditingAnuncio({ ...editingAnuncio, titulo: e.target.value })} className="border p-2 rounded text-sm w-full" placeholder="Título" />
                                                    <textarea value={editingAnuncio.mensagem || ''} onChange={e => setEditingAnuncio({ ...editingAnuncio, mensagem: e.target.value })} className="border p-2 rounded text-sm w-full min-h-[60px]" placeholder="Mensagem" />
                                                    <div className="flex justify-end gap-2 mt-1">
                                                        <button onClick={() => setEditingAnuncio(null)} className="text-xs text-gray-500 px-3 py-1 hover:bg-gray-100 rounded">Cancelar</button>
                                                        <button onClick={handleSaveEditAnuncio} className="text-xs bg-brand-800 text-white px-3 py-1 rounded">Guardar</button>
                                                    </div>
                                                </div>
                                            ) : (
                                                <>
                                                    {anuncio.titulo && <span className="font-bold text-sm block mb-1 text-black">{anuncio.titulo}</span>}
                                                    <p className="text-neutral-600 text-sm whitespace-pre-wrap">{anuncio.mensagem}</p>
                                                </>
                                            )}
                                        </div>
                                    </div>
                                )
                            })
                        )}
                    </div>
                </div>

                {/* 30% Sidebar Lateral de Grupos */}
                <div className="w-full lg:w-[320px] flex flex-col gap-4 shrink-0">
                    <div className="flex items-center justify-between pb-2 border-b border-brand-800/20">
                        <h3 className="font-bold text-neutral-800 text-lg flex items-center gap-2"><Users size={18} /> Grupos</h3>
                        {canManageGroups && !isPastOrCancelled && (
                            <button
                                onClick={() => setShowCreateGroup(true)}
                                className="w-8 h-8 rounded-full bg-brand-800 flex items-center justify-center text-white hover:bg-brand-900 transition-colors shadow-sm"
                                title="Criar novo grupo"
                            >
                                <Plus size={16} />
                            </button>
                        )}
                    </div>

                    <div className="flex flex-col gap-3">
                        {groups.length === 0 ? (
                            <p className="text-xs text-center p-4 text-neutral-600 italic">Nenhum grupo configurado.</p>
                        ) : (
                            groups.map((grupo) => (
                                <button
                                    key={grupo.id_grupo}
                                    onClick={() => setSelectedGroup(grupo)}
                                    className={`w-full flex items-center gap-3 p-3 rounded-xl border text-left transition-all ${selectedGroup?.id_grupo === grupo.id_grupo
                                        ? 'bg-neutral-200 border-brand-800 shadow-sm'
                                        : 'bg-white border-neutral-400 hover:border-brand-800'
                                        }`}
                                >
                                    <div className={`w-10 h-10 rounded-full border flex items-center justify-center shrink-0 font-bold text-xs ${selectedGroup?.id_grupo === grupo.id_grupo ? 'border-brand-800 bg-brand-800 text-white' : 'border-neutral-400 bg-white text-brand-800'}`}>
                                        G{grupo.id_grupo}
                                    </div>
                                    <div className="flex flex-col flex-1 min-w-0">
                                        <span className={`font-bold text-sm truncate ${selectedGroup?.id_grupo === grupo.id_grupo ? 'text-brand-800' : 'text-black'}`}>{grupo.nome}</span>
                                        <span className="text-[10px] text-neutral-600">{(grupo.aluno_grupo?.length || 0) + (grupo.docente_grupo?.length || 0)} Membros</span>
                                    </div>
                                </button>
                            ))
                        )}
                    </div>
                </div>

            </div>

            {/* Modal de Feed do Grupo */}
            {selectedGroup && (
                <div className="fixed inset-0 z-[60] bg-black/60 flex flex-col items-center justify-center p-4">
                    <div className="bg-brand-50 w-full max-w-2xl max-h-[85vh] rounded-3xl shadow-2xl flex flex-col overflow-hidden">

                        <div className="bg-white border-b border-brand-800/20 p-5 shrink-0 flex justify-between items-center">
                            <div className="flex items-center gap-3">
                                <div className="w-12 h-12 rounded-full border-2 border-brand-800 bg-brand-200 flex items-center justify-center text-brand-800 font-bold text-lg">
                                    G{selectedGroup.id_grupo}
                                </div>
                                <div>
                                    <h2 className="text-xl font-bold text-neutral-800">{selectedGroup.nome}</h2>
                                    <p className="text-sm text-neutral-600">{(selectedGroup.aluno_grupo?.length || 0) + (selectedGroup.docente_grupo?.length || 0)} Membros no grupo</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-3">
                                {canManageGroups && !isPastOrCancelled && (
                                    <>
                                        <button onClick={() => { setEditGroupData(selectedGroup); setShowCreateGroup(true); }} className="px-3 py-1.5 text-sm bg-white border border-neutral-400 rounded-lg font-bold text-brand-800 hover:bg-neutral-50 transition">Editar Grupo</button>
                                        <button onClick={() => handleDeleteGroup(selectedGroup.id_grupo)} className="p-2 text-feedback-error bg-white border border-feedback-error-light rounded-lg hover:bg-feedback-error-light/30 transition"><Trash2 size={16} /></button>
                                    </>
                                )}
                                <button onClick={() => setSelectedGroup(null)} className="w-10 h-10 bg-neutral-200 rounded-full flex items-center justify-center text-neutral-600 hover:bg-red-100 hover:text-red-600 transition-colors">
                                    <X size={20} />
                                </button>
                            </div>
                        </div>

                        <div className="flex-1 overflow-y-auto p-6 scroll-smooth">
                            {isAdmin && !isPastOrCancelled && (
                                <div className="bg-white rounded-2xl border border-brand-800/20 p-5 shadow-sm mb-6">
                                    <input
                                        type="text"
                                        placeholder="Título do anúncio..."
                                        value={modalMsgTitle}
                                        onChange={(e) => setModalMsgTitle(e.target.value)}
                                        className="w-full bg-transparent border-b border-gray-200 pb-2 mb-3 text-sm font-semibold text-black placeholder:text-gray-400 focus:outline-none"
                                    />
                                    <textarea
                                        placeholder="Novo anúncio restrito a este grupo..."
                                        value={modalNewMsg}
                                        onChange={(e) => setModalNewMsg(e.target.value)}
                                        className="w-full bg-transparent text-sm resize-none focus:outline-none placeholder:text-neutral-600/60 min-h-[60px]"
                                    />
                                    <div className="flex justify-end mt-2">
                                        <button
                                            onClick={() => handlePostAnnouncement(true)}
                                            disabled={posting || (!modalNewMsg && !modalMsgTitle)}
                                            className="flex items-center gap-2 bg-brand-800 text-white px-4 py-2 rounded-xl text-sm font-bold hover:bg-brand-900 transition-colors disabled:opacity-50"
                                        >
                                            {posting ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
                                            Publicar
                                        </button>
                                    </div>
                                </div>
                            )}

                            <div className="flex flex-col gap-4">
                                {!isMemberOfSelectedGroup ? (
                                    <div className="flex flex-col items-center justify-center py-10 gap-3">
                                        <Lock className="text-brand-800/50" size={40} />
                                        <p className="text-center text-neutral-600 font-medium px-6">Os anúncios deste grupo são exclusivos para os seus membros.</p>
                                    </div>
                                ) : groupAnnouncements.length === 0 ? (
                                    <p className="text-center text-neutral-600 italic py-8">Nenhum aviso restrito circulou neste grupo.</p>
                                ) : (
                                    groupAnnouncements.map((anuncio, idx) => {
                                        const isEditing = editingAnuncio?.id_anuncio === anuncio.id_anuncio && editingAnuncio?.isGroupContext
                                        return (
                                            <div key={idx} className="bg-white p-5 rounded-2xl border border-brand-800/20 flex flex-col gap-3 shadow-sm">
                                                <div className="flex justify-between items-start">
                                                    <div className="flex items-center gap-2 mb-1">
                                                        <div className="w-8 h-8 rounded-full bg-brand-800 text-white flex items-center justify-center font-bold text-xs">C</div>
                                                        <div className="flex flex-col">
                                                            <span className="text-xs font-bold text-neutral-800">Coordenação</span>
                                                            <span className="text-[10px] text-gray-400">{formatDate(anuncio.data_envio)}</span>
                                                        </div>
                                                    </div>
                                                    {isAdmin && !isEditing && !isPastOrCancelled && (
                                                        <div className="flex items-center gap-2">
                                                            <button onClick={() => setEditingAnuncio({ ...anuncio, isGroupContext: true })} className="text-brand-800 hover:text-brand-900 p-1"><Edit2 size={14} /></button>
                                                            <button onClick={() => handleDeleteAnuncio(anuncio.id_anuncio, true)} className="text-feedback-error hover:text-feedback-error-dark p-1"><Trash2 size={14} /></button>
                                                        </div>
                                                    )}
                                                </div>
                                                <div>
                                                    {isEditing ? (
                                                        <div className="flex flex-col gap-2 mt-2">
                                                            <input value={editingAnuncio.titulo || ''} onChange={e => setEditingAnuncio({ ...editingAnuncio, titulo: e.target.value })} className="border p-2 rounded text-sm w-full" placeholder="Título" />
                                                            <textarea value={editingAnuncio.mensagem || ''} onChange={e => setEditingAnuncio({ ...editingAnuncio, mensagem: e.target.value })} className="border p-2 rounded text-sm w-full min-h-[60px]" placeholder="Mensagem" />
                                                            <div className="flex justify-end gap-2 mt-1">
                                                                <button onClick={() => setEditingAnuncio(null)} className="text-xs text-gray-500 px-3 py-1 hover:bg-gray-100 rounded">Cancelar</button>
                                                                <button onClick={handleSaveEditAnuncio} className="text-xs bg-brand-800 text-white px-3 py-1 rounded">Guardar</button>
                                                            </div>
                                                        </div>
                                                    ) : (
                                                        <>
                                                            {anuncio.titulo && <span className="font-bold text-sm block mb-1 text-black">{anuncio.titulo}</span>}
                                                            <p className="text-neutral-600 text-sm whitespace-pre-wrap">{anuncio.mensagem}</p>
                                                        </>
                                                    )}
                                                </div>
                                            </div>
                                        )
                                    })
                                )}
                            </div>
                        </div>

                    </div>
                </div>
            )}

            {/* Modal Deslizante para Edição Evento */}
            {showEditEvent && (
                <>
                    <div className="fixed inset-0 z-[55] bg-black/20 backdrop-blur-[2px]" onClick={() => setShowEditEvent(false)} />
                    <EditEventPanel
                        initialEvent={event}
                        onClose={() => setShowEditEvent(false)}
                        onSuccess={() => {
                            setShowEditEvent(false)
                            loadEventData()
                            showToast('Evento atualizado com sucesso!')
                        }}
                    />
                </>
            )}

            {/* Modal Deslizante para Criação Grupo */}
            {showCreateGroup && (
                <>
                    <div className="fixed inset-0 z-50 bg-black/20 backdrop-blur-[2px]" onClick={() => { setShowCreateGroup(false); setEditGroupData(null); }} />
                    <CriarGrupoPanel
                        eventId={id}
                        initialGroup={editGroupData}
                        onClose={() => { setShowCreateGroup(false); setEditGroupData(null); }}
                        onSuccess={() => {
                            setShowCreateGroup(false)
                            setEditGroupData(null)
                            loadEventData() // Reload groups list!
                            showToast(editGroupData ? 'Grupo atualizado!' : 'Grupo criado com sucesso!')
                        }}
                    />
                </>
            )}
            {/* Painel Adicionar Membro ao Evento */}
            {showAddMember && (
                <>
                    <div className="fixed inset-0 z-[55] bg-black/20 backdrop-blur-[2px]" onClick={() => setShowAddMember(false)} />
                    <AddEventMemberPanel
                        eventId={id}
                        onClose={() => setShowAddMember(false)}
                        onSuccess={() => {
                            loadEventData()
                            showToast('Membros adicionados com sucesso!')
                        }}
                    />
                </>
            )}

            {/* Modal Participantes */}
            {showParticipants && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={() => setShowParticipants(false)}>
                    <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" />
                    <div
                        className="relative bg-brand-50 rounded-2xl shadow-2xl w-full max-w-lg max-h-[80vh] flex flex-col overflow-hidden"
                        onClick={e => e.stopPropagation()}
                    >
                        {/* Header */}
                        <div className="flex items-center justify-between px-7 pt-7 pb-4 border-b border-brand-800/15">
                            <div className="flex items-center gap-3">
                                <div className="w-9 h-9 rounded-xl bg-brand-200 flex items-center justify-center shrink-0">
                                    <Users size={18} className="text-brand-800" />
                                </div>
                                <div>
                                    <h2 className="text-lg font-bold text-neutral-800 font-['Sora']">Participantes</h2>
                                    <p className="text-xs text-neutral-600">{participants.alunos.length + participants.docentes.length} inscritos neste evento</p>
                                </div>
                            </div>
                            <button onClick={() => setShowParticipants(false)} className="w-8 h-8 rounded-full hover:bg-red-100 hover:text-red-600 transition-colors flex items-center justify-center text-neutral-600">
                                <X size={16} />
                            </button>
                        </div>

                        {/* Body */}
                        <div className="flex-1 overflow-y-auto px-7 py-5 space-y-5">
                            {participants.alunos.length === 0 && participants.docentes.length === 0 ? (
                                <p className="text-sm text-center text-neutral-600 italic py-8">Ainda não há participantes inscritos.</p>
                            ) : (
                                <>
                                    {participants.docentes.length > 0 && (
                                        <div>
                                            <p className="text-[10px] font-bold uppercase tracking-widest text-neutral-600 mb-3">Docentes · {participants.docentes.length}</p>
                                            <div className="space-y-2">
                                                {participants.docentes.map((d, i) => (
                                                    <div key={i} className="flex items-center justify-between gap-3 px-3 py-2.5 bg-white rounded-xl border border-brand-800/15">
                                                        <div className="flex items-center gap-3">
                                                            <div className="w-9 h-9 rounded-full bg-brand-800 flex items-center justify-center text-white text-xs font-bold shrink-0">
                                                                {((d.nome?.[0] || '') + (d.apelido?.[0] || '')).toUpperCase() || '?'}
                                                            </div>
                                                            <div>
                                                                <p className="text-sm font-semibold text-neutral-900">{d.nome} {d.apelido}</p>
                                                                <p className="text-[10px] text-neutral-600">{d.codigo_username || d.email || ''}</p>
                                                            </div>
                                                        </div>
                                                        {isAdmin && (
                                                            <button
                                                                onClick={() => handleRemoveParticipant(d.id_utilizador, 'docente', `${d.nome} ${d.apelido}`)}
                                                                className="w-8 h-8 rounded-lg text-neutral-600 hover:text-red-600 hover:bg-red-50 flex items-center justify-center transition-all shrink-0"
                                                                title="Remover docente"
                                                            >
                                                                <Trash2 size={16} />
                                                            </button>
                                                        )}
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                    {participants.alunos.length > 0 && (
                                        <div>
                                            <p className="text-[10px] font-bold uppercase tracking-widest text-neutral-600 mb-3">Alunos · {participants.alunos.length}</p>
                                            <div className="space-y-2">
                                                {participants.alunos.map((a, i) => (
                                                    <div key={i} className="flex items-center justify-between gap-3 px-3 py-2.5 bg-white rounded-xl border border-neutral-400">
                                                        <div className="flex items-center gap-3">
                                                            <div className="w-9 h-9 rounded-full bg-brand-200 flex items-center justify-center text-brand-800 text-xs font-bold shrink-0">
                                                                {((a.nome?.[0] || '') + (a.apelido?.[0] || '')).toUpperCase() || '?'}
                                                            </div>
                                                            <div>
                                                                <p className="text-sm font-semibold text-neutral-900">{a.nome} {a.apelido}</p>
                                                                <p className="text-[10px] text-neutral-600">{a.codigo_username || a.email || ''}</p>
                                                            </div>
                                                        </div>
                                                        {isAdmin && (
                                                            <button
                                                                onClick={() => handleRemoveParticipant(a.id_utilizador, 'aluno', `${a.nome} ${a.apelido}`)}
                                                                className="w-8 h-8 rounded-lg text-neutral-600 hover:text-red-600 hover:bg-red-50 flex items-center justify-center transition-all shrink-0"
                                                                title="Remover aluno"
                                                            >
                                                                <Trash2 size={16} />
                                                            </button>
                                                        )}
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {confirmCtx && (
                <div className="fixed inset-0 z-[80] flex items-center justify-center p-4" onClick={() => setConfirmCtx(null)}>
                    <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" />
                    <div className="relative bg-white rounded-2xl shadow-xl p-6 w-full max-w-sm font-['Sora']" onClick={e => e.stopPropagation()}>
                        <p className="font-semibold text-neutral-800 text-base mb-1">Tem a certeza?</p>
                        <p className="text-sm text-neutral-500 mb-5">{confirmCtx.message}</p>
                        <div className="flex gap-2">
                            <button onClick={() => setConfirmCtx(null)} className="flex-1 py-2.5 text-sm border border-neutral-600/25 rounded-xl text-neutral-600 hover:bg-neutral-50 transition-colors">
                                Cancelar
                            </button>
                            <button onClick={() => { setConfirmCtx(null); confirmCtx.onConfirm() }} className="flex-1 py-2.5 text-sm bg-red-600 text-white font-bold rounded-xl hover:bg-red-700 transition-colors">
                                Confirmar
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {toast && <Toast msg={toast.title} type={toast.type} onClose={() => setToast(null)} />}
        </div>
    )
}


