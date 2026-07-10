'use client'
import { useEffect, useState } from 'react'
import { useAuth } from '@/lib/auth-context'
import { api } from '@/lib/api'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { toast } from '@/components/ui/toaster'
import { getRoleLabel, formatDate } from '@/lib/utils'
import { MapPin, IdCard, Clock } from 'lucide-react'

type Me = {
  id: string; name: string; email: string; role: string
  phone?: string | null; nik?: string | null; lastLoginAt?: string | null
  village?: { id: string; name: string } | null
}

export default function ProfilePage() {
  const { user } = useAuth()
  const [me, setMe] = useState<Me | null>(null)
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [saving, setSaving] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.get('/api/auth/me').then(d => {
      const u = d.user as Me
      setMe(u)
      setName(u.name || '')
      setPhone(u.phone || '')
    }).finally(() => setLoading(false))
  }, [])

  const isFarmer = user?.role === 'FARMER'

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) { toast('error', 'Nama wajib diisi'); return }
    if (password && password.length < 6) { toast('error', 'Password minimal 6 karakter'); return }
    if (password && password !== confirm) { toast('error', 'Konfirmasi password tidak sama'); return }
    setSaving(true)
    try {
      await api.put(`/api/users/${user?.id}`, { name: name.trim(), phone: phone.trim(), ...(password ? { password } : {}) })
      setPassword(''); setConfirm('')
      toast('success', 'Profil berhasil diperbarui. Perubahan nama tampil setelah masuk kembali.')
    } catch (err) { toast('error', err instanceof Error ? err.message : 'Gagal menyimpan') } finally { setSaving(false) }
  }

  return (
    <div className="max-w-lg">
      <div className="mb-6"><h1 className="text-2xl font-bold text-gray-800">Profil Saya</h1></div>
      <Card>
        <CardHeader>
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center shrink-0">
              <span className="text-2xl font-bold text-green-700">{(me?.name || user?.name)?.charAt(0).toUpperCase()}</span>
            </div>
            <div className="min-w-0">
              <CardTitle className="truncate">{me?.name || user?.name}</CardTitle>
              <p className="text-green-600 text-sm font-medium">{getRoleLabel(me?.role || user?.role || '')}</p>
              <div className="mt-1 space-y-0.5 text-xs text-gray-500">
                {me?.village && <p className="flex items-center gap-1"><MapPin size={12} />{me.village.name}</p>}
                {me?.nik && <p className="flex items-center gap-1"><IdCard size={12} />NIK: {me.nik}</p>}
                {me?.lastLoginAt && <p className="flex items-center gap-1"><Clock size={12} />Terakhir masuk: {formatDate(me.lastLoginAt)}</p>}
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-8"><div className="h-8 w-8 animate-spin rounded-full border-4 border-green-600 border-t-transparent" /></div>
          ) : (
            <form onSubmit={handleSave} className="space-y-4">
              <Input label="Nama Lengkap *" value={name} onChange={e => setName(e.target.value)} className="py-3 text-base" required />

              <div>
                <Input label="No. HP" value={phone} onChange={e => setPhone(e.target.value)} placeholder="08xxxxxxxxxx" className="py-3 text-base" />
                {isFarmer && <p className="text-xs text-gray-400 mt-1">No. HP ini dipakai untuk masuk ke aplikasi. Pastikan benar.</p>}
              </div>

              <div className="pt-2 border-t">
                <p className="text-sm font-medium text-gray-700 mb-2">Ubah Password (opsional)</p>
                <div className="space-y-3">
                  <Input label="Password Baru" type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Kosongkan jika tidak diubah" className="py-3 text-base" />
                  {password && (
                    <Input label="Ulangi Password Baru" type="password" value={confirm} onChange={e => setConfirm(e.target.value)} placeholder="Ketik ulang password baru" className="py-3 text-base" />
                  )}
                </div>
              </div>

              <Button type="submit" size="lg" loading={saving} className="w-full">Simpan Perubahan</Button>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
