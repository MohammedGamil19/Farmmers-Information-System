'use client'
import { useEffect, useState } from 'react'
import { api } from '@/lib/api'
import { useAuth } from '@/lib/auth-context'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { Modal } from '@/components/ui/modal'
import { Badge } from '@/components/ui/badge'
import { toast } from '@/components/ui/toaster'
import { Plus, Pencil, Trash2, MapPin, Layers } from 'lucide-react'

type Lahan = {
  id: string; area: number; blockLocation?: string; soilType?: string
  ownershipStatus: string; commodity?: string; description?: string
  owner: { id: string; name: string }
  village: { id: string; name: string }
  kelompokTani?: { id: string; name: string }
}
type KelompokTani = { id: string; name: string }
type Village = { id: string; name: string }
type Farmer = { id: string; name: string }

const OWN_LABELS: Record<string, string> = { OWNED: 'Milik Sendiri', RENTED: 'Sewa', MORTGAGED: 'Gadai' }
const OWN_COLORS: Record<string, 'success' | 'warning' | 'danger'> = { OWNED: 'success', RENTED: 'warning', MORTGAGED: 'danger' }

const EMPTY_FORM = { area: '', blockLocation: '', soilType: '', ownershipStatus: 'OWNED', commodity: '', description: '', villageId: '', kelompokTaniId: '', ownerId: '' }

export default function LahanPage() {
  const { user } = useAuth()
  const [lahans, setLahans] = useState<Lahan[]>([])
  const [totalArea, setTotalArea] = useState(0)
  const [kelompoks, setKelompoks] = useState<KelompokTani[]>([])
  const [villages, setVillages] = useState<Village[]>([])
  const [farmers, setFarmers] = useState<Farmer[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing] = useState<Lahan | null>(null)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState(EMPTY_FORM)

  const load = () => {
    setLoading(true)
    const calls: Promise<unknown>[] = [
      api.get('/api/lahan'),
      api.get('/api/kelompok-tani'),
    ]
    if (user?.role !== 'FARMER') calls.push(api.get('/api/villages'), api.get('/api/anggota'))
    Promise.all(calls).then(([l, k, v, a]) => {
      const ld = l as { lahans: Lahan[]; totalArea: number }
      setLahans(ld.lahans); setTotalArea(ld.totalArea)
      setKelompoks((k as { kelompoks: KelompokTani[] }).kelompoks)
      if (v) setVillages((v as { villages: Village[] }).villages)
      if (a) setFarmers((a as { members: Farmer[] }).members)
    }).finally(() => setLoading(false))
  }
  useEffect(() => { if (user) load() }, [user])

  // Auto-populate villageId for non-SUPER_ADMIN when opening new form
  const getDefaultVillageId = () => user?.village?.id || ''

  const openNew = () => { setEditing(null); setForm({ ...EMPTY_FORM, villageId: getDefaultVillageId() }); setShowModal(true) }
  const openEdit = (l: Lahan) => {
    setEditing(l)
    setForm({ area: String(l.area), blockLocation: l.blockLocation || '', soilType: l.soilType || '', ownershipStatus: l.ownershipStatus, commodity: l.commodity || '', description: l.description || '', villageId: l.village.id, kelompokTaniId: l.kelompokTani?.id || '', ownerId: l.owner.id })
    setShowModal(true)
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault(); setSaving(true)
    try {
      if (editing) {
        await api.put(`/api/lahan/${editing.id}`, form)
        toast('success', 'Data lahan diperbarui')
      } else {
        await api.post('/api/lahan', form)
        toast('success', 'Lahan ditambahkan')
      }
      setShowModal(false); load()
    } catch (err) { toast('error', err instanceof Error ? err.message : 'Gagal') }
    finally { setSaving(false) }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Hapus data lahan ini?')) return
    try { await api.delete(`/api/lahan/${id}`); toast('success', 'Lahan dihapus'); load() }
    catch { toast('error', 'Gagal') }
  }

  return (
    <div>
      <div className="flex items-start justify-between mb-6 gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Data Lahan</h1>
          <p className="text-gray-500 text-sm">{lahans.length} petak · Total {totalArea.toFixed(2)} ha</p>
        </div>
        <Button onClick={openNew} className="shrink-0"><Plus size={16} /><span className="hidden sm:inline">Tambah Lahan</span><span className="sm:hidden">Tambah</span></Button>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mb-6">
        {[
          { label: 'Total Petak', value: lahans.length },
          { label: 'Total Luas', value: `${totalArea.toFixed(2)} ha` },
          { label: 'Milik Sendiri', value: lahans.filter(l => l.ownershipStatus === 'OWNED').length },
        ].map(c => (
          <Card key={c.label}><CardContent className="p-4">
            <p className="text-2xl font-bold text-green-700">{c.value}</p>
            <p className="text-xs text-gray-500 mt-1">{c.label}</p>
          </CardContent></Card>
        ))}
      </div>

      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex justify-center py-10"><div className="h-8 w-8 animate-spin rounded-full border-4 border-green-600 border-t-transparent" /></div>
          ) : lahans.length === 0 ? (
            <div className="text-center py-14 text-gray-400"><Layers size={40} className="mx-auto mb-3 opacity-30" /><p>Belum ada data lahan</p></div>
          ) : (
            <>
              {/* Mobile cards */}
              <div className="sm:hidden divide-y">
                {lahans.map(l => (
                  <div key={l.id} className="p-4 flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="font-semibold text-gray-800">{l.owner.name}</p>
                      <p className="text-sm text-green-700 font-medium">{l.area} ha {l.commodity && `· ${l.commodity}`}</p>
                      {l.blockLocation && <p className="text-xs text-gray-500 flex items-center gap-1"><MapPin size={11} />{l.blockLocation}</p>}
                      {l.soilType && <p className="text-xs text-gray-500">Tanah: {l.soilType}</p>}
                      <div className="flex flex-wrap gap-1.5 mt-1.5">
                        <Badge variant={OWN_COLORS[l.ownershipStatus]}>{OWN_LABELS[l.ownershipStatus]}</Badge>
                        {l.kelompokTani && <span className="text-xs bg-green-50 text-green-700 px-2 py-0.5 rounded-full">{l.kelompokTani.name}</span>}
                      </div>
                    </div>
                    <div className="flex gap-1 shrink-0">
                      <button onClick={() => openEdit(l)} className="text-blue-600 hover:text-blue-800 p-2 rounded-lg hover:bg-blue-50"><Pencil size={14} /></button>
                      <button onClick={() => handleDelete(l.id)} className="text-red-600 hover:text-red-800 p-2 rounded-lg hover:bg-red-50"><Trash2 size={14} /></button>
                    </div>
                  </div>
                ))}
              </div>
              {/* Desktop table */}
              <div className="hidden sm:block overflow-x-auto">
                <table className="w-full text-sm">
                  <thead><tr className="border-b text-gray-500 text-left bg-gray-50">
                    <th className="px-4 py-3 font-medium">Petani</th>
                    <th className="px-4 py-3 font-medium">Luas (ha)</th>
                    <th className="px-4 py-3 font-medium">Lokasi/Blok</th>
                    <th className="px-4 py-3 font-medium">Jenis Tanah</th>
                    <th className="px-4 py-3 font-medium">Kepemilikan</th>
                    <th className="px-4 py-3 font-medium">Komoditas</th>
                    <th className="px-4 py-3 font-medium">Kelompok</th>
                    <th className="px-4 py-3 font-medium">Aksi</th>
                  </tr></thead>
                  <tbody className="divide-y">
                    {lahans.map(l => (
                      <tr key={l.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3 font-medium text-gray-800">{l.owner.name}</td>
                        <td className="px-4 py-3 text-green-700 font-semibold">{l.area}</td>
                        <td className="px-4 py-3 text-gray-600">{l.blockLocation || '-'}</td>
                        <td className="px-4 py-3 text-gray-600">{l.soilType || '-'}</td>
                        <td className="px-4 py-3"><Badge variant={OWN_COLORS[l.ownershipStatus]}>{OWN_LABELS[l.ownershipStatus]}</Badge></td>
                        <td className="px-4 py-3 text-gray-600">{l.commodity || '-'}</td>
                        <td className="px-4 py-3">{l.kelompokTani ? <span className="text-xs bg-green-50 text-green-700 px-2 py-1 rounded-full">{l.kelompokTani.name}</span> : <span className="text-gray-400">-</span>}</td>
                        <td className="px-4 py-3">
                          <div className="flex gap-1">
                            <button onClick={() => openEdit(l)} className="text-blue-600 hover:text-blue-800 p-1"><Pencil size={14} /></button>
                            <button onClick={() => handleDelete(l.id)} className="text-red-600 hover:text-red-800 p-1"><Trash2 size={14} /></button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      <Modal open={showModal} onClose={() => setShowModal(false)} title={editing ? 'Edit Data Lahan' : 'Tambah Lahan'} size="lg">
        <form onSubmit={handleSave} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input label="Luas Lahan (hektar) *" type="number" step="0.01" min="0" value={form.area} onChange={e => setForm({ ...form, area: e.target.value })} placeholder="0.50" required />
            <Input label="Lokasi / Blok" value={form.blockLocation} onChange={e => setForm({ ...form, blockLocation: e.target.value })} placeholder="Blok A / Petak 3" />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input label="Jenis Tanah" value={form.soilType} onChange={e => setForm({ ...form, soilType: e.target.value })} placeholder="Lempung, Pasir, dll" />
            <Select label="Status Kepemilikan" value={form.ownershipStatus} onChange={e => setForm({ ...form, ownershipStatus: e.target.value })}
              options={[{ value: 'OWNED', label: 'Milik Sendiri' }, { value: 'RENTED', label: 'Sewa' }, { value: 'MORTGAGED', label: 'Gadai' }]} />
          </div>
          <Input label="Komoditas yang Ditanam" value={form.commodity} onChange={e => setForm({ ...form, commodity: e.target.value })} placeholder="Padi, Jagung, Sayuran, dll" />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {user?.role === 'SUPER_ADMIN' ? (
              <Select label="Desa *" value={form.villageId} onChange={e => setForm({ ...form, villageId: e.target.value })}
                options={[{ value: '', label: '-- Pilih Desa --' }, ...villages.map(v => ({ value: v.id, label: v.name }))]} />
            ) : (
              <Input label="Desa" value={user?.village?.name || '-'} disabled />
            )}
            <Select label="Kelompok Tani" value={form.kelompokTaniId} onChange={e => setForm({ ...form, kelompokTaniId: e.target.value })}
              options={[{ value: '', label: '-- Pilih Kelompok --' }, ...kelompoks.map(k => ({ value: k.id, label: k.name }))]} />
          </div>
          {user?.role !== 'FARMER' && farmers.length > 0 && (
            <Select label="Petani Pemilik" value={form.ownerId} onChange={e => setForm({ ...form, ownerId: e.target.value })}
              options={[{ value: '', label: '-- Pilih Petani --' }, ...farmers.map(f => ({ value: f.id, label: f.name }))]} />
          )}
          <div className="flex gap-3 pt-2">
            <Button type="button" variant="outline" onClick={() => setShowModal(false)} className="flex-1">Batal</Button>
            <Button type="submit" loading={saving} className="flex-1">Simpan</Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
