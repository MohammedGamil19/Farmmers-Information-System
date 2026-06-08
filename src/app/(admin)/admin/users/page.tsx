'use client'
import { useEffect, useState } from 'react'
import { api } from '@/lib/api'
import { useAuth } from '@/lib/auth-context'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { Modal } from '@/components/ui/modal'
import { toast } from '@/components/ui/toaster'
import { Plus, Pencil, Trash2, Users, Phone, Mail } from 'lucide-react'
import { getRoleLabel, formatDate } from '@/lib/utils'

export default function AdminUsersPage() {
  const { user } = useAuth()
  const [users, setUsers] = useState<Record<string, unknown>[]>([])
  const [villages, setVillages] = useState<Record<string, unknown>[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing] = useState<Record<string, unknown> | null>(null)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({ name: '', email: '', password: '', role: 'FARMER', phone: '', villageId: '' })

  const load = () => {
    setLoading(true)
    Promise.all([api.get('/api/users'), api.get('/api/villages')]).then(([u, v]) => { setUsers(u.users); setVillages(v.villages) }).finally(() => setLoading(false))
  }
  useEffect(() => { load() }, [])

  const openEdit = (u: Record<string, unknown>) => {
    setEditing(u)
    setForm({ name: u.name as string, email: u.email as string, password: '', role: u.role as string, phone: (u.phone as string) || '', villageId: (u.villageId as string) || '' })
    setShowModal(true)
  }

  const openNew = () => { setEditing(null); setForm({ name: '', email: '', password: '', role: 'FARMER', phone: '', villageId: '' }); setShowModal(true) }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault(); setSaving(true)
    try {
      if (editing) {
        await api.put(`/api/users/${editing.id}`, { name: form.name, phone: form.phone, role: form.role, villageId: form.villageId || null, ...(form.password ? { password: form.password } : {}) })
        toast('success', 'Pengguna diperbarui')
      } else {
        await api.post('/api/users', form)
        toast('success', 'Pengguna ditambahkan')
      }
      setShowModal(false); load()
    } catch (err) { toast('error', err instanceof Error ? err.message : 'Gagal') } finally { setSaving(false) }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Yakin hapus pengguna ini?')) return
    try { await api.delete(`/api/users/${id}`); toast('success', 'Pengguna dihapus'); load() } catch { toast('error', 'Gagal menghapus') }
  }

  const roleColors: Record<string, 'danger' | 'warning' | 'success'> = { SUPER_ADMIN: 'danger', VILLAGE_ADMIN: 'warning', FARMER: 'success' }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div><h1 className="text-2xl font-bold text-gray-800">Manajemen Pengguna</h1><p className="text-gray-500">{users.length} pengguna terdaftar</p></div>
        <Button onClick={openNew}><Plus size={16} />Tambah Pengguna</Button>
      </div>

      <Card>
        <CardContent className="p-0">
          {loading ? <div className="flex justify-center py-10"><div className="h-8 w-8 animate-spin rounded-full border-4 border-green-600 border-t-transparent" /></div> : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead><tr className="border-b text-gray-500 text-left bg-gray-50">
                  <th className="px-4 py-3 font-medium">Nama</th>
                  <th className="px-4 py-3 font-medium">Email</th>
                  <th className="px-4 py-3 font-medium">Peran</th>
                  <th className="px-4 py-3 font-medium">Desa</th>
                  <th className="px-4 py-3 font-medium">No. HP</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium">Aksi</th>
                </tr></thead>
                <tbody className="divide-y">
                  {users.map(u => {
                    const village = u.village as Record<string, unknown>
                    return (
                      <tr key={u.id as string} className="hover:bg-gray-50">
                        <td className="px-4 py-3 font-medium text-gray-800">{u.name as string}</td>
                        <td className="px-4 py-3 text-gray-600">{u.email as string}</td>
                        <td className="px-4 py-3"><Badge variant={roleColors[u.role as string] || 'default'}>{getRoleLabel(u.role as string)}</Badge></td>
                        <td className="px-4 py-3 text-gray-600">{village?.name as string || '-'}</td>
                        <td className="px-4 py-3 text-gray-600">{u.phone as string || '-'}</td>
                        <td className="px-4 py-3"><Badge variant={u.isActive ? 'success' : 'danger'}>{u.isActive ? 'Aktif' : 'Nonaktif'}</Badge></td>
                        <td className="px-4 py-3">
                          <div className="flex gap-2">
                            <button onClick={() => openEdit(u)} className="text-blue-600 hover:text-blue-800 p-1"><Pencil size={15} /></button>
                            {user?.role === 'SUPER_ADMIN' && <button onClick={() => handleDelete(u.id as string)} className="text-red-600 hover:text-red-800 p-1"><Trash2 size={15} /></button>}
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                  {users.length === 0 && <tr><td colSpan={7} className="text-center text-gray-400 py-10">Belum ada pengguna</td></tr>}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      <Modal open={showModal} onClose={() => setShowModal(false)} title={editing ? 'Edit Pengguna' : 'Tambah Pengguna'}>
        <form onSubmit={handleSave} className="space-y-4">
          <Input label="Nama Lengkap *" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} required />
          {!editing && <Input label="Email *" type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} required />}
          <Input label={editing ? 'Password Baru (kosongkan jika tidak diubah)' : 'Password *'} type="password" value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} required={!editing} />
          <div className="grid grid-cols-2 gap-4">
            <Select label="Peran" value={form.role} onChange={e => setForm({ ...form, role: e.target.value })} options={[{ value: 'FARMER', label: 'Petani' }, { value: 'VILLAGE_ADMIN', label: 'Admin Desa' }, ...(user?.role === 'SUPER_ADMIN' ? [{ value: 'SUPER_ADMIN', label: 'Super Admin' }] : [])]} />
            <Select label="Desa" value={form.villageId} onChange={e => setForm({ ...form, villageId: e.target.value })} options={[{ value: '', label: '-- Pilih Desa --' }, ...villages.map((v: Record<string, unknown>) => ({ value: v.id as string, label: v.name as string }))]} />
          </div>
          <Input label="No. HP" value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} placeholder="08xxxxxxxxxx" />
          <div className="flex gap-3 pt-2">
            <Button type="button" variant="outline" onClick={() => setShowModal(false)} className="flex-1">Batal</Button>
            <Button type="submit" loading={saving} className="flex-1">Simpan</Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}