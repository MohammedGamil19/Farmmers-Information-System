'use client'
import { useEffect, useState } from 'react'
import { api } from '@/lib/api'
import { useAuth } from '@/lib/auth-context'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Modal } from '@/components/ui/modal'
import { toast } from '@/components/ui/toaster'
import { Plus, Sprout, Pencil, Trash2, Droplets, FlaskConical, Calendar } from 'lucide-react'

type PlantType = {
  id: string
  name: string
  description: string | null
  minPH: number
  maxPH: number
  minTDS: number
  maxTDS: number
  growthDays: number
  _count?: { farms: number }
  createdBy?: { id: string; name: string; role: string } | null
}

const EMPTY_FORM = {
  name: '',
  description: '',
  minPH: '5.5',
  maxPH: '7.0',
  minTDS: '800',
  maxTDS: '2000',
  growthDays: '30',
}

export default function TanamanPage() {
  const { user } = useAuth()
  const [plants, setPlants] = useState<PlantType[]>([])
  const [loading, setLoading] = useState(true)

  // Add / Edit modal
  const [showModal, setShowModal] = useState(false)
  const [editTarget, setEditTarget] = useState<PlantType | null>(null)
  const [form, setForm] = useState(EMPTY_FORM)
  const [saving, setSaving] = useState(false)

  // Delete
  const [deleting, setDeleting] = useState<string | null>(null)

  // Search
  const [search, setSearch] = useState('')

  const load = async () => {
    setLoading(true)
    try {
      const res = await api.get('/api/plant-types')
      setPlants(res.plantTypes)
    } finally {
      setLoading(false)
    }
  }
  useEffect(() => { load() }, [])

  const openAdd = () => {
    setEditTarget(null)
    setForm(EMPTY_FORM)
    setShowModal(true)
  }

  const openEdit = (p: PlantType) => {
    setEditTarget(p)
    setForm({
      name: p.name,
      description: p.description || '',
      minPH: String(p.minPH),
      maxPH: String(p.maxPH),
      minTDS: String(p.minTDS),
      maxTDS: String(p.maxTDS),
      growthDays: String(p.growthDays),
    })
    setShowModal(true)
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.name.trim()) { toast('error', 'Nama tanaman wajib diisi'); return }
    const minPH = parseFloat(form.minPH)
    const maxPH = parseFloat(form.maxPH)
    const minTDS = parseInt(form.minTDS)
    const maxTDS = parseInt(form.maxTDS)
    if (minPH >= maxPH) { toast('error', 'pH Minimum harus lebih kecil dari pH Maksimum'); return }
    if (minTDS >= maxTDS) { toast('error', 'TDS Minimum harus lebih kecil dari TDS Maksimum'); return }

    setSaving(true)
    try {
      const payload = {
        name: form.name.trim(),
        description: form.description.trim() || null,
        minPH,
        maxPH,
        minTDS,
        maxTDS,
        growthDays: parseInt(form.growthDays),
      }

      if (editTarget) {
        await api.put(`/api/plant-types/${editTarget.id}`, payload)
        toast('success', `Tanaman "${form.name}" berhasil diperbarui`)
      } else {
        await api.post('/api/plant-types', payload)
        toast('success', `Tanaman "${form.name}" berhasil ditambahkan`)
      }
      setShowModal(false)
      load()
    } catch (err) {
      toast('error', err instanceof Error ? err.message : 'Gagal menyimpan')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (p: PlantType) => {
    const farmCount = p._count?.farms ?? 0
    if (farmCount > 0) {
      toast('error', `Tidak bisa dihapus — tanaman ini digunakan oleh ${farmCount} kebun`)
      return
    }
    if (!confirm(`Hapus tanaman "${p.name}"? Tindakan ini tidak dapat dibatalkan.`)) return
    setDeleting(p.id)
    try {
      await api.delete(`/api/plant-types/${p.id}`)
      toast('success', `Tanaman "${p.name}" berhasil dihapus`)
      load()
    } catch (err) {
      toast('error', err instanceof Error ? err.message : 'Gagal menghapus')
    } finally {
      setDeleting(null)
    }
  }

  const isAdmin = user?.role === 'SUPER_ADMIN' || user?.role === 'VILLAGE_ADMIN'

  // Returns true if the current user can edit/delete this specific plant
  const canModify = (p: PlantType) =>
    isAdmin || (user?.role === 'FARMER' && p.createdBy?.id === user?.id)

  const filtered = plants.filter(p =>
    p.name.toLowerCase().includes(search.toLowerCase()) ||
    (p.description || '').toLowerCase().includes(search.toLowerCase())
  )

  // pH status color helper
  const phColor = (min: number, max: number) => {
    if (min < 5.5 || max > 7.5) return 'text-orange-600 bg-orange-50'
    return 'text-green-700 bg-green-50'
  }

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Jenis Tanaman</h1>
          <p className="text-gray-500">Kelola katalog tanaman hidroponik &amp; parameter idealnya</p>
        </div>
        <Button onClick={openAdd}>
          <Plus size={16} />Tambah Tanaman
        </Button>
      </div>

      {/* Search */}
      <div className="mb-5">
        <Input
          placeholder="Cari tanaman..."
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
      </div>

      {/* Grid */}
      {loading ? (
        <div className="flex justify-center py-20">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-green-600 border-t-transparent" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-20 text-gray-400">
          <Sprout size={48} className="mx-auto mb-3 opacity-30" />
          <p className="font-medium">Tidak ada tanaman ditemukan</p>
          {search && <p className="text-sm mt-1">Coba ubah kata pencarian</p>}
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map(p => {
            const farmCount = p._count?.farms ?? 0
            return (
              <Card key={p.id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-5">
                  {/* Title row */}
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-2.5">
                      <div className="w-9 h-9 rounded-xl bg-green-100 flex items-center justify-center shrink-0">
                        <Sprout size={18} className="text-green-700" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-gray-800 leading-tight">{p.name}</h3>
                        {p.description && (
                          <p className="text-xs text-gray-400 mt-0.5 line-clamp-1">{p.description}</p>
                        )}
                      </div>
                    </div>
                    {canModify(p) && (
                      <div className="flex items-center gap-1 ml-2 shrink-0">
                        <button
                          onClick={() => openEdit(p)}
                          className="p-1.5 rounded-lg text-blue-600 hover:bg-blue-50 transition-colors"
                          title="Edit tanaman"
                        >
                          <Pencil size={14} />
                        </button>
                        <button
                          onClick={() => handleDelete(p)}
                          disabled={deleting === p.id || farmCount > 0}
                          className="p-1.5 rounded-lg text-red-500 hover:bg-red-50 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                          title={farmCount > 0 ? `Digunakan ${farmCount} kebun` : 'Hapus tanaman'}
                        >
                          {deleting === p.id
                            ? <span className="inline-block h-3.5 w-3.5 animate-spin rounded-full border-2 border-red-500 border-t-transparent" />
                            : <Trash2 size={14} />}
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Parameter badges */}
                  <div className="space-y-2 mt-3">
                    <div className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium ${phColor(p.minPH, p.maxPH)}`}>
                      <FlaskConical size={14} />
                      <span>pH Ideal:</span>
                      <span className="font-bold ml-auto">{p.minPH} – {p.maxPH}</span>
                    </div>
                    <div className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium text-blue-700 bg-blue-50">
                      <Droplets size={14} />
                      <span>TDS Ideal:</span>
                      <span className="font-bold ml-auto">{p.minTDS} – {p.maxTDS} ppm</span>
                    </div>
                    <div className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium text-purple-700 bg-purple-50">
                      <Calendar size={14} />
                      <span>Masa Panen:</span>
                      <span className="font-bold ml-auto">{p.growthDays} hari</span>
                    </div>
                  </div>

                  {/* Farm usage + ownership */}
                  <div className="mt-3 pt-3 border-t flex items-center justify-between gap-2 flex-wrap">
                    <p className="text-xs text-gray-400">
                      {farmCount > 0
                        ? <span className="text-green-600 font-medium">✓ Digunakan di {farmCount} kebun</span>
                        : <span className="text-gray-400 italic">Belum digunakan</span>}
                    </p>
                    {p.createdBy?.id === user?.id && (
                      <span className="text-xs px-2 py-0.5 rounded-full bg-green-100 text-green-700 font-medium">
                        Ditambahkan oleh Anda
                      </span>
                    )}
                    {p.createdBy && p.createdBy.id !== user?.id && isAdmin && (
                      <span className="text-xs text-gray-400">oleh {p.createdBy.name}</span>
                    )}
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

      {/* ═══ ADD / EDIT MODAL ═══ */}
      <Modal
        open={showModal}
        onClose={() => setShowModal(false)}
        title={editTarget ? `Edit Tanaman — ${editTarget.name}` : 'Tambah Jenis Tanaman'}
        size="md"
      >
        <form onSubmit={handleSave} className="space-y-4">
          {/* Name */}
          <Input
            label="Nama Tanaman *"
            value={form.name}
            onChange={e => setForm({ ...form, name: e.target.value })}
            placeholder="Contoh: Selada, Bayam, Pakcoy..."
            required
          />

          {/* Description */}
          <Input
            label="Deskripsi (opsional)"
            value={form.description}
            onChange={e => setForm({ ...form, description: e.target.value })}
            placeholder="Keterangan singkat tentang tanaman ini"
          />

          {/* pH range */}
          <div>
            <div className="flex items-center gap-2 mb-2">
              <FlaskConical size={14} className="text-green-600" />
              <p className="text-sm font-medium text-gray-700">Range pH Ideal</p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Input
                label="pH Minimum"
                type="number"
                step="0.1"
                min="0"
                max="14"
                value={form.minPH}
                onChange={e => setForm({ ...form, minPH: e.target.value })}
              />
              <Input
                label="pH Maksimum"
                type="number"
                step="0.1"
                min="0"
                max="14"
                value={form.maxPH}
                onChange={e => setForm({ ...form, maxPH: e.target.value })}
              />
            </div>
            {/* Live preview */}
            {form.minPH && form.maxPH && (
              <p className="text-xs text-green-700 mt-1.5 bg-green-50 px-2 py-1 rounded">
                ✓ Air nutrisi harus di antara pH <strong>{form.minPH}</strong> dan <strong>{form.maxPH}</strong>
              </p>
            )}
          </div>

          {/* TDS range */}
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Droplets size={14} className="text-blue-600" />
              <p className="text-sm font-medium text-gray-700">Range TDS Ideal (ppm)</p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Input
                label="TDS Minimum"
                type="number"
                step="50"
                min="0"
                value={form.minTDS}
                onChange={e => setForm({ ...form, minTDS: e.target.value })}
              />
              <Input
                label="TDS Maksimum"
                type="number"
                step="50"
                min="0"
                value={form.maxTDS}
                onChange={e => setForm({ ...form, maxTDS: e.target.value })}
              />
            </div>
            {form.minTDS && form.maxTDS && (
              <p className="text-xs text-blue-700 mt-1.5 bg-blue-50 px-2 py-1 rounded">
                ✓ Konsentrasi nutrisi harus <strong>{form.minTDS}</strong> – <strong>{form.maxTDS}</strong> ppm
              </p>
            )}
          </div>

          {/* Growth days */}
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Calendar size={14} className="text-purple-600" />
              <p className="text-sm font-medium text-gray-700">Estimasi Hari Panen</p>
            </div>
            <Input
              type="number"
              min="1"
              max="365"
              value={form.growthDays}
              onChange={e => setForm({ ...form, growthDays: e.target.value })}
              placeholder="30"
            />
          </div>

          <div className="flex gap-3 pt-2">
            <Button type="button" variant="outline" onClick={() => setShowModal(false)} className="flex-1">
              Batal
            </Button>
            <Button type="submit" loading={saving} className="flex-1">
              {editTarget ? 'Simpan Perubahan' : 'Tambah Tanaman'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
