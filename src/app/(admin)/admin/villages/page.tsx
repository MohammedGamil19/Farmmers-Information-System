'use client'
import { useEffect, useState } from 'react'
import { api } from '@/lib/api'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Modal } from '@/components/ui/modal'
import { Badge } from '@/components/ui/badge'
import { toast } from '@/components/ui/toaster'
import { Plus, Pencil, Trash2, MapPin, Users, Leaf } from 'lucide-react'

export default function AdminVillagesPage() {
  const [villages, setVillages] = useState<Record<string, unknown>[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing] = useState<Record<string, unknown> | null>(null)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({ name: '', district: '', province: '', description: '' })

  const load = () => { setLoading(true); api.get('/api/villages').then(d => setVillages(d.villages)).finally(() => setLoading(false)) }
  useEffect(() => { load() }, [])

  const openNew = () => { setEditing(null); setForm({ name: '', district: '', province: '', description: '' }); setShowModal(true) }
  const openEdit = (v: Record<string, unknown>) => { setEditing(v); setForm({ name: v.name as string, district: v.district as string, province: v.province as string, description: (v.description as string) || '' }); setShowModal(true) }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault(); setSaving(true)
    try {
      if (editing) { await api.put(`/api/villages/${editing.id}`, form); toast('success', 'Desa diperbarui') }
      else { await api.post('/api/villages', form); toast('success', 'Desa ditambahkan') }
      setShowModal(false); load()
    } catch (err) { toast('error', err instanceof Error ? err.message : 'Gagal') } finally { setSaving(false) }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Yakin hapus desa ini?')) return
    try { await api.delete(`/api/villages/${id}`); toast('success', 'Desa dihapus'); load() } catch { toast('error', 'Gagal') }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div><h1 className="text-2xl font-bold text-gray-800">Manajemen Desa</h1><p className="text-gray-500">{villages.length} desa terdaftar</p></div>
        <Button onClick={openNew}><Plus size={16} />Tambah Desa</Button>
      </div>

      {loading ? <div className="flex justify-center py-20"><div className="h-10 w-10 animate-spin rounded-full border-4 border-green-600 border-t-transparent" /></div> : (
        <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">
          {villages.length === 0 && <div className="col-span-full text-center py-20 text-gray-400"><MapPin size={48} className="mx-auto mb-3 opacity-30" /><p>Belum ada desa</p></div>}
          {villages.map(v => {
            const count = v._count as Record<string, number>
            return (
              <Card key={v.id as string} className="hover:shadow-md transition-shadow">
                <CardContent className="p-5">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h3 className="font-semibold text-gray-800">{v.name as string}</h3>
                      <p className="text-sm text-gray-500">{v.district as string}, {v.province as string}</p>
                    </div>
                    <div className="flex gap-1">
                      <button onClick={() => openEdit(v)} className="text-blue-600 hover:text-blue-800 p-1"><Pencil size={15} /></button>
                      <button onClick={() => handleDelete(v.id as string)} className="text-red-600 hover:text-red-800 p-1"><Trash2 size={15} /></button>
                    </div>
                  </div>
                  {v.description ? <p className="text-sm text-gray-500 mb-3">{String(v.description)}</p> : null}
                  <div className="flex gap-3 text-sm text-gray-600">
                    <span className="flex items-center gap-1"><Users size={13} />{count?.users || 0} pengguna</span>
                    <span className="flex items-center gap-1"><Leaf size={13} />{count?.farms || 0} kebun</span>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

      <Modal open={showModal} onClose={() => setShowModal(false)} title={editing ? 'Edit Desa' : 'Tambah Desa'}>
        <form onSubmit={handleSave} className="space-y-4">
          <Input label="Nama Desa *" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="Desa Sumber Makmur" required />
          <Input label="Kecamatan *" value={form.district} onChange={e => setForm({ ...form, district: e.target.value })} placeholder="Kecamatan Sejahtera" required />
          <Input label="Provinsi *" value={form.province} onChange={e => setForm({ ...form, province: e.target.value })} placeholder="Jawa Tengah" required />
          <Textarea label="Deskripsi" value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} placeholder="Keterangan tentang desa..." />
          <div className="flex gap-3 pt-2">
            <Button type="button" variant="outline" onClick={() => setShowModal(false)} className="flex-1">Batal</Button>
            <Button type="submit" loading={saving} className="flex-1">Simpan</Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}