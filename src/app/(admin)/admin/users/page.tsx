'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { api } from '@/lib/api'
import { useAuth } from '@/lib/auth-context'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { Modal } from '@/components/ui/modal'
import { toast } from '@/components/ui/toaster'
import { Plus, Pencil, KeyRound, Power, Users, Scale, Search, History, Trash2, ShieldCheck, Code2 } from 'lucide-react'
import { formatDate } from '@/lib/utils'
import { isDeveloper } from '@/lib/developer'

type Village = { id: string; name: string }
type UserRow = {
  id: string; name: string; email: string; role: string
  phone?: string | null; nik?: string | null; address?: string | null; rt?: string | null; rw?: string | null
  memberStatus: string; isActive: boolean; lastLoginAt?: string | null
  village?: { id: string; name: string } | null
  _count: { farms: number; lahans: number; panens: number }
  totalPanenKg: number
}

const STATUS_COLORS: Record<string, 'success' | 'warning' | 'danger'> = { ACTIVE: 'success', PENDING: 'warning', INACTIVE: 'danger' }
const STATUS_LABELS: Record<string, string> = { ACTIVE: 'Aktif', PENDING: 'Menunggu', INACTIVE: 'Nonaktif' }

const EMPTY_FORM = { name: '', email: '', password: '', role: 'FARMER', phone: '', nik: '', address: '', rt: '', rw: '', villageId: '', memberStatus: 'ACTIVE' }

function RoleBadge({ u }: { u: { role: string; email?: string | null; name?: string | null } }) {
  if (isDeveloper(u)) {
    return <span className="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold bg-indigo-600 text-white"><Code2 size={11} /> Developer</span>
  }
  if (u.role !== 'FARMER') {
    return <span className="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold bg-slate-800 text-white"><ShieldCheck size={11} /> Admin</span>
  }
  return <Badge variant="success">Petani</Badge>
}

export default function ManajemenPenggunaPage() {
  const { user } = useAuth()
  const [users, setUsers] = useState<UserRow[]>([])
  const [villages, setVillages] = useState<Village[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [roleFilter, setRoleFilter] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing] = useState<UserRow | null>(null)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState(EMPTY_FORM)

  const load = () => {
    setLoading(true)
    const params = new URLSearchParams()
    if (roleFilter) params.set('role', roleFilter)
    if (search) params.set('search', search)
    Promise.all([api.get(`/api/users?${params}`), api.get('/api/villages')])
      .then(([u, v]) => { setUsers(u.users); setVillages(v.villages) })
      .finally(() => setLoading(false))
  }
  useEffect(() => { load() }, [roleFilter]) // eslint-disable-line react-hooks/exhaustive-deps

  const openNew = () => { setEditing(null); setForm(EMPTY_FORM); setShowModal(true) }
  const openEdit = (u: UserRow) => {
    setEditing(u)
    setForm({
      name: u.name, email: u.email, password: '', role: u.role, phone: u.phone || '',
      nik: u.nik || '', address: u.address || '', rt: u.rt || '', rw: u.rw || '',
      villageId: u.village?.id || '', memberStatus: u.memberStatus,
    })
    setShowModal(true)
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault(); setSaving(true)
    try {
      if (editing) {
        await api.put(`/api/users/${editing.id}`, {
          name: form.name, phone: form.phone, role: form.role, villageId: form.villageId || null,
          nik: form.nik, address: form.address, rt: form.rt, rw: form.rw, memberStatus: form.memberStatus,
          ...(form.password ? { password: form.password } : {}),
        })
        toast('success', 'Pengguna diperbarui')
      } else {
        await api.post('/api/users', form)
        toast('success', 'Pengguna ditambahkan')
      }
      setShowModal(false); load()
    } catch (err) { toast('error', err instanceof Error ? err.message : 'Gagal') } finally { setSaving(false) }
  }

  const toggleActive = async (u: UserRow) => {
    if (u.id === user?.id) { toast('warning', 'Tidak dapat menonaktifkan akun sendiri'); return }
    try {
      await api.put(`/api/users/${u.id}`, { isActive: !u.isActive })
      toast('success', u.isActive ? 'Pengguna dinonaktifkan' : 'Pengguna diaktifkan'); load()
    } catch { toast('error', 'Gagal') }
  }

  const removeUser = async (u: UserRow) => {
    if (!confirm(`Hapus permanen pengguna "${u.name}"? Tindakan ini tidak dapat dibatalkan.`)) return
    try {
      await api.delete(`/api/users/${u.id}`)
      toast('success', `Pengguna "${u.name}" dihapus`); load()
    } catch (err) { toast('error', err instanceof Error ? err.message : 'Gagal menghapus') }
  }

  // Whether the current admin may permanently delete this row
  const canDelete = (u: UserRow) => u.id !== user?.id && !isDeveloper(u)

  const farmers = users.filter(u => u.role === 'FARMER')
  const admins = users.filter(u => u.role !== 'FARMER')
  const totalKg = farmers.reduce((s, u) => s + u.totalPanenKg, 0)
  const activeFarmers = farmers.filter(u => u.isActive).length

  return (
    <div>
      <div className="flex items-start justify-between mb-6 gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Manajemen Pengguna</h1>
          <p className="text-gray-500 text-sm">Kelola akun petani &amp; admin beserta ringkasan aktivitasnya</p>
        </div>
        <Button onClick={openNew} className="shrink-0"><Plus size={16} /><span className="hidden sm:inline">Tambah Pengguna</span><span className="sm:hidden">Tambah</span></Button>
      </div>

      {/* Analytics summary */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {[
          { label: 'Total Petani', value: farmers.length, icon: Users, color: 'text-green-600', bg: 'bg-green-50' },
          { label: 'Petani Aktif', value: activeFarmers, icon: Power, color: 'text-teal-600', bg: 'bg-teal-50' },
          { label: 'Total Produksi (kg)', value: totalKg.toFixed(1), icon: Scale, color: 'text-blue-600', bg: 'bg-blue-50' },
          { label: 'Admin', value: admins.length, icon: KeyRound, color: 'text-amber-600', bg: 'bg-amber-50' },
        ].map((s, i) => (
          <Card key={i}><CardContent className="p-4">
            <div className={`w-10 h-10 ${s.bg} rounded-xl flex items-center justify-center mb-3`}><s.icon className={s.color} size={20} /></div>
            <p className="text-2xl font-bold text-gray-800">{s.value}</p>
            <p className="text-xs text-gray-500 mt-1">{s.label}</p>
          </CardContent></Card>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-4">
        <div className="relative flex-1 min-w-[200px]">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input value={search} onChange={e => setSearch(e.target.value)} onKeyDown={e => e.key === 'Enter' && load()}
            placeholder="Cari nama, NIK, HP, email... (Enter)" className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-green-500" />
        </div>
        <div className="w-full sm:w-44">
          <Select label="" value={roleFilter} onChange={e => setRoleFilter(e.target.value)}
            options={[{ value: '', label: 'Semua Peran' }, { value: 'FARMER', label: 'Petani' }, { value: 'ADMIN', label: 'Admin' }]} />
        </div>
      </div>

      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex justify-center py-10"><div className="h-8 w-8 animate-spin rounded-full border-4 border-green-600 border-t-transparent" /></div>
          ) : users.length === 0 ? (
            <div className="text-center py-14 text-gray-400"><Users size={40} className="mx-auto mb-3 opacity-30" /><p>Tidak ada pengguna</p></div>
          ) : (
            <>
              {/* Mobile cards */}
              <div className="sm:hidden divide-y">
                {users.map(u => (
                  <div key={u.id} className="p-4">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="font-semibold text-gray-800">{u.name}</p>
                        <p className="text-xs text-gray-500">{u.phone || u.email}</p>
                        <div className="flex flex-wrap gap-1.5 mt-1.5">
                          <RoleBadge u={u} />
                          <Badge variant={u.isActive ? (STATUS_COLORS[u.memberStatus] || 'default') : 'danger'}>{u.isActive ? STATUS_LABELS[u.memberStatus] : 'Nonaktif'}</Badge>
                          {u.village && <span className="text-xs text-gray-500 self-center">{u.village.name}</span>}
                        </div>
                        {u.role === 'FARMER' && (
                          <p className="text-xs text-gray-400 mt-1.5">{u._count.farms} kebun · {u.totalPanenKg} kg · {u._count.panens} panen</p>
                        )}
                      </div>
                      <div className="flex gap-1 shrink-0">
                        <button onClick={() => openEdit(u)} title="Edit" className="text-blue-600 p-2 rounded-lg hover:bg-blue-50"><Pencil size={15} /></button>
                        <button onClick={() => toggleActive(u)} title={u.isActive ? 'Nonaktifkan' : 'Aktifkan'} className={`p-2 rounded-lg ${u.isActive ? 'text-amber-600 hover:bg-amber-50' : 'text-green-600 hover:bg-green-50'}`}><Power size={15} /></button>
                        {canDelete(u) && <button onClick={() => removeUser(u)} title="Hapus permanen" className="text-red-600 p-2 rounded-lg hover:bg-red-50"><Trash2 size={15} /></button>}
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Desktop table */}
              <div className="hidden sm:block overflow-x-auto">
                <table className="w-full text-sm">
                  <thead><tr className="border-b text-gray-500 text-left bg-gray-50">
                    <th className="px-4 py-3 font-medium">Nama</th>
                    <th className="px-4 py-3 font-medium">Peran</th>
                    <th className="px-4 py-3 font-medium">Kontak</th>
                    <th className="px-4 py-3 font-medium">Desa</th>
                    <th className="px-4 py-3 font-medium">Kebun</th>
                    <th className="px-4 py-3 font-medium">Produksi</th>
                    <th className="px-4 py-3 font-medium">Status</th>
                    <th className="px-4 py-3 font-medium">Terakhir Masuk</th>
                    <th className="px-4 py-3 font-medium">Aksi</th>
                  </tr></thead>
                  <tbody className="divide-y">
                    {users.map(u => (
                      <tr key={u.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3">
                          <p className="font-medium text-gray-800">{u.name}</p>
                          {u.nik && <p className="text-xs text-gray-400">NIK: {u.nik}</p>}
                        </td>
                        <td className="px-4 py-3"><RoleBadge u={u} /></td>
                        <td className="px-4 py-3 text-gray-600 text-xs">{u.phone || '-'}<div className="text-gray-400">{u.email}</div></td>
                        <td className="px-4 py-3 text-gray-600">{u.village?.name || '-'}</td>
                        <td className="px-4 py-3 text-gray-600">{u.role === 'FARMER' ? `${u._count.farms}` : '-'}</td>
                        <td className="px-4 py-3">{u.role === 'FARMER' ? <span className="font-semibold text-green-700">{u.totalPanenKg} kg</span> : <span className="text-gray-300">-</span>}<div className="text-xs text-gray-400">{u.role === 'FARMER' ? `${u._count.panens} catatan` : ''}</div></td>
                        <td className="px-4 py-3"><Badge variant={u.isActive ? (STATUS_COLORS[u.memberStatus] || 'default') : 'danger'}>{u.isActive ? STATUS_LABELS[u.memberStatus] : 'Nonaktif'}</Badge></td>
                        <td className="px-4 py-3 text-gray-500 text-xs">{u.lastLoginAt ? formatDate(u.lastLoginAt) : 'Belum pernah'}</td>
                        <td className="px-4 py-3">
                          <div className="flex gap-1">
                            <button onClick={() => openEdit(u)} title="Edit / Reset Password" className="text-blue-600 hover:bg-blue-50 p-1.5 rounded"><Pencil size={15} /></button>
                            <button onClick={() => toggleActive(u)} title={u.isActive ? 'Nonaktifkan' : 'Aktifkan'} className={`p-1.5 rounded ${u.isActive ? 'text-amber-600 hover:bg-amber-50' : 'text-green-600 hover:bg-green-50'}`}><Power size={15} /></button>
                            {u.role === 'FARMER' && <Link href={`/aktivitas?userId=${u.id}`} title="Lihat aktivitas" className="text-gray-500 hover:bg-gray-100 p-1.5 rounded"><History size={15} /></Link>}
                            {canDelete(u) && <button onClick={() => removeUser(u)} title="Hapus permanen" className="text-red-600 hover:bg-red-50 p-1.5 rounded"><Trash2 size={15} /></button>}
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

      {/* Add / Edit modal */}
      <Modal open={showModal} onClose={() => setShowModal(false)} title={editing ? `Edit — ${editing.name}` : 'Tambah Pengguna'} size="lg">
        <form onSubmit={handleSave} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input label="Nama Lengkap *" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} required />
            <Select label="Peran *" value={form.role} onChange={e => setForm({ ...form, role: e.target.value })}
              options={[{ value: 'FARMER', label: 'Petani' }, { value: 'ADMIN', label: 'Admin' }]} />
          </div>
          {!editing && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input label="Email *" type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} required />
              <Input label="Password *" type="password" value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} required />
            </div>
          )}
          {editing && (
            <div className="flex items-center gap-2">
              <KeyRound size={15} className="text-gray-400" />
              <Input label="Reset Password (kosongkan jika tidak diubah)" type="password" value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} className="flex-1" />
            </div>
          )}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input label="No. HP" value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} placeholder="08xxxxxxxxxx" />
            <Select label="Desa" value={form.villageId} onChange={e => setForm({ ...form, villageId: e.target.value })}
              options={[{ value: '', label: '-- Pilih Desa --' }, ...villages.map(v => ({ value: v.id, label: v.name }))]} />
          </div>

          {/* Farmer-specific detail fields */}
          {form.role === 'FARMER' && (
            <>
              <Input label="NIK" value={form.nik} onChange={e => setForm({ ...form, nik: e.target.value })} placeholder="16 digit NIK" />
              <Input label="Alamat" value={form.address} onChange={e => setForm({ ...form, address: e.target.value })} placeholder="Jl. Contoh No. 1" />
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <Input label="RT" value={form.rt} onChange={e => setForm({ ...form, rt: e.target.value })} placeholder="001" />
                <Input label="RW" value={form.rw} onChange={e => setForm({ ...form, rw: e.target.value })} placeholder="002" />
                <Select label="Status Keanggotaan" value={form.memberStatus} onChange={e => setForm({ ...form, memberStatus: e.target.value })}
                  options={[{ value: 'ACTIVE', label: 'Aktif' }, { value: 'PENDING', label: 'Menunggu' }, { value: 'INACTIVE', label: 'Nonaktif' }]} />
              </div>
            </>
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
