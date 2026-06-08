'use client'
import { useState } from 'react'
import { useAuth } from '@/lib/auth-context'
import { api } from '@/lib/api'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { toast } from '@/components/ui/toaster'
import { getRoleLabel } from '@/lib/utils'
import { User } from 'lucide-react'

export default function ProfilePage() {
  const { user } = useAuth()
  const [name, setName] = useState(user?.name || '')
  const [phone, setPhone] = useState('')
  const [password, setPassword] = useState('')
  const [saving, setSaving] = useState(false)

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault(); setSaving(true)
    try {
      await api.put(`/api/users/${user?.id}`, { name, phone: phone || undefined, ...(password ? { password } : {}) })
      toast('success', 'Profil berhasil diperbarui')
    } catch (err) { toast('error', err instanceof Error ? err.message : 'Gagal') } finally { setSaving(false) }
  }

  return (
    <div className="max-w-lg">
      <div className="mb-6"><h1 className="text-2xl font-bold text-gray-800">Profil Saya</h1></div>
      <Card>
        <CardHeader>
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center">
              <span className="text-2xl font-bold text-green-700">{user?.name?.charAt(0).toUpperCase()}</span>
            </div>
            <div>
              <CardTitle>{user?.name}</CardTitle>
              <p className="text-gray-500 text-sm">{user?.email}</p>
              <p className="text-green-600 text-sm font-medium">{getRoleLabel(user?.role || '')}</p>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSave} className="space-y-4">
            <Input label="Nama Lengkap" value={name} onChange={e => setName(e.target.value)} required />
            <Input label="No. HP" value={phone} onChange={e => setPhone(e.target.value)} placeholder="08xxxxxxxxxx" />
            <Input label="Password Baru (kosongkan jika tidak diubah)" type="password" value={password} onChange={e => setPassword(e.target.value)} />
            <Button type="submit" loading={saving} className="w-full">Simpan Perubahan</Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}