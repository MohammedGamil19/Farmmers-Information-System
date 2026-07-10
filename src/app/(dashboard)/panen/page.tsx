'use client'
import { useEffect, useRef, useState } from 'react'
import { useAuth } from '@/lib/auth-context'
import { api } from '@/lib/api'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Plus, Pencil, Trash2, Wheat, Scale, TrendingUp, Sprout, Leaf } from 'lucide-react'
import { toast } from '@/components/ui/toaster'

type PlantType = { id: string; name: string }
type Farm = { id: string; name: string; plantType: PlantType; owner?: { id: string; name: string } }
type Panen = {
  id: string
  tanggalPanen: string
  komoditas: string
  jumlahKg: number
  hargaJual: number | null
  kondisi: string
  catatan: string | null
  petani: { id: string; name: string }
  village: { id: string; name: string }
  farm: { id: string; name: string }
  plantType: { id: string; name: string }
}

const KONDISI_OPTIONS = ['Baik', 'Sedang', 'Kurang']
const KONDISI_COLORS: Record<string, 'success' | 'warning' | 'danger'> = {
  Baik: 'success', Sedang: 'warning', Kurang: 'danger',
}

const EMPTY_FORM = {
  tanggalPanen: '',
  farmId: '',
  jumlahKg: '',
  hargaJual: '',
  kondisi: 'Baik',
  catatan: '',
}

export default function PanenPage() {
  const { user } = useAuth()
  const [panens, setPanens] = useState<Panen[]>([])
  const [farms, setFarms] = useState<Farm[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editId, setEditId] = useState<string | null>(null)
  const [form, setForm] = useState({ ...EMPTY_FORM })
  const [saving, setSaving] = useState(false)
  const [filterKomoditas, setFilterKomoditas] = useState('')
  const submitLock = useRef(false)

  async function load() {
    setLoading(true)
    try {
      const [panenData, farmData] = await Promise.all([
        api.get('/api/panen'),
        api.get('/api/farms'),
      ])
      setPanens(panenData as Panen[])
      setFarms((farmData as { farms: Farm[] }).farms || [])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const selectedFarm = farms.find(f => f.id === form.farmId)

  function openNew() {
    setEditId(null)
    setForm({ ...EMPTY_FORM, tanggalPanen: new Date().toISOString().split('T')[0] })
    setShowModal(true)
  }

  function openEdit(p: Panen) {
    setEditId(p.id)
    setForm({
      tanggalPanen: p.tanggalPanen.split('T')[0],
      farmId: p.farm.id,
      jumlahKg: String(p.jumlahKg),
      hargaJual: p.hargaJual != null ? String(p.hargaJual) : '',
      kondisi: p.kondisi || 'Baik',
      catatan: p.catatan || '',
    })
    setShowModal(true)
  }

  async function save() {
    if (submitLock.current) return
    submitLock.current = true
    setSaving(true)
    try {
      if (editId) {
        await api.put(`/api/panen/${editId}`, form)
      } else {
        await api.post('/api/panen', form)
      }
      setShowModal(false)
      await load()
      toast('success', editId ? 'Data panen diperbarui' : 'Data panen ditambahkan')
    } catch (e) {
      toast('error', e instanceof Error ? e.message : 'Gagal menyimpan')
    } finally {
      setSaving(false)
      submitLock.current = false
    }
  }

  async function remove(id: string) {
    if (!confirm('Hapus data panen ini?')) return
    await api.delete(`/api/panen/${id}`)
    await load()
  }

  const filtered = panens.filter(p =>
    !filterKomoditas || p.komoditas.toLowerCase().includes(filterKomoditas.toLowerCase())
  )

  const totalKg = filtered.reduce((s, p) => s + p.jumlahKg, 0)
  const totalNilai = filtered.reduce((s, p) => s + (p.hargaJual ? p.jumlahKg * p.hargaJual : 0), 0)

  // Roll-ups computed from all harvest records
  const perKebun = (() => {
    const map: Record<string, { name: string; kg: number }> = {}
    panens.forEach(p => {
      if (!map[p.farm.id]) map[p.farm.id] = { name: p.farm.name, kg: 0 }
      map[p.farm.id].kg += p.jumlahKg
    })
    return Object.values(map).sort((a, b) => b.kg - a.kg)
  })()

  const perTanaman = (() => {
    const map: Record<string, { name: string; kg: number }> = {}
    panens.forEach(p => {
      if (!map[p.plantType.id]) map[p.plantType.id] = { name: p.plantType.name, kg: 0 }
      map[p.plantType.id].kg += p.jumlahKg
    })
    return Object.values(map).sort((a, b) => b.kg - a.kg)
  })()

  const komoditasTerbanyak = perTanaman[0]?.name ?? '-'

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="h-10 w-10 animate-spin rounded-full border-4 border-green-600 border-t-transparent" />
    </div>
  )

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-800">Data Panen</h1>
          <p className="text-gray-500 text-sm mt-1">Dokumentasi produksi hasil panen per kebun dan jenis tanaman</p>
        </div>
        <Button onClick={openNew} className="flex items-center gap-2" disabled={farms.length === 0}>
          <Plus size={16} /> Tambah Panen
        </Button>
      </div>

      {farms.length === 0 && (
        <div className="mb-6 rounded-lg bg-amber-50 border border-amber-200 p-4 text-sm text-amber-800">
          Belum ada kebun. Tambahkan kebun terlebih dahulu di menu <strong>Kebun</strong> sebelum mencatat panen.
        </div>
      )}

      {/* Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardContent className="p-4">
            <div className="w-10 h-10 bg-green-50 rounded-xl flex items-center justify-center mb-3">
              <Wheat className="text-green-600" size={20} />
            </div>
            <p className="text-2xl font-bold text-gray-800">{panens.length}</p>
            <p className="text-xs text-gray-500 mt-1">Total Catatan Panen</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center mb-3">
              <Scale className="text-blue-600" size={20} />
            </div>
            <p className="text-2xl font-bold text-gray-800">{totalKg.toFixed(1)}</p>
            <p className="text-xs text-gray-500 mt-1">Total Produksi (kg)</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="w-10 h-10 bg-amber-50 rounded-xl flex items-center justify-center mb-3">
              <TrendingUp className="text-amber-600" size={20} />
            </div>
            <p className="text-2xl font-bold text-gray-800">
              {totalNilai > 0 ? `Rp ${(totalNilai / 1000).toFixed(0)}rb` : '-'}
            </p>
            <p className="text-xs text-gray-500 mt-1">Estimasi Nilai (jika ada harga)</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="w-10 h-10 bg-purple-50 rounded-xl flex items-center justify-center mb-3">
              <Sprout className="text-purple-600" size={20} />
            </div>
            <p className="text-2xl font-bold text-gray-800 truncate">{komoditasTerbanyak}</p>
            <p className="text-xs text-gray-500 mt-1">Tanaman Terbanyak</p>
          </CardContent>
        </Card>
      </div>

      {/* Roll-ups: per garden & per plant type */}
      {panens.length > 0 && (
        <div className="grid lg:grid-cols-2 gap-6 mb-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base"><Leaf size={16} /> Total Produksi per Kebun</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {perKebun.map((k, i) => {
                  const max = perKebun[0].kg || 1
                  return (
                    <div key={i}>
                      <div className="flex justify-between text-sm mb-1">
                        <span className="text-gray-700">{k.name}</span>
                        <span className="font-semibold text-green-700">{k.kg.toFixed(1)} kg</span>
                      </div>
                      <div className="h-2 rounded-full bg-gray-100 overflow-hidden">
                        <div className="h-full bg-green-500 rounded-full" style={{ width: `${(k.kg / max) * 100}%` }} />
                      </div>
                    </div>
                  )
                })}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base"><Sprout size={16} /> Total Produksi per Jenis Tanaman</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {perTanaman.map((t, i) => {
                  const max = perTanaman[0].kg || 1
                  return (
                    <div key={i}>
                      <div className="flex justify-between text-sm mb-1">
                        <span className="text-gray-700">{t.name}</span>
                        <span className="font-semibold text-purple-700">{t.kg.toFixed(1)} kg</span>
                      </div>
                      <div className="h-2 rounded-full bg-gray-100 overflow-hidden">
                        <div className="h-full bg-purple-500 rounded-full" style={{ width: `${(t.kg / max) * 100}%` }} />
                      </div>
                    </div>
                  )
                })}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Filter */}
      <div className="mb-4">
        <Input
          placeholder="Filter komoditas..."
          value={filterKomoditas}
          onChange={e => setFilterKomoditas(e.target.value)}
          className="max-w-xs"
        />
      </div>

      {/* Mobile Cards */}
      <div className="grid gap-3 sm:hidden">
        {filtered.length === 0 && (
          panens.length === 0 ? (
            <div className="text-center py-10 px-4 bg-white rounded-xl border border-dashed border-gray-200">
              <Wheat size={40} className="mx-auto mb-3 text-green-300" />
              <p className="font-medium text-gray-700">Belum ada hasil panen yang dicatat</p>
              <p className="text-sm text-gray-400 mt-1 mb-4">Ketuk tombol di bawah untuk mencatat panen pertama Anda.</p>
              <Button onClick={openNew} disabled={farms.length === 0} className="gap-2"><Plus size={16} /> Tambah Panen</Button>
            </div>
          ) : (
            <p className="text-center text-gray-400 py-8">Tidak ada panen yang cocok dengan pencarian</p>
          )
        )}
        {filtered.map(p => (
          <Card key={p.id}>
            <CardContent className="p-4">
              <div className="flex items-start justify-between mb-2">
                <div>
                  <p className="font-semibold text-gray-800">{p.plantType.name}</p>
                  <p className="text-sm text-gray-500">{p.farm.name} · {p.petani.name}</p>
                </div>
                <Badge variant="success">{p.jumlahKg} kg</Badge>
              </div>
              <p className="text-xs text-gray-500 mb-1">
                {new Date(p.tanggalPanen).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}
              </p>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xs text-gray-400">Kondisi:</span>
                <Badge variant={KONDISI_COLORS[p.kondisi] || 'default'}>{p.kondisi || 'Baik'}</Badge>
              </div>
              {p.hargaJual && <p className="text-xs text-gray-400">Harga: Rp {p.hargaJual.toLocaleString('id-ID')}/kg</p>}
              {p.catatan && <p className="text-xs text-gray-400 mt-1 italic">{p.catatan}</p>}
              <div className="flex gap-2 mt-3">
                <Button size="sm" variant="outline" onClick={() => openEdit(p)} className="flex-1 gap-1">
                  <Pencil size={13} /> Edit
                </Button>
                <Button size="sm" variant="outline" onClick={() => remove(p.id)} className="flex-1 gap-1 text-red-600 border-red-200 hover:bg-red-50">
                  <Trash2 size={13} /> Hapus
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Desktop Table */}
      <Card className="hidden sm:block">
        <CardHeader>
          <CardTitle>Daftar Panen ({filtered.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {filtered.length === 0 ? (
            panens.length === 0 ? (
              <div className="text-center py-12">
                <Wheat size={44} className="mx-auto mb-3 text-green-300" />
                <p className="font-medium text-gray-700">Belum ada hasil panen yang dicatat</p>
                <p className="text-sm text-gray-400 mt-1 mb-4">Mulai dokumentasikan produksi panen kebun Anda.</p>
                <Button onClick={openNew} disabled={farms.length === 0} className="gap-2"><Plus size={16} /> Tambah Panen</Button>
              </div>
            ) : (
              <p className="text-center text-gray-400 py-8">Tidak ada panen yang cocok dengan pencarian</p>
            )
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-gray-500">
                    <th className="pb-3 font-medium">Tanggal Panen</th>
                    <th className="pb-3 font-medium">Kebun</th>
                    <th className="pb-3 font-medium">Jenis Tanaman</th>
                    <th className="pb-3 font-medium">Petani</th>
                    <th className="pb-3 font-medium">Jumlah (kg)</th>
                    <th className="pb-3 font-medium">Harga Jual/kg</th>
                    <th className="pb-3 font-medium">Kondisi Panen</th>
                    <th className="pb-3 font-medium">Catatan</th>
                    <th className="pb-3 font-medium">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {filtered.map(p => (
                    <tr key={p.id} className="hover:bg-gray-50">
                      <td className="py-3 text-gray-700">
                        {new Date(p.tanggalPanen).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
                      </td>
                      <td className="py-3 font-medium text-gray-800">{p.farm.name}</td>
                      <td className="py-3">
                        <Badge variant="info">{p.plantType.name}</Badge>
                      </td>
                      <td className="py-3 text-gray-500">{p.petani.name}</td>
                      <td className="py-3 font-semibold text-green-700">{p.jumlahKg} kg</td>
                      <td className="py-3 text-gray-600">
                        {p.hargaJual ? `Rp ${p.hargaJual.toLocaleString('id-ID')}` : <span className="text-gray-300">—</span>}
                      </td>
                      <td className="py-3">
                        <Badge variant={KONDISI_COLORS[p.kondisi] || 'default'}>{p.kondisi || 'Baik'}</Badge>
                      </td>
                      <td className="py-3 text-gray-400 text-xs max-w-[150px] truncate">{p.catatan || '—'}</td>
                      <td className="py-3">
                        <div className="flex gap-1">
                          <button onClick={() => openEdit(p)} className="p-1.5 rounded hover:bg-gray-100 text-gray-500 hover:text-blue-600">
                            <Pencil size={14} />
                          </button>
                          <button onClick={() => remove(p.id)} className="p-1.5 rounded hover:bg-red-50 text-gray-500 hover:text-red-600">
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <h2 className="text-lg font-bold text-gray-800 mb-5">
                {editId ? 'Edit Data Panen' : 'Tambah Data Panen'}
              </h2>
              <div className="space-y-4">
                {/* Garden picker — plant type auto-fills from it */}
                <div className="w-full">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Kebun *</label>
                  <select
                    className="block w-full rounded-lg border border-gray-300 px-3 py-3 text-base text-gray-900 focus:border-green-500 focus:outline-none focus:ring-1 focus:ring-green-500"
                    value={form.farmId}
                    onChange={e => setForm(f => ({ ...f, farmId: e.target.value }))}
                  >
                    <option value="">Pilih Kebun</option>
                    {farms.map(f => (
                      <option key={f.id} value={f.id}>{f.name} — {f.plantType.name}</option>
                    ))}
                  </select>
                  <p className="text-xs text-gray-400 mt-1">Pilih kebun tempat hasil panen ini berasal. Jenis tanaman akan terisi otomatis.</p>
                </div>

                {/* Auto plant type (read-only) */}
                <Input
                  label="Jenis Tanaman (otomatis dari kebun)"
                  value={selectedFarm?.plantType.name || '-'}
                  disabled
                />

                <Input
                  label="Tanggal Panen *"
                  type="date"
                  className="py-3 text-base"
                  value={form.tanggalPanen}
                  onChange={e => setForm(f => ({ ...f, tanggalPanen: e.target.value }))}
                />
                <div>
                  <Input
                    label="Jumlah Hasil Panen (kg) *"
                    type="number"
                    step="0.1"
                    min="0"
                    placeholder="Contoh: 25"
                    className="py-3 text-base"
                    value={form.jumlahKg}
                    onChange={e => setForm(f => ({ ...f, jumlahKg: e.target.value }))}
                  />
                  <p className="text-xs text-gray-400 mt-1">Berat total hasil panen dalam kilogram (kg).</p>
                </div>
                <Input
                  label="Harga Jual per kg (Rp) — opsional"
                  type="number"
                  min="0"
                  placeholder="Boleh dikosongkan"
                  className="py-3 text-base"
                  value={form.hargaJual}
                  onChange={e => setForm(f => ({ ...f, hargaJual: e.target.value }))}
                />
                <div className="w-full">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Kondisi Panen</label>
                  <select
                    className="block w-full rounded-lg border border-gray-300 px-3 py-3 text-base text-gray-900 focus:border-green-500 focus:outline-none focus:ring-1 focus:ring-green-500"
                    value={form.kondisi}
                    onChange={e => setForm(f => ({ ...f, kondisi: e.target.value }))}
                  >
                    {KONDISI_OPTIONS.map(k => <option key={k} value={k}>{k}</option>)}
                  </select>
                  <p className="text-xs text-gray-400 mt-1">Kualitas hasil panen: Baik, Sedang, atau Kurang.</p>
                </div>
                <div className="w-full">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Catatan</label>
                  <textarea
                    className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-gray-900 placeholder-gray-400 focus:border-green-500 focus:outline-none focus:ring-1 focus:ring-green-500"
                    rows={3}
                    placeholder="Catatan tambahan..."
                    value={form.catatan}
                    onChange={e => setForm(f => ({ ...f, catatan: e.target.value }))}
                  />
                </div>
              </div>

              <div className="flex gap-3 mt-6">
                <Button variant="outline" size="lg" className="flex-1" onClick={() => setShowModal(false)} disabled={saving}>
                  Batal
                </Button>
                <Button size="lg" className="flex-1" onClick={save} disabled={saving || !form.tanggalPanen || !form.farmId || !form.jumlahKg}>
                  {saving ? 'Menyimpan...' : editId ? 'Simpan Perubahan' : 'Tambah Panen'}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
