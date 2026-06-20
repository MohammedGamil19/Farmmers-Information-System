'use client'
import { useEffect, useState } from 'react'
import { useAuth } from '@/lib/auth-context'
import { api } from '@/lib/api'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Users, Leaf, FlaskConical, TrendingUp, Bell, AlertTriangle, CheckCircle, Activity, Megaphone, CalendarDays, Layers, Wheat, Scale } from 'lucide-react'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts'
import { formatDate } from '@/lib/utils'
import Link from 'next/link'

type Announcement = { id: string; title: string; content: string; type: string; publishedAt?: string; author: { name: string }; village: { name: string } }
type CalEvent = { id: string; title: string; startDate: string; category: string; location?: string; village: { name: string } }

export default function DashboardPage() {
  const { user } = useAuth()
  const [stats, setStats] = useState<Record<string, number | string | null>>({})
  const [records, setRecords] = useState<Record<string, unknown>[]>([])
  const [notifications, setNotifications] = useState<Record<string, unknown>[]>([])
  const [farms, setFarms] = useState<Record<string, unknown>[]>([])
  const [announcements, setAnnouncements] = useState<Announcement[]>([])
  const [upcomingEvents, setUpcomingEvents] = useState<CalEvent[]>([])
  const [gapoktanName, setGapoktanName] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.get('/api/dashboard').then((data) => {
      setStats(data.stats)
      setRecords(data.records)
      setNotifications(data.notifications)
      setFarms(data.farms)
      setAnnouncements(data.announcements || [])
      setUpcomingEvents(data.upcomingEvents || [])
      setGapoktanName(data.gapoktanName || null)
    }).finally(() => setLoading(false))
    api.post('/api/farms/check-stages', {}).catch(() => {/* silent */})
  }, [])

  const chartData = records.reduce((acc: Record<string, Record<string, unknown>>, r: Record<string, unknown>) => {
    const day = formatDate(r.date as string)
    if (!acc[day]) acc[day] = { day, phSum: 0, tdsSum: 0, count: 0 }
    acc[day].phSum = (acc[day].phSum as number) + (r.phValue as number)
    acc[day].tdsSum = (acc[day].tdsSum as number) + (r.tdsValue as number)
    acc[day].count = (acc[day].count as number) + 1
    return acc
  }, {})
  const chartArr = Object.values(chartData).map(d => ({
    day: d.day as string,
    pH: Math.round(((d.phSum as number) / (d.count as number)) * 100) / 100,
    TDS: Math.round((d.tdsSum as number) / (d.count as number)),
  }))

  const unreadCount = notifications.filter((n: Record<string, unknown>) => !n.isRead).length

  const isFarmer = user?.role === 'FARMER'

  const statCards = [
    !isFarmer && { label: 'Total Petani', value: stats.totalFarmers ?? '-', icon: Users, color: 'text-blue-600', bg: 'bg-blue-50' },
    !isFarmer && stats.totalMembers != null && { label: 'Anggota GAPOKTAN', value: stats.totalMembers, icon: Users, color: 'text-indigo-600', bg: 'bg-indigo-50' },
    !isFarmer && stats.totalLahan != null && { label: 'Total Lahan', value: `${stats.totalLahan} ha`, icon: Layers, color: 'text-amber-600', bg: 'bg-amber-50' },
    { label: isFarmer ? 'Kebun Saya' : 'Total Kebun', value: stats.totalFarms ?? '-', icon: Activity, color: 'text-emerald-600', bg: 'bg-emerald-50' },
    { label: 'Kebun Aktif', value: stats.activeFarms ?? '-', icon: Leaf, color: 'text-green-600', bg: 'bg-green-50' },
    { label: 'Siap Panen', value: stats.readyForHarvest ?? '-', icon: CheckCircle, color: 'text-teal-600', bg: 'bg-teal-50' },
    !isFarmer && stats.totalProduksiKg != null && { label: 'Total Produksi', value: `${stats.totalProduksiKg} kg`, icon: Scale, color: 'text-green-700', bg: 'bg-green-50' },
    !isFarmer && stats.komoditasTerbanyak && { label: 'Komoditas Terbanyak', value: stats.komoditasTerbanyak as string, icon: Wheat, color: 'text-yellow-600', bg: 'bg-yellow-50' },
    { label: 'Rata-rata pH', value: stats.avgPH != null ? Number(stats.avgPH).toFixed(1) : '-', icon: FlaskConical, color: 'text-purple-600', bg: 'bg-purple-50' },
    { label: 'Rata-rata TDS', value: stats.avgTDS != null ? `${stats.avgTDS} ppm` : '-', icon: TrendingUp, color: 'text-orange-600', bg: 'bg-orange-50' },
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
            ? 'Pantau kondisi kebun hidroponik Anda hari ini'
            : 'Ringkasan sistem monitoring hidroponik'}
        </p>
      </div>

      {/* Stats Cards */}
      <div className={`grid grid-cols-2 gap-4 mb-6 ${statCards.length <= 4 ? 'lg:grid-cols-4' : 'lg:grid-cols-3 xl:grid-cols-5'}`}>
        {statCards.map((s, i) => (
          <Card key={i}>
            <CardContent className="p-4">
              <div className={`w-10 h-10 ${s.bg} rounded-xl flex items-center justify-center mb-3`}>
                <s.icon className={s.color} size={20} />
              </div>
              <p className="text-2xl font-bold text-gray-800">{s.value}</p>
              <p className="text-xs text-gray-500 mt-1">{s.label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Chart */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>
              Tren pH &amp; TDS (14 Hari Terakhir)
              {isFarmer && <span className="text-sm font-normal text-gray-400 ml-2">— kebun Anda</span>}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {chartArr.length > 0 ? (
              <ResponsiveContainer width="100%" height={250}>
                <LineChart data={chartArr}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="day" tick={{ fontSize: 10 }} />
                  <YAxis yAxisId="ph" domain={[4, 9]} tick={{ fontSize: 10 }} />
                  <YAxis yAxisId="tds" orientation="right" tick={{ fontSize: 10 }} />
                  <Tooltip />
                  <Legend />
                  <Line yAxisId="ph" type="monotone" dataKey="pH" stroke="#16a34a" strokeWidth={2} dot={false} />
                  <Line yAxisId="tds" type="monotone" dataKey="TDS" stroke="#2563eb" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[250px] flex items-center justify-center text-gray-400">
                Belum ada data monitoring
              </div>
            )}
          </CardContent>
        </Card>

        {/* Notifications */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Notifikasi</CardTitle>
              {unreadCount > 0 && <Badge variant="danger">{unreadCount} baru</Badge>}
            </div>
          </CardHeader>
          <CardContent>
            {notifications.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-4">Tidak ada notifikasi</p>
            ) : (
              <div className="space-y-3">
                {notifications.slice(0, 5).map((n: Record<string, unknown>) => (
                  <div key={n.id as string} className={`flex gap-3 p-3 rounded-lg ${n.isRead ? 'bg-gray-50' : 'bg-orange-50 border border-orange-100'}`}>
                    <AlertTriangle size={16} className="text-orange-500 flex-shrink-0 mt-0.5" />
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
          {/* Announcements */}
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

          {/* Upcoming Events */}
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

      {/* Recent Farms */}
      <Card className="mt-6">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>{isFarmer ? 'Kebun Saya' : 'Kebun Terbaru'}</CardTitle>
            <Link href="/farms" className="text-sm text-green-600 hover:underline">Lihat semua</Link>
          </div>
        </CardHeader>
        <CardContent>
          {farms.length === 0 ? (
            <p className="text-gray-400 text-center py-4">Belum ada kebun</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-gray-500">
                    <th className="pb-3 font-medium">Nama Kebun</th>
                    <th className="pb-3 font-medium">Tanaman</th>
                    {!isFarmer && <th className="pb-3 font-medium">Pemilik</th>}
                    <th className="pb-3 font-medium">Status</th>
                    <th className="pb-3 font-medium">Tanggal Tanam</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {farms.slice(0, 5).map((f: Record<string, unknown>) => {
                    const pt = f.plantType as Record<string, unknown>
                    const owner = f.owner as Record<string, unknown>
                    const statusColors: Record<string, 'success' | 'info' | 'warning' | 'default'> = {
                      ACTIVE: 'success', GROWING: 'info', READY_FOR_HARVEST: 'warning', HARVESTED: 'default',
                    }
                    const statusLabels: Record<string, string> = {
                      ACTIVE: 'Aktif', GROWING: 'Tumbuh', READY_FOR_HARVEST: 'Siap Panen', HARVESTED: 'Panen',
                    }
                    return (
                      <tr key={f.id as string} className="hover:bg-gray-50">
                        <td className="py-3 font-medium text-gray-800">{f.name as string}</td>
                        <td className="py-3 text-gray-600">{pt?.name as string}</td>
                        {!isFarmer && <td className="py-3 text-gray-500">{owner?.name as string}</td>}
                        <td className="py-3">
                          <Badge variant={statusColors[f.status as string] || 'default'}>
                            {statusLabels[f.status as string] || f.status as string}
                          </Badge>
                        </td>
                        <td className="py-3 text-gray-500">{formatDate(f.plantingDate as string)}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
