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
import { Plus, Pencil, Trash2, Megaphone } from 'lucide-react'

type Announcement = {
  id: string; title: string; content: string; type: string; isPublished: boolean; publishedAt?: string
  author: { id: string; name: string }
  village: { id: string; name: string }
}
type Village = { id: string; name: string }

const TYPE_LABELS: Record<string, string> = { INFO: 'Info', WARNING: 'Peringatan', EVENT: 'Acara' }
const TYPE_COLORS: Record<string, 'default' | 'warning' | 'success'> = { INFO: 'default', WARNING: 'warning', EVENT: 'success' }

const EMPTY_FORM = { title: '', content: '', type: 'INFO', isPublished: 'true', villageId: '' }

export default function PengumumanPage() {
  const { user } = useAuth()
  const [items, setItems] = useState<Announcement[]>([])
  const [villages, setVillages] = useState<Village[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing] = useState<Announcement | null>(null)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState(EMPTY_FORM)

  const load = () => {
    setLoading(true)
    const calls: Promise<unknown>[] = [api.get('/api/pengumuman')]
    if (user?.role !== 'FARMER') calls.push(api.get('/api/villages'))
    Promise.all(calls).then(([a, v]) => {
      setItems((a as { announcements: Announcement[] }).announcements)
      if (v) setVillages((v as { villages: Village[] }).villages)
    }).finally(() => setLoading(false))
  }
  useEffect(() => { if (user) load() }, [user])

  const openNew = () => { setEditing(null); setForm({ ...EMPTY_FORM, villageId: user?.village?.id || '' }); setShowModal(true) }
  const openEdit = (a: Announcement) => {
    setEditing(a)
    setForm({ title: a.title, content: a.content, type: a.type, isPublished: String(a.isPublished), villageId: a.village.id })
    setShowModal(true)
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault(); setSaving(true)
    try {
      const payload = { ...form, isPublished: form.isPublished === 'true' }
      if (editing) { await api.put(`/api/pengumuman/${editing.id}`, payload); toast('success', 'Pengumuman diperbarui') }
      else { await api.post('/api/pengumuman', payload); toast('success', 'Pengumuman ditambahkan') }
      setShowModal(false); load()
    } catch (err) { toast('error', err instanceof Error ? err.message : 'Gagal') }
    finally { setSaving(false) }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Hapus pengumuman ini?')) return
    try { await api.delete(`/api/pengumuman/${id}`); toast('success', 'Dihapus'); load() }
    catch { toast('error', 'Gagal') }
  }

  return (
    <div>
      <div className="flex items-start justify-between mb-6 gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Pengumuman</h1>
          <p className="text-gray-500 text-sm">{items.length} pengumuman</p>
        </div>
        {user?.role !== 'FARMER' && (
          <Button onClick={openNew} className="shrink-0"><Plus size={16} /><span className="hidden sm:inline">Tambah Pengumuman</span><span className="sm:hidden">Tambah</span></Button>
        )}
      </div>

      <div className="space-y-4">
        {loading ? (
          <div className="flex justify-center py-10"><div className="h-8 w-8 animate-spin rounded-full border-4 border-green-600 border-t-transparent" /></div>
        ) : items.length === 0 ? (
          <Card><CardContent className="text-center py-14 text-gray-400">
            <Megaphone size={40} className="mx-auto mb-3 opacity-30" /><p>Belum ada pengumuman</p>
          </CardContent></Card>
        ) : items.map(a => (
          <Card key={a.id}>
            <CardContent className="p-4 sm:p-5">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2 mb-1.5">
                    <Badge variant={TYPE_COLORS[a.type]}>{TYPE_LABELS[a.type]}</Badge>
                    {!a.isPublished && <Badge variant="danger">Draft</Badge>}
                  </div>
                  <h3 className="font-semibold text-gray-800 text-base">{a.title}</h3>
                  <p className="text-sm text-gray-600 mt-1 whitespace-pre-wrap">{a.content}</p>
                  <p className="text-xs text-gray-400 mt-2">
                    {a.author.name} · {a.village.name} · {a.publishedAt ? new Date(a.publishedAt).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' }) : 'Draft'}
                  </p>
                </div>
                {user?.role !== 'FARMER' && (
                  <div className="flex gap-1 shrink-0">
                    <button onClick={() => openEdit(a)} className="text-blue-600 hover:text-blue-800 p-2 rounded-lg hover:bg-blue-50"><Pencil size={14} /></button>
                    <button onClick={() => handleDelete(a.id)} className="text-red-600 hover:text-red-800 p-2 rounded-lg hover:bg-red-50"><Trash2 size={14} /></button>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Modal open={showModal} onClose={() => setShowModal(false)} title={editing ? 'Edit Pengumuman' : 'Tambah Pengumuman'}>
        <form onSubmit={handleSave} className="space-y-4">
          <Input label="Judul *" value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} required />
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Isi Pengumuman *</label>
            <textarea value={form.content} onChange={e => setForm({ ...form, content: e.target.value })} required rows={4}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-green-500" />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Select label="Jenis" value={form.type} onChange={e => setForm({ ...form, type: e.target.value })}
              options={[{ value: 'INFO', label: 'Info' }, { value: 'WARNING', label: 'Peringatan' }, { value: 'EVENT', label: 'Acara' }]} />
            <Select label="Status" value={form.isPublished} onChange={e => setForm({ ...form, isPublished: e.target.value })}
              options={[{ value: 'true', label: 'Terbitkan' }, { value: 'false', label: 'Simpan sebagai Draft' }]} />
          </div>
          <Select label="Desa *" value={form.villageId} onChange={e => setForm({ ...form, villageId: e.target.value })}
            options={[{ value: '', label: '-- Pilih Desa --' }, ...villages.map(v => ({ value: v.id, label: v.name }))]} />
          <div className="flex gap-3 pt-2">
            <Button type="button" variant="outline" onClick={() => setShowModal(false)} className="flex-1">Batal</Button>
            <Button type="submit" loading={saving} className="flex-1">Simpan</Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
