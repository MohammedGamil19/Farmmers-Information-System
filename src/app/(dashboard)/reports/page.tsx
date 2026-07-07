'use client'
import { useEffect, useState } from 'react'
import { api } from '@/lib/api'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { toast } from '@/components/ui/toaster'
import { FileText, FileSpreadsheet, Filter, CalendarRange } from 'lucide-react'
import { formatDate } from '@/lib/utils'

const PRESETS = [
  { label: '30 Hari', days: 30 },
  { label: '3 Bulan', days: 90 },
  { label: '1 Tahun', days: 365 },
  { label: 'Semua', days: 0 },
]

type Farm = { id: string; name: string }
type Panen = {
  id: string
  tanggalPanen: string
  komoditas: string
  jumlahKg: number
  hargaJual: number | null
  catatan: string | null
  petani: { id: string; name: string }
  village: { id: string; name: string }
  farm: { id: string; name: string }
  plantType: { id: string; name: string }
}

function toLocalDateString(date: Date) {
  return date.toISOString().slice(0, 10)
}

export default function ReportsPage() {
  const [farms, setFarms] = useState<Farm[]>([])
  const [farmId, setFarmId] = useState('')
  const [dateFrom, setDateFrom] = useState(() => {
    const d = new Date(); d.setDate(d.getDate() - 90); return toLocalDateString(d)
  })
  const [dateTo, setDateTo] = useState(() => toLocalDateString(new Date()))
  const [allPanens, setAllPanens] = useState<Panen[]>([])
  const [loaded, setLoaded] = useState(false)
  const [loading, setLoading] = useState(false)

  useEffect(() => { api.get('/api/farms').then(d => setFarms((d.farms as Farm[]) || [])) }, [])

  const applyPreset = (days: number) => {
    setDateTo(toLocalDateString(new Date()))
    if (days === 0) {
      setDateFrom('2000-01-01')
    } else {
      const from = new Date(); from.setDate(from.getDate() - days)
      setDateFrom(toLocalDateString(from))
    }
  }

  const loadData = async () => {
    if (dateFrom && dateTo && dateFrom > dateTo) { toast('warning', 'Tanggal mulai harus sebelum tanggal akhir'); return }
    setLoading(true)
    try {
      const data = await api.get('/api/panen')
      setAllPanens(data as Panen[])
      setLoaded(true)
      if ((data as Panen[]).length === 0) toast('warning', 'Belum ada data panen')
    } catch { toast('error', 'Gagal memuat data') } finally { setLoading(false) }
  }

  const filtered = allPanens.filter(p => {
    const d = p.tanggalPanen.slice(0, 10)
    if (farmId && p.farm.id !== farmId) return false
    if (dateFrom && d < dateFrom) return false
    if (dateTo && d > dateTo) return false
    return true
  })

  const totalKg = filtered.reduce((s, p) => s + p.jumlahKg, 0)
  const totalValue = filtered.reduce((s, p) => s + (p.hargaJual ? p.jumlahKg * p.hargaJual : 0), 0)
  const topPlant = (() => {
    const map: Record<string, number> = {}
    filtered.forEach(p => { map[p.plantType.name] = (map[p.plantType.name] || 0) + p.jumlahKg })
    return Object.entries(map).sort((a, b) => b[1] - a[1])[0]?.[0] ?? '-'
  })()

  const farmLabel = farmId ? (farms.find(f => f.id === farmId)?.name || 'kebun') : 'Semua_Kebun'

  const exportExcel = async () => {
    if (!filtered.length) { toast('warning', 'Tidak ada data untuk diekspor'); return }
    const { utils, writeFile } = await import('xlsx')
    const wsData = [
      ['Tanggal Panen', 'Kebun', 'Jenis Tanaman', 'Jumlah (kg)', 'Harga Jual/kg (Rp)', 'Nilai (Rp)', 'Petani', 'Desa', 'Catatan'],
      ...filtered.map(p => [
        formatDate(p.tanggalPanen),
        p.farm.name,
        p.plantType.name,
        p.jumlahKg,
        p.hargaJual ?? '-',
        p.hargaJual ? p.jumlahKg * p.hargaJual : '-',
        p.petani.name,
        p.village.name,
        p.catatan || '-',
      ]),
      [],
      ['TOTAL', '', '', totalKg.toFixed(1), '', totalValue > 0 ? totalValue : '-', '', '', ''],
    ]
    const ws = utils.aoa_to_sheet(wsData)
    ws['!cols'] = [{ wch: 16 }, { wch: 20 }, { wch: 18 }, { wch: 12 }, { wch: 16 }, { wch: 14 }, { wch: 18 }, { wch: 16 }, { wch: 30 }]
    const wb = utils.book_new()
    utils.book_append_sheet(wb, ws, 'Data Panen')
    writeFile(wb, `laporan_panen_${farmLabel.replace(/\s+/g, '_')}_${dateFrom}_sd_${dateTo}.xlsx`)
    toast('success', 'File Excel berhasil diunduh')
  }

  const exportPDF = async () => {
    if (!filtered.length) { toast('warning', 'Muat data terlebih dahulu'); return }
    const { default: jsPDF } = await import('jspdf')
    const { default: autoTable } = await import('jspdf-autotable')
    const doc = new jsPDF()

    doc.setFontSize(16); doc.setTextColor(22, 163, 74)
    doc.text('Laporan Produksi Hasil Panen', 14, 20)
    doc.setFontSize(10); doc.setTextColor(100)
    doc.text(`Dibuat: ${new Date().toLocaleDateString('id-ID')}`, 14, 28)
    doc.text(`Periode: ${formatDate(dateFrom)} — ${formatDate(dateTo)}`, 14, 34)
    doc.text(`Kebun: ${farmId ? farmLabel : 'Semua Kebun'}`, 14, 40)

    doc.setTextColor(0)
    doc.text(`Total Catatan: ${filtered.length}  |  Total Produksi: ${totalKg.toFixed(1)} kg${totalValue > 0 ? `  |  Estimasi Nilai: Rp ${totalValue.toLocaleString('id-ID')}` : ''}`, 14, 48)

    autoTable(doc, {
      startY: 56,
      head: [['Tanggal', 'Kebun', 'Tanaman', 'Kg', 'Harga/kg', 'Petani']],
      body: filtered.map(p => [
        formatDate(p.tanggalPanen),
        p.farm.name,
        p.plantType.name,
        String(p.jumlahKg),
        p.hargaJual ? `Rp ${p.hargaJual.toLocaleString('id-ID')}` : '-',
        p.petani.name,
      ]),
      headStyles: { fillColor: [22, 163, 74] },
      styles: { fontSize: 8 },
    })

    doc.save(`laporan_panen_${farmLabel.replace(/\s+/g, '_')}_${dateFrom}_sd_${dateTo}.pdf`)
    toast('success', 'File PDF berhasil diunduh')
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Laporan Panen</h1>
        <p className="text-gray-500">Buat dan ekspor laporan produksi hasil panen</p>
      </div>

      {/* Filter card */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Filter size={18} />Filter Laporan</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex flex-wrap items-end gap-3">
              <div className="w-full sm:w-56">
                <Select
                  label="Kebun"
                  value={farmId}
                  onChange={e => setFarmId(e.target.value)}
                  options={[
                    { value: '', label: 'Semua Kebun' },
                    ...farms.map(f => ({ value: f.id, label: f.name })),
                  ]}
                />
              </div>
              <div>
                <p className="text-xs font-medium text-gray-500 mb-1.5 flex items-center gap-1">
                  <CalendarRange size={12} />Rentang Cepat
                </p>
                <div className="flex gap-1.5 flex-wrap">
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
            </div>

            <div className="flex flex-wrap items-end gap-3">
              <div className="flex items-end gap-2 flex-wrap">
                <Input label="Dari Tanggal" type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} className="w-full sm:w-40" />
                <span className="text-gray-400 mb-2.5 hidden sm:block">—</span>
                <Input label="Sampai Tanggal" type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} className="w-full sm:w-40" />
              </div>
              <Button onClick={loadData} loading={loading}>Muat Data</Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Preview */}
      {loaded && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between flex-wrap gap-3">
              <div>
                <CardTitle>Pratinjau Laporan</CardTitle>
                <p className="text-xs text-gray-400 mt-1">
                  {formatDate(dateFrom)} — {formatDate(dateTo)} &nbsp;·&nbsp; {filtered.length} catatan
                </p>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" onClick={exportExcel} disabled={!filtered.length}>
                  <FileSpreadsheet size={16} />Excel
                </Button>
                <Button onClick={exportPDF} disabled={!filtered.length}>
                  <FileText size={16} />PDF
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-5 p-4 bg-gray-50 rounded-xl">
              <div>
                <p className="text-xs text-gray-500 mb-1">Total Catatan</p>
                <p className="text-2xl font-bold text-gray-800">{filtered.length}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500 mb-1">Total Produksi</p>
                <p className="text-2xl font-bold text-green-700">{totalKg.toFixed(1)} kg</p>
              </div>
              <div>
                <p className="text-xs text-gray-500 mb-1">Estimasi Nilai</p>
                <p className="text-2xl font-bold text-amber-600">{totalValue > 0 ? `Rp ${(totalValue / 1000).toFixed(0)}rb` : '-'}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500 mb-1">Tanaman Terbanyak</p>
                <p className="text-lg font-bold text-purple-700 truncate">{topPlant}</p>
              </div>
            </div>

            {filtered.length === 0 ? (
              <p className="text-center text-gray-400 py-8">Tidak ada data pada rentang waktu ini</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b text-gray-500 text-left">
                      <th className="pb-2 font-medium">Tanggal</th>
                      <th className="pb-2 font-medium">Kebun</th>
                      <th className="pb-2 font-medium">Tanaman</th>
                      <th className="pb-2 font-medium text-center">Jumlah (kg)</th>
                      <th className="pb-2 font-medium text-center">Harga/kg</th>
                      <th className="pb-2 font-medium">Petani</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {filtered.slice(0, 25).map(p => (
                      <tr key={p.id} className="hover:bg-gray-50">
                        <td className="py-2 text-gray-700">{formatDate(p.tanggalPanen)}</td>
                        <td className="py-2 text-gray-700">{p.farm.name}</td>
                        <td className="py-2 text-gray-700">{p.plantType.name}</td>
                        <td className="py-2 text-center font-semibold text-green-700">{p.jumlahKg}</td>
                        <td className="py-2 text-center text-gray-600">{p.hargaJual ? `Rp ${p.hargaJual.toLocaleString('id-ID')}` : '—'}</td>
                        <td className="py-2 text-gray-600">{p.petani.name}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {filtered.length > 25 && (
                  <p className="text-xs text-gray-400 mt-3 text-center">
                    Menampilkan 25 dari {filtered.length} catatan — export untuk data lengkap
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
