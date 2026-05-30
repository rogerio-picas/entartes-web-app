import { useState, useEffect, createContext, useContext } from 'react'
import { Outlet } from 'react-router-dom'
import DashboardHeader from './DashboardHeader'
import NotificationPanel from './NotificationPanel'
import { notificacaoService } from '../services/notificacaoService'

// ─── Notification Context (shared across all child pages) ─────────────────────
const NotificationContext = createContext({
    unreadCount: 0,
    openNotifications: () => { },
    refreshUnread: () => { },
})

export function useNotifications() {
    return useContext(NotificationContext)
}

// ─── Layout ───────────────────────────────────────────────────────────────────
export default function DashboardLayout() {
    const [notifOpen, setNotifOpen] = useState(false)
    const [unreadCount, setUnreadCount] = useState(0)

    // Fetch unread count on mount and periodically
    useEffect(() => {
        async function fetchUnread() {
            try {
                const data = await notificacaoService.getAll()
                setUnreadCount(data.filter(n => !n.lida).length)
            } catch {
                // silently fail — user might not be logged in yet
            }
        }
        fetchUnread()
        const interval = setInterval(fetchUnread, 60_000) // refresh every 60s
        return () => clearInterval(interval)
    }, [])

    const ctx = {
        unreadCount,
        openNotifications: () => setNotifOpen(true),
        refreshUnread: async () => {
            try {
                const data = await notificacaoService.getAll()
                setUnreadCount(data.filter(n => !n.lida).length)
            } catch { /* ignore */ }
        }
    }

    return (
        <NotificationContext.Provider value={ctx}>
            <div className="min-h-screen flex flex-col bg-neutral-50">
                <DashboardHeader
                    unreadCount={unreadCount}
                    onBellClick={() => setNotifOpen(true)}
                />

                <main className="flex-1 p-6 md:p-8 lg:p-10">
                    <div className="max-w-[1400px] mx-auto">
                        <Outlet />
                    </div>
                </main>
            </div>

            <NotificationPanel
                isOpen={notifOpen}
                onClose={() => setNotifOpen(false)}
                onUnreadChange={setUnreadCount}
            />
        </NotificationContext.Provider>
    )
}