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
import { Plus, Pencil, Trash2, Users, Search, Phone, MapPin, IdCard } from 'lucide-react'

type Member = {
  id: string; name: string; email: string; phone?: string; nik?: string
  address?: string; rt?: string; rw?: string; memberStatus: string; isActive: boolean
  village?: { id: string; name: string }
  kelompokTani?: { id: string; name: string }
  _count: { lahans: number; farms: number }
}
type KelompokTani = { id: string; name: string }
type Village = { id: string; name: string }

const STATUS_COLORS: Record<string, 'success' | 'warning' | 'danger'> = {
  ACTIVE: 'success', PENDING: 'warning', INACTIVE: 'danger',
}
const STATUS_LABELS: Record<string, string> = {
  ACTIVE: 'Aktif', PENDING: 'Pending', INACTIVE: 'Nonaktif',
}

const EMPTY_FORM = { name: '', email: '', password: '', phone: '', nik: '', address: '', rt: '', rw: '', villageId: '', kelompokTaniId: '', memberStatus: 'ACTIVE' }

export default function AnggotaPage() {
  const { user } = useAuth()
  const [members, setMembers] = useState<Member[]>([])
  const [kelompoks, setKelompoks] = useState<KelompokTani[]>([])
  const [villages, setVillages] = useState<Village[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filterKelompok, setFilterKelompok] = useState('')
  const [filterStatus, setFilterStatus] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing] = useState<Member | null>(null)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState(EMPTY_FORM)

  const load = () => {
    setLoading(true)
    const params = new URLSearchParams()
    if (filterKelompok) params.set('kelompokId', filterKelompok)
    if (filterStatus) params.set('memberStatus', filterStatus)
    if (search) params.set('search', search)
    Promise.all([
      api.get(`/api/anggota?${params}`),
      api.get('/api/kelompok-tani'),
      api.get('/api/villages'),
    ]).then(([m, k, v]) => {
      setMembers(m.members)
      setKelompoks(k.kelompoks)
      setVillages(v.villages)
    }).finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [filterKelompok, filterStatus])

  const openNew = () => { setEditing(null); setForm(EMPTY_FORM); setShowModal(true) }
  const openEdit = (m: Member) => {
    setEditing(m)
    setForm({ name: m.name, email: m.email, password: '', phone: m.phone || '', nik: m.nik || '', address: m.address || '', rt: m.rt || '', rw: m.rw || '', villageId: m.village?.id || '', kelompokTaniId: m.kelompokTani?.id || '', memberStatus: m.memberStatus })
    setShowModal(true)
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault(); setSaving(true)
    try {
      if (editing) {
        await api.put(`/api/anggota/${editing.id}`, form)
        toast('success', 'Data anggota diperbarui')
      } else {
        await api.post('/api/anggota', form)
        toast('success', 'Anggota ditambahkan')
      }
      setShowModal(false); load()
    } catch (err) { toast('error', err instanceof Error ? err.message : 'Gagal') }
    finally { setSaving(false) }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Nonaktifkan anggota ini?')) return
    try { await api.delete(`/api/anggota/${id}`); toast('success', 'Anggota dinonaktifkan'); load() }
    catch { toast('error', 'Gagal') }
  }

  const filtered = members.filter(m =>
    !search || m.name.toLowerCase().includes(search.toLowerCase()) ||
    (m.nik || '').includes(search) || (m.phone || '').includes(search)
  )

  return (
    <div>
      <div className="flex items-start justify-between mb-6 gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Data Anggota</h1>
          <p className="text-gray-500 text-sm">{members.length} anggota terdaftar</p>
        </div>
        {user?.role !== 'FARMER' && (
          <Button onClick={openNew} className="shrink-0"><Plus size={16} /><span className="hidden sm:inline">Tambah Anggota</span><span className="sm:hidden">Tambah</span></Button>
        )}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-4">
        <div className="relative flex-1 min-w-[200px]">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input value={search} onChange={e => setSearch(e.target.value)} onKeyDown={e => e.key === 'Enter' && load()}
            placeholder="Cari nama, NIK, atau no. HP..." className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-green-500" />
        </div>
        <div className="w-full sm:w-48">
          <Select label="" value={filterKelompok} onChange={e => setFilterKelompok(e.target.value)}
            options={[{ value: '', label: 'Semua Kelompok' }, ...kelompoks.map(k => ({ value: k.id, label: k.name }))]} />
        </div>
        <div className="w-full sm:w-44">
          <Select label="" value={filterStatus} onChange={e => setFilterStatus(e.target.value)}
            options={[{ value: '', label: 'Semua Status' }, { value: 'ACTIVE', label: 'Aktif' }, { value: 'PENDING', label: 'Pending' }, { value: 'INACTIVE', label: 'Nonaktif' }]} />
        </div>
      </div>

      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex justify-center py-10"><div className="h-8 w-8 animate-spin rounded-full border-4 border-green-600 border-t-transparent" /></div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-14 text-gray-400"><Users size={40} className="mx-auto mb-3 opacity-30" /><p>Belum ada anggota</p></div>
          ) : (
            <>
              {/* Mobile cards */}
              <div className="sm:hidden divide-y">
                {filtered.map(m => (
                  <div key={m.id} className="p-4">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="font-semibold text-gray-800">{m.name}</p>
                        {!!m.nik && <p className="text-xs text-gray-500 flex items-center gap-1"><IdCard size={11} />NIK: {m.nik}</p>}
                        {!!m.phone && <p className="text-xs text-gray-500 flex items-center gap-1"><Phone size={11} />{m.phone}</p>}
                        {(m.rt || m.rw || m.address) && <p className="text-xs text-gray-500 flex items-center gap-1"><MapPin size={11} />{[m.address, m.rt && `RT ${m.rt}`, m.rw && `RW ${m.rw}`].filter(Boolean).join(', ')}</p>}
                        <div className="flex flex-wrap gap-1.5 mt-1.5">
                          <Badge variant={STATUS_COLORS[m.memberStatus] || 'default'}>{STATUS_LABELS[m.memberStatus]}</Badge>
                          {m.kelompokTani && <span className="text-xs bg-green-50 text-green-700 px-2 py-0.5 rounded-full">{m.kelompokTani.name}</span>}
                        </div>
                        <p className="text-xs text-gray-400 mt-1">{m._count.lahans} lahan · {m._count.farms} kebun</p>
                      </div>
                      {user?.role !== 'FARMER' && (
                        <div className="flex gap-1 shrink-0">
                          <button onClick={() => openEdit(m)} className="text-blue-600 hover:text-blue-800 p-2 rounded-lg hover:bg-blue-50"><Pencil size={14} /></button>
                          {user?.role === 'SUPER_ADMIN' && <button onClick={() => handleDelete(m.id)} className="text-red-600 hover:text-red-800 p-2 rounded-lg hover:bg-red-50"><Trash2 size={14} /></button>}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
              {/* Desktop table */}
              <div className="hidden sm:block overflow-x-auto">
                <table className="w-full text-sm">
                  <thead><tr className="border-b text-gray-500 text-left bg-gray-50">
                    <th className="px-4 py-3 font-medium">Nama</th>
                    <th className="px-4 py-3 font-medium">NIK</th>
                    <th className="px-4 py-3 font-medium">Alamat (RT/RW)</th>
                    <th className="px-4 py-3 font-medium">No. HP</th>
                    <th className="px-4 py-3 font-medium">Kelompok Tani</th>
                    <th className="px-4 py-3 font-medium">Status</th>
                    <th className="px-4 py-3 font-medium">Lahan</th>
                    {user?.role !== 'FARMER' && <th className="px-4 py-3 font-medium">Aksi</th>}
                  </tr></thead>
                  <tbody className="divide-y">
                    {filtered.map(m => (
                      <tr key={m.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3 font-medium text-gray-800">{m.name}<div className="text-xs text-gray-400">{m.email}</div></td>
                        <td className="px-4 py-3 text-gray-600 text-xs">{m.nik || '-'}</td>
                        <td className="px-4 py-3 text-gray-600 text-xs">{m.address || ''}{m.rt && ` RT ${m.rt}`}{m.rw && ` RW ${m.rw}` || '-'}</td>
                        <td className="px-4 py-3 text-gray-600">{m.phone || '-'}</td>
                        <td className="px-4 py-3">{m.kelompokTani ? <span className="text-xs bg-green-50 text-green-700 px-2 py-1 rounded-full">{m.kelompokTani.name}</span> : <span className="text-gray-400">-</span>}</td>
                        <td className="px-4 py-3"><Badge variant={STATUS_COLORS[m.memberStatus] || 'default'}>{STATUS_LABELS[m.memberStatus]}</Badge></td>
                        <td className="px-4 py-3 text-gray-600">{m._count.lahans} lahan</td>
                        {user?.role !== 'FARMER' && (
                          <td className="px-4 py-3">
                            <div className="flex gap-1">
                              <button onClick={() => openEdit(m)} className="text-blue-600 hover:text-blue-800 p-1"><Pencil size={14} /></button>
                              {user?.role === 'SUPER_ADMIN' && <button onClick={() => handleDelete(m.id)} className="text-red-600 hover:text-red-800 p-1"><Trash2 size={14} /></button>}
                            </div>
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      <Modal open={showModal} onClose={() => setShowModal(false)} title={editing ? 'Edit Anggota' : 'Tambah Anggota'} size="lg">
        <form onSubmit={handleSave} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input label="Nama Lengkap *" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} required />
            <Input label="NIK" value={form.nik} onChange={e => setForm({ ...form, nik: e.target.value })} placeholder="16 digit NIK" />
          </div>
          {!editing && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input label="Email *" type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} required />
              <Input label="Password *" type="password" value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} required />
            </div>
          )}
          <Input label="Alamat" value={form.address} onChange={e => setForm({ ...form, address: e.target.value })} placeholder="Jl. Contoh No. 1" />
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Input label="RT" value={form.rt} onChange={e => setForm({ ...form, rt: e.target.value })} placeholder="001" />
            <Input label="RW" value={form.rw} onChange={e => setForm({ ...form, rw: e.target.value })} placeholder="002" />
            <Input label="No. HP" value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} placeholder="08xxxxxxxxxx" />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Select label="Desa" value={form.villageId} onChange={e => setForm({ ...form, villageId: e.target.value })}
              options={[{ value: '', label: '-- Pilih Desa --' }, ...villages.map(v => ({ value: v.id, label: v.name }))]} />
            <Select label="Kelompok Tani" value={form.kelompokTaniId} onChange={e => setForm({ ...form, kelompokTaniId: e.target.value })}
              options={[{ value: '', label: '-- Pilih Kelompok --' }, ...kelompoks.map(k => ({ value: k.id, label: k.name }))]} />
          </div>
          <Select label="Status Keanggotaan" value={form.memberStatus} onChange={e => setForm({ ...form, memberStatus: e.target.value })}
            options={[{ value: 'ACTIVE', label: 'Aktif' }, { value: 'PENDING', label: 'Pending' }, { value: 'INACTIVE', label: 'Nonaktif' }]} />
          <div className="flex gap-3 pt-2">
            <Button type="button" variant="outline" onClick={() => setShowModal(false)} className="flex-1">Batal</Button>
            <Button type="submit" loading={saving} className="flex-1">Simpan</Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
