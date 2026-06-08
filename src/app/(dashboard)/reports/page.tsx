'use client'
import { useEffect, useState } from 'react'
import { api } from '@/lib/api'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { toast } from '@/components/ui/toaster'
import { FileText, FileSpreadsheet, Filter, CalendarRange } from 'lucide-react'
import { formatDate, formatDateTime } from '@/lib/utils'

// Quick-range presets
const PRESETS = [
  { label: '7 Hari', days: 7 },
  { label: '30 Hari', days: 30 },
  { label: '3 Bulan', days: 90 },
  { label: 'Semua', days: 0 },
]

function toLocalDateString(date: Date) {
  return date.toISOString().slice(0, 10)
}

export default function ReportsPage() {
  const [farms, setFarms] = useState<Record<string, unknown>[]>([])
  const [farmId, setFarmId] = useState('')
  const [dateFrom, setDateFrom] = useState(() => {
    const d = new Date(); d.setDate(d.getDate() - 30); return toLocalDateString(d)
  })
  const [dateTo, setDateTo] = useState(() => toLocalDateString(new Date()))
  const [records, setRecords] = useState<Record<string, unknown>[]>([])
  const [farmData, setFarmData] = useState<Record<string, unknown> | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => { api.get('/api/farms').then(d => setFarms(d.farms)) }, [])

  const applyPreset = (days: number) => {
    const to = new Date()
    setDateTo(toLocalDateString(to))
    if (days === 0) {
      setDateFrom('2000-01-01') // "all time"
    } else {
      const from = new Date(); from.setDate(from.getDate() - days)
      setDateFrom(toLocalDateString(from))
    }
  }

  const loadData = async () => {
    if (!farmId) { toast('warning', 'Pilih kebun terlebih dahulu'); return }
    if (dateFrom && dateTo && dateFrom > dateTo) { toast('warning', 'Tanggal mulai harus sebelum tanggal akhir'); return }
    setLoading(true)
    try {
      const params = new URLSearchParams({ farmId, limit: '500' })
      if (dateFrom) params.set('from', dateFrom)
      if (dateTo) params.set('to', dateTo)
      const [fData, mData] = await Promise.all([
        api.get(`/api/farms/${farmId}`),
        api.get(`/api/monitoring?${params}`),
      ])
      setFarmData(fData.farm)
      setRecords(mData.records)
      if (mData.records.length === 0) toast('warning', 'Tidak ada data pada rentang waktu tersebut')
    } catch { toast('error', 'Gagal memuat data') } finally { setLoading(false) }
  }

  // Filter records client-side by date range (belt-and-suspenders)
  const filteredRecords = records.filter(r => {
    const d = (r.date as string).slice(0, 10)
    if (dateFrom && d < dateFrom) return false
    if (dateTo && d > dateTo) return false
    return true
  })

  const exportExcel = async () => {
    if (!filteredRecords.length) { toast('warning', 'Tidak ada data untuk diekspor'); return }
    const { utils, writeFile } = await import('xlsx')
    const wsData = [
      ['Waktu', 'pH', 'TDS (ppm)', 'Suhu (°C)', 'Kelembaban (%)', 'Status pH', 'Status TDS', 'Catatan'],
      ...filteredRecords.map(r => [
        formatDateTime(r.date as string),
        (r.phValue as number).toFixed(2),
        Math.round(r.tdsValue as number),
        r.temperature != null ? (r.temperature as number).toFixed(1) : '-',
        r.humidity != null ? Math.round(r.humidity as number) : '-',
        r.phStatus,
        r.tdsStatus,
        r.notes || '-',
      ]),
    ]
    const ws = utils.aoa_to_sheet(wsData)
    // Column widths
    ws['!cols'] = [{ wch: 22 }, { wch: 8 }, { wch: 10 }, { wch: 10 }, { wch: 14 }, { wch: 12 }, { wch: 12 }, { wch: 30 }]
    const wb = utils.book_new()
    utils.book_append_sheet(wb, ws, 'Monitoring')
    const fname = `monitoring_${(farmData?.name as string || farmId).replace(/\s+/g, '_')}_${dateFrom}_sd_${dateTo}.xlsx`
    writeFile(wb, fname)
    toast('success', 'File Excel berhasil diunduh')
  }

  const exportPDF = async () => {
    if (!farmData || !filteredRecords.length) { toast('warning', 'Muat data terlebih dahulu'); return }
    const { default: jsPDF } = await import('jspdf')
    const { default: autoTable } = await import('jspdf-autotable')
    const doc = new jsPDF()
    const pt = farmData.plantType as Record<string, unknown>
    const owner = farmData.owner as Record<string, unknown>
    const village = farmData.village as Record<string, unknown>

    doc.setFontSize(18); doc.setTextColor(22, 163, 74)
    doc.text('Laporan Monitoring Hidroponik', 14, 20)
    doc.setFontSize(10); doc.setTextColor(100)
    doc.text(`Dibuat: ${new Date().toLocaleDateString('id-ID')}`, 14, 28)
    doc.text(`Periode: ${formatDate(dateFrom)} — ${formatDate(dateTo)}`, 14, 34)

    doc.setFontSize(12); doc.setTextColor(0)
    doc.text('Informasi Kebun', 14, 46)
    doc.setFontSize(10); doc.setTextColor(80)
    doc.text(`Nama Kebun : ${farmData.name}`, 14, 54)
    doc.text(`Pemilik    : ${owner?.name}`, 14, 60)
    doc.text(`Desa       : ${village?.name}`, 14, 66)
    doc.text(`Tanaman    : ${pt?.name}`, 14, 72)
    doc.text(`Range pH   : ${pt?.minPH} — ${pt?.maxPH}`, 14, 78)
    doc.text(`Range TDS  : ${pt?.minTDS} — ${pt?.maxTDS} ppm`, 14, 84)

    // Summary
    const avgPH = filteredRecords.reduce((s, r) => s + (r.phValue as number), 0) / filteredRecords.length
    const avgTDS = filteredRecords.reduce((s, r) => s + (r.tdsValue as number), 0) / filteredRecords.length
    const abnormal = filteredRecords.filter(r => r.phStatus !== 'NORMAL' || r.tdsStatus !== 'NORMAL').length
    doc.text(`Total Catatan: ${filteredRecords.length}  |  pH Rata-rata: ${avgPH.toFixed(2)}  |  TDS Rata-rata: ${Math.round(avgTDS)} ppm  |  Abnormal: ${abnormal}`, 14, 92)

    autoTable(doc, {
      startY: 100,
      head: [['Waktu', 'pH', 'TDS (ppm)', 'Suhu', 'Status', 'Catatan']],
      body: filteredRecords.map(r => [
        formatDateTime(r.date as string),
        (r.phValue as number).toFixed(2),
        String(Math.round(r.tdsValue as number)),
        r.temperature != null ? `${(r.temperature as number).toFixed(1)}°C` : '-',
        r.phStatus === 'NORMAL' && r.tdsStatus === 'NORMAL' ? 'Normal' : 'Abnormal',
        String(r.notes || '-'),
      ]) as string[][],
      headStyles: { fillColor: [22, 163, 74] },
      styles: { fontSize: 8 },
      columnStyles: { 5: { cellWidth: 40 } },
    })

    const fname = `laporan_${(farmData.name as string).replace(/\s+/g, '_')}_${dateFrom}_sd_${dateTo}.pdf`
    doc.save(fname)
    toast('success', 'File PDF berhasil diunduh')
  }

  const abnormalCount = filteredRecords.filter(r => r.phStatus !== 'NORMAL' || r.tdsStatus !== 'NORMAL').length
  const avgPH = filteredRecords.length
    ? (filteredRecords.reduce((s, r) => s + (r.phValue as number), 0) / filteredRecords.length).toFixed(2)
    : '-'
  const avgTDS = filteredRecords.length
    ? Math.round(filteredRecords.reduce((s, r) => s + (r.tdsValue as number), 0) / filteredRecords.length) + ' ppm'
    : '-'

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Laporan</h1>
        <p className="text-gray-500">Generate dan ekspor laporan monitoring</p>
      </div>

      {/* Filter card */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Filter size={18} />Filter Laporan</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap items-end gap-4">
            {/* Farm selector */}
            <div className="w-56">
              <Select
                label="Pilih Kebun"
                value={farmId}
                onChange={e => setFarmId(e.target.value)}
                options={[
                  { value: '', label: '-- Pilih Kebun --' },
                  ...farms.map((f: Record<string, unknown>) => ({ value: f.id as string, label: f.name as string })),
                ]}
              />
            </div>

            {/* Divider */}
            <div className="hidden md:block w-px h-10 bg-gray-200" />

            {/* Quick presets */}
            <div>
              <p className="text-xs font-medium text-gray-500 mb-1.5 flex items-center gap-1">
                <CalendarRange size={12} />Rentang Cepat
              </p>
              <div className="flex gap-1.5">
                {PRESETS.map(p => (
                  <button
                    key={p.label}
                    type="button"
                    onClick={() => applyPreset(p.days)}
                    className="px-3 py-1.5 text-xs rounded-lg border border-green-300 text-green-700 hover:bg-green-50 transition-colors font-medium"
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Divider */}
            <div className="hidden md:block w-px h-10 bg-gray-200" />

            {/* Custom dates */}
            <div className="flex items-end gap-2">
              <Input
                label="Dari Tanggal"
                type="date"
                value={dateFrom}
                onChange={e => setDateFrom(e.target.value)}
                className="w-40"
              />
              <span className="text-gray-400 mb-2.5">—</span>
              <Input
                label="Sampai Tanggal"
                type="date"
                value={dateTo}
                onChange={e => setDateTo(e.target.value)}
                className="w-40"
              />
            </div>

            {/* Load button */}
            <Button onClick={loadData} loading={loading}>
              Muat Data
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Preview */}
      {farmData && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between flex-wrap gap-3">
              <div>
                <CardTitle>Pratinjau: {farmData.name as string}</CardTitle>
                <p className="text-xs text-gray-400 mt-1">
                  {formatDate(dateFrom)} — {formatDate(dateTo)} &nbsp;·&nbsp; {filteredRecords.length} catatan
                </p>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" onClick={exportExcel} disabled={!filteredRecords.length}>
                  <FileSpreadsheet size={16} />Excel
                </Button>
                <Button onClick={exportPDF} disabled={!filteredRecords.length}>
                  <FileText size={16} />PDF
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {/* Summary row */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-5 p-4 bg-gray-50 rounded-xl">
              <div>
                <p className="text-xs text-gray-500 mb-1">Total Catatan</p>
                <p className="text-2xl font-bold text-gray-800">{filteredRecords.length}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500 mb-1">pH Rata-rata</p>
                <p className="text-2xl font-bold text-green-700">{avgPH}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500 mb-1">TDS Rata-rata</p>
                <p className="text-2xl font-bold text-blue-700">{avgTDS}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500 mb-1">Catatan Abnormal</p>
                <p className={`text-2xl font-bold ${abnormalCount > 0 ? 'text-red-600' : 'text-gray-400'}`}>{abnormalCount}</p>
              </div>
            </div>

            {/* Table */}
            {filteredRecords.length === 0 ? (
              <p className="text-center text-gray-400 py-8">Tidak ada data pada rentang waktu ini</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b text-gray-500 text-left">
                      <th className="pb-2 font-medium">Waktu</th>
                      <th className="pb-2 font-medium text-center">pH</th>
                      <th className="pb-2 font-medium text-center">TDS (ppm)</th>
                      <th className="pb-2 font-medium text-center">Suhu</th>
                      <th className="pb-2 font-medium text-center">Kelembaban</th>
                      <th className="pb-2 font-medium text-center">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {filteredRecords.slice(0, 25).map(r => {
                      const normal = r.phStatus === 'NORMAL' && r.tdsStatus === 'NORMAL'
                      return (
                        <tr key={r.id as string} className="hover:bg-gray-50">
                          <td className="py-2 text-gray-700">{formatDateTime(r.date as string)}</td>
                          <td className={`py-2 text-center font-mono font-semibold ${r.phStatus !== 'NORMAL' ? 'text-red-600' : 'text-green-700'}`}>
                            {(r.phValue as number).toFixed(2)}
                          </td>
                          <td className={`py-2 text-center font-mono font-semibold ${r.tdsStatus !== 'NORMAL' ? 'text-red-600' : 'text-blue-700'}`}>
                            {Math.round(r.tdsValue as number)}
                          </td>
                          <td className="py-2 text-center text-gray-600">
                            {r.temperature != null ? `${(r.temperature as number).toFixed(1)}°C` : '—'}
                          </td>
                          <td className="py-2 text-center text-gray-600">
                            {r.humidity != null ? `${Math.round(r.humidity as number)}%` : '—'}
                          </td>
                          <td className="py-2 text-center">
                            <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${normal ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                              {normal ? 'Normal' : 'Abnormal'}
                            </span>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
                {filteredRecords.length > 25 && (
                  <p className="text-xs text-gray-400 mt-3 text-center">
                    Menampilkan 25 dari {filteredRecords.length} catatan — export untuk data lengkap
                  </p>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  )
}
