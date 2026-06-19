'use client'
import { useEffect, useState } from 'react'
import { api } from '@/lib/api'
import { useAuth } from '@/lib/auth-context'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { Modal } from '@/components/ui/modal'
import { toast } from '@/components/ui/toaster'
import { Plus, Pencil, Trash2, Users } from 'lucide-react'

type KelompokTani = {
  id: string; name: string; description?: string; isActive: boolean
  village: { id: string; name: string }
  _count: { members: number; lahans: number }
}
type Village = { id: string; name: string }

const EMPTY_FORM = { name: '', description: '', villageId: '' }

export default function KelompokTaniPage() {
  const { user } = useAuth()
  const [items, setItems] = useState<KelompokTani[]>([])
  const [villages, setVillages] = useState<Village[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing] = useState<KelompokTani | null>(null)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState(EMPTY_FORM)

  const load = () => {
    setLoading(true)
    Promise.all([api.get('/api/kelompok-tani'), api.get('/api/villages')]).then(([k, v]) => {
      setItems((k as { kelompoks: KelompokTani[] }).kelompoks)
      setVillages((v as { villages: Village[] }).villages)
    }).finally(() => setLoading(false))
  }
  useEffect(() => { if (user) load() }, [user])

  const openNew = () => { setEditing(null); setForm({ ...EMPTY_FORM, villageId: user?.village?.id || '' }); setShowModal(true) }
  const openEdit = (k: KelompokTani) => {
    setEditing(k)
    setForm({ name: k.name, description: k.description || '', villageId: k.village.id })
    setShowModal(true)
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault(); setSaving(true)
    try {
      if (editing) { await api.put(`/api/kelompok-tani/${editing.id}`, form); toast('success', 'Kelompok diperbarui') }
      else { await api.post('/api/kelompok-tani', form); toast('success', 'Kelompok ditambahkan') }
      setShowModal(false); load()
    } catch (err) { toast('error', err instanceof Error ? err.message : 'Gagal') }
    finally { setSaving(false) }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Nonaktifkan kelompok ini?')) return
    try { await api.delete(`/api/kelompok-tani/${id}`); toast('success', 'Kelompok dinonaktifkan'); load() }
    catch { toast('error', 'Gagal') }
  }

  if (user?.role === 'FARMER') return <div className="text-gray-500 p-8 text-center">Akses ditolak</div>

  return (
    <div>
      <div className="flex items-start justify-between mb-6 gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Kelompok Tani</h1>
          <p className="text-gray-500 text-sm">{items.length} kelompok terdaftar</p>
        </div>
        <Button onClick={openNew} className="shrink-0"><Plus size={16} /><span className="hidden sm:inline">Tambah Kelompok</span><span className="sm:hidden">Tambah</span></Button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {loading ? (
          <div className="col-span-full flex justify-center py-10"><div className="h-8 w-8 animate-spin rounded-full border-4 border-green-600 border-t-transparent" /></div>
        ) : items.length === 0 ? (
          <Card className="col-span-full"><CardContent className="text-center py-14 text-gray-400">
            <Users size={40} className="mx-auto mb-3 opacity-30" /><p>Belum ada kelompok tani</p>
          </CardContent></Card>
        ) : items.map(k => (
          <Card key={k.id} className={!k.isActive ? 'opacity-60' : ''}>
            <CardContent className="p-4">
              <div className="flex items-start justify-between gap-2 mb-2">
                <div>
                  <h3 className="font-semibold text-gray-800">{k.name}</h3>
                  <p className="text-xs text-gray-500">{k.village.name}</p>
                </div>
                <div className="flex gap-1 shrink-0">
                  <button onClick={() => openEdit(k)} className="text-blue-600 hover:text-blue-800 p-1.5 rounded hover:bg-blue-50"><Pencil size={13} /></button>
                  <button onClick={() => handleDelete(k.id)} className="text-red-600 hover:text-red-800 p-1.5 rounded hover:bg-red-50"><Trash2 size={13} /></button>
                </div>
              </div>
              {k.description && <p className="text-sm text-gray-600 mb-3">{k.description}</p>}
              <div className="flex gap-4 text-xs text-gray-500 border-t pt-2 mt-2">
                <span>{k._count.members} anggota</span>
                <span>{k._count.lahans} lahan</span>
                {!k.isActive && <span className="text-red-500">Nonaktif</span>}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Modal open={showModal} onClose={() => setShowModal(false)} title={editing ? 'Edit Kelompok Tani' : 'Tambah Kelompok Tani'}>
        <form onSubmit={handleSave} className="space-y-4">
          <Input label="Nama Kelompok *" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} required />
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Deskripsi</label>
            <textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} rows={3}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-green-500" />
          </div>
          {user?.role === 'SUPER_ADMIN' ? (
            <Select label="Desa *" value={form.villageId} onChange={e => setForm({ ...form, villageId: e.target.value })}
              options={[{ value: '', label: '-- Pilih Desa --' }, ...villages.map(v => ({ value: v.id, label: v.name }))]} />
          ) : (
            <Input label="Desa" value={user?.village?.name || '-'} disabled />
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
