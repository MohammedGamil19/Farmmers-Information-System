'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useAuth } from '@/lib/auth-context'
import { api } from '@/lib/api'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { toast } from '@/components/ui/toaster'
import { getRoleLabel, formatDate } from '@/lib/utils'
import {
  MapPin, IdCard, Clock, CalendarDays, Leaf, Scale, Wheat, Layers,
  Users, History, Settings, KeyRound, Phone, Mail, ShieldCheck,
} from 'lucide-react'

type Me = {
  id: string; name: string; email: string; role: string
  phone?: string | null; nik?: string | null
  address?: string | null; rt?: string | null; rw?: string | null
  memberStatus?: string; lastLoginAt?: string | null; createdAt?: string
  village?: { id: string; name: string } | null
}
type Stats = { totalFarms?: number; totalProduksiKg?: number; totalPanen?: number; totalLahanCount?: number }

const STATUS_LABELS: Record<string, string> = { ACTIVE: 'Aktif', PENDING: 'Menunggu', INACTIVE: 'Nonaktif' }
const STATUS_COLORS: Record<string, string> = { ACTIVE: 'bg-green-100 text-green-700', PENDING: 'bg-amber-100 text-amber-700', INACTIVE: 'bg-red-100 text-red-700' }

export default function ProfilePage() {
  const { user } = useAuth()
  const [me, setMe] = useState<Me | null>(null)
  const [stats, setStats] = useState<Stats>({})
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [saving, setSaving] = useState(false)
  const [loading, setLoading] = useState(true)

  const isFarmer = user?.role === 'FARMER'

  useEffect(() => {
    const calls: Promise<unknown>[] = [api.get('/api/auth/me')]
    if (isFarmer) calls.push(api.get('/api/dashboard'))
    Promise.all(calls).then(([m, d]) => {
      const u = (m as { user: Me }).user
      setMe(u); setName(u.name || ''); setPhone(u.phone || '')
      if (d) setStats((d as { stats: Stats }).stats || {})
    }).finally(() => setLoading(false))
  }, [isFarmer])

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

  const fullAddress = [me?.address, me?.rt && `RT ${me.rt}`, me?.rw && `RW ${me.rw}`].filter(Boolean).join(', ')

  const statCards = [
    { label: 'Kebun', value: stats.totalFarms ?? 0, icon: Leaf, color: 'text-green-600', bg: 'bg-green-50' },
    { label: 'Produksi (kg)', value: stats.totalProduksiKg ?? 0, icon: Scale, color: 'text-blue-600', bg: 'bg-blue-50' },
    { label: 'Catatan Panen', value: stats.totalPanen ?? 0, icon: Wheat, color: 'text-amber-600', bg: 'bg-amber-50' },
    { label: 'Lahan', value: stats.totalLahanCount ?? 0, icon: Layers, color: 'text-purple-600', bg: 'bg-purple-50' },
  ]

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="h-10 w-10 animate-spin rounded-full border-4 border-green-600 border-t-transparent" />
    </div>
  )

  return (
    <div className="max-w-4xl">
      <h1 className="text-2xl font-bold text-gray-800 mb-5">Profil Saya</h1>

      {/* Header banner */}
      <div className="rounded-2xl bg-gradient-to-br from-green-600 to-green-700 p-5 sm:p-6 text-white mb-6">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-white/20 flex items-center justify-center shrink-0 ring-2 ring-white/30">
            <span className="text-2xl sm:text-3xl font-bold">{me?.name?.charAt(0).toUpperCase()}</span>
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-xl sm:text-2xl font-bold truncate">{me?.name}</h2>
              <span className="text-xs font-semibold bg-white/20 px-2 py-0.5 rounded-full">{getRoleLabel(me?.role || '')}</span>
            </div>
            <div className="flex items-center gap-4 mt-1 text-green-50 text-sm flex-wrap">
              {me?.phone && <span className="flex items-center gap-1"><Phone size={13} />{me.phone}</span>}
              <span className="flex items-center gap-1 truncate"><Mail size={13} />{me?.email}</span>
            </div>
            <div className="flex items-center gap-4 mt-1.5 text-green-100/80 text-xs flex-wrap">
              {me?.village && <span className="flex items-center gap-1"><MapPin size={12} />{me.village.name}</span>}
              {me?.createdAt && <span className="flex items-center gap-1"><CalendarDays size={12} />Bergabung {formatDate(me.createdAt)}</span>}
              {me?.lastLoginAt && <span className="flex items-center gap-1"><Clock size={12} />Terakhir masuk {formatDate(me.lastLoginAt)}</span>}
            </div>
          </div>
        </div>
      </div>

      {/* Farmer: activity summary */}
      {isFarmer && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          {statCards.map((s, i) => (
            <Card key={i}><CardContent className="p-4">
              <div className={`w-10 h-10 ${s.bg} rounded-xl flex items-center justify-center mb-3`}><s.icon className={s.color} size={20} /></div>
              <p className="text-2xl font-bold text-gray-800">{s.value}</p>
              <p className="text-xs text-gray-500 mt-1">{s.label}</p>
            </CardContent></Card>
          ))}
        </div>
      )}

      <div className="grid lg:grid-cols-5 gap-6">
        {/* Edit form */}
        <Card className="lg:col-span-3">
          <CardHeader><CardTitle>Edit Profil</CardTitle></CardHeader>
          <CardContent>
            <form onSubmit={handleSave} className="space-y-4">
              <Input label="Nama Lengkap *" value={name} onChange={e => setName(e.target.value)} className="py-3 text-base" required />
              <div>
                <Input label="No. HP" value={phone} onChange={e => setPhone(e.target.value)} placeholder="08xxxxxxxxxx" className="py-3 text-base" />
                {isFarmer && <p className="text-xs text-gray-400 mt-1">No. HP ini dipakai untuk masuk ke aplikasi. Pastikan benar.</p>}
              </div>
              <div className="pt-2 border-t">
                <p className="text-sm font-medium text-gray-700 mb-2 flex items-center gap-1.5"><KeyRound size={14} className="text-gray-400" />Ubah Password (opsional)</p>
                <div className="space-y-3">
                  <Input label="Password Baru" type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Kosongkan jika tidak diubah" className="py-3 text-base" />
                  {password && (
                    <Input label="Ulangi Password Baru" type="password" value={confirm} onChange={e => setConfirm(e.target.value)} placeholder="Ketik ulang password baru" className="py-3 text-base" />
                  )}
                </div>
              </div>
              <Button type="submit" size="lg" loading={saving} className="w-full">Simpan Perubahan</Button>
            </form>
          </CardContent>
        </Card>

        {/* Side panel */}
        <div className="lg:col-span-2 space-y-6">
          {isFarmer ? (
            <Card>
              <CardHeader><CardTitle className="text-base flex items-center gap-2"><IdCard size={16} />Data Diri</CardTitle></CardHeader>
              <CardContent>
                <dl className="space-y-3 text-sm">
                  <div>
                    <dt className="text-gray-400 text-xs">NIK</dt>
                    <dd className="text-gray-800 font-medium">{me?.nik || <span className="text-gray-300">Belum diisi</span>}</dd>
                  </div>
                  <div>
                    <dt className="text-gray-400 text-xs">Alamat</dt>
                    <dd className="text-gray-800">{fullAddress || <span className="text-gray-300">Belum diisi</span>}</dd>
                  </div>
                  <div>
                    <dt className="text-gray-400 text-xs">Desa</dt>
                    <dd className="text-gray-800">{me?.village?.name || <span className="text-gray-300">-</span>}</dd>
                  </div>
                  <div>
                    <dt className="text-gray-400 text-xs">Status Keanggotaan</dt>
                    <dd><span className={`inline-block text-xs font-medium px-2 py-0.5 rounded-full ${STATUS_COLORS[me?.memberStatus || 'ACTIVE']}`}>{STATUS_LABELS[me?.memberStatus || 'ACTIVE']}</span></dd>
                  </div>
                </dl>
                <p className="text-xs text-gray-400 mt-4 pt-3 border-t">Data diri dikelola oleh admin. Hubungi admin GAPOKTAN untuk perubahan.</p>
              </CardContent>
            </Card>
          ) : (
            <>
              <Card>
                <CardHeader><CardTitle className="text-base flex items-center gap-2"><ShieldCheck size={16} />Informasi Akun</CardTitle></CardHeader>
                <CardContent>
                  <dl className="space-y-3 text-sm">
                    <div><dt className="text-gray-400 text-xs">Peran</dt><dd className="text-gray-800 font-medium">Admin — akses penuh</dd></div>
                    <div><dt className="text-gray-400 text-xs">Email</dt><dd className="text-gray-800 break-all">{me?.email}</dd></div>
                    <div><dt className="text-gray-400 text-xs">Bergabung</dt><dd className="text-gray-800">{me?.createdAt ? formatDate(me.createdAt) : '-'}</dd></div>
                  </dl>
                </CardContent>
              </Card>
              <Card>
                <CardHeader><CardTitle className="text-base">Pintasan Admin</CardTitle></CardHeader>
                <CardContent>
                  <div className="space-y-1">
                    {[
                      { href: '/admin/users', icon: Users, label: 'Manajemen Pengguna' },
                      { href: '/aktivitas', icon: History, label: 'Log Aktivitas' },
                      { href: '/admin/settings', icon: Settings, label: 'Pengaturan Sistem' },
                    ].map(l => (
                      <Link key={l.href} href={l.href} className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-gray-700 hover:bg-gray-50">
                        <l.icon size={16} className="text-gray-400" />{l.label}
                      </Link>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
