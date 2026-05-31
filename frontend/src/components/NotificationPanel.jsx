import { useState, useEffect, useRef } from 'react'
import { X, Bell, CheckCheck, RefreshCw, Inbox, AlertCircle } from 'lucide-react'
import { notificacaoService } from '../services/notificacaoService'

export default function NotificationPanel({ isOpen, onClose, onUnreadChange }) {
    const [notificacoes, setNotificacoes] = useState([])
    const [loading, setLoading] = useState(false)
    const [marking, setMarking] = useState(null)
    const panelRef = useRef(null)

    // Fetch when opened
    useEffect(() => {
        if (!isOpen) return
        setLoading(true)
        notificacaoService.getAll()
            .then(data => {
                setNotificacoes(data)
                const unread = data.filter(n => !n.lida).length
                onUnreadChange?.(unread)
            })
            .finally(() => setLoading(false))
    }, [isOpen])

    // Close on outside click
    useEffect(() => {
        if (!isOpen) return
        function handleClick(e) {
            if (panelRef.current && !panelRef.current.contains(e.target)) {
                onClose()
            }
        }
        document.addEventListener('mousedown', handleClick)
        return () => document.removeEventListener('mousedown', handleClick)
    }, [isOpen, onClose])

    // Close on Escape
    useEffect(() => {
        function handleKey(e) { if (e.key === 'Escape') onClose() }
        document.addEventListener('keydown', handleKey)
        return () => document.removeEventListener('keydown', handleKey)
    }, [onClose])

    async function handleMarkRead(id) {
        setMarking(id)
        try {
            await notificacaoService.markAsRead(id)
            setNotificacoes(prev => prev.map(n => n.id === id ? { ...n, lida: true } : n))
            const unread = notificacoes.filter(n => !n.lida && n.id !== id).length
            onUnreadChange?.(unread)
        } catch (e) {
            console.error(e)
        } finally {
            setMarking(null)
        }
    }

    async function handleDelete(id) {
        setMarking(id)
        try {
            await notificacaoService.delete(id)
            const remaining = notificacoes.filter(n => n.id !== id)
            setNotificacoes(remaining)
            const unread = remaining.filter(n => !n.lida).length
            onUnreadChange?.(unread)
        } catch (e) {
            console.error(e)
        } finally {
            setMarking(null)
        }
    }

    async function handleMarkAllRead() {
        const unread = notificacoes.filter(n => !n.lida)
        for (const n of unread) {
            try { await notificacaoService.markAsRead(n.id) } catch { /* skip */ }
        }
        setNotificacoes(prev => prev.map(n => ({ ...n, lida: true })))
        onUnreadChange?.(0)
    }

    const unreadCount = notificacoes.filter(n => !n.lida).length

    return (
        <>
            {/* Backdrop */}
            <div
                className={`fixed inset-0 z-40 bg-black/20 backdrop-blur-[2px] transition-opacity duration-300 ${isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
                aria-hidden="true"
            />

            {/* Panel */}
            <aside
                ref={panelRef}
                className={`fixed top-0 right-0 h-full z-50 w-[380px] max-w-[95vw] bg-white shadow-2xl flex flex-col
                    transform transition-transform duration-300 ease-out
                    ${isOpen ? 'translate-x-0' : 'translate-x-full'}`}
                aria-label="Painel de notificações"
            >
                {/* Header */}
                <div className="bg-neutral-50 border-b-[3px] border-brand-800 px-5 py-4 flex items-center justify-between shrink-0">
                    <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-brand-800 flex items-center justify-center">
                            <Bell size={17} className="text-brand-500" />
                        </div>
                        <div>
                            <h2 className="font-bold text-brand-800 text-base font-['Sora'] leading-tight">Notificações</h2>
                            {unreadCount > 0 && (
                                <p className="text-[11px] text-neutral-600 font-medium">
                                    {unreadCount} por ler
                                </p>
                            )}
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        {unreadCount > 0 && (
                            <button
                                onClick={handleMarkAllRead}
                                className="flex items-center gap-1.5 text-[11px] font-semibold text-brand-800 bg-brand-200 px-2.5 py-1.5 rounded-lg hover:bg-brand-500 transition-colors"
                                title="Marcar todas como lidas"
                            >
                                <CheckCheck size={13} />
                                Marcar todas
                            </button>
                        )}
                        <button
                            onClick={onClose}
                            className="w-8 h-8 rounded-full hover:bg-brand-200 flex items-center justify-center text-neutral-600 transition-colors"
                            aria-label="Fechar"
                        >
                            <X size={17} />
                        </button>
                    </div>
                </div>

                {/* Body */}
                <div className="flex-1 overflow-y-auto">
                    {loading ? (
                        <div className="flex items-center justify-center py-16 text-brand-800">
                            <RefreshCw size={24} className="animate-spin" />
                        </div>
                    ) : notificacoes.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-20 px-6 text-center">
                            <div className="w-16 h-16 rounded-full bg-brand-200 flex items-center justify-center mb-4">
                                <Inbox size={28} className="text-brand-800" />
                            </div>
                            <p className="font-semibold text-neutral-800 text-sm">Sem notificações</p>
                            <p className="text-xs text-neutral-600 mt-1 opacity-70">Estás em dia com tudo!</p>
                        </div>
                    ) : (
                        <ul className="divide-y divide-neutral-600/10">
                            {notificacoes.map(n => (
                                <li
                                    key={n.id}
                                    className={`px-5 py-4 flex gap-3 transition-colors ${!n.lida ? 'bg-brand-50' : 'bg-white hover:bg-gray-50'}`}
                                >
                                    {/* Dot indicator */}
                                    <div className="mt-1.5 shrink-0">
                                        <div className={`w-2 h-2 rounded-full ${!n.lida ? 'bg-brand-800' : 'bg-transparent border border-gray-300'}`} />
                                    </div>

                                    <div className="flex-1 min-w-0">
                                        <p className={`text-sm leading-snug mb-0.5 font-['Sora'] ${!n.lida ? 'font-semibold text-neutral-800' : 'font-medium text-gray-600'}`}>
                                            {n.titulo}
                                        </p>
                                        {n.mensagem && (
                                            <p className="text-xs text-neutral-600 leading-relaxed line-clamp-2 mb-1.5">
                                                {n.mensagem}
                                            </p>
                                        )}
                                        <p className="text-[10px] text-gray-400 font-medium">{n.data}</p>
                                    </div>

                                    <div className="flex flex-col gap-1.5 shrink-0 justify-center">
                                        {!n.lida && (
                                            <button
                                                onClick={() => handleMarkRead(n.id)}
                                                disabled={marking === n.id}
                                                className="w-7 h-7 rounded-lg bg-brand-200 flex items-center justify-center hover:bg-brand-800 hover:text-white text-brand-800 transition-colors"
                                                title="Marcar como lida"
                                            >
                                                {marking === n.id
                                                    ? <RefreshCw size={12} className="animate-spin" />
                                                    : <CheckCheck size={12} />
                                                }
                                            </button>
                                        )}
                                        <button
                                            onClick={() => handleDelete(n.id)}
                                            disabled={marking === n.id}
                                            className="w-7 h-7 rounded-full flex items-center justify-center text-neutral-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                                            title="Descartar notificação"
                                        >
                                            {marking === n.id
                                                ? <RefreshCw size={12} className="animate-spin" />
                                                : <X size={14} />
                                            }
                                        </button>
                                    </div>
                                </li>
                            ))}
                        </ul>
                    )}
                </div>

                {/* Footer */}
                <div className="px-5 py-3 border-t border-neutral-600/10 shrink-0">
                    <p className="text-[10px] text-center text-gray-400">
                        {notificacoes.length} notificação{notificacoes.length !== 1 ? 'ões' : ''} no total
                    </p>
                </div>
            </aside>
        </>
    )
}

