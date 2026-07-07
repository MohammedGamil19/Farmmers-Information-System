'use client'
import { useEffect, useRef, useState } from 'react'
import { useAuth } from '@/lib/auth-context'
import { api } from '@/lib/api'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Plus, Pencil, Trash2, Wheat, Scale, TrendingUp, Sprout } from 'lucide-react'

type Lahan = { id: string; blockLocation: string | null; commodity: string | null }
type Village = { id: string; name: string }
type Petani = { id: string; name: string }
type Panen = {
  id: string
  tanggalPanen: string
  komoditas: string
  jumlahKg: number
  hargaJual: number | null
  catatan: string | null
  petani: Petani
  village: Village
  lahan: Lahan | null
}

const EMPTY_FORM = {
  tanggalPanen: '',
  komoditas: '',
  jumlahKg: '',
  hargaJual: '',
  catatan: '',
  villageId: '',
  lahanId: '',
  petaniId: '',
}

export default function PanenPage() {
  const { user } = useAuth()
  const [panens, setPanens] = useState<Panen[]>([])
  const [lahans, setLahans] = useState<Lahan[]>([])
  const [villages, setVillages] = useState<Village[]>([])
  const [anggota, setAnggota] = useState<Petani[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editId, setEditId] = useState<string | null>(null)
  const [form, setForm] = useState({ ...EMPTY_FORM })
  const [saving, setSaving] = useState(false)
  const [filterKomoditas, setFilterKomoditas] = useState('')
  const submitLock = useRef(false)

  const isFarmer = user?.role === 'FARMER'
  const isSuperAdmin = user?.role === 'SUPER_ADMIN'

  async function load() {
    setLoading(true)
    try {
      const calls: Promise<unknown>[] = [
        api.get('/api/panen'),
        api.get('/api/lahan'),
      ]
      if (!isFarmer) calls.push(api.get('/api/anggota'))
      if (isSuperAdmin) calls.push(api.get('/api/villages'))

      const [panenData, lahanData, ...rest] = await Promise.all(calls)
      setPanens(panenData as Panen[])
      setLahans((lahanData as { lahans: Lahan[] }).lahans || [])
      if (!isFarmer && rest[0]) setAnggota((rest[0] as { members: Petani[] }).members || [])
      if (isSuperAdmin && rest[1]) setVillages((rest[1] as { villages: Village[] }).villages || [])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, []) // eslint-disable-line react-hooks/exhaustive-deps

  function openNew() {
    setEditId(null)
    setForm({
      ...EMPTY_FORM,
      tanggalPanen: new Date().toISOString().split('T')[0],
      villageId: user?.village?.id || '',
      petaniId: isFarmer ? (user?.id || '') : '',
    })
    setShowModal(true)
  }

  function openEdit(p: Panen) {
    setEditId(p.id)
    setForm({
      tanggalPanen: p.tanggalPanen.split('T')[0],
      komoditas: p.komoditas,
      jumlahKg: String(p.jumlahKg),
      hargaJual: p.hargaJual != null ? String(p.hargaJual) : '',
      catatan: p.catatan || '',
      villageId: p.village.id,
      lahanId: p.lahan?.id || '',
      petaniId: p.petani.id,
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
  const komoditasTerbanyak = (() => {
    const map: Record<string, number> = {}
    panens.forEach(p => { map[p.komoditas] = (map[p.komoditas] || 0) + p.jumlahKg })
    const top = Object.entries(map).sort((a, b) => b[1] - a[1])[0]
    return top ? top[0] : '-'
  })()

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
          <p className="text-gray-500 text-sm mt-1">Rekap hasil panen GAPOKTAN</p>
        </div>
        <Button onClick={openNew} className="flex items-center gap-2">
          <Plus size={16} /> Tambah Panen
        </Button>
      </div>

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
            <p className="text-xs text-gray-500 mt-1">Komoditas Terbanyak</p>
          </CardContent>
        </Card>
      </div>

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
          <p className="text-center text-gray-400 py-8">Belum ada data panen</p>
        )}
        {filtered.map(p => (
          <Card key={p.id}>
            <CardContent className="p-4">
              <div className="flex items-start justify-between mb-2">
                <div>
                  <p className="font-semibold text-gray-800">{p.komoditas}</p>
                  <p className="text-sm text-gray-500">{p.petani.name}</p>
                </div>
                <Badge variant="success">{p.jumlahKg} kg</Badge>
              </div>
              <p className="text-xs text-gray-500 mb-1">
                {new Date(p.tanggalPanen).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}
              </p>
              {p.lahan && <p className="text-xs text-gray-400">Lahan: {p.lahan.blockLocation || p.lahan.commodity || '-'}</p>}
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
            <p className="text-center text-gray-400 py-8">Belum ada data panen</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-gray-500">
                    <th className="pb-3 font-medium">Tanggal Panen</th>
                    <th className="pb-3 font-medium">Petani</th>
                    <th className="pb-3 font-medium">Komoditas</th>
                    <th className="pb-3 font-medium">Jumlah (kg)</th>
                    <th className="pb-3 font-medium">Harga Jual/kg</th>
                    <th className="pb-3 font-medium">Lahan</th>
                    <th className="pb-3 font-medium">Desa</th>
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
                      <td className="py-3 font-medium text-gray-800">{p.petani.name}</td>
                      <td className="py-3">
                        <Badge variant="info">{p.komoditas}</Badge>
                      </td>
                      <td className="py-3 font-semibold text-green-700">{p.jumlahKg} kg</td>
                      <td className="py-3 text-gray-600">
                        {p.hargaJual ? `Rp ${p.hargaJual.toLocaleString('id-ID')}` : <span className="text-gray-300">—</span>}
                      </td>
                      <td className="py-3 text-gray-500 text-xs">
                        {p.lahan ? (p.lahan.blockLocation || p.lahan.commodity || '-') : <span className="text-gray-300">—</span>}
                      </td>
                      <td className="py-3 text-gray-500">{p.village.name}</td>
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
                <Input
                  label="Tanggal Panen *"
                  type="date"
                  value={form.tanggalPanen}
                  onChange={e => setForm(f => ({ ...f, tanggalPanen: e.target.value }))}
                />
                <Input
                  label="Komoditas *"
                  placeholder="Contoh: Selada, Bayam, Kangkung"
                  value={form.komoditas}
                  onChange={e => setForm(f => ({ ...f, komoditas: e.target.value }))}
                />
                <Input
                  label="Jumlah Hasil Panen (kg) *"
                  type="number"
                  step="0.1"
                  min="0"
                  placeholder="0"
                  value={form.jumlahKg}
                  onChange={e => setForm(f => ({ ...f, jumlahKg: e.target.value }))}
                />
                <Input
                  label="Harga Jual per kg (Rp) — opsional"
                  type="number"
                  min="0"
                  placeholder="0"
                  value={form.hargaJual}
                  onChange={e => setForm(f => ({ ...f, hargaJual: e.target.value }))}
                />

                {/* Village — auto-filled or dropdown for Super Admin */}
                {isSuperAdmin ? (
                  <div className="w-full">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Desa *</label>
                    <select
                      className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-gray-900 focus:border-green-500 focus:outline-none focus:ring-1 focus:ring-green-500"
                      value={form.villageId}
                      onChange={e => setForm(f => ({ ...f, villageId: e.target.value }))}
                    >
                      <option value="">Pilih Desa</option>
                      {villages.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}
                    </select>
                  </div>
                ) : (
                  <Input label="Desa" value={user?.village?.name || '-'} disabled />
                )}

                {/* Petani — only admin can pick */}
                {!isFarmer && (
                  <div className="w-full">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Petani</label>
                    <select
                      className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-gray-900 focus:border-green-500 focus:outline-none focus:ring-1 focus:ring-green-500"
                      value={form.petaniId}
                      onChange={e => setForm(f => ({ ...f, petaniId: e.target.value }))}
                    >
                      <option value="">Pilih Petani (opsional)</option>
                      {anggota.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                    </select>
                  </div>
                )}

                {/* Lahan */}
                <div className="w-full">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Lahan (opsional)</label>
                  <select
                    className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-gray-900 focus:border-green-500 focus:outline-none focus:ring-1 focus:ring-green-500"
                    value={form.lahanId}
                    onChange={e => setForm(f => ({ ...f, lahanId: e.target.value }))}
                  >
                    <option value="">Pilih Lahan</option>
                    {lahans.map(l => (
                      <option key={l.id} value={l.id}>
                        {l.blockLocation || l.commodity || l.id.slice(0, 8)}
                      </option>
                    ))}
                  </select>
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
                <Button variant="outline" className="flex-1" onClick={() => setShowModal(false)} disabled={saving}>
                  Batal
                </Button>
                <Button className="flex-1" onClick={save} disabled={saving || !form.tanggalPanen || !form.komoditas || !form.jumlahKg || !form.villageId}>
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
