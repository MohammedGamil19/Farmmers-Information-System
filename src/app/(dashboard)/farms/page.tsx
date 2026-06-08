'use client'
import { useEffect, useState } from 'react'
import { useAuth } from '@/lib/auth-context'
import { api } from '@/lib/api'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { Modal } from '@/components/ui/modal'
import { Textarea } from '@/components/ui/textarea'
import { toast } from '@/components/ui/toaster'
import { Plus, Leaf, Calendar, MapPin, User, Eye, Sprout, X, Check } from 'lucide-react'
import { formatDate, getDaysUntilHarvest, getFarmStatusLabel, getCropStageLabel } from '@/lib/utils'
import Link from 'next/link'

type Farm = Record<string, unknown>

const ADD_NEW_VALUE = '__ADD_NEW__'
const EMPTY_PLANT_FORM = { name: '', description: '', minPH: '5.5', maxPH: '7.0', minTDS: '800', maxTDS: '2000', growthDays: '30' }

export default function FarmsPage() {
  const { user } = useAuth()
  const [farms, setFarms] = useState<Farm[]>([])
  const [villages, setVillages] = useState<Record<string, unknown>[]>([])
  const [plantTypes, setPlantTypes] = useState<Record<string, unknown>[]>([])
  const [users, setUsers] = useState<Record<string, unknown>[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({
    name: '', location: '', area: '', plantTypeId: '',
    villageId: '', ownerId: '', plantingDate: '', estimatedHarvest: '', description: '',
  })

  // Inline "add new plant type" panel
  const [showNewPlant, setShowNewPlant] = useState(false)
  const [plantForm, setPlantForm] = useState(EMPTY_PLANT_FORM)
  const [savingPlant, setSavingPlant] = useState(false)

  const load = () => {
    setLoading(true)
    Promise.all([
      api.get('/api/farms'),
      api.get('/api/villages'),
      api.get('/api/plant-types'),
      user?.role !== 'FARMER' ? api.get('/api/users?role=FARMER') : Promise.resolve({ users: [] }),
    ]).then(([f, v, pt, u]) => {
      setFarms(f.farms); setVillages(v.villages); setPlantTypes(pt.plantTypes); setUsers(u.users)
    }).finally(() => setLoading(false))
  }
  useEffect(() => { load() }, [])

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault(); setSaving(true)
    try {
      await api.post('/api/farms', form)
      toast('success', 'Kebun berhasil ditambahkan')
      setShowModal(false)
      setShowNewPlant(false)
      setForm({ name: '', location: '', area: '', plantTypeId: '', villageId: '', ownerId: '', plantingDate: '', estimatedHarvest: '', description: '' })
      load()
    } catch (err) {
      toast('error', err instanceof Error ? err.message : 'Gagal')
    } finally { setSaving(false) }
  }

  const handlePlantTypeChange = (val: string) => {
    if (val === ADD_NEW_VALUE) {
      // Show inline panel, don't change current selection
      setShowNewPlant(true)
      setPlantForm(EMPTY_PLANT_FORM)
    } else {
      setForm(prev => ({ ...prev, plantTypeId: val }))
      setShowNewPlant(false)
    }
  }

  const handleSaveNewPlant = async () => {
    if (!plantForm.name.trim()) { toast('error', 'Nama tanaman wajib diisi'); return }
    setSavingPlant(true)
    try {
      const res = await api.post('/api/plant-types', {
        name: plantForm.name.trim(),
        description: plantForm.description.trim() || null,
        minPH: parseFloat(plantForm.minPH),
        maxPH: parseFloat(plantForm.maxPH),
        minTDS: parseInt(plantForm.minTDS),
        maxTDS: parseInt(plantForm.maxTDS),
        growthDays: parseInt(plantForm.growthDays),
      })
      toast('success', `Tanaman "${res.plantType.name}" berhasil ditambahkan`)
      // Reload plant types, auto-select the new one
      const updated = await api.get('/api/plant-types')
      setPlantTypes(updated.plantTypes)
      setForm(prev => ({ ...prev, plantTypeId: res.plantType.id }))
      setShowNewPlant(false)
      setPlantForm(EMPTY_PLANT_FORM)
    } catch (err) {
      toast('error', err instanceof Error ? err.message : 'Gagal menambah tanaman')
    } finally {
      setSavingPlant(false)
    }
  }

  const cancelNewPlant = () => {
    setShowNewPlant(false)
    setPlantForm(EMPTY_PLANT_FORM)
    // Reset select back to empty if nothing was selected
    setForm(prev => ({ ...prev, plantTypeId: prev.plantTypeId === ADD_NEW_VALUE ? '' : prev.plantTypeId }))
  }

  const statusVariants: Record<string, 'success' | 'info' | 'warning' | 'default'> = {
    ACTIVE: 'success', GROWING: 'info', READY_FOR_HARVEST: 'warning', HARVESTED: 'default',
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Kebun</h1>
          <p className="text-gray-500">Kelola kebun hidroponik</p>
        </div>
        <Button onClick={() => setShowModal(true)}><Plus size={16} />Tambah Kebun</Button>
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-green-600 border-t-transparent" />
        </div>
      ) : (
        <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">
          {farms.length === 0 && (
            <div className="col-span-full text-center py-20 text-gray-400">
              <Leaf size={48} className="mx-auto mb-3 opacity-30" /><p>Belum ada kebun</p>
            </div>
          )}
          {farms.map((f: Farm) => {
            const pt = f.plantType as Record<string, unknown>
            const owner = f.owner as Record<string, unknown>
            const village = f.village as Record<string, unknown>
            const daysLeft = f.estimatedHarvest ? getDaysUntilHarvest(f.estimatedHarvest as string) : null
            return (
              <Card key={f.id as string} className="hover:shadow-md transition-shadow">
                <CardContent className="p-5">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h3 className="font-semibold text-gray-800">{f.name as string}</h3>
                      <p className="text-sm text-gray-500 flex items-center gap-1 mt-1"><Leaf size={12} />{pt?.name as string}</p>
                    </div>
                    <Badge variant={statusVariants[f.status as string] || 'default'}>{getFarmStatusLabel(f.status as string)}</Badge>
                  </div>
                  <div className="space-y-1.5 text-sm text-gray-600">
                    {owner && <p className="flex items-center gap-2"><User size={13} />{owner.name as string}</p>}
                    {village && <p className="flex items-center gap-2"><MapPin size={13} />{village.name as string}</p>}
                    <p className="flex items-center gap-2"><Calendar size={13} />Tanam: {formatDate(f.plantingDate as string)}</p>
                    {daysLeft !== null && (
                      <p className={`flex items-center gap-2 font-medium ${daysLeft <= 7 ? 'text-orange-600' : 'text-green-600'}`}>
                        🌾 {daysLeft > 0 ? `${daysLeft} hari lagi panen` : daysLeft === 0 ? 'Panen hari ini!' : 'Siap panen'}
                      </p>
                    )}
                  </div>
                  <div className="mt-4 pt-4 border-t flex items-center gap-2">
                    <Badge variant="outline" className="text-xs">{getCropStageLabel(f.cropStage as string)}</Badge>
                    <Link href={`/farms/${f.id}`} className="ml-auto">
                      <Button size="sm" variant="outline"><Eye size={14} />Detail</Button>
                    </Link>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

      {/* ═══ FARM MODAL ═══ */}
      <Modal open={showModal} onClose={() => { setShowModal(false); setShowNewPlant(false); setPlantForm(EMPTY_PLANT_FORM) }} title="Tambah Kebun Baru" size="lg">
        <form onSubmit={handleSave} className="space-y-4">
          <Input
            label="Nama Kebun *"
            value={form.name}
            onChange={e => setForm({ ...form, name: e.target.value })}
            placeholder="Contoh: Kebun Selada Pak Slamet"
            required
          />

          <div className="grid grid-cols-2 gap-4">
            {/* Plant type select — with "Add new" option */}
            <div className="w-full">
              <label className="block text-sm font-medium text-gray-700 mb-1">Jenis Tanaman *</label>
              <select
                value={showNewPlant ? ADD_NEW_VALUE : form.plantTypeId}
                onChange={e => handlePlantTypeChange(e.target.value)}
                required={!showNewPlant}
                className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-gray-900 focus:border-green-500 focus:outline-none focus:ring-1 focus:ring-green-500 bg-white"
              >
                <option value="">-- Pilih Tanaman --</option>
                {plantTypes.map((p: Record<string, unknown>) => (
                  <option key={p.id as string} value={p.id as string}>{p.name as string}</option>
                ))}
                <option value={ADD_NEW_VALUE}>➕ Tambah Tanaman Baru...</option>
              </select>
            </div>

            <Select
              label="Desa *"
              value={form.villageId}
              onChange={e => setForm({ ...form, villageId: e.target.value })}
              required
              options={[
                { value: '', label: '-- Pilih Desa --' },
                ...villages.map((v: Record<string, unknown>) => ({ value: v.id as string, label: v.name as string })),
              ]}
            />
          </div>

          {/* ── Inline "Add new plant type" panel ── */}
          {showNewPlant && (
            <div className="border-2 border-green-400 rounded-xl p-4 bg-green-50 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-green-800 font-semibold text-sm">
                  <Sprout size={16} />
                  Tambah Jenis Tanaman Baru
                </div>
                <button type="button" onClick={cancelNewPlant} className="text-gray-400 hover:text-gray-600 p-1 rounded">
                  <X size={16} />
                </button>
              </div>

              <Input
                label="Nama Tanaman *"
                value={plantForm.name}
                onChange={e => setPlantForm({ ...plantForm, name: e.target.value })}
                placeholder="Contoh: Pakcoy, Basil, Mint..."
              />

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <p className="text-xs font-medium text-gray-600 mb-1.5">Range pH Ideal</p>
                  <div className="grid grid-cols-2 gap-2">
                    <Input label="Min" type="number" step="0.1" min="0" max="14"
                      value={plantForm.minPH} onChange={e => setPlantForm({ ...plantForm, minPH: e.target.value })} />
                    <Input label="Max" type="number" step="0.1" min="0" max="14"
                      value={plantForm.maxPH} onChange={e => setPlantForm({ ...plantForm, maxPH: e.target.value })} />
                  </div>
                </div>
                <div>
                  <p className="text-xs font-medium text-gray-600 mb-1.5">Range TDS (ppm)</p>
                  <div className="grid grid-cols-2 gap-2">
                    <Input label="Min" type="number" step="50"
                      value={plantForm.minTDS} onChange={e => setPlantForm({ ...plantForm, minTDS: e.target.value })} />
                    <Input label="Max" type="number" step="50"
                      value={plantForm.maxTDS} onChange={e => setPlantForm({ ...plantForm, maxTDS: e.target.value })} />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <Input
                  label="Estimasi Hari Panen"
                  type="number" min="1"
                  value={plantForm.growthDays}
                  onChange={e => setPlantForm({ ...plantForm, growthDays: e.target.value })}
                  placeholder="30"
                />
                <Input
                  label="Deskripsi (opsional)"
                  value={plantForm.description}
                  onChange={e => setPlantForm({ ...plantForm, description: e.target.value })}
                  placeholder="Keterangan singkat..."
                />
              </div>

              <div className="flex gap-2 pt-1">
                <button
                  type="button"
                  onClick={cancelNewPlant}
                  className="flex-1 px-3 py-2 rounded-lg border border-gray-300 text-sm text-gray-600 hover:bg-gray-50 transition-colors"
                >
                  Batal
                </button>
                <button
                  type="button"
                  onClick={handleSaveNewPlant}
                  disabled={savingPlant || !plantForm.name.trim()}
                  className="flex-1 px-3 py-2 rounded-lg bg-green-600 text-white text-sm font-medium hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
                >
                  {savingPlant ? (
                    <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  ) : (
                    <Check size={15} />
                  )}
                  Simpan Tanaman
                </button>
              </div>
            </div>
          )}

          {user?.role !== 'FARMER' && users.length > 0 && (
            <Select
              label="Pemilik Kebun"
              value={form.ownerId}
              onChange={e => setForm({ ...form, ownerId: e.target.value })}
              options={[{ value: '', label: '-- Pilih Petani --' }, ...users.map((u: Record<string, unknown>) => ({ value: u.id as string, label: u.name as string }))]}
            />
          )}

          <div className="grid grid-cols-2 gap-4">
            <Input label="Lokasi/Blok" value={form.location} onChange={e => setForm({ ...form, location: e.target.value })} placeholder="Blok A" />
            <Input label="Luas (m²)" type="number" value={form.area} onChange={e => setForm({ ...form, area: e.target.value })} placeholder="50" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Input label="Tanggal Tanam *" type="date" value={form.plantingDate} onChange={e => setForm({ ...form, plantingDate: e.target.value })} required />
            <Input label="Estimasi Panen" type="date" value={form.estimatedHarvest} onChange={e => setForm({ ...form, estimatedHarvest: e.target.value })} />
          </div>
          <Textarea label="Deskripsi" value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} placeholder="Keterangan tambahan..." />

          <div className="flex gap-3 pt-2">
            <Button type="button" variant="outline" onClick={() => { setShowModal(false); setShowNewPlant(false); setPlantForm(EMPTY_PLANT_FORM) }} className="flex-1">
              Batal
            </Button>
            <Button type="submit" loading={saving} disabled={showNewPlant} className="flex-1">
              Simpan
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
