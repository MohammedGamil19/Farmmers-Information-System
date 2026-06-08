'use client'
import { useEffect, useState } from 'react'
import { api } from '@/lib/api'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { toast } from '@/components/ui/toaster'
import { Bell, CheckCheck, FlaskConical, Leaf, AlertTriangle, Info } from 'lucide-react'
import { formatDateTime } from '@/lib/utils'

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<Record<string, unknown>[]>([])
  const [loading, setLoading] = useState(true)

  const load = () => {
    setLoading(true)
    api.get('/api/notifications').then(d => setNotifications(d.notifications)).finally(() => setLoading(false))
  }
  useEffect(() => { load() }, [])

  const markAllRead = async () => {
    await api.patch('/api/notifications')
    toast('success', 'Semua notifikasi ditandai dibaca')
    load()
  }

  const icons: Record<string, React.ReactNode> = {
    ABNORMAL_PH: <FlaskConical size={18} className="text-red-500" />,
    ABNORMAL_TDS: <FlaskConical size={18} className="text-orange-500" />,
    UPCOMING_HARVEST: <Leaf size={18} className="text-green-500" />,
    MISSING_RECORD: <AlertTriangle size={18} className="text-yellow-500" />,
    SYSTEM: <Info size={18} className="text-blue-500" />,
  }

  const unread = notifications.filter(n => !n.isRead)

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Notifikasi</h1>
          <p className="text-gray-500">{unread.length} notifikasi belum dibaca</p>
        </div>
        {unread.length > 0 && <Button variant="outline" onClick={markAllRead}><CheckCheck size={16} />Tandai Semua Dibaca</Button>}
      </div>

      <Card>
        <CardContent className="p-0">
          {loading ? <div className="flex justify-center py-10"><div className="h-8 w-8 animate-spin rounded-full border-4 border-green-600 border-t-transparent" /></div> :
            notifications.length === 0 ? (
              <div className="text-center py-16 text-gray-400">
                <Bell size={48} className="mx-auto mb-3 opacity-30" />
                <p>Tidak ada notifikasi</p>
              </div>
            ) : (
              <div className="divide-y">
                {notifications.map(n => (
                  <div key={n.id as string} className={`flex gap-4 p-4 ${!n.isRead ? 'bg-orange-50' : ''}`}>
                    <div className="flex-shrink-0 mt-1">{icons[n.type as string] || <Bell size={18} />}</div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <p className="font-semibold text-gray-800 text-sm">{n.title as string}</p>
                        {!n.isRead && <Badge variant="warning" className="text-xs">Baru</Badge>}
                      </div>
                      <p className="text-gray-600 text-sm">{n.message as string}</p>
                      <p className="text-gray-400 text-xs mt-1">{formatDateTime(n.createdAt as string)}</p>
                    </div>
                  </div>
                ))}
              </div>
            )
          }
        </CardContent>
      </Card>
    </div>
  )
}