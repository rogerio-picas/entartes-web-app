import { useState, useEffect, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { api } from '../services/api'
import { ArrowLeft, Loader2, AlertCircle, Plus, Megaphone, Send, Users, User, Clock, Trash2, Calendar, MapPin } from 'lucide-react'
import CriarGrupoPanel from '../components/CriarGrupoPanel'
import { authService } from '../services/authService'

function formatDate(dateStr) {
    if (!dateStr) return 'Data por definir'
    return new Date(dateStr).toLocaleDateString('pt-PT', { day: '2-digit', month: 'long', year: 'numeric' })
}

export default function EventDetailsView() {
    const { id } = useParams()
    const navigate = useNavigate()
    const user = authService.getUser()
    const isAdmin = user?.tipo_utilizador?.id_tipo === 1 || user?.tipo_utilizador?.id_tipo === 2 // Assume 1/2 are admins/coordenadores

    const [event, setEvent] = useState(null)
    const [groups, setGroups] = useState([])
    const [selectedGroup, setSelectedGroup] = useState(null)
    const [announcements, setAnnouncements] = useState([])

    const [loading, setLoading] = useState(true)
    const [error, setError] = useState('')
    
    // UI states
    const [showCreateGroup, setShowCreateGroup] = useState(false)
    const [newMsg, setNewMsg] = useState('')
    const [msgTitle, setMsgTitle] = useState('')
    const [posting, setPosting] = useState(false)

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

            if (grpData.status === 'fulfilled' && Array.isArray(grpData.value)) {
                setGroups(grpData.value)
            }
        } catch (e) {
            setError(e.message || 'Erro inesperado ao contactar base de dados.')
        } finally {
            setLoading(false)
        }
    }, [id])

    // Load Announcements based on Context (Event vs Selected Group)
    const loadAnnouncements = useCallback(async () => {
        try {
            const url = selectedGroup 
                ? `/evento/grupos/${selectedGroup.id_grupo}/anuncios`
                : `/evento/${id}/anuncios`
            
            const data = await api.get(url)
            setAnnouncements(Array.isArray(data) ? data : [])
        } catch (e) {
            console.warn("Anúncios não suportados ainda pelo backend ou sem dados.", e)
            setAnnouncements([])
        }
    }, [id, selectedGroup])

    useEffect(() => {
        loadEventData()
    }, [loadEventData])

    useEffect(() => {
        loadAnnouncements()
    }, [loadAnnouncements])

    const handlePostAnnouncement = async () => {
        if (!newMsg.trim() && !msgTitle.trim()) return
        setPosting(true)
        try {
            const url = selectedGroup 
                ? `/evento/grupos/${selectedGroup.id_grupo}/anuncios`
                : `/evento/${id}/anuncios`
                
            await api.post(url, {
                titulo: msgTitle || 'Aviso Novo',
                mensagem: newMsg
            })
            // Limpar formulário e recarregar
            setMsgTitle('')
            setNewMsg('')
            loadAnnouncements()
        } catch (e) {
            alert('Não foi possível publicar.\n' + (e.message || ''))
        } finally {
            setPosting(false)
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
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-[#CCE8E6] text-[#006A68] rounded-full text-xs font-bold mb-3 uppercase tracking-wider">
                           ID Evento #{event?.id_evento}
                        </span>
                        <h1 className="text-3xl font-bold text-[#324B4A] leading-tight mb-2">{event?.nome || 'Evento sem nome'}</h1>
                        <p className="text-[#4A6362] flex items-center gap-2 text-sm font-medium">
                            <Calendar size={15}/> {formatDate(event?.data_de_realizacao)}
                        </p>
                        <p className="text-[#4A6362] flex items-center gap-2 text-sm font-medium mt-1.5">
                            <MapPin size={15}/> {event?.local || 'Local a definir'}
                        </p>
                    </div>
                </div>
            </div>

            {/* Layout Divisório 70/30 */}
            <div className="flex-1 flex flex-col lg:flex-row max-w-7xl w-full mx-auto px-4 lg:px-8 gap-8 pb-10">
                
                {/* 70% Mural Principal de Anúncios */}
                <div className="flex-1 flex flex-col gap-6">
                    <div className="bg-white rounded-2xl border border-brand-dark/20 p-6 flex items-center justify-between shadow-sm">
                        <div className="flex items-center gap-3">
                            <Megaphone size={28} className={selectedGroup ? "text-[#FF9500]" : "text-brand-dark"} />
                            <div>
                                <h2 className="text-xl font-bold text-[#324B4A]">
                                    Mural de Anúncios
                                </h2>
                                <p className="text-sm font-medium text-[#4A6362]">
                                    {selectedGroup 
                                        ? `Aviso Restrito ao Grupo: ${selectedGroup.nome}` 
                                        : 'Aviso Público Geral'}
                                </p>
                            </div>
                        </div>
                        {selectedGroup && (
                            <button onClick={() => setSelectedGroup(null)} className="text-xs font-bold text-white bg-brand-dark px-3 py-1.5 rounded-lg hover:bg-opacity-80 transition">
                                Voltar a Geral
                            </button>
                        )}
                    </div>

                    {/* Caixa de Criação de Anúncios */}
                    <div className="bg-white rounded-2xl border border-brand-dark/20 p-5 shadow-sm">
                        <input 
                            type="text"
                            placeholder="Título curto (Opcional)"
                            value={msgTitle}
                            onChange={(e) => setMsgTitle(e.target.value)}
                            className="w-full bg-transparent border-b border-gray-200 pb-2 mb-3 text-sm font-semibold text-black placeholder:text-gray-400 focus:outline-none"
                        />
                        <textarea 
                            placeholder={selectedGroup ? `Escrever aviso para o grupo ${selectedGroup.nome}...` : "O que precisas de anunciar a todos os alunos deste evento?"}
                            value={newMsg}
                            onChange={(e) => setNewMsg(e.target.value)}
                            className="w-full bg-transparent text-sm resize-none focus:outline-none placeholder:text-[#4A6362]/60 min-h-[60px]"
                        />
                        <div className="flex justify-end mt-2">
                            <button 
                                onClick={handlePostAnnouncement}
                                disabled={posting || (!newMsg && !msgTitle)}
                                className="flex items-center gap-2 bg-brand-dark text-white px-4 py-2 rounded-xl text-sm font-bold hover:bg-[#00504E] transition-colors disabled:opacity-50"
                            >
                                {posting ? <Loader2 size={16} className="animate-spin"/> : <Send size={16} />}
                                Publicar
                            </button>
                        </div>
                    </div>

                    {/* Feed de Anúncios */}
                    <div className="flex flex-col gap-4">
                        {announcements.length === 0 ? (
                            <div className="text-center py-10">
                                <p className="text-[#4A6362] italic text-sm">Ainda não existem anúncios publicados neste contexto.</p>
                            </div>
                        ) : (
                            announcements.map((anuncio, idx) => (
                                <div key={idx} className="bg-white p-5 rounded-2xl shadow-sm border border-transparent hover:border-brand-dark/20 transition-all flex flex-col gap-3">
                                    <div className="flex justify-between items-start">
                                        <div className="flex items-center gap-2">
                                           <div className="w-8 h-8 rounded-full bg-[#CCE8E6] text-brand-dark flex items-center justify-center font-bold text-xs">A</div>
                                           <div className="flex flex-col">
                                               <span className="text-xs font-bold text-[#324B4A]">Admin / Coordenadora</span>
                                               <span className="text-[10px] text-gray-400">{formatDate(anuncio.data_envio)}</span>
                                           </div>
                                        </div>
                                    </div>
                                    <div>
                                        {anuncio.titulo && <span className="font-bold text-sm block mb-1 text-black">{anuncio.titulo}</span>}
                                        <p className="text-[#4A6362] text-sm whitespace-pre-wrap">{anuncio.mensagem}</p>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>

                {/* 30% Sidebar Lateral de Grupos */}
                <div className="w-full lg:w-[320px] flex flex-col gap-4 shrink-0">
                    <div className="flex items-center justify-between pb-2 border-b border-brand-dark/20">
                        <h3 className="font-bold text-[#324B4A] text-lg flex items-center gap-2"><Users size={18}/> Grupos</h3>
                        <button 
                            onClick={() => setShowCreateGroup(true)}
                            className="w-8 h-8 rounded-full bg-brand-dark flex items-center justify-center text-white hover:bg-[#00504E] transition-colors shadow-sm"
                            title="Criar novo grupo"
                        >
                            <Plus size={16} />
                        </button>
                    </div>
                    
                    <div className="flex flex-col gap-3">
                        <button 
                            onClick={() => setSelectedGroup(null)}
                            className={`w-full flex items-center gap-3 p-3 rounded-xl border text-left transition-all ${
                                !selectedGroup 
                                ? 'bg-[#CCE8E6] border-brand-dark shadow-sm' 
                                : 'bg-white border-[#BEC9C7] hover:border-brand-dark'
                            }`}
                        >
                            <div className="w-10 h-10 rounded-full bg-brand-dark flex items-center justify-center text-white shrink-0"><Megaphone size={16}/></div>
                            <div className="flex flex-col">
                                <span className={`font-bold text-sm ${!selectedGroup ? 'text-brand-darkest' : 'text-black'}`}>Geral (Todos)</span>
                                <span className="text-[10px] text-[#4A6362] uppercase tracking-wider">{unassignedAlunosCount} alunos soltos inscritos</span>
                            </div>
                        </button>

                        {groups.length === 0 ? (
                            <p className="text-xs text-center p-4 text-[#4A6362] italic">Nenhum grupo configurado.</p>
                        ) : (
                            groups.map((grupo) => (
                                <button 
                                    key={grupo.id_grupo}
                                    onClick={() => setSelectedGroup(grupo)}
                                    className={`w-full flex items-center gap-3 p-3 rounded-xl border text-left transition-all ${
                                        selectedGroup?.id_grupo === grupo.id_grupo 
                                        ? 'bg-[#E3E9E8] border-[#FF9500] shadow-sm' 
                                        : 'bg-white border-[#BEC9C7] hover:border-[#FF9500]'
                                    }`}
                                >
                                    <div className="w-10 h-10 rounded-full bg-white border border-[#BEC9C7] flex items-center justify-center text-[#FF9500] shrink-0 font-bold text-xs">
                                        G{grupo.id_grupo}
                                    </div>
                                    <div className="flex flex-col flex-1 min-w-0">
                                        <span className={`font-bold text-sm truncate ${selectedGroup?.id_grupo === grupo.id_grupo ? 'text-[#FF9500]' : 'text-black'}`}>{grupo.nome}</span>
                                        <span className="text-[10px] text-[#4A6362]">{(grupo.aluno_grupo?.length || 0)} Membros</span>
                                    </div>
                                </button>
                            ))
                        )}
                    </div>
                </div>

            </div>

            {/* Modal Deslizante para Criação */}
            {showCreateGroup && (
                <>
                    <div className="fixed inset-0 z-50 bg-black/20 backdrop-blur-[2px]" onClick={() => setShowCreateGroup(false)} />
                    <CriarGrupoPanel 
                        eventId={id} 
                        onClose={() => setShowCreateGroup(false)}
                        onSuccess={() => {
                            setShowCreateGroup(false)
                            loadEventData() // Reload groups list!
                        }}
                    />
                </>
            )}

        </div>
    )
}
