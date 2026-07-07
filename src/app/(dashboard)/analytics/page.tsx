'use client'
import { useEffect, useState } from 'react'
import { api } from '@/lib/api'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Select } from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { toast } from '@/components/ui/toaster'
import { FileSpreadsheet, FileText } from 'lucide-react'
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'

type Point = { date: string; kg: number }
type Bucket = { name: string; kg: number }
type Stats = { totalKg: number; totalPanen: number; avgKg: number; totalValue: number; topPlantType: string | null }
type Farm = { id: string; name: string }

const PERIOD_LABELS: Record<string, string> = { '30': '30 Hari', '90': '90 Hari', '180': '6 Bulan', '365': '1 Tahun' }

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

  const periodLabel = PERIOD_LABELS[days] || `${days} Hari`
  const farmLabel = farmId ? (farms.find(f => f.id === farmId)?.name || 'Kebun') : 'Semua Kebun'
  const fileBase = `analitik_panen_${farmLabel.replace(/\s+/g, '_')}_${periodLabel.replace(/\s+/g, '')}`
  const hasData = stats.totalPanen > 0

  const fmtDate = (d: string) => new Date(d).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })

  const exportExcel = async () => {
    if (!hasData) { toast('warning', 'Tidak ada data untuk diekspor'); return }
    const { utils, writeFile } = await import('xlsx')
    const wb = utils.book_new()

    // Ringkasan
    const ringkasan = utils.aoa_to_sheet([
      ['Laporan Analitik Panen'],
      ['Periode', periodLabel],
      ['Kebun', farmLabel],
      ['Dibuat', new Date().toLocaleDateString('id-ID')],
      [],
      ['Total Produksi (kg)', stats.totalKg],
      ['Total Catatan Panen', stats.totalPanen],
      ['Rata-rata per Panen (kg)', stats.avgKg],
      ['Estimasi Nilai (Rp)', stats.totalValue || '-'],
      ['Tanaman Terbanyak', stats.topPlantType ?? '-'],
    ])
    ringkasan['!cols'] = [{ wch: 24 }, { wch: 28 }]
    utils.book_append_sheet(wb, ringkasan, 'Ringkasan')

    // Produksi Harian
    const harian = utils.aoa_to_sheet([['Tanggal', 'Produksi (kg)'], ...timeSeries.map(p => [fmtDate(p.date), p.kg])])
    harian['!cols'] = [{ wch: 18 }, { wch: 16 }]
    utils.book_append_sheet(wb, harian, 'Produksi Harian')

    // Per Kebun
    const kebun = utils.aoa_to_sheet([['Kebun', 'Produksi (kg)'], ...perGarden.map(b => [b.name, b.kg])])
    kebun['!cols'] = [{ wch: 28 }, { wch: 16 }]
    utils.book_append_sheet(wb, kebun, 'Per Kebun')

    // Per Jenis Tanaman
    const tanaman = utils.aoa_to_sheet([['Jenis Tanaman', 'Produksi (kg)'], ...perPlantType.map(b => [b.name, b.kg])])
    tanaman['!cols'] = [{ wch: 28 }, { wch: 16 }]
    utils.book_append_sheet(wb, tanaman, 'Per Jenis Tanaman')

    writeFile(wb, `${fileBase}.xlsx`)
    toast('success', 'File Excel berhasil diunduh')
  }

  const exportPDF = async () => {
    if (!hasData) { toast('warning', 'Tidak ada data untuk diekspor'); return }
    const { default: jsPDF } = await import('jspdf')
    const { default: autoTable } = await import('jspdf-autotable')
    const doc = new jsPDF()

    doc.setFontSize(16); doc.setTextColor(22, 163, 74)
    doc.text('Laporan Analitik Panen', 14, 20)
    doc.setFontSize(10); doc.setTextColor(100)
    doc.text(`Dibuat: ${new Date().toLocaleDateString('id-ID')}`, 14, 28)
    doc.text(`Periode: ${periodLabel}  |  Kebun: ${farmLabel}`, 14, 34)

    doc.setTextColor(0)
    doc.text(
      `Total Produksi: ${stats.totalKg} kg  |  Catatan: ${stats.totalPanen}  |  Rata-rata: ${stats.avgKg} kg  |  Tanaman Terbanyak: ${stats.topPlantType ?? '-'}`,
      14, 42
    )

    autoTable(doc, {
      startY: 50,
      head: [['Kebun', 'Produksi (kg)']],
      body: perGarden.map(b => [b.name, String(b.kg)]),
      headStyles: { fillColor: [22, 163, 74] },
      styles: { fontSize: 9 },
      margin: { left: 14 },
      tableWidth: 90,
    })

    const afterFirst = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY
    autoTable(doc, {
      startY: 50,
      head: [['Jenis Tanaman', 'Produksi (kg)']],
      body: perPlantType.map(b => [b.name, String(b.kg)]),
      headStyles: { fillColor: [147, 51, 234] },
      styles: { fontSize: 9 },
      margin: { left: 110 },
      tableWidth: 86,
    })

    const startY = Math.max(afterFirst, (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY) + 8
    autoTable(doc, {
      startY,
      head: [['Tanggal', 'Produksi (kg)']],
      body: timeSeries.map(p => [fmtDate(p.date), String(p.kg)]),
      headStyles: { fillColor: [37, 99, 235] },
      styles: { fontSize: 8 },
    })

    doc.save(`${fileBase}.pdf`)
    toast('success', 'File PDF berhasil diunduh')
  }

  return (
    <div>
      <div className="flex items-start justify-between mb-6 gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Analitik Panen</h1>
          <p className="text-gray-500">Analisis produksi hasil panen per waktu, kebun, dan jenis tanaman</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={exportExcel} disabled={!hasData || loading}>
            <FileSpreadsheet size={16} />Excel
          </Button>
          <Button onClick={exportPDF} disabled={!hasData || loading}>
            <FileText size={16} />PDF
          </Button>
        </div>
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
