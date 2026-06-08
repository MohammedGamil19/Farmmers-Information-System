'use client'
import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { api } from '@/lib/api'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { toast } from '@/components/ui/toaster'
import {
  ArrowLeft, FlaskConical, MapPin,
  Cpu, Copy, RefreshCw, Unplug, Eye, EyeOff, CheckCheck, Wifi,
  ChevronRight, AlertCircle,
} from 'lucide-react'
import {
  calculateExpectedStage, getNextStage, isStageBehind,
  STAGE_LABELS, STAGE_EMOJI, STAGES, daysSincePlanting, stageDayRange,
} from '@/lib/farm-stages'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { formatDate, getCropStageLabel, getFarmStatusLabel } from '@/lib/utils'
import { getPhRecommendations, getTdsRecommendations } from '@/lib/recommendations'
import Link from 'next/link'

// ── PDF Report Generator ───────────────────────────────────────────────────────
async function generateCyclePDF(
  farm: Record<string, unknown>,
  records: Record<string, unknown>[],
) {
  const { default: jsPDF } = await import('jspdf')
  const { default: autoTable } = await import('jspdf-autotable')

  const pt      = farm.plantType as Record<string, unknown>
  const owner   = farm.owner    as Record<string, unknown>
  const village = farm.village  as Record<string, unknown>
  const doc     = new jsPDF()
  const green   = [22, 163, 74] as [number, number, number]
  const gray    = [107, 114, 128] as [number, number, number]

  // ── Header bar ──────────────────────────────────────────────────────────────
  doc.setFillColor(...green)
  doc.rect(0, 0, 210, 28, 'F')
  doc.setTextColor(255, 255, 255)
  doc.setFontSize(16)
  doc.setFont('helvetica', 'bold')
  doc.text('Laporan Siklus Tanam Hidroponik', 14, 12)
  doc.setFontSize(9)
  doc.setFont('helvetica', 'normal')
  doc.text(`Dicetak: ${new Date().toLocaleDateString('id-ID', { dateStyle: 'long' })}`, 14, 21)

  // ── Farm info ────────────────────────────────────────────────────────────────
  doc.setTextColor(30, 30, 30)
  doc.setFontSize(13)
  doc.setFont('helvetica', 'bold')
  doc.text(farm.name as string, 14, 38)
  doc.setFontSize(9)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(...gray)
  doc.text(`Desa: ${village?.name ?? '-'}  |  Pemilik: ${owner?.name ?? '-'}  |  Tanaman: ${pt?.name ?? '-'}`, 14, 45)

  // ── Cycle summary box ────────────────────────────────────────────────────────
  doc.setDrawColor(220, 252, 231)
  doc.setFillColor(240, 253, 244)
  doc.roundedRect(14, 50, 182, 28, 3, 3, 'FD')
  doc.setTextColor(30, 30, 30)
  doc.setFontSize(8)
  doc.setFont('helvetica', 'bold')
  doc.text('RINGKASAN SIKLUS', 20, 58)

  const planted  = farm.plantingDate  ? new Date(farm.plantingDate  as string).toLocaleDateString('id-ID', { dateStyle: 'medium' }) : '-'
  const harvested = farm.estimatedHarvest ? new Date(farm.estimatedHarvest as string).toLocaleDateString('id-ID', { dateStyle: 'medium' }) : '-'
  const totalRec = records.length
  const phVals   = records.map(r => r.phValue  as number).filter(Boolean)
  const tdsVals  = records.map(r => r.tdsValue as number).filter(Boolean)
  const avgPh    = phVals.length  ? (phVals.reduce((a, b) => a + b, 0)  / phVals.length).toFixed(2)  : '-'
  const avgTds   = tdsVals.length ? (tdsVals.reduce((a, b) => a + b, 0) / tdsVals.length).toFixed(0) : '-'
  const abnormal = records.filter(r => r.status === 'ABNORMAL' || r.status === 'WARNING').length

  doc.setFont('helvetica', 'normal')
  const cols = [
    [`Tanggal Tanam: ${planted}`, `Estimasi Panen: ${harvested}`],
    [`Total Monitoring: ${totalRec} catatan`, `Data Abnormal: ${abnormal} catatan`],
    [`Rata-rata pH: ${avgPh}`, `Rata-rata TDS: ${avgTds} ppm`],
  ]
  let cy = 65
  cols.forEach(row => {
    doc.text(row[0], 20, cy)
    doc.text(row[1], 110, cy)
    cy += 6
  })

  // ── Table ─────────────────────────────────────────────────────────────────────
  doc.setTextColor(30, 30, 30)
  doc.setFontSize(10)
  doc.setFont('helvetica', 'bold')
  doc.text('Detail Catatan Monitoring', 14, 86)

  autoTable(doc, {
    startY: 90,
    head: [['No', 'Tanggal', 'pH', 'TDS (ppm)', 'Status', 'Tindakan']],
    body: records.map((r, i) => [
      i + 1,
      new Date(r.date as string).toLocaleDateString('id-ID', { dateStyle: 'short' }),
      (r.phValue  as number)?.toFixed(2) ?? '-',
      (r.tdsValue as number)?.toFixed(0) ?? '-',
      r.status === 'NORMAL' ? 'Normal' : r.status === 'ABNORMAL' ? 'Abnormal' : 'Peringatan',
      (r.actionTaken as string) || '-',
    ]),
    styles:       { fontSize: 8, cellPadding: 2.5 },
    headStyles:   { fillColor: green, textColor: 255, fontStyle: 'bold' },
    columnStyles: {
      0: { cellWidth: 10, halign: 'center' },
      2: { cellWidth: 16, halign: 'center' },
      3: { cellWidth: 22, halign: 'center' },
      4: { cellWidth: 24, halign: 'center' },
    },
    alternateRowStyles: { fillColor: [248, 250, 252] },
    didDrawCell: (data) => {
      if (data.column.index === 4 && data.section === 'body') {
        const val = data.cell.raw as string
        if (val === 'Abnormal') {
          doc.setTextColor(185, 28, 28)
        } else if (val === 'Peringatan') {
          doc.setTextColor(180, 83, 9)
        } else {
          doc.setTextColor(21, 128, 61)
        }
      }
    },
  })

  // ── Footer ───────────────────────────────────────────────────────────────────
  const pageCount = (doc as unknown as { internal: { getNumberOfPages: () => number } }).internal.getNumberOfPages()
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i)
    doc.setFontSize(7)
    doc.setTextColor(...gray)
    doc.text(
      `Sistem Monitoring Hidroponik  |  Halaman ${i} dari ${pageCount}`,
      14,
      doc.internal.pageSize.height - 8,
    )
  }

  doc.save(`Laporan_Siklus_${(farm.name as string).replace(/\s+/g, '_')}_${new Date().toISOString().slice(0, 10)}.pdf`)
}

// ── New Cycle Button (shown when HARVESTED) ────────────────────────────────────
function NewCycleButton({
  farmId, onStarted,
}: {
  farmId: string
  onStarted: (data: Record<string, unknown>) => void
}) {
  const [open,        setOpen]        = useState(false)
  const [step,        setStep]        = useState<'report' | 'details'>('report')
  const [wantReport,  setWantReport]  = useState<boolean | null>(null)
  const [date,        setDate]        = useState(() => new Date().toISOString().slice(0, 10))
  const [plantTypeId, setPlantTypeId] = useState('')
  const [plantTypes,  setPlantTypes]  = useState<Record<string, unknown>[]>([])
  const [loading,     setLoading]     = useState(false)
  const [farmData,    setFarmData]    = useState<Record<string, unknown> | null>(null)
  const [records,     setRecords]     = useState<Record<string, unknown>[]>([])

  const openModal = async () => {
    setStep('report')
    setWantReport(null)
    setDate(new Date().toISOString().slice(0, 10))
    setOpen(true)
    try {
      const [farmRes, recRes, ptRes] = await Promise.all([
        api.get(`/api/farms/${farmId}`),
        api.get(`/api/monitoring?farmId=${farmId}&limit=500`),
        api.get('/api/plant-types'),
      ])
      setFarmData(farmRes.farm)
      setRecords(recRes.records ?? [])
      setPlantTypes(ptRes.plantTypes ?? [])
      // Pre-select current plant type
      const currentPtId = (farmRes.farm as Record<string, unknown>)?.plantTypeId as string
      setPlantTypeId(currentPtId ?? '')
    } catch { /* non-blocking */ }
  }

  const confirm = async () => {
    setLoading(true)
    try {
      if (wantReport && farmData) await generateCyclePDF(farmData, records)
      await api.delete(`/api/farms/${farmId}/records`)
      const data = await api.put(`/api/farms/${farmId}`, {
        cropStage:    'SEEDLING',
        plantingDate: date,
        ...(plantTypeId && { plantTypeId }),
      })
      toast('success', 'Siklus tanam baru berhasil dimulai 🌱')
      onStarted(data)
      setOpen(false)
    } catch {
      toast('error', 'Gagal memulai siklus baru')
    } finally { setLoading(false) }
  }

  // Derived: selected plant type name for summary display
  const selectedPt = plantTypes.find(p => (p as Record<string, unknown>).id === plantTypeId) as Record<string, unknown> | undefined

  return (
    <>
      <button
        onClick={openModal}
        className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold bg-green-600 hover:bg-green-700 text-white transition-colors shadow-sm"
      >
        <span>🔄</span> Mulai Siklus Tanam Baru
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">

            {/* ── Modal Header ── */}
            <div className="bg-gradient-to-r from-green-600 to-green-500 px-6 py-5">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 bg-white/20 rounded-xl flex items-center justify-center text-2xl">🌱</div>
                <div>
                  <h2 className="text-base font-bold text-white">Mulai Siklus Tanam Baru</h2>
                  <p className="text-xs text-green-100">
                    {step === 'report' ? 'Langkah 1 dari 2 — Laporan Siklus' : 'Langkah 2 dari 2 — Detail Siklus Baru'}
                  </p>
                </div>
              </div>
              {/* Step indicator */}
              <div className="flex gap-2 mt-4">
                {['report', 'details'].map((s, i) => (
                  <div key={s} className={`h-1.5 flex-1 rounded-full transition-colors ${step === s || (i === 0 && step === 'details') ? 'bg-white' : 'bg-white/30'}`} />
                ))}
              </div>
            </div>

            <div className="p-6">
              {/* ── Step 1: Report choice ── */}
              {step === 'report' && (
                <>
                  <p className="text-sm text-gray-600 mb-5">
                    Siklus tanam sebelumnya telah selesai. Apakah Anda ingin menyimpan
                    <strong className="text-gray-800"> laporan lengkap siklus ini</strong> sebelum memulai yang baru?
                  </p>

                  <div className="grid grid-cols-2 gap-3 mb-5">
                    {/* Yes — Download Report */}
                    <button
                      onClick={() => setWantReport(true)}
                      className={`flex flex-col items-center gap-2 p-4 rounded-xl border-2 text-sm font-medium transition-all ${
                        wantReport === true
                          ? 'border-green-500 bg-green-50 text-green-800'
                          : 'border-gray-200 text-gray-600 hover:border-green-300 hover:bg-green-50/50'
                      }`}
                    >
                      <span className="text-3xl">📄</span>
                      <span className="font-semibold">Ya, Unduh Laporan</span>
                      <span className="text-xs text-gray-500 text-center leading-tight">Simpan PDF ringkasan siklus ini</span>
                    </button>

                    {/* No — Skip */}
                    <button
                      onClick={() => setWantReport(false)}
                      className={`flex flex-col items-center gap-2 p-4 rounded-xl border-2 text-sm font-medium transition-all ${
                        wantReport === false
                          ? 'border-blue-500 bg-blue-50 text-blue-800'
                          : 'border-gray-200 text-gray-600 hover:border-blue-300 hover:bg-blue-50/50'
                      }`}
                    >
                      <span className="text-3xl">🚀</span>
                      <span className="font-semibold">Tidak, Langsung Mulai</span>
                      <span className="text-xs text-gray-500 text-center leading-tight">Hapus data & mulai siklus baru</span>
                    </button>
                  </div>

                  {wantReport !== null && (
                    <div className={`rounded-xl p-3 mb-4 text-xs flex items-start gap-2 ${wantReport ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-amber-50 text-amber-700 border border-amber-200'}`}>
                      <span className="text-base mt-0.5">{wantReport ? '📥' : '⚠️'}</span>
                      <span>
                        {wantReport
                          ? 'Laporan PDF akan diunduh secara otomatis sebelum data dihapus.'
                          : 'Seluruh data monitoring siklus ini akan dihapus permanen. Tindakan ini tidak dapat dibatalkan.'}
                      </span>
                    </div>
                  )}

                  <div className="flex gap-3">
                    <button onClick={() => setOpen(false)} className="flex-1 px-4 py-2.5 rounded-xl border border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors">
                      Batal
                    </button>
                    <button
                      onClick={() => setStep('details')}
                      disabled={wantReport === null}
                      className="flex-1 px-4 py-2.5 rounded-xl bg-green-600 hover:bg-green-700 text-white text-sm font-semibold transition-colors disabled:opacity-40"
                    >
                      Lanjut →
                    </button>
                  </div>
                </>
              )}

              {/* ── Step 2: New cycle details ── */}
              {step === 'details' && (
                <>
                  <p className="text-sm text-gray-600 mb-4">
                    Konfirmasi atau perbarui detail kebun untuk siklus tanam yang baru.
                  </p>

                  {/* Plant type */}
                  <label className="block mb-3">
                    <span className="text-sm font-medium text-gray-700 mb-1.5 block">🌿 Jenis Tanaman</span>
                    <select
                      value={plantTypeId}
                      onChange={e => setPlantTypeId(e.target.value)}
                      className="w-full border border-gray-300 rounded-xl px-3 py-2.5 text-sm bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-green-500 [&>option]:text-gray-900"
                    >
                      <option value="">— Pilih jenis tanaman —</option>
                      {plantTypes.map(pt => {
                        const p = pt as Record<string, unknown>
                        return (
                          <option key={p.id as string} value={p.id as string}>
                            {p.name as string} ({p.growthDays as number} hari)
                          </option>
                        )
                      })}
                    </select>
                  </label>

                  {/* Planting date */}
                  <label className="block mb-4">
                    <span className="text-sm font-medium text-gray-700 mb-1.5 block">📅 Tanggal Mulai Tanam</span>
                    <input
                      type="date"
                      value={date}
                      max={new Date().toISOString().slice(0, 10)}
                      onChange={e => setDate(e.target.value)}
                      className="w-full border border-gray-300 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                    />
                  </label>

                  {/* Summary box */}
                  <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 mb-5 space-y-2 text-xs text-gray-600">
                    <p className="font-semibold text-gray-700 text-sm mb-2">Ringkasan perubahan:</p>
                    <div className="flex items-center gap-2"><span className="text-red-500">✕</span> Seluruh data monitoring siklus lama dihapus</div>
                    {wantReport && <div className="flex items-center gap-2"><span className="text-green-600">✓</span> Laporan PDF diunduh sebelum penghapusan</div>}
                    <div className="flex items-center gap-2"><span className="text-green-600">✓</span> Tahap pertumbuhan → <strong>Persemaian</strong></div>
                    {selectedPt && <div className="flex items-center gap-2"><span className="text-green-600">✓</span> Jenis tanaman → <strong>{selectedPt.name as string}</strong></div>}
                    <div className="flex items-center gap-2"><span className="text-green-600">✓</span> Tanggal tanam → <strong>{date ? new Date(date).toLocaleDateString('id-ID', { dateStyle: 'long' }) : '—'}</strong></div>
                    {selectedPt && date && (
                      <div className="flex items-center gap-2">
                        <span className="text-green-600">✓</span>
                        Estimasi panen → <strong>
                          {new Date(new Date(date).getTime() + (selectedPt.growthDays as number) * 86400000)
                            .toLocaleDateString('id-ID', { dateStyle: 'long' })}
                        </strong>
                      </div>
                    )}
                  </div>

                  <div className="flex gap-3">
                    <button
                      onClick={() => setStep('report')}
                      disabled={loading}
                      className="flex-1 px-4 py-2.5 rounded-xl border border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors disabled:opacity-50"
                    >
                      ← Kembali
                    </button>
                    <button
                      onClick={confirm}
                      disabled={loading || !date || !plantTypeId}
                      className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-green-600 hover:bg-green-700 text-white text-sm font-semibold transition-colors disabled:opacity-50"
                    >
                      {loading
                        ? <><span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" /><span>Memproses…</span></>
                        : <><span>🌱</span><span>Mulai Siklus Baru</span></>}
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  )
}

// ── Stage Advance Banner ──────────────────────────────────────────────────────
function StageBanner({
  farmId, currentStage, expectedStage, growthDays, onConfirmed,
}: {
  farmId: string; currentStage: string; expectedStage: string
  growthDays: number; onConfirmed: (newStage: string) => void
}) {
  const [confirming, setConfirming] = useState(false)
  const nextStage = getNextStage(currentStage)
  if (!nextStage || !isStageBehind(currentStage, expectedStage)) return null

  const nextIdx   = STAGES.indexOf(nextStage)
  const stageNum  = nextIdx + 1

  const confirm = async () => {
    setConfirming(true)
    try {
      await api.put(`/api/farms/${farmId}`, { cropStage: nextStage })
      toast('success', `Tahap diperbarui ke: ${STAGE_LABELS[nextStage]}`)
      onConfirmed(nextStage)
    } catch {
      toast('error', 'Gagal memperbarui tahap')
    } finally { setConfirming(false) }
  }

  return (
    <div className="mb-6 bg-amber-50 border-2 border-amber-300 rounded-2xl p-4">
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 bg-amber-100 rounded-xl flex items-center justify-center shrink-0 text-xl">
          {STAGE_EMOJI[nextStage as keyof typeof STAGE_EMOJI]}
        </div>
        <div className="flex-1">
          <p className="font-bold text-amber-900 flex items-center gap-2">
            <AlertCircle size={16} />
            Saatnya Lanjut ke Tahap {stageNum} — {STAGE_LABELS[nextStage as keyof typeof STAGE_LABELS]}
          </p>
          <p className="text-sm text-amber-700 mt-1">
            Berdasarkan tanggal tanam dan durasi tumbuh (<strong>{growthDays} hari</strong>),
            kebun ini seharusnya sudah berada di tahap{' '}
            <strong>{STAGE_LABELS[nextStage as keyof typeof STAGE_LABELS]}</strong>{' '}
            ({stageDayRange(nextIdx, growthDays)}).
            Konfirmasi untuk memperbarui tahap pertumbuhan.
          </p>
          <div className="flex items-center gap-3 mt-3">
            <button
              onClick={confirm}
              disabled={confirming}
              className="flex items-center gap-2 bg-amber-600 hover:bg-amber-700 text-white px-4 py-2 rounded-xl text-sm font-semibold transition-colors disabled:opacity-50"
            >
              <span className="flex items-center justify-center w-4 h-4">
                {confirming
                  ? <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  : <ChevronRight size={15} />}
              </span>
              <span>Konfirmasi — Lanjut ke {STAGE_LABELS[nextStage as keyof typeof STAGE_LABELS]}</span>
            </button>
            <span className="text-xs text-amber-600">Tahap saat ini: {STAGE_LABELS[currentStage as keyof typeof STAGE_LABELS] ?? currentStage}</span>
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Next Stage Button (manual advance) ────────────────────────────────────────
function NextStageButton({
  farmId, currentStage, onAdvanced,
}: {
  farmId: string; currentStage: string; onAdvanced: (newStage: string) => void
}) {
  const [open,     setOpen]     = useState(false)
  const [advancing, setAdvancing] = useState(false)
  const nextStage = getNextStage(currentStage)
  if (!nextStage) return null

  const nextLabel = STAGE_LABELS[nextStage as keyof typeof STAGE_LABELS]
  const nextEmoji = STAGE_EMOJI[nextStage  as keyof typeof STAGE_EMOJI]
  const currLabel = STAGE_LABELS[currentStage as keyof typeof STAGE_LABELS] ?? currentStage

  const advance = async () => {
    setAdvancing(true)
    try {
      await api.put(`/api/farms/${farmId}`, { cropStage: nextStage })
      toast('success', `Tahap diperbarui ke: ${nextLabel}`)
      onAdvanced(nextStage)
      setOpen(false)
    } catch {
      toast('error', 'Gagal memperbarui tahap')
    } finally { setAdvancing(false) }
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium border-2 border-green-300 text-green-700 bg-green-50 hover:bg-green-100 transition-colors"
      >
        <ChevronRight size={14} />
        <span>{nextEmoji} Lanjut ke {nextLabel}</span>
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center text-2xl shrink-0">
                {nextEmoji}
              </div>
              <div>
                <h2 className="text-base font-bold text-gray-800">Konfirmasi Kemajuan Tahap</h2>
                <p className="text-sm text-gray-500">Perbarui tahap pertumbuhan kebun</p>
              </div>
            </div>

            <div className="bg-gray-50 rounded-xl p-4 mb-5 space-y-2 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-gray-500">Tahap saat ini</span>
                <span className="font-medium text-gray-700">{currLabel}</span>
              </div>
              <div className="flex items-center justify-center text-gray-400 text-lg">↓</div>
              <div className="flex items-center justify-between">
                <span className="text-gray-500">Tahap berikutnya</span>
                <span className="font-semibold text-green-700">{nextEmoji} {nextLabel}</span>
              </div>
            </div>

            <p className="text-xs text-gray-400 mb-5 text-center">
              Pastikan kondisi kebun sudah sesuai sebelum melanjutkan ke tahap berikutnya.
            </p>

            <div className="flex gap-3">
              <button
                onClick={() => setOpen(false)}
                disabled={advancing}
                className="flex-1 px-4 py-2.5 rounded-xl border border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors disabled:opacity-50"
              >
                Batal
              </button>
              <button
                onClick={advance}
                disabled={advancing}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-green-600 hover:bg-green-700 text-white text-sm font-semibold transition-colors disabled:opacity-50"
              >
                {advancing
                  ? <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  : <span>{nextEmoji}</span>}
                <span>Ya, Lanjutkan</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

// ── Device Connection Card ─────────────────────────────────────────────────────
function DeviceCard({ farmId, initialToken }: { farmId: string; initialToken: string | null }) {
  const [token,       setToken]       = useState<string | null>(initialToken)
  const [visible,     setVisible]     = useState(false)
  const [generating,  setGenerating]  = useState(false)
  const [revoking,    setRevoking]    = useState(false)
  const [copied,      setCopied]      = useState(false)

  const generate = async () => {
    setGenerating(true)
    try {
      const data = await api.post(`/api/farms/${farmId}/token`, {})
      setToken(data.token)
      setVisible(true)
      toast('success', 'Token berhasil dibuat')
    } catch {
      toast('error', 'Gagal membuat token')
    } finally { setGenerating(false) }
  }

  const revoke = async () => {
    if (!confirm('Cabut token? Perangkat tidak akan bisa mengirim data lagi sampai token baru dibuat.')) return
    setRevoking(true)
    try {
      await api.delete(`/api/farms/${farmId}/token`)
      setToken(null)
      setVisible(false)
      toast('success', 'Token dicabut')
    } catch {
      toast('error', 'Gagal mencabut token')
    } finally { setRevoking(false) }
  }

  const copy = async (text: string) => {
    await navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const masked = token ? `hydro_${'•'.repeat(32)}` : ''

  return (
    <Card className="mb-6 border-2 border-dashed border-green-200 bg-green-50/30">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Cpu size={18} className="text-green-600" />
          Koneksi Perangkat Sensor
          {token && (
            <span className="ml-auto flex items-center gap-1.5 text-xs font-medium text-green-700 bg-green-100 px-2.5 py-1 rounded-full">
              <Wifi size={12} />Perangkat Terhubung
            </span>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {!token ? (
          /* No token yet */
          <div className="text-center py-4 space-y-3">
            <div className="w-14 h-14 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto">
              <Cpu size={28} className="text-gray-400" />
            </div>
            <div>
              <p className="font-semibold text-gray-700">Belum Ada Perangkat Terhubung</p>
              <p className="text-sm text-gray-500 mt-1">
                Generate token untuk menghubungkan sensor ESP32 ke kebun ini.
                Perangkat akan otomatis mengirim data pH & TDS tanpa input manual.
              </p>
            </div>
            <Button onClick={generate} loading={generating} className="mx-auto">
              <Cpu size={15} />Generate Token Perangkat
            </Button>
          </div>
        ) : (
          /* Token exists */
          <div className="space-y-4">
            {/* How it works */}
            <div className="grid sm:grid-cols-3 gap-3 text-center text-xs">
              {[
                { icon: '📡', label: 'Sensor Baca Data', desc: 'pH, TDS, Suhu' },
                { icon: '📶', label: 'Kirim via WiFi', desc: 'Otomatis setiap X menit' },
                { icon: '📱', label: 'Tampil di Dashboard', desc: 'Klasifikasi & notifikasi' },
              ].map((s, i) => (
                <div key={i} className="bg-white rounded-xl p-3 border border-green-100">
                  <div className="text-2xl mb-1">{s.icon}</div>
                  <p className="font-semibold text-gray-700">{s.label}</p>
                  <p className="text-gray-400">{s.desc}</p>
                </div>
              ))}
            </div>

            {/* Farm ID */}
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1.5 uppercase tracking-wide">
                Farm ID
              </label>
              <div className="flex items-center gap-2">
                <code className="flex-1 bg-gray-100 border border-gray-200 rounded-lg px-3 py-2 text-sm font-mono text-gray-700 truncate">
                  {farmId}
                </code>
                <button
                  onClick={() => copy(farmId)}
                  className="p-2 rounded-lg border border-gray-200 hover:bg-gray-100 transition-colors text-gray-500"
                  title="Salin Farm ID"
                >
                  {copied ? <CheckCheck size={15} className="text-green-600" /> : <Copy size={15} />}
                </button>
              </div>
            </div>

            {/* Device Token */}
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1.5 uppercase tracking-wide">
                Device Token
              </label>
              <div className="flex items-center gap-2">
                <code className="flex-1 bg-white border-2 border-green-200 rounded-lg px-3 py-2 text-sm font-mono text-green-800 truncate">
                  {visible ? token : masked}
                </code>
                <button
                  onClick={() => setVisible(v => !v)}
                  className="p-2 rounded-lg border border-gray-200 hover:bg-gray-100 transition-colors text-gray-500"
                  title={visible ? 'Sembunyikan' : 'Tampilkan'}
                >
                  {visible ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
                <button
                  onClick={() => token && copy(token)}
                  className="p-2 rounded-lg border border-gray-200 hover:bg-gray-100 transition-colors text-gray-500"
                  title="Salin token"
                >
                  {copied ? <CheckCheck size={15} className="text-green-600" /> : <Copy size={15} />}
                </button>
              </div>
              <p className="text-xs text-orange-600 mt-1.5 flex items-center gap-1">
                ⚠ Jangan bagikan token ini ke sembarang orang. Hanya berikan ke programmer ESP32.
              </p>
            </div>

            {/* ESP32 code snippet */}
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1.5 uppercase tracking-wide">
                Kode untuk ESP32 (salin ke Arduino IDE)
              </label>
              <div className="relative">
                <pre className="bg-gray-900 text-green-300 rounded-xl p-4 text-xs overflow-x-auto leading-relaxed">
{`const char* WIFI_SSID     = "NamaWiFiFarm";
const char* WIFI_PASSWORD = "PasswordWiFi";
const char* FARM_ID       = "${farmId}";
const char* DEVICE_TOKEN  = "${visible ? token : '(klik 👁 untuk tampilkan token)'}";
const char* SERVER_URL    = "https://your-domain.com/api/device";`}
                </pre>
                <button
                  onClick={() => copy(
`const char* WIFI_SSID     = "NamaWiFiFarm";
const char* WIFI_PASSWORD = "PasswordWiFi";
const char* FARM_ID       = "${farmId}";
const char* DEVICE_TOKEN  = "${token}";
const char* SERVER_URL    = "https://your-domain.com/api/device";`
                  )}
                  className="absolute top-2 right-2 p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white/70 hover:text-white transition-colors"
                  title="Salin kode"
                >
                  {copied ? <CheckCheck size={13} /> : <Copy size={13} />}
                </button>
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-2 flex-wrap pt-1 border-t">
              <button
                onClick={generate}
                disabled={generating}
                className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors disabled:opacity-50"
              >
                <RefreshCw size={13} className={generating ? 'animate-spin' : ''} />
                Regenerate Token
              </button>
              <button
                onClick={revoke}
                disabled={revoking}
                className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm border border-red-200 text-red-600 hover:bg-red-50 transition-colors disabled:opacity-50"
              >
                <Unplug size={13} />
                Cabut Koneksi
              </button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

// ═══════════════════════════════════════════════════════════════════════════════
export default function FarmDetailPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const [farm,    setFarm]    = useState<Record<string, unknown> | null>(null)
  const [loading, setLoading] = useState(true)

  const loadFarm = (showSpinner = false) => {
    if (showSpinner) setLoading(true)
    api.get(`/api/farms/${id}`)
      .then(d => setFarm(d.farm))
      .catch(() => toast('error', 'Gagal memuat data'))
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    loadFarm()
    // Trigger automatic stage notifications in the background
    api.post('/api/farms/check-stages', {}).catch(() => {/* silent */})
  }, [id])

  if (loading) return (
    <div className="flex justify-center py-20">
      <div className="h-10 w-10 animate-spin rounded-full border-4 border-green-600 border-t-transparent" />
    </div>
  )
  if (!farm) return <div className="text-center py-20 text-gray-400">Kebun tidak ditemukan</div>

  const records        = (farm.monitoringRecords as Record<string, unknown>[]) || []
  const pt             = farm.plantType as Record<string, unknown>
  const owner          = farm.owner    as Record<string, unknown>
  const village        = farm.village  as Record<string, unknown>
  const lastRecord     = records[0]
  const phRecs         = lastRecord ? getPhRecommendations(lastRecord.phValue  as number, pt?.minPH  as number, pt?.maxPH  as number) : []
  const tdsRecs        = lastRecord ? getTdsRecommendations(lastRecord.tdsValue as number, pt?.minTDS as number, pt?.maxTDS as number) : []
  const allRecs        = [...phRecs, ...tdsRecs]
  const currentStageIdx = (STAGES as readonly string[]).indexOf(farm.cropStage as string)
  const expectedStage   = pt ? calculateExpectedStage(farm.plantingDate as string, pt.growthDays as number) : (farm.cropStage as string)
  const chartData      = [...records].reverse().map(r => ({
    date: formatDate(r.date as string),
    pH:   r.phValue  as number,
    TDS:  r.tdsValue as number,
  }))

  const recColors = {
    danger:  'bg-red-50    border-red-200    text-red-800',
    warning: 'bg-yellow-50 border-yellow-200 text-yellow-800',
    success: 'bg-green-50  border-green-200  text-green-800',
    info:    'bg-blue-50   border-blue-200   text-blue-800',
  }

  return (
    <div>
      {/* Page header */}
      <div className="flex items-center gap-4 mb-6">
        <button onClick={() => router.back()} className="p-2 hover:bg-gray-100 rounded-lg">
          <ArrowLeft size={20} />
        </button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-gray-800">{farm.name as string}</h1>
          <p className="text-gray-500 flex items-center gap-2"><MapPin size={13} />{village?.name as string}</p>
        </div>
        <Badge variant="success">{getFarmStatusLabel(farm.status as string)}</Badge>
        <Link href={`/monitoring?farmId=${id}`}>
          <Button><FlaskConical size={16} />Input Monitoring</Button>
        </Link>
      </div>

      {/* Auto-stage advance banner */}
      <StageBanner
        farmId={id}
        currentStage={farm.cropStage as string}
        expectedStage={expectedStage}
        growthDays={(pt?.growthDays as number) ?? 30}
        onConfirmed={() => loadFarm()}
      />

      {/* Info Cards */}
      <div className="grid md:grid-cols-4 gap-4 mb-6">
        {[
          { label: 'Jenis Tanaman',    value: pt?.name    as string,                                        icon: '🌿' },
          { label: 'Pemilik',          value: owner?.name as string,                                        icon: '👤' },
          { label: 'Tanggal Tanam',    value: formatDate(farm.plantingDate as string),                      icon: '📅' },
          { label: 'Estimasi Panen',   value: farm.estimatedHarvest ? formatDate(farm.estimatedHarvest as string) : '-', icon: '🌾' },
        ].map((item, idx) => (
          <Card key={idx}>
            <CardContent className="p-4 flex items-center gap-3">
              <span className="text-2xl">{item.icon}</span>
              <div>
                <p className="text-xs text-gray-500">{item.label}</p>
                <p className="font-semibold text-gray-800">{item.value}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* ── Device Connection ── */}
      <DeviceCard farmId={id} initialToken={(farm.deviceToken as string | null) ?? null} />

      {/* Crop Stage Timeline */}
      <Card className="mb-6">
        <CardHeader>
          <div className="flex items-center justify-between gap-4">
            <CardTitle>Tahap Pertumbuhan</CardTitle>
            <div className="flex items-center gap-2">
              <NextStageButton
                farmId={id}
                currentStage={farm.cropStage as string}
                onAdvanced={() => loadFarm()}
              />
              {farm.cropStage === 'HARVESTED' && (
                <NewCycleButton farmId={id} onStarted={() => loadFarm(true)} />
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2 overflow-x-auto py-2">
            {STAGES.map((s, i) => (
              <div key={s} className="flex items-center gap-2 flex-shrink-0">
                <div className="flex flex-col items-center gap-1">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold border-2 ${i <= currentStageIdx ? 'bg-green-600 text-white border-green-600' : 'bg-white text-gray-400 border-gray-300'}`}>
                    {i < currentStageIdx ? '✓' : i + 1}
                  </div>
                  <p className={`text-xs text-center ${i <= currentStageIdx ? 'text-green-700 font-medium' : 'text-gray-400'}`}>
                    {getCropStageLabel(s)}
                  </p>
                </div>
                {i < STAGES.length - 1 && (
                  <div className={`h-0.5 w-8 flex-shrink-0 mt-[-14px] ${i < currentStageIdx ? 'bg-green-600' : 'bg-gray-200'}`} />
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <div className="grid lg:grid-cols-3 gap-6 mb-6">
        {/* Chart */}
        <Card className="lg:col-span-2">
          <CardHeader><CardTitle>Riwayat Monitoring</CardTitle></CardHeader>
          <CardContent>
            {chartData.length > 0 ? (
              <ResponsiveContainer width="100%" height={220}>
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="date" tick={{ fontSize: 9 }} />
                  <YAxis yAxisId="ph"  domain={[4, 9]} tick={{ fontSize: 10 }} />
                  <YAxis yAxisId="tds" orientation="right" tick={{ fontSize: 10 }} />
                  <Tooltip />
                  <Line yAxisId="ph"  type="monotone" dataKey="pH"  stroke="#16a34a" strokeWidth={2} dot={{ r: 3 }} />
                  <Line yAxisId="tds" type="monotone" dataKey="TDS" stroke="#2563eb" strokeWidth={2} dot={{ r: 3 }} />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-center text-gray-400 py-10">Belum ada data monitoring</p>
            )}
          </CardContent>
        </Card>

        {/* Recommendations */}
        <Card>
          <CardHeader><CardTitle>Rekomendasi</CardTitle></CardHeader>
          <CardContent>
            {allRecs.length === 0 ? (
              <p className="text-gray-400 text-sm text-center py-4">Belum ada data untuk rekomendasi</p>
            ) : (
              <div className="space-y-3">
                {allRecs.map((r, i) => (
                  <div key={i} className={`border rounded-lg p-3 ${recColors[r.type]}`}>
                    <p className="font-semibold text-sm">{r.title}</p>
                    <p className="text-xs mt-1">{r.message}</p>
                    {r.action && <p className="text-xs font-medium mt-1">💡 {r.action}</p>}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* History Table */}
      <Card>
        <CardHeader><CardTitle>Riwayat Pencatatan</CardTitle></CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-gray-600">
                  <th className="pb-3 text-left font-medium">Tanggal</th>
                  <th className="pb-3 text-left font-medium">pH</th>
                  <th className="pb-3 text-left font-medium">TDS (ppm)</th>
                  <th className="pb-3 text-left font-medium">Suhu</th>
                  <th className="pb-3 text-left font-medium">Sumber</th>
                  <th className="pb-3 text-left font-medium">Status</th>
                  <th className="pb-3 text-left font-medium">Catatan</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {records.map((r: Record<string, unknown>) => (
                  <tr key={r.id as string} className="hover:bg-gray-50 text-gray-800">
                    <td className="py-2.5 text-gray-700">{formatDate(r.date as string)}</td>
                    <td className="py-2.5 font-mono font-semibold">{(r.phValue as number).toFixed(2)}</td>
                    <td className="py-2.5 font-mono font-semibold">{r.tdsValue as number}</td>
                    <td className="py-2.5 text-gray-700">{r.temperature ? `${r.temperature as number}°C` : '-'}</td>
                    <td className="py-2.5">
                      {r.source === 'DEVICE'
                        ? <span className="flex items-center gap-1 text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-medium w-fit">🔌 Sensor</span>
                        : <span className="flex items-center gap-1 text-xs bg-orange-100 text-orange-700 px-2 py-0.5 rounded-full font-medium w-fit">✍️ Manual</span>}
                    </td>
                    <td className="py-2.5">
                      <Badge variant={r.phStatus === 'NORMAL' && r.tdsStatus === 'NORMAL' ? 'success' : 'danger'}>
                        {r.phStatus === 'NORMAL' && r.tdsStatus === 'NORMAL' ? 'Normal' : 'Abnormal'}
                      </Badge>
                    </td>
                    <td className="py-2.5 text-gray-600">{r.notes as string || '-'}</td>
                  </tr>
                ))}
                {records.length === 0 && (
                  <tr><td colSpan={7} className="text-center text-gray-400 py-6">Belum ada catatan</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
