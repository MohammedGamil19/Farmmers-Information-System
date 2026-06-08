'use client'
import { useEffect, useState, useMemo } from 'react'
import { useSearchParams } from 'next/navigation'
import { api } from '@/lib/api'
import { useAuth } from '@/lib/auth-context'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { Modal } from '@/components/ui/modal'
import { toast } from '@/components/ui/toaster'
import { getPhRecommendations, getTdsRecommendations, getPhStatus, getTdsStatus } from '@/lib/recommendations'
import {
  Plus, FlaskConical, AlertTriangle, CheckCircle,
  Pencil, Trash2, Clock, Droplets, Thermometer,
  ChevronDown, ChevronUp, Sprout, Wrench, ArrowLeft,
} from 'lucide-react'
import { formatDateTime } from '@/lib/utils'

type PlantType = { name: string; minPH: number; maxPH: number; minTDS: number; maxTDS: number }
type MonitoringRecord = {
  id: string; date: string; phValue: number; tdsValue: number
  temperature: number | null; humidity: number | null; notes: string | null
  phStatus: string; tdsStatus: string; actionTaken: string | null
  source: string
  farm: { id: string; name: string; plantType: PlantType }
}

const localNow = () => { const d = new Date(); return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16) }

const EMPTY_FORM = {
  farmId: '', date: localNow(),
  phValue: '', tdsValue: '', temperature: '', humidity: '', notes: '',
}

// ── Derive action options based on what is abnormal ───────────────────────────
function getActionOptions(ph: number, tds: number, pt: PlantType): string[] {
  const opts: string[] = []
  if (ph < pt.minPH) {
    opts.push('Menambahkan larutan pH Up ke tandon nutrisi')
    opts.push('Mengganti sebagian larutan dan menambahkan pH Up')
  }
  if (ph > pt.maxPH) {
    opts.push('Menambahkan larutan pH Down ke tandon nutrisi')
    opts.push('Menambahkan air bersih untuk menurunkan pH')
  }
  if (tds < pt.minTDS) {
    opts.push('Menambahkan konsentrat nutrisi ke tandon')
    opts.push('Memeriksa sistem dan mengisi ulang larutan nutrisi')
  }
  if (tds > pt.maxTDS) {
    opts.push('Mengencerkan larutan dengan menambahkan air bersih')
    opts.push('Mengganti sebagian larutan dengan air bersih')
  }
  opts.push('Belum ada tindakan — akan dipantau lebih lanjut')
  return opts
}

// ── Visual pH bar ─────────────────────────────────────────────────────────────
function PhBar({ value, min, max }: { value: number; min: number; max: number }) {
  const pct    = ((value - 0) / 14) * 100
  const minPct = (min / 14) * 100
  const maxPct = (max / 14) * 100
  const ok = value >= min && value <= max
  return (
    <div className="w-full">
      <div className="relative h-3 rounded-full bg-gray-100 overflow-hidden">
        <div className="absolute h-full bg-green-100" style={{ left: `${minPct}%`, width: `${maxPct - minPct}%` }} />
        <div className={`absolute top-0 bottom-0 w-2.5 rounded-full -translate-x-1/2 ${ok ? 'bg-green-500' : 'bg-red-500'}`} style={{ left: `${pct}%` }} />
      </div>
      <div className="flex justify-between text-[10px] text-gray-400 mt-0.5">
        <span>0</span><span className="text-green-600 font-medium">{min}–{max}</span><span>14</span>
      </div>
    </div>
  )
}

// ── Visual TDS bar ────────────────────────────────────────────────────────────
function TdsBar({ value, min, max }: { value: number; min: number; max: number }) {
  const rangeMax = Math.max(max * 1.5, value * 1.1)
  const pct    = Math.min((value / rangeMax) * 100, 100)
  const minPct = (min / rangeMax) * 100
  const maxPct = (max / rangeMax) * 100
  const ok = value >= min && value <= max
  return (
    <div className="w-full">
      <div className="relative h-3 rounded-full bg-gray-100 overflow-hidden">
        <div className="absolute h-full bg-blue-100" style={{ left: `${minPct}%`, width: `${maxPct - minPct}%` }} />
        <div className={`absolute top-0 bottom-0 w-2.5 rounded-full -translate-x-1/2 ${ok ? 'bg-blue-500' : 'bg-red-500'}`} style={{ left: `${pct}%` }} />
      </div>
      <div className="flex justify-between text-[10px] text-gray-400 mt-0.5">
        <span>0</span><span className="text-blue-600 font-medium">{min}–{max}</span><span>{Math.round(rangeMax)}</span>
      </div>
    </div>
  )
}

// ── Expanded row detail ───────────────────────────────────────────────────────
function ExpandedRow({ r, canEdit, onEdit, onDelete, deleting }: {
  r: MonitoringRecord; canEdit: boolean
  onEdit: () => void; onDelete: () => void; deleting: boolean
}) {
  const pt = r.farm.plantType
  const phRecs  = getPhRecommendations(r.phValue,  pt.minPH,  pt.maxPH)
  const tdsRecs = getTdsRecommendations(r.tdsValue, pt.minTDS, pt.maxTDS)
  const recColors = {
    danger:  'bg-red-50    border-red-200    text-red-800',
    warning: 'bg-yellow-50 border-yellow-200 text-yellow-800',
    success: 'bg-green-50  border-green-200  text-green-800',
    info:    'bg-blue-50   border-blue-200   text-blue-800',
  }

  // actionTaken display
  const isPending = r.actionTaken === 'Belum ada tindakan — akan dipantau lebih lanjut'
  const actionColor = !r.actionTaken
    ? 'bg-gray-50 border-gray-200 text-gray-500'
    : isPending
      ? 'bg-yellow-50 border-yellow-200 text-yellow-800'
      : 'bg-emerald-50 border-emerald-200 text-emerald-800'

  return (
    <div className="bg-gray-50 border-t px-4 py-4 space-y-3">
      <div className="grid sm:grid-cols-2 gap-4">
        {/* pH card */}
        <div className="bg-white rounded-xl p-3 border">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Keasaman Air (pH)</span>
            <span className={`font-bold text-lg ${r.phStatus === 'ABNORMAL' ? 'text-red-600' : 'text-green-600'}`}>{r.phValue.toFixed(2)}</span>
          </div>
          <PhBar value={r.phValue} min={pt.minPH} max={pt.maxPH} />
          <p className="text-xs mt-1.5 text-gray-500">Ideal untuk {pt.name}: {pt.minPH} – {pt.maxPH}</p>
          <div className={`mt-2 text-xs border rounded-lg p-2 ${recColors[phRecs[0]?.type || 'info']}`}>
            <span className="font-semibold">{phRecs[0]?.title}: </span>{phRecs[0]?.message}
          </div>
        </div>
        {/* TDS card */}
        <div className="bg-white rounded-xl p-3 border">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Konsentrasi Nutrisi (TDS)</span>
            <span className={`font-bold text-lg ${r.tdsStatus === 'ABNORMAL' ? 'text-red-600' : 'text-blue-600'}`}>{Math.round(r.tdsValue)} ppm</span>
          </div>
          <TdsBar value={r.tdsValue} min={pt.minTDS} max={pt.maxTDS} />
          <p className="text-xs mt-1.5 text-gray-500">Ideal untuk {pt.name}: {pt.minTDS} – {pt.maxTDS} ppm</p>
          <div className={`mt-2 text-xs border rounded-lg p-2 ${recColors[tdsRecs[0]?.type || 'info']}`}>
            <span className="font-semibold">{tdsRecs[0]?.title}: </span>{tdsRecs[0]?.message}
          </div>
        </div>
      </div>

      {/* Action taken — only show if record was abnormal or action exists */}
      {(r.phStatus === 'ABNORMAL' || r.tdsStatus === 'ABNORMAL' || r.actionTaken) && (
        <div className={`flex items-start gap-2.5 border rounded-xl p-3 text-sm ${actionColor}`}>
          <Wrench size={15} className="mt-0.5 shrink-0" />
          <div>
            <p className="font-semibold text-xs uppercase tracking-wide mb-0.5">Tindakan yang Diambil</p>
            <p>{r.actionTaken || 'Belum ada tindakan yang dicatat'}</p>
          </div>
        </div>
      )}

      {/* Notes + buttons */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <p className="text-sm text-gray-600">
          {r.notes
            ? <span>📝 {r.notes}</span>
            : <span className="italic text-gray-400">Tidak ada catatan</span>}
        </p>
        {canEdit && (
          <div className="flex gap-2">
            <button onClick={onEdit} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm text-blue-600 border border-blue-200 hover:bg-blue-50 transition-colors">
              <Pencil size={13} />Edit
            </button>
            <button onClick={onDelete} disabled={deleting} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm text-red-500 border border-red-200 hover:bg-red-50 transition-colors disabled:opacity-40">
              {deleting
                ? <span className="inline-block h-3.5 w-3.5 animate-spin rounded-full border-2 border-red-500 border-t-transparent" />
                : <Trash2 size={13} />}
              Hapus
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

// ── Action picker step inside the modal ───────────────────────────────────────
function ActionStep({
  ph, tds, pt, selected, onSelect, onBack, onConfirm, saving,
}: {
  ph: number; tds: number; pt: PlantType
  selected: string; onSelect: (v: string) => void
  onBack: () => void; onConfirm: () => void; saving: boolean
}) {
  const options = useMemo(() => getActionOptions(ph, tds, pt), [ph, tds, pt])
  const isAbnormalPh  = getPhStatus(ph,  pt.minPH, pt.maxPH)  === 'ABNORMAL'
  const isAbnormalTds = getTdsStatus(tds, pt.minTDS, pt.maxTDS) === 'ABNORMAL'

  return (
    <div className="space-y-4">
      {/* Alert summary */}
      <div className="bg-red-50 border border-red-200 rounded-xl p-3.5">
        <div className="flex items-center gap-2 text-red-700 font-semibold mb-1.5">
          <AlertTriangle size={16} />Nilai Abnormal Terdeteksi
        </div>
        <div className="flex gap-3 text-sm text-red-600">
          {isAbnormalPh  && <span className="flex items-center gap-1 bg-red-100 rounded-lg px-2 py-1">
            <Droplets size={13} />pH {ph.toFixed(2)} — di luar {pt.minPH}–{pt.maxPH}
          </span>}
          {isAbnormalTds && <span className="flex items-center gap-1 bg-red-100 rounded-lg px-2 py-1">
            <Sprout size={13} />TDS {Math.round(tds)} ppm — di luar {pt.minTDS}–{pt.maxTDS}
          </span>}
        </div>
      </div>

      {/* Question */}
      <div>
        <p className="font-semibold text-gray-800 flex items-center gap-2 mb-3">
          <Wrench size={16} className="text-green-600" />
          Tindakan apa yang sudah kamu ambil?
        </p>
        <div className="space-y-2">
          {options.map(opt => {
            const isPending = opt.includes('Belum ada')
            const isSelected = selected === opt
            return (
              <button
                key={opt}
                type="button"
                onClick={() => onSelect(opt)}
                className={`w-full text-left px-4 py-3 rounded-xl border-2 text-sm transition-all ${
                  isSelected
                    ? isPending
                      ? 'border-yellow-400 bg-yellow-50 text-yellow-800 font-medium'
                      : 'border-green-500 bg-green-50 text-green-800 font-medium'
                    : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300 hover:bg-gray-50'
                }`}
              >
                <span className="mr-2">{isSelected ? (isPending ? '⏳' : '✅') : '○'}</span>
                {opt}
              </button>
            )
          })}
        </div>
      </div>

      {/* Footer buttons */}
      <div className="flex gap-3 pt-1">
        <Button type="button" variant="outline" onClick={onBack} className="flex items-center gap-1.5">
          <ArrowLeft size={14} />Kembali
        </Button>
        <Button
          type="button"
          onClick={onConfirm}
          loading={saving}
          disabled={!selected}
          className="flex-1"
        >
          Simpan Catatan
        </Button>
      </div>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════════
export default function MonitoringPage() {
  const searchParams  = useSearchParams()
  const initialFarmId = searchParams.get('farmId') || ''
  const { user } = useAuth()

  const [records,    setRecords]    = useState<MonitoringRecord[]>([])
  const [totalCount, setTotalCount] = useState(0)
  const [farms,      setFarms]      = useState<Record<string, unknown>[]>([])
  const [loading,    setLoading]    = useState(true)
  const [expandedId, setExpandedId] = useState<string | null>(null)

  // Add modal state
  const [showAddModal,   setShowAddModal]   = useState(false)
  const [saving,         setSaving]         = useState(false)
  const [addStep,        setAddStep]        = useState<'form' | 'action'>('form')
  const [form,           setForm]           = useState({ ...EMPTY_FORM, farmId: initialFarmId })
  const [actionSelected, setActionSelected] = useState('')
  const [selectedFarm,   setSelectedFarm]   = useState<Record<string, unknown> | null>(null)
  const [phRecs,         setPhRecs]         = useState<ReturnType<typeof getPhRecommendations>>([])
  const [tdsRecs,        setTdsRecs]        = useState<ReturnType<typeof getTdsRecommendations>>([])

  // Edit modal state
  const [editRecord,  setEditRecord]  = useState<MonitoringRecord | null>(null)
  const [editForm,    setEditForm]    = useState({ phValue: '', tdsValue: '', temperature: '', humidity: '', notes: '', date: '', actionTaken: '' })
  const [editSaving,  setEditSaving]  = useState(false)
  const [editPhRecs,  setEditPhRecs]  = useState<ReturnType<typeof getPhRecommendations>>([])
  const [editTdsRecs, setEditTdsRecs] = useState<ReturnType<typeof getTdsRecommendations>>([])
  const [deleting,    setDeleting]    = useState<string | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; farmName: string } | null>(null)

  const load = () => {
    setLoading(true)
    Promise.all([api.get('/api/monitoring?limit=100'), api.get('/api/farms')])
      .then(([m, f]) => { setRecords(m.records); setTotalCount(m.total ?? m.records.length); setFarms(f.farms) })
      .finally(() => setLoading(false))
  }
  useEffect(() => { load() }, [])

  useEffect(() => {
    if (form.farmId) setSelectedFarm(farms.find(x => x.id === form.farmId) as Record<string, unknown> || null)
    else setSelectedFarm(null)
  }, [form.farmId, farms])

  useEffect(() => {
    if (selectedFarm && form.phValue) {
      const pt = selectedFarm.plantType as PlantType
      setPhRecs(getPhRecommendations(parseFloat(form.phValue), pt?.minPH, pt?.maxPH))
    } else setPhRecs([])
    if (selectedFarm && form.tdsValue) {
      const pt = selectedFarm.plantType as PlantType
      setTdsRecs(getTdsRecommendations(parseFloat(form.tdsValue), pt?.minTDS, pt?.maxTDS))
    } else setTdsRecs([])
  }, [form.phValue, form.tdsValue, selectedFarm])

  useEffect(() => {
    if (editRecord) {
      const pt = editRecord.farm.plantType
      if (editForm.phValue)  setEditPhRecs(getPhRecommendations(parseFloat(editForm.phValue),   pt.minPH,  pt.maxPH))
      else setEditPhRecs([])
      if (editForm.tdsValue) setEditTdsRecs(getTdsRecommendations(parseFloat(editForm.tdsValue), pt.minTDS, pt.maxTDS))
      else setEditTdsRecs([])
    }
  }, [editForm.phValue, editForm.tdsValue, editRecord])

  // Determine if current form values are abnormal (client-side, for step routing)
  const formIsAbnormal = useMemo(() => {
    if (!selectedFarm || !form.phValue || !form.tdsValue) return false
    const pt = selectedFarm.plantType as PlantType
    return (
      getPhStatus(parseFloat(form.phValue),   pt.minPH,  pt.maxPH)  === 'ABNORMAL' ||
      getTdsStatus(parseFloat(form.tdsValue), pt.minTDS, pt.maxTDS) === 'ABNORMAL'
    )
  }, [form.phValue, form.tdsValue, selectedFarm])

  // ── Save (step 1 of 2 when abnormal) ──────────────────────────────────────
  const handleFormNext = (e: React.FormEvent) => {
    e.preventDefault()
    if (formIsAbnormal) {
      setActionSelected('')
      setAddStep('action')
    } else {
      doSave(null)
    }
  }

  // ── Actual API call (called from step 1 if normal, or step 2 after action pick) ──
  const doSave = async (actionTaken: string | null) => {
    setSaving(true)
    try {
      await api.post('/api/monitoring', {
        ...form,
        date:        new Date(form.date).toISOString(),
        phValue:     parseFloat(form.phValue),
        tdsValue:    parseFloat(form.tdsValue),
        temperature: form.temperature  ? parseFloat(form.temperature)  : null,
        humidity:    form.humidity     ? parseFloat(form.humidity)     : null,
        actionTaken,
      })
      toast('success', 'Data monitoring berhasil disimpan')
      setShowAddModal(false)
      setForm({ ...EMPTY_FORM, date: localNow(), farmId: initialFarmId })
      setAddStep('form')
      setActionSelected('')
      load()
    } catch (err) {
      toast('error', err instanceof Error ? err.message : 'Gagal menyimpan')
    } finally {
      setSaving(false)
    }
  }

  const openEdit = (r: MonitoringRecord) => {
    setEditRecord(r)
    setEditForm({
      phValue:     r.phValue.toFixed(2),
      tdsValue:    String(Math.round(r.tdsValue)),
      temperature: r.temperature != null ? String(r.temperature) : '',
      humidity:    r.humidity    != null ? String(r.humidity)    : '',
      notes:       r.notes       || '',
      date:        (() => { const d = new Date(r.date); return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16) })(),
      actionTaken: r.actionTaken || '',
    })
  }

  const handleEditSave = async (e: React.FormEvent) => {
    e.preventDefault(); if (!editRecord) return; setEditSaving(true)
    try {
      await api.put(`/api/monitoring/${editRecord.id}`, {
        phValue:     parseFloat(editForm.phValue),
        tdsValue:    parseFloat(editForm.tdsValue),
        temperature: editForm.temperature ? parseFloat(editForm.temperature) : null,
        humidity:    editForm.humidity    ? parseFloat(editForm.humidity)    : null,
        notes:       editForm.notes || null,
        date:        new Date(editForm.date).toISOString(),
        actionTaken: editForm.actionTaken || null,
      })
      toast('success', 'Data berhasil diperbarui'); setEditRecord(null); load()
    } catch (err) {
      toast('error', err instanceof Error ? err.message : 'Gagal')
    } finally { setEditSaving(false) }
  }

  const handleDelete = (id: string, farmName: string) => {
    setDeleteTarget({ id, farmName })
  }

  const confirmDelete = async () => {
    if (!deleteTarget) return
    setDeleting(deleteTarget.id)
    try { await api.delete(`/api/monitoring/${deleteTarget.id}`); toast('success', 'Catatan berhasil dihapus'); load() }
    catch (err) { toast('error', err instanceof Error ? err.message : 'Gagal menghapus') }
    finally { setDeleting(null); setDeleteTarget(null) }
  }

  const recColors = {
    danger:  'bg-red-50    border-red-200    text-red-700',
    warning: 'bg-yellow-50 border-yellow-200 text-yellow-700',
    success: 'bg-green-50  border-green-200  text-green-700',
    info:    'bg-blue-50   border-blue-200   text-blue-700',
  }
  const canEdit = user?.role === 'SUPER_ADMIN' || user?.role === 'VILLAGE_ADMIN' || user?.role === 'FARMER'

  const recent10   = records.slice(0, 10)
  const avgPh      = recent10.length ? recent10.reduce((s, r) => s + r.phValue,  0) / recent10.length : 0
  const avgTds     = recent10.length ? recent10.reduce((s, r) => s + r.tdsValue, 0) / recent10.length : 0
  const abnormal   = recent10.filter(r => r.phStatus === 'ABNORMAL' || r.tdsStatus === 'ABNORMAL').length
  const allNormal  = records.length > 0 && records.slice(0, 5).every(r => r.phStatus === 'NORMAL' && r.tdsStatus === 'NORMAL')

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Monitoring pH &amp; TDS</h1>
          <p className="text-gray-500">Catat dan cek kondisi air kebun Anda setiap hari</p>
        </div>
        <Button onClick={() => { setAddStep('form'); setShowAddModal(true) }}>
          <Plus size={16} />Catat Data Baru
        </Button>
      </div>

      {/* Overall health banner */}
      {records.length > 0 && (
        <div className={`rounded-2xl p-4 mb-5 flex items-center gap-4 ${allNormal ? 'bg-green-50 border border-green-200' : 'bg-orange-50 border border-orange-200'}`}>
          <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${allNormal ? 'bg-green-100' : 'bg-orange-100'}`}>
            {allNormal ? <CheckCircle size={26} className="text-green-600" /> : <AlertTriangle size={26} className="text-orange-500" />}
          </div>
          <div>
            <p className={`font-bold text-base ${allNormal ? 'text-green-800' : 'text-orange-800'}`}>
              {allNormal ? '✅ Kondisi kebun Anda baik-baik saja!' : `⚠️ Ada ${abnormal} catatan yang perlu diperhatikan`}
            </p>
            <p className={`text-sm ${allNormal ? 'text-green-600' : 'text-orange-600'}`}>
              {allNormal ? '5 catatan terakhir semua dalam kondisi normal.' : 'Klik pada baris yang berwarna merah untuk melihat saran tindakan.'}
            </p>
          </div>
        </div>
      )}

      {/* Quick stats */}
      {records.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
          {[
            { label: 'Total Catatan',    value: totalCount,              color: 'text-blue-600',                            icon: FlaskConical, desc: 'Semua data tersimpan' },
            { label: 'pH Rata-rata',     value: avgPh.toFixed(2),        color: 'text-green-600',                           icon: Droplets,     desc: '10 catatan terakhir' },
            { label: 'Nutrisi (TDS)',    value: `${Math.round(avgTds)} ppm`, color: 'text-purple-600',                      icon: Sprout,       desc: '10 catatan terakhir' },
            { label: 'Perlu Perhatian',  value: abnormal,                 color: abnormal > 0 ? 'text-red-600' : 'text-gray-400', icon: AlertTriangle, desc: 'Dari 10 catatan terakhir' },
          ].map((s, i) => (
            <Card key={i}>
              <CardContent className="p-4">
                <s.icon size={18} className={`${s.color} mb-2`} />
                <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
                <p className="text-xs font-medium text-gray-600 mt-0.5">{s.label}</p>
                <p className="text-xs text-gray-400">{s.desc}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Records list */}
      <Card>
        <CardHeader><CardTitle>Riwayat Pengukuran</CardTitle></CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex justify-center py-10">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-green-600 border-t-transparent" />
            </div>
          ) : records.length === 0 ? (
            <div className="text-center py-14 text-gray-400">
              <FlaskConical size={40} className="mx-auto mb-3 opacity-30" />
              <p className="font-medium">Belum ada catatan</p>
              <p className="text-sm mt-1">Tekan &quot;Catat Data Baru&quot; untuk mulai</p>
            </div>
          ) : (
            <div className="divide-y">
              {records.map(r => {
                const normal = r.phStatus === 'NORMAL' && r.tdsStatus === 'NORMAL'
                const isOpen = expandedId === r.id
                const hasPendingAction = !normal && r.actionTaken === 'Belum ada tindakan — akan dipantau lebih lanjut'
                const hasAction = !normal && r.actionTaken && !hasPendingAction

                return (
                  <div key={r.id} className={normal ? '' : 'bg-red-50/40'}>
                    <button
                      type="button"
                      onClick={() => setExpandedId(isOpen ? null : r.id)}
                      className="w-full text-left px-4 py-3.5 hover:bg-gray-50/60 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        {/* Status icon */}
                        <div className={`shrink-0 w-9 h-9 rounded-xl flex items-center justify-center ${normal ? 'bg-green-100' : 'bg-red-100'}`}>
                          {normal
                            ? <CheckCircle size={18} className="text-green-600" />
                            : <AlertTriangle size={18} className="text-red-500" />}
                        </div>

                        {/* Main info */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-semibold text-gray-800 text-sm">{r.farm?.name}</span>
                            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${normal ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                              {normal ? 'Kondisi Baik ✓' : 'Perlu Tindakan ⚠'}
                            </span>
                            {r.source === 'DEVICE'
                              ? <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-blue-100 text-blue-700">🔌 Sensor</span>
                              : <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-orange-100 text-orange-700">✍️ Manual</span>}
                            {/* Action taken badge */}
                            {hasAction && (
                              <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-emerald-100 text-emerald-700 flex items-center gap-1">
                                <Wrench size={10} />Ditangani
                              </span>
                            )}
                            {hasPendingAction && (
                              <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-yellow-100 text-yellow-700 flex items-center gap-1">
                                <Clock size={10} />Dipantau
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-3 mt-1 text-xs text-gray-500">
                            <span className="flex items-center gap-1"><Clock size={11} />{formatDateTime(r.date)}</span>
                            {r.temperature != null && <span className="flex items-center gap-1"><Thermometer size={11} />{r.temperature.toFixed(1)}°C</span>}
                          </div>
                        </div>

                        {/* pH & TDS chips */}
                        <div className="shrink-0 flex gap-2 text-right">
                          <div className="text-center">
                            <p className="text-[10px] text-gray-400 uppercase tracking-wide">pH</p>
                            <p className={`font-bold text-base leading-tight ${r.phStatus === 'ABNORMAL' ? 'text-red-600' : 'text-green-600'}`}>
                              {r.phValue.toFixed(2)}
                            </p>
                          </div>
                          <div className="text-center">
                            <p className="text-[10px] text-gray-400 uppercase tracking-wide">TDS</p>
                            <p className={`font-bold text-base leading-tight ${r.tdsStatus === 'ABNORMAL' ? 'text-red-600' : 'text-blue-600'}`}>
                              {Math.round(r.tdsValue)}
                            </p>
                          </div>
                          <div className="text-gray-400 flex items-center">
                            {isOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                          </div>
                        </div>
                      </div>

                      {/* Abnormal quick hint */}
                      {!normal && !isOpen && (
                        <div className="mt-2 ml-12 text-xs text-red-600 font-medium">
                          {r.phStatus  === 'ABNORMAL' && `pH ${r.phValue.toFixed(2)} di luar batas ideal`}
                          {r.phStatus  === 'ABNORMAL' && r.tdsStatus === 'ABNORMAL' && ' · '}
                          {r.tdsStatus === 'ABNORMAL' && `TDS ${Math.round(r.tdsValue)} ppm di luar batas ideal`}
                          {' — '}Ketuk untuk lihat saran
                        </div>
                      )}
                    </button>

                    {isOpen && (
                      <ExpandedRow
                        r={r}
                        canEdit={canEdit}
                        onEdit={() => openEdit(r)}
                        onDelete={() => handleDelete(r.id, r.farm?.name ?? 'kebun ini')}
                        deleting={deleting === r.id}
                      />
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* ═══ ADD MODAL ═══ */}
      <Modal
        open={showAddModal}
        onClose={() => { setShowAddModal(false); setAddStep('form') }}
        title={addStep === 'form' ? 'Catat Data Monitoring' : 'Langkah 2 — Tindakan yang Diambil'}
        size="lg"
      >
        {addStep === 'form' ? (
          <form onSubmit={handleFormNext} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <Select
                label="Pilih Kebun *"
                value={form.farmId}
                onChange={e => setForm({ ...form, farmId: e.target.value })}
                required
                options={[{ value: '', label: '-- Pilih Kebun --' }, ...farms.map((f: Record<string, unknown>) => ({ value: f.id as string, label: f.name as string }))]}
              />
              <Input label="Tanggal & Waktu *" type="datetime-local" value={form.date} onChange={e => setForm({ ...form, date: e.target.value })} required />
            </div>

            {selectedFarm && (() => {
              const pt = selectedFarm.plantType as PlantType
              return (
                <div className="bg-green-50 border border-green-200 rounded-lg p-3 text-sm text-green-800">
                  <strong>Batas aman untuk {pt?.name}:</strong>{' '}
                  pH {pt?.minPH}–{pt?.maxPH} &nbsp;|&nbsp; TDS {pt?.minTDS}–{pt?.maxTDS} ppm
                </div>
              )
            })()}

            <div className="grid grid-cols-2 gap-4">
              <Input label="Nilai pH *" type="number" step="0.01" min="0" max="14" value={form.phValue} onChange={e => setForm({ ...form, phValue: e.target.value })} placeholder="6.5" required />
              <Input label="Nilai TDS (ppm) *" type="number" step="1" value={form.tdsValue} onChange={e => setForm({ ...form, tdsValue: e.target.value })} placeholder="1200" required />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <Input label="Suhu (°C)" type="number" step="0.1" value={form.temperature} onChange={e => setForm({ ...form, temperature: e.target.value })} placeholder="26" />
              <Input label="Kelembaban (%)" type="number" step="1" min="0" max="100" value={form.humidity} onChange={e => setForm({ ...form, humidity: e.target.value })} placeholder="75" />
            </div>

            {(phRecs.length > 0 || tdsRecs.length > 0) && (
              <div className="space-y-2">
                <p className="text-sm font-semibold text-gray-700">⚡ Saran Langsung:</p>
                {[...phRecs, ...tdsRecs].map((rec, i) => (
                  <div key={i} className={`border rounded-lg p-2.5 text-xs ${recColors[rec.type]}`}>
                    <span className="font-semibold">{rec.title}: </span>{rec.message}
                  </div>
                ))}
              </div>
            )}

            <Textarea
              label="Catatan"
              value={form.notes}
              onChange={e => setForm({ ...form, notes: e.target.value })}
              placeholder="Kondisi tanaman hari ini, observasi tambahan..."
            />

            {/* Indicator when values will trigger action step */}
            {formIsAbnormal && (
              <div className="bg-orange-50 border border-orange-200 rounded-lg px-3 py-2 text-xs text-orange-700 flex items-center gap-2">
                <Wrench size={13} />
                Nilai abnormal terdeteksi — kamu akan diminta memilih tindakan di langkah berikutnya.
              </div>
            )}

            <div className="flex gap-3 pt-2">
              <Button type="button" variant="outline" onClick={() => setShowAddModal(false)} className="flex-1">Batal</Button>
              <Button type="submit" className="flex-1">
                {formIsAbnormal ? 'Lanjut →' : 'Simpan Catatan'}
              </Button>
            </div>
          </form>
        ) : (
          <ActionStep
            ph={parseFloat(form.phValue)}
            tds={parseFloat(form.tdsValue)}
            pt={(selectedFarm?.plantType as PlantType)}
            selected={actionSelected}
            onSelect={setActionSelected}
            onBack={() => setAddStep('form')}
            onConfirm={() => doSave(actionSelected)}
            saving={saving}
          />
        )}
      </Modal>

      {/* ═══ EDIT MODAL ═══ */}
      <Modal open={!!editRecord} onClose={() => setEditRecord(null)} title="Edit Catatan Monitoring" size="lg">
        {editRecord && (
          <form onSubmit={handleEditSave} className="space-y-5">
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 text-sm">
              <div className="flex items-center gap-2 text-blue-800 font-semibold mb-1">
                <FlaskConical size={15} />{editRecord.farm?.name}
              </div>
              <p className="text-blue-600 text-xs">
                Tanaman: <strong>{editRecord.farm?.plantType?.name}</strong> &ensp;|&ensp;
                pH aman: {editRecord.farm?.plantType?.minPH}–{editRecord.farm?.plantType?.maxPH} &ensp;|&ensp;
                TDS aman: {editRecord.farm?.plantType?.minTDS}–{editRecord.farm?.plantType?.maxTDS} ppm
              </p>
            </div>

            <Input label="Tanggal & Waktu *" type="datetime-local" value={editForm.date} onChange={e => setEditForm({ ...editForm, date: e.target.value })} required />

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Input label="Nilai pH *" type="number" step="0.01" min="0" max="14" value={editForm.phValue} onChange={e => setEditForm({ ...editForm, phValue: e.target.value })} required />
                {editPhRecs.length > 0 && <div className={`border rounded-lg p-2 text-xs ${recColors[editPhRecs[0].type]}`}><span className="font-semibold">{editPhRecs[0].title}: </span>{editPhRecs[0].message}</div>}
              </div>
              <div className="space-y-1.5">
                <Input label="Nilai TDS (ppm) *" type="number" step="1" value={editForm.tdsValue} onChange={e => setEditForm({ ...editForm, tdsValue: e.target.value })} required />
                {editTdsRecs.length > 0 && <div className={`border rounded-lg p-2 text-xs ${recColors[editTdsRecs[0].type]}`}><span className="font-semibold">{editTdsRecs[0].title}: </span>{editTdsRecs[0].message}</div>}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <Input label="Suhu (°C)" type="number" step="0.1" value={editForm.temperature} onChange={e => setEditForm({ ...editForm, temperature: e.target.value })} placeholder="26" />
              <Input label="Kelembaban (%)" type="number" step="1" min="0" max="100" value={editForm.humidity} onChange={e => setEditForm({ ...editForm, humidity: e.target.value })} placeholder="75" />
            </div>

            <Textarea label="Catatan" value={editForm.notes} onChange={e => setEditForm({ ...editForm, notes: e.target.value })} placeholder="Perubahan kondisi, observasi tambahan..." />

            {/* Action taken edit field — only shown when record is/was abnormal */}
            {(editRecord.phStatus === 'ABNORMAL' || editRecord.tdsStatus === 'ABNORMAL' ||
              getPhStatus(parseFloat(editForm.phValue || '7'), editRecord.farm.plantType.minPH, editRecord.farm.plantType.maxPH) === 'ABNORMAL' ||
              getTdsStatus(parseFloat(editForm.tdsValue || '1000'), editRecord.farm.plantType.minTDS, editRecord.farm.plantType.maxTDS) === 'ABNORMAL') && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-1.5">
                  <Wrench size={14} />Tindakan yang Diambil
                </label>
                <div className="space-y-2">
                  {getActionOptions(
                    parseFloat(editForm.phValue  || String(editRecord.phValue)),
                    parseFloat(editForm.tdsValue || String(editRecord.tdsValue)),
                    editRecord.farm.plantType,
                  ).map(opt => {
                    const isPending  = opt.includes('Belum ada')
                    const isSelected = editForm.actionTaken === opt
                    return (
                      <button
                        key={opt}
                        type="button"
                        onClick={() => setEditForm({ ...editForm, actionTaken: isSelected ? '' : opt })}
                        className={`w-full text-left px-3 py-2.5 rounded-xl border-2 text-sm transition-all ${
                          isSelected
                            ? isPending
                              ? 'border-yellow-400 bg-yellow-50 text-yellow-800 font-medium'
                              : 'border-green-500 bg-green-50 text-green-800 font-medium'
                            : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300'
                        }`}
                      >
                        <span className="mr-2">{isSelected ? (isPending ? '⏳' : '✅') : '○'}</span>
                        {opt}
                      </button>
                    )
                  })}
                </div>
              </div>
            )}

            <div className="flex gap-3 pt-1">
              <Button type="button" variant="outline" onClick={() => setEditRecord(null)} className="flex-1">Batal</Button>
              <Button type="submit" loading={editSaving} className="flex-1">Simpan Perubahan</Button>
            </div>
          </form>
        )}
      </Modal>

      {/* ── Delete Confirmation Modal ── */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden">
            <div className="bg-red-50 px-6 py-5 flex items-center gap-3">
              <div className="w-11 h-11 bg-red-100 rounded-xl flex items-center justify-center text-2xl shrink-0">🗑️</div>
              <div>
                <h2 className="text-base font-bold text-gray-800">Hapus Catatan Monitoring</h2>
                <p className="text-xs text-red-500 font-medium">Tindakan ini tidak dapat dibatalkan</p>
              </div>
            </div>
            <div className="px-6 py-5">
              <p className="text-sm text-gray-600 mb-4">
                Anda akan menghapus catatan monitoring dari kebun{' '}
                <strong className="text-gray-800">&quot;{deleteTarget.farmName}&quot;</strong>.
                Data pH, TDS, dan tindakan yang tercatat akan hilang permanen.
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setDeleteTarget(null)}
                  disabled={!!deleting}
                  className="flex-1 px-4 py-2.5 rounded-xl border border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors disabled:opacity-50"
                >
                  Batal
                </button>
                <button
                  onClick={confirmDelete}
                  disabled={!!deleting}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white text-sm font-semibold transition-colors disabled:opacity-50"
                >
                  {deleting
                    ? <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                    : <span>🗑️</span>}
                  <span>Ya, Hapus</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
