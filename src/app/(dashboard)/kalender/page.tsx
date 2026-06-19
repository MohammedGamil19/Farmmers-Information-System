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
import { Plus, Pencil, Trash2, CalendarDays } from 'lucide-react'

type CalendarEvent = {
  id: string; title: string; description?: string; startDate: string; endDate?: string
  category: string; location?: string
  createdBy: { id: string; name: string }
  village: { id: string; name: string }
}
type Village = { id: string; name: string }

const CAT_LABELS: Record<string, string> = { PLANTING: 'Tanam', HARVEST: 'Panen', MEETING: 'Rapat', TRAINING: 'Pelatihan', OTHER: 'Lainnya' }
const CAT_COLORS: Record<string, 'success' | 'default' | 'warning' | 'danger'> = {
  PLANTING: 'success', HARVEST: 'warning', MEETING: 'default', TRAINING: 'default', OTHER: 'default'
}

const EMPTY_FORM = { title: '', description: '', startDate: '', endDate: '', category: 'OTHER', location: '', villageId: '' }

function formatDate(d: string) {
  return new Date(d).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })
}

export default function KalenderPage() {
  const { user } = useAuth()
  const [events, setEvents] = useState<CalendarEvent[]>([])
  const [villages, setVillages] = useState<Village[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing] = useState<CalendarEvent | null>(null)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState(EMPTY_FORM)
  const [filterCat, setFilterCat] = useState('')

  const load = () => {
    setLoading(true)
    const params = new URLSearchParams()
    if (filterCat) params.set('category', filterCat)
    const calls: Promise<unknown>[] = [api.get(`/api/kalender?${params}`)]
    if (user?.role !== 'FARMER') calls.push(api.get('/api/villages'))
    Promise.all(calls).then(([e, v]) => {
      setEvents((e as { events: CalendarEvent[] }).events)
      if (v) setVillages((v as { villages: Village[] }).villages)
    }).finally(() => setLoading(false))
  }
  useEffect(() => { if (user) load() }, [user, filterCat])

  const openNew = () => { setEditing(null); setForm(EMPTY_FORM); setShowModal(true) }
  const openEdit = (ev: CalendarEvent) => {
    setEditing(ev)
    setForm({
      title: ev.title, description: ev.description || '', startDate: ev.startDate.slice(0, 10),
      endDate: ev.endDate ? ev.endDate.slice(0, 10) : '', category: ev.category, location: ev.location || '', villageId: ev.village.id
    })
    setShowModal(true)
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault(); setSaving(true)
    try {
      if (editing) { await api.put(`/api/kalender/${editing.id}`, form); toast('success', 'Kegiatan diperbarui') }
      else { await api.post('/api/kalender', form); toast('success', 'Kegiatan ditambahkan') }
      setShowModal(false); load()
    } catch (err) { toast('error', err instanceof Error ? err.message : 'Gagal') }
    finally { setSaving(false) }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Hapus kegiatan ini?')) return
    try { await api.delete(`/api/kalender/${id}`); toast('success', 'Dihapus'); load() }
    catch { toast('error', 'Gagal') }
  }

  // Group by month
  const grouped: Record<string, CalendarEvent[]> = {}
  events.forEach(ev => {
    const key = new Date(ev.startDate).toLocaleDateString('id-ID', { month: 'long', year: 'numeric' })
    if (!grouped[key]) grouped[key] = []
    grouped[key].push(ev)
  })

  return (
    <div>
      <div className="flex items-start justify-between mb-6 gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Kalender Kegiatan</h1>
          <p className="text-gray-500 text-sm">{events.length} kegiatan</p>
        </div>
        {user?.role !== 'FARMER' && (
          <Button onClick={openNew} className="shrink-0"><Plus size={16} /><span className="hidden sm:inline">Tambah Kegiatan</span><span className="sm:hidden">Tambah</span></Button>
        )}
      </div>

      <div className="mb-4 w-full sm:w-52">
        <Select label="" value={filterCat} onChange={e => setFilterCat(e.target.value)}
          options={[{ value: '', label: 'Semua Kategori' }, ...Object.entries(CAT_LABELS).map(([v, l]) => ({ value: v, label: l }))]} />
      </div>

      {loading ? (
        <div className="flex justify-center py-10"><div className="h-8 w-8 animate-spin rounded-full border-4 border-green-600 border-t-transparent" /></div>
      ) : events.length === 0 ? (
        <Card><CardContent className="text-center py-14 text-gray-400">
          <CalendarDays size={40} className="mx-auto mb-3 opacity-30" /><p>Belum ada kegiatan</p>
        </CardContent></Card>
      ) : Object.entries(grouped).map(([month, evs]) => (
        <div key={month} className="mb-6">
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">{month}</h2>
          <div className="space-y-3">
            {evs.map(ev => (
              <Card key={ev.id}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex gap-3 min-w-0 flex-1">
                      <div className="text-center min-w-[48px]">
                        <p className="text-2xl font-bold text-green-700 leading-none">{new Date(ev.startDate).getDate()}</p>
                        <p className="text-xs text-gray-500">{new Date(ev.startDate).toLocaleDateString('id-ID', { month: 'short' })}</p>
                      </div>
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2 mb-0.5">
                          <Badge variant={CAT_COLORS[ev.category]}>{CAT_LABELS[ev.category]}</Badge>
                        </div>
                        <h3 className="font-semibold text-gray-800">{ev.title}</h3>
                        {ev.description && <p className="text-sm text-gray-600 mt-0.5">{ev.description}</p>}
                        <p className="text-xs text-gray-400 mt-1">
                          {formatDate(ev.startDate)}{ev.endDate && ` – ${formatDate(ev.endDate)}`}
                          {ev.location && ` · ${ev.location}`}
                          {` · ${ev.village.name}`}
                        </p>
                      </div>
                    </div>
                    {user?.role !== 'FARMER' && (
                      <div className="flex gap-1 shrink-0">
                        <button onClick={() => openEdit(ev)} className="text-blue-600 hover:text-blue-800 p-2 rounded-lg hover:bg-blue-50"><Pencil size={14} /></button>
                        <button onClick={() => handleDelete(ev.id)} className="text-red-600 hover:text-red-800 p-2 rounded-lg hover:bg-red-50"><Trash2 size={14} /></button>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      ))}

      <Modal open={showModal} onClose={() => setShowModal(false)} title={editing ? 'Edit Kegiatan' : 'Tambah Kegiatan'}>
        <form onSubmit={handleSave} className="space-y-4">
          <Input label="Judul Kegiatan *" value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} required />
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Deskripsi</label>
            <textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} rows={3}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-green-500" />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input label="Tanggal Mulai *" type="date" value={form.startDate} onChange={e => setForm({ ...form, startDate: e.target.value })} required />
            <Input label="Tanggal Selesai" type="date" value={form.endDate} onChange={e => setForm({ ...form, endDate: e.target.value })} />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Select label="Kategori" value={form.category} onChange={e => setForm({ ...form, category: e.target.value })}
              options={Object.entries(CAT_LABELS).map(([v, l]) => ({ value: v, label: l }))} />
            <Input label="Lokasi" value={form.location} onChange={e => setForm({ ...form, location: e.target.value })} placeholder="Balai Desa / Lapangan" />
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
