'use client'
import { useEffect, useState } from 'react'
import { api } from '@/lib/api'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { toast } from '@/components/ui/toaster'
import { Settings, Users, Leaf, Scale, Wheat, ShieldCheck, Code2, Phone, Mail, MessageCircle } from 'lucide-react'
import { DEVELOPER } from '@/lib/developer'

export default function AdminSettingsPage() {
  const [stats, setStats] = useState<Record<string, unknown>>({})
  const [gapoktanName, setGapoktanName] = useState('')
  const [savingName, setSavingName] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([api.get('/api/dashboard'), api.get('/api/settings')])
      .then(([d, s]) => {
        setStats(d.stats || {})
        setGapoktanName(s.settings?.gapoktan_name || '')
      })
      .finally(() => setLoading(false))
  }, [])

  const saveGapoktanName = async () => {
    setSavingName(true)
    try {
      await api.put('/api/settings', { key: 'gapoktan_name', value: gapoktanName.trim() })
      toast('success', 'Nama GAPOKTAN disimpan')
    } catch (err) {
      toast('error', err instanceof Error ? err.message : 'Gagal menyimpan')
    } finally {
      setSavingName(false)
    }
  }

  const statCards = [
    { label: 'Total Petani', value: stats.totalMembers, icon: Users, color: 'text-blue-600', bg: 'bg-blue-50' },
    { label: 'Total Kebun', value: stats.totalFarms, icon: Leaf, color: 'text-green-600', bg: 'bg-green-50' },
    { label: 'Total Produksi (kg)', value: stats.totalProduksiKg, icon: Scale, color: 'text-purple-600', bg: 'bg-purple-50' },
    { label: 'Total Catatan Panen', value: stats.totalPanen, icon: Wheat, color: 'text-amber-600', bg: 'bg-amber-50' },
  ]

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Pengaturan Sistem</h1>
        <p className="text-gray-500">Konfigurasi dan informasi sistem</p>
      </div>

      {/* System Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        {statCards.map((s, i) => (
          <Card key={i}><CardContent className="p-4">
            <div className={`w-10 h-10 ${s.bg} rounded-xl flex items-center justify-center mb-3`}><s.icon className={s.color} size={20} /></div>
            <p className="text-2xl font-bold text-gray-800">{loading ? '…' : String(s.value ?? '-')}</p>
            <p className="text-xs text-gray-500 mt-1">{s.label}</p>
          </CardContent></Card>
        ))}
      </div>

      {/* Konfigurasi GAPOKTAN */}
      <Card className="mb-6">
        <CardHeader><CardTitle className="flex items-center gap-2"><Settings size={18} />Konfigurasi</CardTitle></CardHeader>
        <CardContent>
          <div className="max-w-xl">
            <label className="block text-sm font-medium text-gray-700 mb-1">Nama GAPOKTAN</label>
            <div className="flex flex-col sm:flex-row gap-3">
              <Input
                value={gapoktanName}
                onChange={e => setGapoktanName(e.target.value)}
                placeholder="Contoh: GAPOKTAN Sukorejo"
                className="flex-1"
              />
              <Button onClick={saveGapoktanName} loading={savingName} className="shrink-0">Simpan</Button>
            </div>
            <p className="text-xs text-gray-400 mt-1.5">Nama ini ditampilkan sebagai sambutan di halaman Dashboard.</p>
          </div>
        </CardContent>
      </Card>

      {/* System Info */}
      <Card className="mb-6">
        <CardHeader><CardTitle className="flex items-center gap-2"><Settings size={18} />Informasi Sistem</CardTitle></CardHeader>
        <CardContent>
          <div className="space-y-3 text-sm">
            {[
              { label: 'Nama Aplikasi', value: 'Sistem Informasi Dokumentasi Data Produksi Hasil Panen Pertanian' },
              { label: 'Versi', value: '2.1.0' },
              { label: 'Framework', value: 'Next.js 16 + TypeScript + TailwindCSS' },
              { label: 'Database', value: 'PostgreSQL + Prisma ORM' },
              { label: 'Autentikasi', value: 'JWT + Kontrol Akses (Admin & Petani)' },
              { label: 'Charts', value: 'Recharts' },
            ].map((i, idx) => (
              <div key={idx} className="flex justify-between gap-4 py-2 border-b border-gray-100 last:border-0">
                <span className="text-gray-500 shrink-0">{i.label}</span>
                <span className="font-medium text-gray-800 text-right">{i.value}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Keamanan */}
      <Card className="mb-6">
        <CardHeader><CardTitle className="flex items-center gap-2"><ShieldCheck size={18} />Keamanan</CardTitle></CardHeader>
        <CardContent>
          <div className="space-y-2 text-sm text-gray-600">
            <p>• Kelola akun pengguna, reset password, dan aktif/nonaktifkan lewat menu <strong>Manajemen Pengguna</strong>.</p>
            <p>• Password disimpan terenkripsi (bcrypt). Sistem tidak menampilkan password siapa pun.</p>
            <p>• Semua perubahan data tercatat di <strong>Log Aktivitas</strong>.</p>
          </div>
        </CardContent>
      </Card>

      {/* Dukungan Teknis / Developer */}
      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2"><Code2 size={18} />Dukungan Teknis</CardTitle></CardHeader>
        <CardContent>
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-full bg-indigo-600 text-white flex items-center justify-center font-bold text-lg shrink-0">MS</div>
            <div className="min-w-0">
              <p className="font-semibold text-gray-800">{DEVELOPER.name}</p>
              <p className="text-xs text-indigo-600 font-medium mb-3">Developer / Pengembang Aplikasi</p>
              <div className="space-y-2 text-sm">
                <a href={`https://wa.me/${DEVELOPER.whatsapp}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-gray-700 hover:text-green-700">
                  <MessageCircle size={15} className="text-green-600" /> WhatsApp: {DEVELOPER.phone}
                </a>
                <a href={`tel:${DEVELOPER.phone}`} className="flex items-center gap-2 text-gray-700 hover:text-green-700">
                  <Phone size={15} className="text-gray-400" /> {DEVELOPER.phone}
                </a>
                <a href={`mailto:${DEVELOPER.email}`} className="flex items-center gap-2 text-gray-700 hover:text-green-700 break-all">
                  <Mail size={15} className="text-gray-400" /> {DEVELOPER.email}
                </a>
              </div>
              <p className="text-xs text-gray-400 mt-3">Hubungi untuk bantuan teknis, perbaikan, atau pembaruan sistem.</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
