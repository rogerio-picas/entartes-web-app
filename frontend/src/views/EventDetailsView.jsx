import { useState, useEffect, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { api } from '../services/api'
import { ArrowLeft, Loader2, AlertCircle, Plus, Megaphone, Send, Users, User, Clock, Trash2, Calendar, MapPin, Edit2, X, RefreshCw, UserPlus } from 'lucide-react'
import CriarGrupoPanel from '../components/CriarGrupoPanel'
import EditEventPanel from '../components/EditEventPanel'
import AddEventMemberPanel from '../components/AddEventMemberPanel'
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

    // Load initial Event Details and Groups
    const loadEventData = useCallback(async () => {
        try {
            setLoading(true)
            const [evData, grpData] = await Promise.allSettled([
                api.get(`/evento/${id}`),
                api.get(`/evento/${id}/grupos`)
            ])

            if (evData.status === 'fulfilled') setEvent(evData.value)
            else setError('Erro ao carregar o evento principal.')

            if (grpData.status === 'fulfilled') setGroups(grpData.value || [])

            // Load participants
            try {
                const pData = await api.get(`/evento/${id}/participantes`)
                setParticipants({ alunos: pData.alunos || [], docentes: pData.docentes || [] })
            } catch {}
        } catch (e) {
            setError(e.message || 'Erro inesperado ao contactar base de dados.')
        } finally {
            setLoading(false)
        }
    }, [id])

    // Load Announcements (Event only)
    const loadEventAnnouncements = useCallback(async () => {
        try {
            const data = await api.get(`/anuncios/anuncios/${id}`)
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
        } catch (e) {
            alert('Não foi possível publicar.\n' + (e.message || ''))
        } finally {
            setPosting(false)
        }
    }

    const handleDeleteGroup = async (groupId) => {
        if (!window.confirm("Pretende mesmo APAGAR este grupo? Todos os alertas e membros serão perdidos para sempre.")) return;
        try {
            await api.delete(`/evento/${id}/grupos/${groupId}`);
            setSelectedGroup(null);
            loadEventData();
        } catch (e) {
            alert('Não foi possível eliminar o grupo.\n' + (e.message || ''));
        }
    }

    const handleDeleteAnuncio = async (id_anuncio, isGroupContext) => {
        if (!window.confirm("Apagar este anúncio permanentemente?")) return
        try {
            await api.delete(`/anuncios/${id_anuncio}`)
            if (isGroupContext) loadGroupAnnouncements(selectedGroup.id_grupo)
            else loadEventAnnouncements()
        } catch(e) {
            alert('Erro ao apagar anúncio: ' + (e.response?.data?.error || e.message))
        }
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
        } catch(e) {
            alert('Erro ao editar anúncio: ' + (e.response?.data?.error || e.message))
        }
    }

    const handleDeleteEvent = async () => {
        if (!window.confirm(`Tem a certeza absoluta de que pretende cancelar/eliminar o evento "${event?.nome}"?\n\nIsto afetará todas as inscrições e anúncios associados.`)) return
        try {
            await api.delete(`/evento/${id}`)
            navigate('/eventos')
        } catch (err) {
            alert('Erro ao eliminar evento: ' + (err.response?.data?.error || err.message))
        }
    }

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[70vh] gap-3 text-brand-dark">
                <Loader2 className="animate-spin" size={32} />
                <p className="text-sm font-medium animate-pulse">A carregar detalhes da base de dados...</p>
            </div>
        )
    }

    if (error && !event) {
        return (
            <div className="p-10 font-['Sora']">
               <div className="flex flex-col items-center gap-3 bg-red-50 text-red-700 text-sm px-5 py-6 rounded-xl border border-red-200">
                    <AlertCircle size={32} />
                    <p className="font-semibold text-lg">Ocorreu um problema</p>
                    <p className="opacity-80">{error}</p>
                    <button onClick={() => navigate('/eventos')} className="mt-4 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition">Voltar aos eventos</button>
               </div>
            </div>
        )
    }

    const unassignedAlunosCount = event?.evento_aluno?.length || 0

    return (
        <div className="font-['Sora'] bg-[#F4FBF9] min-h-screen flex flex-col">
            
            {/* Header da Página */}
            <div className="bg-white border-b border-[#006A68]/20 px-8 py-6 mb-6">
                <button onClick={() => navigate('/eventos')} className="flex items-center gap-2 text-[#4A6362] hover:text-[#006A68] text-sm font-semibold mb-4 w-fit transition-colors">
                    <ArrowLeft size={16} /> Voltar à Agenda
                </button>
                <div className="flex justify-between items-end">
                    <div>
                        <h1 className="text-3xl font-bold text-[#324B4A] leading-tight mb-2">{event?.nome || 'Evento sem nome'}</h1>
                        <p className="text-[#4A6362] flex items-center gap-2 text-sm font-medium">
                            <Calendar size={15}/> {formatDate(event?.data_de_realizacao)}
                        </p>
                        <p className="text-[#4A6362] flex items-center gap-2 text-sm font-medium mt-1.5">
                            <MapPin size={15}/> {event?.local || 'Local a definir'}
                        </p>
                        {event?.duracao_minutos && event?.data_de_realizacao && (
                            <p className="text-[#4A6362] flex items-center gap-2 text-sm font-medium mt-1.5">
                                <Clock size={15}/> Data prevista de fim: {(() => {
                                    const startStr = event.data_de_realizacao ? event.data_de_realizacao.substring(11, 16) : '00:00';
                                    return addMinutesToTime(startStr, event.duracao_minutos);
                                })()}

                            </p>
                        )}

                        {/* Botao discreto de participantes */}
                        <button
                            onClick={() => setShowParticipants(true)}
                            className="mt-2.5 inline-flex items-center gap-1.5 text-xs text-[#006A68] font-semibold hover:underline"
                        >
                            <Users size={13} />
                            {participants.alunos.length + participants.docentes.length} participantes inscritos
                        </button>
                    </div>

                    {isAdmin && (
                        <div className="flex items-center gap-3">
                            <button
                                onClick={() => setShowAddMember(true)}
                                className="flex items-center gap-2 px-4 py-2.5 bg-[#CCE8E6] text-[#006A68] hover:bg-[#b3d9d7] rounded-xl text-sm font-semibold transition-colors border border-[#006A68]/30"
                            >
                                <UserPlus size={16} /> Adicionar Membro
                            </button>
                            <button
                                onClick={() => setShowEditEvent(true)}
                                className="flex items-center gap-2 px-4 py-2.5 bg-[#F4FBF9] text-[#006A68] hover:bg-[#CCE8E6] rounded-xl text-sm font-semibold transition-colors border border-[#006A68]/20"
                            >
                                <Edit2 size={16} /> Editar Evento
                            </button>
                            <button
                                onClick={handleDeleteEvent}
                                className="flex items-center gap-2 px-4 py-2.5 bg-red-50 text-red-700 hover:bg-red-100 rounded-xl text-sm font-semibold transition-colors border border-red-200"
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

                    {/* === MURAL DE ANÚNCIOS === */}
                    <div className="bg-white rounded-2xl border border-brand-dark/20 p-6 flex items-center justify-between shadow-sm">
                        <div className="flex items-center gap-3">
                            <Megaphone size={28} className="text-brand-dark" />
                            <div>
                                <h2 className="text-xl font-bold text-[#324B4A]">
                                    Mural de Anúncios
                                </h2>
                            </div>
                        </div>
                    </div>

                    {/* Caixa de Criação de Anúncios — apenas Admin */}
                    {isAdmin && (
                    <div className="bg-white rounded-2xl border border-brand-dark/20 p-5 shadow-sm">
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
                            className="w-full bg-transparent text-sm resize-none focus:outline-none placeholder:text-[#4A6362]/60 min-h-[60px]"
                        />
                        <div className="flex justify-end mt-2">
                            <button 
                                onClick={() => handlePostAnnouncement(false)}
                                disabled={posting || (!newMsg && !msgTitle)}
                                className="flex items-center gap-2 bg-brand-dark text-white px-4 py-2 rounded-xl text-sm font-bold hover:bg-[#00504E] transition-colors disabled:opacity-50"
                            >
                                {posting ? <Loader2 size={16} className="animate-spin"/> : <Send size={16} />}
                                Publicar
                            </button>
                        </div>
                    </div>
                    )}

                    {/* Feed de Anúncios */}
                    <div className="flex flex-col gap-4">
                        {announcements.length === 0 ? (
                            <div className="text-center py-10">
                                <p className="text-[#4A6362] italic text-sm">Ainda não existem anúncios publicados neste contexto.</p>
                            </div>
                        ) : (
                            announcements.map((anuncio, idx) => {
                                const isEditing = editingAnuncio?.id_anuncio === anuncio.id_anuncio && !editingAnuncio?.isGroupContext
                                return (
                                <div key={idx} className="bg-white p-5 rounded-2xl shadow-sm border border-transparent hover:border-brand-dark/20 transition-all flex flex-col gap-3">
                                    <div className="flex justify-between items-start">
                                        <div className="flex items-center gap-2">
                                           <div className="w-8 h-8 rounded-full bg-[#CCE8E6] text-brand-dark flex items-center justify-center font-bold text-xs">A</div>
                                           <div className="flex flex-col">
                                               <span className="text-xs font-bold text-[#324B4A]">Admin / Coordenadora</span>
                                               <span className="text-[10px] text-gray-400">{formatDate(anuncio.data_envio)}</span>
                                           </div>
                                        </div>
                                        {isAdmin && !isEditing && (
                                            <div className="flex items-center gap-2 opacity-0 hover:opacity-100 focus-within:opacity-100 transition-opacity" style={{ opacity: 1 }}> {/* Forced opacity to be visible right away for discoverability or keep on hover */}
                                                <button onClick={() => setEditingAnuncio({ ...anuncio, isGroupContext: false })} className="text-[#006A68] hover:text-[#00504E] p-1"><Edit2 size={14}/></button>
                                                <button onClick={() => handleDeleteAnuncio(anuncio.id_anuncio, false)} className="text-red-500 hover:text-red-700 p-1"><Trash2 size={14}/></button>
                                            </div>
                                        )}
                                    </div>
                                    <div>
                                        {isEditing ? (
                                            <div className="flex flex-col gap-2 mt-2">
                                                <input value={editingAnuncio.titulo || ''} onChange={e => setEditingAnuncio({...editingAnuncio, titulo: e.target.value})} className="border p-2 rounded text-sm w-full" placeholder="Título" />
                                                <textarea value={editingAnuncio.mensagem || ''} onChange={e => setEditingAnuncio({...editingAnuncio, mensagem: e.target.value})} className="border p-2 rounded text-sm w-full min-h-[60px]" placeholder="Mensagem" />
                                                <div className="flex justify-end gap-2 mt-1">
                                                    <button onClick={() => setEditingAnuncio(null)} className="text-xs text-gray-500 px-3 py-1 hover:bg-gray-100 rounded">Cancelar</button>
                                                    <button onClick={handleSaveEditAnuncio} className="text-xs bg-[#006A68] text-white px-3 py-1 rounded">Guardar</button>
                                                </div>
                                            </div>
                                        ) : (
                                            <>
                                                {anuncio.titulo && <span className="font-bold text-sm block mb-1 text-black">{anuncio.titulo}</span>}
                                                <p className="text-[#4A6362] text-sm whitespace-pre-wrap">{anuncio.mensagem}</p>
                                            </>
                                        )}
                                    </div>
                                </div>
                            )})
                        )}
                    </div>
                </div>

                {/* 30% Sidebar Lateral de Grupos */}
                <div className="w-full lg:w-[320px] flex flex-col gap-4 shrink-0">
                    <div className="flex items-center justify-between pb-2 border-b border-brand-dark/20">
                        <h3 className="font-bold text-[#324B4A] text-lg flex items-center gap-2"><Users size={18}/> Grupos</h3>
                        {isAdmin && (
                            <button 
                                onClick={() => setShowCreateGroup(true)}
                                className="w-8 h-8 rounded-full bg-brand-dark flex items-center justify-center text-white hover:bg-[#00504E] transition-colors shadow-sm"
                                title="Criar novo grupo"
                            >
                                <Plus size={16} />
                            </button>
                        )}
                    </div>
                    
                    <div className="flex flex-col gap-3">
                        {groups.length === 0 ? (
                            <p className="text-xs text-center p-4 text-[#4A6362] italic">Nenhum grupo configurado.</p>
                        ) : (
                            groups.map((grupo) => (
                                <button 
                                    key={grupo.id_grupo}
                                    onClick={() => setSelectedGroup(grupo)}
                                    className={`w-full flex items-center gap-3 p-3 rounded-xl border text-left transition-all ${
                                        selectedGroup?.id_grupo === grupo.id_grupo 
                                        ? 'bg-[#E3E9E8] border-[#006A68] shadow-sm' 
                                        : 'bg-white border-[#BEC9C7] hover:border-[#006A68]'
                                    }`}
                                >
                                    <div className={`w-10 h-10 rounded-full border flex items-center justify-center shrink-0 font-bold text-xs ${selectedGroup?.id_grupo === grupo.id_grupo ? 'border-[#006A68] bg-[#006A68] text-white' : 'border-[#BEC9C7] bg-white text-[#006A68]'}`}>
                                        G{grupo.id_grupo}
                                    </div>
                                    <div className="flex flex-col flex-1 min-w-0">
                                        <span className={`font-bold text-sm truncate ${selectedGroup?.id_grupo === grupo.id_grupo ? 'text-[#006A68]' : 'text-black'}`}>{grupo.nome}</span>
                                        <span className="text-[10px] text-[#4A6362]">{(grupo.aluno_grupo?.length || 0) + (grupo.docente_grupo?.length || 0)} Membros</span>
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
                    <div className="bg-[#F4FBF9] w-full max-w-2xl max-h-[85vh] rounded-3xl shadow-2xl flex flex-col overflow-hidden">
                        
                        <div className="bg-white border-b border-[#006A68]/20 p-5 shrink-0 flex justify-between items-center">
                            <div className="flex items-center gap-3">
                                <div className="w-12 h-12 rounded-full border-2 border-[#006A68] bg-[#CCE8E6] flex items-center justify-center text-[#006A68] font-bold text-lg">
                                    G{selectedGroup.id_grupo}
                                </div>
                                <div>
                                    <h2 className="text-xl font-bold text-[#324B4A]">{selectedGroup.nome}</h2>
                                    <p className="text-sm text-[#4A6362]">{(selectedGroup.aluno_grupo?.length || 0) + (selectedGroup.docente_grupo?.length || 0)} Membros no grupo</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-3">
                                {isAdmin && (
                                    <>
                                        <button onClick={() => { setEditGroupData(selectedGroup); setShowCreateGroup(true); }} className="px-3 py-1.5 text-sm bg-white border border-[#BEC9C7] rounded-lg font-bold text-[#006A68] hover:bg-[#EFF5F4] transition">Editar Grupo</button>
                                        <button onClick={() => handleDeleteGroup(selectedGroup.id_grupo)} className="p-2 text-red-500 bg-white border border-red-200 rounded-lg hover:bg-red-50 transition"><Trash2 size={16}/></button>
                                    </>
                                )}
                                <button onClick={() => setSelectedGroup(null)} className="w-10 h-10 bg-[#E3E9E8] rounded-full flex items-center justify-center text-[#4A6362] hover:bg-black hover:text-white transition">
                                    <ArrowLeft size={20} />
                                </button>
                            </div>
                        </div>

                        <div className="flex-1 overflow-y-auto p-6 scroll-smooth">
                            {isAdmin && (
                            <div className="bg-white rounded-2xl border border-brand-dark/20 p-5 shadow-sm mb-6">
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
                                    className="w-full bg-transparent text-sm resize-none focus:outline-none placeholder:text-[#4A6362]/60 min-h-[60px]"
                                />
                                <div className="flex justify-end mt-2">
                                    <button 
                                        onClick={() => handlePostAnnouncement(true)}
                                        disabled={posting || (!modalNewMsg && !modalMsgTitle)}
                                        className="flex items-center gap-2 bg-[#006A68] text-white px-4 py-2 rounded-xl text-sm font-bold hover:bg-[#00504E] transition-colors disabled:opacity-50"
                                    >
                                        {posting ? <Loader2 size={16} className="animate-spin"/> : <Send size={16} />}
                                        Publicar
                                    </button>
                                </div>
                            </div>
                            )}

                            <div className="flex flex-col gap-4">
                                {groupAnnouncements.length === 0 ? (
                                    <p className="text-center text-[#4A6362] italic py-8">Nenhum aviso restrito circulou neste grupo.</p>
                                ) : (
                                    groupAnnouncements.map((anuncio, idx) => {
                                        const isEditing = editingAnuncio?.id_anuncio === anuncio.id_anuncio && editingAnuncio?.isGroupContext
                                        return (
                                        <div key={idx} className="bg-white p-5 rounded-2xl border border-brand-dark/20 flex flex-col gap-3 shadow-sm">
                                            <div className="flex justify-between items-start">
                                                <div className="flex items-center gap-2 mb-1">
                                                <div className="w-8 h-8 rounded-full bg-brand-dark text-white flex items-center justify-center font-bold text-xs">C</div>
                                                <div className="flex flex-col">
                                                    <span className="text-xs font-bold text-[#324B4A]">Coordenação</span>
                                                    <span className="text-[10px] text-gray-400">{formatDate(anuncio.data_envio)}</span>
                                                </div>
                                                </div>
                                                {isAdmin && !isEditing && (
                                                    <div className="flex items-center gap-2">
                                                        <button onClick={() => setEditingAnuncio({ ...anuncio, isGroupContext: true })} className="text-[#006A68] hover:text-[#00504E] p-1"><Edit2 size={14}/></button>
                                                        <button onClick={() => handleDeleteAnuncio(anuncio.id_anuncio, true)} className="text-red-500 hover:text-red-700 p-1"><Trash2 size={14}/></button>
                                                    </div>
                                                )}
                                            </div>
                                            <div>
                                                {isEditing ? (
                                                    <div className="flex flex-col gap-2 mt-2">
                                                        <input value={editingAnuncio.titulo || ''} onChange={e => setEditingAnuncio({...editingAnuncio, titulo: e.target.value})} className="border p-2 rounded text-sm w-full" placeholder="Título" />
                                                        <textarea value={editingAnuncio.mensagem || ''} onChange={e => setEditingAnuncio({...editingAnuncio, mensagem: e.target.value})} className="border p-2 rounded text-sm w-full min-h-[60px]" placeholder="Mensagem" />
                                                        <div className="flex justify-end gap-2 mt-1">
                                                            <button onClick={() => setEditingAnuncio(null)} className="text-xs text-gray-500 px-3 py-1 hover:bg-gray-100 rounded">Cancelar</button>
                                                            <button onClick={handleSaveEditAnuncio} className="text-xs bg-[#006A68] text-white px-3 py-1 rounded">Guardar</button>
                                                        </div>
                                                    </div>
                                                ) : (
                                                    <>
                                                        {anuncio.titulo && <span className="font-bold text-sm block mb-1 text-black">{anuncio.titulo}</span>}
                                                        <p className="text-[#4A6362] text-sm whitespace-pre-wrap">{anuncio.mensagem}</p>
                                                    </>
                                                )}
                                            </div>
                                        </div>
                                    )})
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
                        onSuccess={() => loadEventData()}
                    />
                </>
            )}

            {/* Modal Participantes */}
            {showParticipants && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={() => setShowParticipants(false)}>
                    <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" />
                    <div
                        className="relative bg-[#F4FBF9] rounded-2xl shadow-2xl w-full max-w-lg max-h-[80vh] flex flex-col overflow-hidden"
                        onClick={e => e.stopPropagation()}
                    >
                        {/* Header */}
                        <div className="flex items-center justify-between px-7 pt-7 pb-4 border-b border-[#006A68]/15">
                            <div className="flex items-center gap-3">
                                <div className="w-9 h-9 rounded-xl bg-[#CCE8E6] flex items-center justify-center shrink-0">
                                    <Users size={18} className="text-[#006A68]" />
                                </div>
                                <div>
                                    <h2 className="text-lg font-bold text-[#324B4A] font-['Sora']">Participantes</h2>
                                    <p className="text-xs text-[#4A6362]">{participants.alunos.length + participants.docentes.length} inscritos neste evento</p>
                                </div>
                            </div>
                            <button onClick={() => setShowParticipants(false)} className="w-8 h-8 rounded-full hover:bg-[#CCE8E6] flex items-center justify-center text-[#4A6362]">
                                <X size={16} />
                            </button>
                        </div>

                        {/* Body */}
                        <div className="flex-1 overflow-y-auto px-7 py-5 space-y-5">
                            {participants.alunos.length === 0 && participants.docentes.length === 0 ? (
                                <p className="text-sm text-center text-[#4A6362] italic py-8">Ainda não há participantes inscritos.</p>
                            ) : (
                                <>
                                    {participants.docentes.length > 0 && (
                                        <div>
                                            <p className="text-[10px] font-bold uppercase tracking-widest text-[#4A6362] mb-3">Docentes · {participants.docentes.length}</p>
                                            <div className="space-y-2">
                                                {participants.docentes.map((d, i) => (
                                                    <div key={i} className="flex items-center gap-3 px-3 py-2.5 bg-white rounded-xl border border-[#006A68]/15">
                                                        <div className="w-9 h-9 rounded-full bg-[#006A68] flex items-center justify-center text-white text-xs font-bold shrink-0">
                                                            {((d.nome?.[0] || '') + (d.apelido?.[0] || '')).toUpperCase() || '?'}
                                                        </div>
                                                        <div>
                                                            <p className="text-sm font-semibold text-[#161D1C]">{d.nome} {d.apelido}</p>
                                                            <p className="text-[10px] text-[#4A6362]">{d.codigo_username || d.email || ''}</p>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                    {participants.alunos.length > 0 && (
                                        <div>
                                            <p className="text-[10px] font-bold uppercase tracking-widest text-[#4A6362] mb-3">Alunos · {participants.alunos.length}</p>
                                            <div className="space-y-2">
                                                {participants.alunos.map((a, i) => (
                                                    <div key={i} className="flex items-center gap-3 px-3 py-2.5 bg-white rounded-xl border border-[#BEC9C7]">
                                                        <div className="w-9 h-9 rounded-full bg-[#CCE8E6] flex items-center justify-center text-[#006A68] text-xs font-bold shrink-0">
                                                            {((a.nome?.[0] || '') + (a.apelido?.[0] || '')).toUpperCase() || '?'}
                                                        </div>
                                                        <div>
                                                            <p className="text-sm font-semibold text-[#161D1C]">{a.nome} {a.apelido}</p>
                                                            <p className="text-[10px] text-[#4A6362]">{a.codigo_username || a.email || ''}</p>
                                                        </div>
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

        </div>
    )
}
