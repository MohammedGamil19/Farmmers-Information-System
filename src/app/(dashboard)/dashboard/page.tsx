'use client'
import { useEffect, useState } from 'react'
import { useAuth } from '@/lib/auth-context'
import { api } from '@/lib/api'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Users, Leaf, CheckCircle, Activity, Megaphone, CalendarDays, Layers, Wheat, Scale, Sprout, Bell, AlertTriangle } from 'lucide-react'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { formatDate } from '@/lib/utils'
import Link from 'next/link'

type Announcement = { id: string; title: string; content: string; type: string; publishedAt?: string; author: { name: string }; village: { name: string } }
type CalEvent = { id: string; title: string; startDate: string; category: string; location?: string; village: { name: string } }
type RecentPanen = { id: string; tanggalPanen: string; komoditas: string; jumlahKg: number; farm: { name: string }; petani: { name: string } }
type HarvestPoint = { date: string; kg: number }

export default function DashboardPage() {
  const { user } = useAuth()
  const [stats, setStats] = useState<Record<string, number | string | null>>({})
  const [notifications, setNotifications] = useState<Record<string, unknown>[]>([])
  const [farms, setFarms] = useState<Record<string, unknown>[]>([])
  const [announcements, setAnnouncements] = useState<Announcement[]>([])
  const [upcomingEvents, setUpcomingEvents] = useState<CalEvent[]>([])
  const [recentPanens, setRecentPanens] = useState<RecentPanen[]>([])
  const [harvestSeries, setHarvestSeries] = useState<HarvestPoint[]>([])
  const [gapoktanName, setGapoktanName] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.get('/api/dashboard').then((data) => {
      setStats(data.stats)
      setNotifications(data.notifications)
      setFarms(data.farms)
      setAnnouncements(data.announcements || [])
      setUpcomingEvents(data.upcomingEvents || [])
      setRecentPanens(data.recentPanens || [])
      setHarvestSeries(data.harvestSeries || [])
      setGapoktanName(data.gapoktanName || null)
    }).finally(() => setLoading(false))
    api.post('/api/farms/check-stages', {}).catch(() => {/* silent */})
  }, [])

  const chartData = harvestSeries.map(p => ({
    day: new Date(p.date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' }),
    kg: p.kg,
  }))

  const unreadCount = notifications.filter((n: Record<string, unknown>) => !n.isRead).length
  const isFarmer = user?.role === 'FARMER'

  const statCards = [
    !isFarmer && { label: 'Total Petani', value: stats.totalFarmers ?? '-', icon: Users, color: 'text-blue-600', bg: 'bg-blue-50' },
    !isFarmer && stats.totalMembers != null && { label: 'Anggota GAPOKTAN', value: stats.totalMembers, icon: Users, color: 'text-indigo-600', bg: 'bg-indigo-50' },
    { label: 'Total Produksi', value: stats.totalProduksiKg != null ? `${stats.totalProduksiKg} kg` : '-', icon: Scale, color: 'text-green-700', bg: 'bg-green-50' },
    { label: 'Total Catatan Panen', value: stats.totalPanen ?? '-', icon: Wheat, color: 'text-emerald-600', bg: 'bg-emerald-50' },
    stats.komoditasTerbanyak ? { label: 'Tanaman Terbanyak', value: stats.komoditasTerbanyak as string, icon: Sprout, color: 'text-purple-600', bg: 'bg-purple-50' } : null,
    { label: isFarmer ? 'Kebun Saya' : 'Total Kebun', value: stats.totalFarms ?? '-', icon: Leaf, color: 'text-teal-600', bg: 'bg-teal-50' },
    { label: 'Siap Panen', value: stats.readyForHarvest ?? '-', icon: CheckCircle, color: 'text-amber-600', bg: 'bg-amber-50' },
    !isFarmer && stats.totalLahan != null && { label: 'Total Lahan', value: `${stats.totalLahan} ha`, icon: Layers, color: 'text-orange-600', bg: 'bg-orange-50' },
  ].filter(Boolean) as { label: string; value: string | number; icon: React.ElementType; color: string; bg: string }[]

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="h-10 w-10 animate-spin rounded-full border-4 border-green-600 border-t-transparent" />
    </div>
  )

  return (
    <div>
      <div className="mb-6">
        {gapoktanName && (
          <div className="mb-3 inline-flex items-center gap-2 bg-green-50 text-green-700 px-3 py-1.5 rounded-full text-sm font-medium">
            <Leaf size={14} />
            GAPOKTAN {gapoktanName}
          </div>
        )}
        <h1 className="text-xl sm:text-2xl font-bold text-gray-800">
          Selamat Datang, {user?.name}!
        </h1>
        <p className="text-gray-500 text-sm">
          {isFarmer
            ? 'Dokumentasi hasil panen kebun Anda'
            : 'Ringkasan dokumentasi produksi hasil panen'}
        </p>
      </div>

      {/* Stats Cards */}
      <div className={`grid grid-cols-2 gap-4 mb-6 ${statCards.length <= 4 ? 'lg:grid-cols-4' : 'lg:grid-cols-3 xl:grid-cols-4'}`}>
        {statCards.map((s, i) => (
          <Card key={i}>
            <CardContent className="p-4">
              <div className={`w-10 h-10 ${s.bg} rounded-xl flex items-center justify-center mb-3`}>
                <s.icon className={s.color} size={20} />
              </div>
              <p className="text-2xl font-bold text-gray-800 truncate">{s.value}</p>
              <p className="text-xs text-gray-500 mt-1">{s.label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Harvest chart */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>
              Produksi Panen (30 Hari Terakhir)
              {isFarmer && <span className="text-sm font-normal text-gray-400 ml-2">— kebun Anda</span>}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {chartData.length > 0 ? (
              <ResponsiveContainer width="100%" height={250}>
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="day" tick={{ fontSize: 10 }} />
                  <YAxis tick={{ fontSize: 10 }} />
                  <Tooltip formatter={(v) => [`${v} kg`, 'Produksi']} />
                  <Line type="monotone" dataKey="kg" stroke="#16a34a" strokeWidth={2} dot={{ r: 3 }} />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[250px] flex items-center justify-center text-gray-400">
                Belum ada data panen
              </div>
            )}
          </CardContent>
        </Card>

        {/* Notifications */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2"><Bell size={16} /> Notifikasi</CardTitle>
              {unreadCount > 0 && <Badge variant="danger">{unreadCount} baru</Badge>}
            </div>
          </CardHeader>
          <CardContent>
            {notifications.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-4">Tidak ada notifikasi</p>
            ) : (
              <div className="space-y-3">
                {notifications.slice(0, 5).map((n: Record<string, unknown>) => (
                  <div key={n.id as string} className={`flex gap-3 p-3 rounded-lg ${n.isRead ? 'bg-gray-50' : 'bg-amber-50 border border-amber-100'}`}>
                    <AlertTriangle size={16} className="text-amber-500 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm font-medium text-gray-800">{n.title as string}</p>
                      <p className="text-xs text-gray-500 mt-0.5">{n.message as string}</p>
                    </div>
                  </div>
                ))}
                <Link href="/notifications" className="block text-center text-sm text-green-600 hover:underline mt-2">
                  Lihat semua
                </Link>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* GAPOKTAN: Announcements & Events */}
      {(announcements.length > 0 || upcomingEvents.length > 0) && (
        <div className="grid lg:grid-cols-2 gap-6 mt-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2"><Megaphone size={16} /> Pengumuman</CardTitle>
                <Link href="/pengumuman" className="text-sm text-green-600 hover:underline">Lihat semua</Link>
              </div>
            </CardHeader>
            <CardContent>
              {announcements.length === 0 ? (
                <p className="text-sm text-gray-400 text-center py-4">Tidak ada pengumuman</p>
              ) : (
                <div className="space-y-3">
                  {announcements.map(a => (
                    <div key={a.id} className="p-3 rounded-lg bg-green-50 border border-green-100">
                      <p className="text-sm font-medium text-gray-800">{a.title}</p>
                      <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{a.content}</p>
                      <p className="text-xs text-gray-400 mt-1">{a.village?.name} · {a.publishedAt ? new Date(a.publishedAt).toLocaleDateString('id-ID') : ''}</p>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2"><CalendarDays size={16} /> Kegiatan Mendatang</CardTitle>
                <Link href="/kalender" className="text-sm text-green-600 hover:underline">Lihat semua</Link>
              </div>
            </CardHeader>
            <CardContent>
              {upcomingEvents.length === 0 ? (
                <p className="text-sm text-gray-400 text-center py-4">Tidak ada kegiatan mendatang</p>
              ) : (
                <div className="space-y-3">
                  {upcomingEvents.map(ev => (
                    <div key={ev.id} className="flex gap-3 p-3 rounded-lg bg-blue-50 border border-blue-100">
                      <div className="text-center min-w-[40px]">
                        <p className="text-lg font-bold text-blue-700 leading-none">{new Date(ev.startDate).getDate()}</p>
                        <p className="text-xs text-blue-500">{new Date(ev.startDate).toLocaleDateString('id-ID', { month: 'short' })}</p>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-800">{ev.title}</p>
                        <p className="text-xs text-gray-500">{ev.village?.name}{ev.location && ` · ${ev.location}`}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* Recent Harvests */}
      <Card className="mt-6">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2"><Wheat size={16} /> Panen Terbaru</CardTitle>
            <Link href="/panen" className="text-sm text-green-600 hover:underline">Lihat semua</Link>
          </div>
        </CardHeader>
        <CardContent>
          {recentPanens.length === 0 ? (
            <p className="text-gray-400 text-center py-4">Belum ada data panen</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-gray-500">
                    <th className="pb-3 font-medium">Tanggal</th>
                    <th className="pb-3 font-medium">Kebun</th>
                    <th className="pb-3 font-medium">Komoditas</th>
                    {!isFarmer && <th className="pb-3 font-medium">Petani</th>}
                    <th className="pb-3 font-medium">Jumlah</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {recentPanens.map((p) => (
                    <tr key={p.id} className="hover:bg-gray-50">
                      <td className="py-3 text-gray-500">{formatDate(p.tanggalPanen)}</td>
                      <td className="py-3 font-medium text-gray-800">{p.farm.name}</td>
                      <td className="py-3 text-gray-600">{p.komoditas}</td>
                      {!isFarmer && <td className="py-3 text-gray-500">{p.petani.name}</td>}
                      <td className="py-3 font-semibold text-green-700">{p.jumlahKg} kg</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
