'use client'
import { useEffect, useState } from 'react'
import { api } from '@/lib/api'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { toast } from '@/components/ui/toaster'
import { Settings, Database, Users, Leaf, FlaskConical } from 'lucide-react'

export default function AdminSettingsPage() {
  const [stats, setStats] = useState<Record<string, unknown>>({})
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.get('/api/analytics').then(d => setStats(d.stats)).finally(() => setLoading(false))
  }, [])

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Pengaturan Sistem</h1>
        <p className="text-gray-500">Konfigurasi dan informasi sistem</p>
      </div>

      {/* System Stats */}
      <div className="grid md:grid-cols-4 gap-4 mb-6">
        {[
          { label: 'Total Petani', value: stats.totalFarmers, icon: Users, color: 'text-blue-600', bg: 'bg-blue-50' },
          { label: 'Total Kebun', value: stats.totalFarms, icon: Leaf, color: 'text-green-600', bg: 'bg-green-50' },
          { label: 'Kebun Aktif', value: stats.activeFarms, icon: FlaskConical, color: 'text-purple-600', bg: 'bg-purple-50' },
          { label: 'Siap Panen', value: stats.readyForHarvest, icon: Leaf, color: 'text-orange-600', bg: 'bg-orange-50' },
        ].map((s, i) => (
          <Card key={i}><CardContent className="p-4">
            <div className={`w-10 h-10 ${s.bg} rounded-xl flex items-center justify-center mb-3`}><s.icon className={s.color} size={20} /></div>
            <p className="text-2xl font-bold text-gray-800">{String(s.value ?? '-')}</p>
            <p className="text-xs text-gray-500 mt-1">{s.label}</p>
          </CardContent></Card>
        ))}
      </div>

      {/* System Info */}
      <Card className="mb-6">
        <CardHeader><CardTitle className="flex items-center gap-2"><Settings size={18} />Informasi Sistem</CardTitle></CardHeader>
        <CardContent>
          <div className="space-y-3 text-sm">
            {[
              { label: 'Nama Aplikasi', value: 'Sistem Informasi Dokumentasi Data Produksi Hasil Panen Pertanian' },
              { label: 'Versi', value: '2.0.0' },
              { label: 'Framework', value: 'Next.js 16 + TypeScript + TailwindCSS' },
              { label: 'Database', value: 'PostgreSQL + Prisma ORM' },
              { label: 'Autentikasi', value: 'JWT + Role-Based Access Control' },
              { label: 'Charts', value: 'Recharts' },
            ].map((i, idx) => (
              <div key={idx} className="flex justify-between py-2 border-b border-gray-100 last:border-0">
                <span className="text-gray-500">{i.label}</span>
                <span className="font-medium text-gray-800">{i.value}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Akun Demo */}
      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2"><Database size={18} />Akun Demo</CardTitle></CardHeader>
        <CardContent>
          <div className="space-y-2 text-sm font-mono bg-gray-50 rounded-lg p-4">
            <p className="text-gray-700"><strong>Super Admin:</strong> superadmin@hydro.id / password123</p>
            <p className="text-gray-700"><strong>Admin Desa:</strong> admin@desa1.id / password123</p>
            <p className="text-gray-700"><strong>Petani 1:</strong> petani1@desa1.id / password123</p>
            <p className="text-gray-700"><strong>Petani 2:</strong> petani2@desa1.id / password123</p>
          </div>
          <p className="text-xs text-gray-400 mt-2">* Jalankan <code>npm run db:seed</code> untuk memuat data demo</p>
        </CardContent>
      </Card>
    </div>
  )
}