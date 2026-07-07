'use client'
import { useEffect, useState } from 'react'
import { api } from '@/lib/api'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Select } from '@/components/ui/select'
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'

type Point = { date: string; kg: number }
type Bucket = { name: string; kg: number }
type Stats = { totalKg: number; totalPanen: number; avgKg: number; totalValue: number; topPlantType: string | null }
type Farm = { id: string; name: string }

export default function AnalyticsPage() {
  const [timeSeries, setTimeSeries] = useState<Point[]>([])
  const [perGarden, setPerGarden] = useState<Bucket[]>([])
  const [perPlantType, setPerPlantType] = useState<Bucket[]>([])
  const [stats, setStats] = useState<Stats>({ totalKg: 0, totalPanen: 0, avgKg: 0, totalValue: 0, topPlantType: null })
  const [farms, setFarms] = useState<Farm[]>([])
  const [farmId, setFarmId] = useState('')
  const [days, setDays] = useState('90')
  const [loading, setLoading] = useState(true)

  const load = () => {
    setLoading(true)
    Promise.all([
      api.get(`/api/analytics?days=${days}${farmId ? `&farmId=${farmId}` : ''}`),
      api.get('/api/farms'),
    ]).then(([a, f]) => {
      setTimeSeries(a.timeSeries || [])
      setPerGarden(a.perGarden || [])
      setPerPlantType(a.perPlantType || [])
      setStats(a.stats)
      setFarms((f.farms as Farm[]) || [])
    }).finally(() => setLoading(false))
  }
  useEffect(() => { load() }, [days, farmId]) // eslint-disable-line react-hooks/exhaustive-deps

  const chartData = timeSeries.map(p => ({
    day: new Date(p.date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' }),
    kg: p.kg,
  }))

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Analitik Panen</h1>
        <p className="text-gray-500">Analisis produksi hasil panen per waktu, kebun, dan jenis tanaman</p>
      </div>

      {/* Filters */}
      <div className="flex gap-3 mb-6 flex-wrap">
        <div className="w-full sm:w-44">
          <Select label="Periode" value={days} onChange={e => setDays(e.target.value)} options={[{ value: '30', label: '30 Hari' }, { value: '90', label: '90 Hari' }, { value: '180', label: '6 Bulan' }, { value: '365', label: '1 Tahun' }]} />
        </div>
        <div className="w-full sm:w-64">
          <Select label="Kebun" value={farmId} onChange={e => setFarmId(e.target.value)} options={[{ value: '', label: 'Semua Kebun' }, ...farms.map(f => ({ value: f.id, label: f.name }))]} />
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        {[
          { label: 'Total Produksi (kg)', value: stats.totalKg, color: 'text-green-600' },
          { label: 'Total Catatan Panen', value: stats.totalPanen, color: 'text-blue-600' },
          { label: 'Rata-rata per Panen (kg)', value: stats.avgKg, color: 'text-purple-600' },
          { label: 'Tanaman Terbanyak', value: stats.topPlantType ?? '-', color: 'text-teal-600' },
        ].map((s, i) => (
          <Card key={i}><CardContent className="p-4 text-center">
            <p className={`text-2xl font-bold ${s.color} truncate`}>{String(s.value ?? '-')}</p>
            <p className="text-xs text-gray-500 mt-1">{s.label}</p>
          </CardContent></Card>
        ))}
      </div>

      {loading ? <div className="flex justify-center py-10"><div className="h-8 w-8 animate-spin rounded-full border-4 border-green-600 border-t-transparent" /></div> : (
        <>
          {/* Harvest over time */}
          <Card className="mb-6">
            <CardHeader><CardTitle>Produksi Panen dari Waktu ke Waktu (kg)</CardTitle></CardHeader>
            <CardContent>
              {chartData.length > 0 ? (
                <ResponsiveContainer width="100%" height={260}>
                  <LineChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis dataKey="day" tick={{ fontSize: 10 }} />
                    <YAxis tick={{ fontSize: 11 }} />
                    <Tooltip formatter={(v) => [`${v} kg`, 'Produksi']} />
                    <Line type="monotone" dataKey="kg" stroke="#16a34a" strokeWidth={2} dot={{ r: 3 }} />
                  </LineChart>
                </ResponsiveContainer>
              ) : <p className="text-center text-gray-400 py-10">Belum ada data panen</p>}
            </CardContent>
          </Card>

          <div className="grid md:grid-cols-2 gap-6">
            {/* kg per garden */}
            <Card>
              <CardHeader><CardTitle>Produksi per Kebun (kg)</CardTitle></CardHeader>
              <CardContent>
                {perGarden.length > 0 ? (
                  <ResponsiveContainer width="100%" height={260}>
                    <BarChart data={perGarden} layout="vertical" margin={{ left: 10 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                      <XAxis type="number" tick={{ fontSize: 11 }} />
                      <YAxis type="category" dataKey="name" width={90} tick={{ fontSize: 10 }} />
                      <Tooltip formatter={(v) => [`${v} kg`, 'Produksi']} />
                      <Bar dataKey="kg" fill="#16a34a" radius={[0, 4, 4, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                ) : <p className="text-center text-gray-400 py-10">Belum ada data</p>}
              </CardContent>
            </Card>

            {/* kg per plant type */}
            <Card>
              <CardHeader><CardTitle>Produksi per Jenis Tanaman (kg)</CardTitle></CardHeader>
              <CardContent>
                {perPlantType.length > 0 ? (
                  <ResponsiveContainer width="100%" height={260}>
                    <BarChart data={perPlantType} layout="vertical" margin={{ left: 10 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                      <XAxis type="number" tick={{ fontSize: 11 }} />
                      <YAxis type="category" dataKey="name" width={90} tick={{ fontSize: 10 }} />
                      <Tooltip formatter={(v) => [`${v} kg`, 'Produksi']} />
                      <Bar dataKey="kg" fill="#9333ea" radius={[0, 4, 4, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                ) : <p className="text-center text-gray-400 py-10">Belum ada data</p>}
              </CardContent>
            </Card>
          </div>
        </>
      )}
    </div>
  )
}
