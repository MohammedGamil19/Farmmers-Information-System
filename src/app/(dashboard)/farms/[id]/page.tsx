'use client'
import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { api } from '@/lib/api'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { toast } from '@/components/ui/toaster'
import { ArrowLeft, MapPin, ChevronRight, AlertCircle, Wheat } from 'lucide-react'
import {
  calculateExpectedStage, getNextStage, isStageBehind,
  STAGE_LABELS, STAGE_EMOJI, STAGES, stageDayRange,
} from '@/lib/farm-stages'
import { formatDate, getCropStageLabel, getFarmStatusLabel } from '@/lib/utils'
import Link from 'next/link'

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

  const nextIdx  = STAGES.indexOf(nextStage)
  const stageNum = nextIdx + 1

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
          {STAGE_EMOJI[nextStage]}
        </div>
        <div className="flex-1">
          <p className="font-bold text-amber-900 flex items-center gap-2">
            <AlertCircle size={16} />
            Saatnya Lanjut ke Tahap {stageNum} — {STAGE_LABELS[nextStage]}
          </p>
          <p className="text-sm text-amber-700 mt-1">
            Berdasarkan tanggal tanam dan durasi tumbuh (<strong>{growthDays} hari</strong>),
            kebun ini seharusnya sudah berada di tahap{' '}
            <strong>{STAGE_LABELS[nextStage]}</strong> ({stageDayRange(nextIdx, growthDays)}).
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
              <span>Konfirmasi — Lanjut ke {STAGE_LABELS[nextStage]}</span>
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
  const [open, setOpen] = useState(false)
  const [advancing, setAdvancing] = useState(false)
  const nextStage = getNextStage(currentStage)
  if (!nextStage) return null

  const nextLabel = STAGE_LABELS[nextStage]
  const nextEmoji = STAGE_EMOJI[nextStage]
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

// ── Start New Cycle Button (shown when HARVESTED) ──────────────────────────────
function NewCycleButton({ farmId, currentPlantTypeId, onStarted }: {
  farmId: string; currentPlantTypeId: string; onStarted: () => void
}) {
  const [open, setOpen] = useState(false)
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10))
  const [plantTypeId, setPlantTypeId] = useState(currentPlantTypeId)
  const [plantTypes, setPlantTypes] = useState<Record<string, unknown>[]>([])
  const [loading, setLoading] = useState(false)

  const openModal = async () => {
    setDate(new Date().toISOString().slice(0, 10))
    setPlantTypeId(currentPlantTypeId)
    setOpen(true)
    try {
      const ptRes = await api.get('/api/plant-types')
      setPlantTypes(ptRes.plantTypes ?? [])
    } catch { /* non-blocking */ }
  }

  const confirm = async () => {
    setLoading(true)
    try {
      await api.put(`/api/farms/${farmId}`, {
        cropStage: 'SEEDLING',
        plantingDate: date,
        ...(plantTypeId && { plantTypeId }),
      })
      toast('success', 'Siklus tanam baru berhasil dimulai 🌱')
      onStarted()
      setOpen(false)
    } catch {
      toast('error', 'Gagal memulai siklus baru')
    } finally { setLoading(false) }
  }

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
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-11 h-11 bg-green-100 rounded-xl flex items-center justify-center text-2xl shrink-0">🌱</div>
              <div>
                <h2 className="text-base font-bold text-gray-800">Mulai Siklus Tanam Baru</h2>
                <p className="text-sm text-gray-500">Perbarui detail kebun untuk siklus baru</p>
              </div>
            </div>

            <label className="block mb-3">
              <span className="text-sm font-medium text-gray-700 mb-1.5 block">🌿 Jenis Tanaman</span>
              <select
                value={plantTypeId}
                onChange={e => setPlantTypeId(e.target.value)}
                className="w-full border border-gray-300 rounded-xl px-3 py-2.5 text-sm bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-green-500"
              >
                <option value="">— Pilih jenis tanaman —</option>
                {plantTypes.map(pt => {
                  const p = pt as Record<string, unknown>
                  return <option key={p.id as string} value={p.id as string}>{p.name as string} ({p.growthDays as number} hari)</option>
                })}
              </select>
            </label>

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

            {selectedPt && date && (
              <div className="bg-gray-50 border border-gray-200 rounded-xl p-3 mb-5 text-xs text-gray-600">
                Estimasi panen → <strong>
                  {new Date(new Date(date).getTime() + (selectedPt.growthDays as number) * 86400000)
                    .toLocaleDateString('id-ID', { dateStyle: 'long' })}
                </strong>
              </div>
            )}

            <div className="flex gap-3">
              <button
                onClick={() => setOpen(false)}
                disabled={loading}
                className="flex-1 px-4 py-2.5 rounded-xl border border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors disabled:opacity-50"
              >
                Batal
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
          </div>
        </div>
      )}
    </>
  )
}

// ═══════════════════════════════════════════════════════════════════════════════
export default function FarmDetailPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const [farm, setFarm] = useState<Record<string, unknown> | null>(null)
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
    // Trigger automatic stage/harvest-reminder notifications in the background
    api.post('/api/farms/check-stages', {}).catch(() => {/* silent */})
  }, [id])

  if (loading) return (
    <div className="flex justify-center py-20">
      <div className="h-10 w-10 animate-spin rounded-full border-4 border-green-600 border-t-transparent" />
    </div>
  )
  if (!farm) return <div className="text-center py-20 text-gray-400">Kebun tidak ditemukan</div>

  const panens          = (farm.panens as Record<string, unknown>[]) || []
  const pt              = farm.plantType as Record<string, unknown>
  const owner           = farm.owner as Record<string, unknown>
  const village         = farm.village as Record<string, unknown>
  const currentStageIdx = (STAGES as readonly string[]).indexOf(farm.cropStage as string)
  const expectedStage   = pt ? calculateExpectedStage(farm.plantingDate as string, pt.growthDays as number) : (farm.cropStage as string)
  const totalHarvestKg  = panens.reduce((s, p) => s + (p.jumlahKg as number), 0)

  return (
    <div>
      {/* Page header */}
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-2">
          <button onClick={() => router.back()} className="p-2 hover:bg-gray-100 rounded-lg shrink-0">
            <ArrowLeft size={20} />
          </button>
          <div className="flex-1 min-w-0">
            <h1 className="text-xl sm:text-2xl font-bold text-gray-800 truncate">{farm.name as string}</h1>
            <p className="text-gray-500 text-sm flex items-center gap-1"><MapPin size={12} />{village?.name as string}</p>
          </div>
          <Badge variant="success" className="shrink-0">{getFarmStatusLabel(farm.status as string)}</Badge>
        </div>
        <div className="ml-11">
          <Link href="/panen">
            <Button size="sm"><Wheat size={15} />Catat Panen</Button>
          </Link>
        </div>
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
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        {[
          { label: 'Jenis Tanaman',  value: pt?.name as string, icon: '🌿' },
          { label: 'Pemilik',        value: owner?.name as string, icon: '👤' },
          { label: 'Tanggal Tanam',  value: formatDate(farm.plantingDate as string), icon: '📅' },
          { label: 'Estimasi Panen', value: farm.estimatedHarvest ? formatDate(farm.estimatedHarvest as string) : '-', icon: '🌾' },
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

      {/* Crop Stage Timeline */}
      <Card className="mb-6">
        <CardHeader>
          <div className="flex items-start justify-between gap-3 flex-wrap">
            <CardTitle>Tahap Pertumbuhan</CardTitle>
            <div className="flex items-center gap-2 flex-wrap">
              <NextStageButton
                farmId={id}
                currentStage={farm.cropStage as string}
                onAdvanced={() => loadFarm()}
              />
              {farm.cropStage === 'HARVESTED' && (
                <NewCycleButton farmId={id} currentPlantTypeId={(farm.plantTypeId as string) ?? (pt?.id as string) ?? ''} onStarted={() => loadFarm(true)} />
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

      {/* Harvest History for this garden */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between flex-wrap gap-2">
            <CardTitle className="flex items-center gap-2"><Wheat size={18} />Riwayat Panen Kebun Ini</CardTitle>
            <span className="text-sm font-semibold text-green-700 bg-green-50 px-3 py-1 rounded-full">
              Total: {totalHarvestKg.toFixed(1)} kg
            </span>
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-gray-600">
                  <th className="pb-3 text-left font-medium">Tanggal Panen</th>
                  <th className="pb-3 text-left font-medium">Jenis Tanaman</th>
                  <th className="pb-3 text-left font-medium">Jumlah (kg)</th>
                  <th className="pb-3 text-left font-medium">Harga Jual/kg</th>
                  <th className="pb-3 text-left font-medium">Petani</th>
                  <th className="pb-3 text-left font-medium">Catatan</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {panens.map((r: Record<string, unknown>) => {
                  const rpt = r.plantType as Record<string, unknown>
                  const rpetani = r.petani as Record<string, unknown>
                  return (
                    <tr key={r.id as string} className="hover:bg-gray-50 text-gray-800">
                      <td className="py-2.5 text-gray-700">{formatDate(r.tanggalPanen as string)}</td>
                      <td className="py-2.5">
                        <Badge variant="info">{rpt?.name as string}</Badge>
                      </td>
                      <td className="py-2.5 font-semibold text-green-700">{r.jumlahKg as number} kg</td>
                      <td className="py-2.5 text-gray-600">{r.hargaJual ? `Rp ${(r.hargaJual as number).toLocaleString('id-ID')}` : '-'}</td>
                      <td className="py-2.5 text-gray-600">{rpetani?.name as string}</td>
                      <td className="py-2.5 text-gray-600">{(r.catatan as string) || '-'}</td>
                    </tr>
                  )
                })}
                {panens.length === 0 && (
                  <tr><td colSpan={6} className="text-center text-gray-400 py-6">Belum ada catatan panen untuk kebun ini</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
