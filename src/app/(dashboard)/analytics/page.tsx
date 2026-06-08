'use client'
import { useEffect, useState } from 'react'
import { api } from '@/lib/api'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Select } from '@/components/ui/select'
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, ReferenceLine } from 'recharts'
import { formatDate } from '@/lib/utils'
import { BarChart3 } from 'lucide-react'

export default function AnalyticsPage() {
  const [records, setRecords] = useState<Record<string, unknown>[]>([])
  const [stats, setStats] = useState<Record<string, unknown>>({})
  const [farms, setFarms] = useState<Record<string, unknown>[]>([])
  const [farmId, setFarmId] = useState('')
  const [days, setDays] = useState('30')
  const [loading, setLoading] = useState(true)

  const load = () => {
    setLoading(true)
    Promise.all([
      api.get(`/api/analytics?days=${days}${farmId ? `&farmId=${farmId}` : ''}`),
      api.get('/api/farms'),
    ]).then(([a, f]) => { setRecords(a.records); setStats(a.stats); setFarms(f.farms) }).finally(() => setLoading(false))
  }
  useEffect(() => { load() }, [days, farmId])

  const dailyData = records.reduce((acc: Record<string, Record<string, unknown>>, r: Record<string, unknown>) => {
    const day = formatDate(r.date as string)
    if (!acc[day]) acc[day] = { day, phSum: 0, tdsSum: 0, count: 0 }
    acc[day].phSum = (acc[day].phSum as number) + (r.phValue as number)
    acc[day].tdsSum = (acc[day].tdsSum as number) + (r.tdsValue as number)
    acc[day].count = (acc[day].count as number) + 1
    return acc
  }, {})
  const chartData = Object.values(dailyData).map(d => ({ day: d.day as string, pH: Math.round(((d.phSum as number) / (d.count as number)) * 100) / 100, TDS: Math.round((d.tdsSum as number) / (d.count as number)) }))

  const phDist = { normal: records.filter(r => r.phStatus === 'NORMAL').length, abnormal: records.filter(r => r.phStatus === 'ABNORMAL').length }
  const tdsDist = { normal: records.filter(r => r.tdsStatus === 'NORMAL').length, abnormal: records.filter(r => r.tdsStatus === 'ABNORMAL').length }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Analitik</h1>
        <p className="text-gray-500">Analisis tren pH & TDS kebun hidroponik</p>
      </div>

      {/* Filters */}
      <div className="flex gap-3 mb-6 flex-wrap">
        <div className="w-full sm:w-44">
          <Select label="Periode" value={days} onChange={e => setDays(e.target.value)} options={[{ value: '7', label: '7 Hari' }, { value: '14', label: '14 Hari' }, { value: '30', label: '30 Hari' }, { value: '90', label: '90 Hari' }]} />
        </div>
        <div className="w-full sm:w-64">
          <Select label="Kebun" value={farmId} onChange={e => setFarmId(e.target.value)} options={[{ value: '', label: 'Semua Kebun' }, ...farms.map((f: Record<string, unknown>) => ({ value: f.id as string, label: f.name as string }))]} />
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        {[
          { label: 'Total Catatan', value: records.length, color: 'text-blue-600' },
          { label: 'Rata-rata pH', value: stats.avgPH, color: 'text-green-600' },
          { label: 'Rata-rata TDS (ppm)', value: stats.avgTDS, color: 'text-purple-600' },
          { label: 'pH Normal (%)', value: records.length ? Math.round((phDist.normal / records.length) * 100) + '%' : '-', color: 'text-teal-600' },
        ].map((s, i) => (
          <Card key={i}><CardContent className="p-4 text-center">
            <p className={`text-2xl font-bold ${s.color}`}>{String(s.value ?? '-')}</p>
            <p className="text-xs text-gray-500 mt-1">{s.label}</p>
          </CardContent></Card>
        ))}
      </div>

      {loading ? <div className="flex justify-center py-10"><div className="h-8 w-8 animate-spin rounded-full border-4 border-green-600 border-t-transparent" /></div> : (
        <>
          {/* pH Trend */}
          <Card className="mb-6">
            <CardHeader><CardTitle>Tren pH Harian</CardTitle></CardHeader>
            <CardContent>
              {chartData.length > 0 ? (
                <ResponsiveContainer width="100%" height={250}>
                  <LineChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis dataKey="day" tick={{ fontSize: 10 }} />
                    <YAxis domain={[4, 9]} tick={{ fontSize: 11 }} />
                    <Tooltip />
                    <ReferenceLine y={5.5} stroke="#f59e0b" strokeDasharray="4 4" label={{ value: 'Min 5.5', position: 'insideTopRight', fontSize: 10 }} />
                    <ReferenceLine y={7.0} stroke="#f59e0b" strokeDasharray="4 4" label={{ value: 'Max 7.0', position: 'insideBottomRight', fontSize: 10 }} />
                    <Line type="monotone" dataKey="pH" stroke="#16a34a" strokeWidth={2} dot={{ r: 3 }} />
                  </LineChart>
                </ResponsiveContainer>
              ) : <p className="text-center text-gray-400 py-10">Belum ada data</p>}
            </CardContent>
          </Card>

          {/* TDS Trend */}
          <Card className="mb-6">
            <CardHeader><CardTitle>Tren TDS Harian (ppm)</CardTitle></CardHeader>
            <CardContent>
              {chartData.length > 0 ? (
                <ResponsiveContainer width="100%" height={250}>
                  <BarChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis dataKey="day" tick={{ fontSize: 10 }} />
                    <YAxis tick={{ fontSize: 11 }} />
                    <Tooltip />
                    <Bar dataKey="TDS" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : <p className="text-center text-gray-400 py-10">Belum ada data</p>}
            </CardContent>
          </Card>

          {/* Distribution */}
          <div className="grid md:grid-cols-2 gap-6">
            {[
              { title: 'Distribusi Status pH', normal: phDist.normal, abnormal: phDist.abnormal },
              { title: 'Distribusi Status TDS', normal: tdsDist.normal, abnormal: tdsDist.abnormal },
            ].map((d, i) => (
              <Card key={i}>
                <CardHeader><CardTitle>{d.title}</CardTitle></CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div>
                      <div className="flex justify-between text-sm mb-1"><span className="text-green-700">Normal</span><span>{d.normal}</span></div>
                      <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
                        <div className="h-full bg-green-500 rounded-full" style={{ width: `${records.length ? (d.normal / records.length) * 100 : 0}%` }} />
                      </div>
                    </div>
                    <div>
                      <div className="flex justify-between text-sm mb-1"><span className="text-red-700">Abnormal</span><span>{d.abnormal}</span></div>
                      <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
                        <div className="h-full bg-red-500 rounded-full" style={{ width: `${records.length ? (d.abnormal / records.length) * 100 : 0}%` }} />
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </>
      )}
    </div>
  )
}