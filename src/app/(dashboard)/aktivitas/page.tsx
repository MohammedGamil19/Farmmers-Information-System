'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { api } from '@/lib/api'
import { useAuth } from '@/lib/auth-context'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Select } from '@/components/ui/select'
import { History, Plus, Pencil, Trash2 } from 'lucide-react'
import { formatDateTime } from '@/lib/utils'

type Log = {
  id: string
  action: 'CREATE' | 'UPDATE' | 'DELETE'
  entity: string
  detail: string
  createdAt: string
  user: { id: string; name: string; role: string }
}

const ACTION_META: Record<string, { label: string; variant: 'success' | 'info' | 'danger'; icon: typeof Plus }> = {
  CREATE: { label: 'Tambah', variant: 'success', icon: Plus },
  UPDATE: { label: 'Ubah', variant: 'info', icon: Pencil },
  DELETE: { label: 'Hapus', variant: 'danger', icon: Trash2 },
}

const ROLE_LABELS: Record<string, string> = {
  SUPER_ADMIN: 'Super Admin', VILLAGE_ADMIN: 'Admin Desa', FARMER: 'Petani',
}

export default function AktivitasPage() {
  const { user, loading: authLoading } = useAuth()
  const router = useRouter()
  const [logs, setLogs] = useState<Log[]>([])
  const [loading, setLoading] = useState(true)
  const [entity, setEntity] = useState('')

  // Guard: only admins may view the activity log
  useEffect(() => {
    if (!authLoading && user && user.role === 'FARMER') router.replace('/dashboard')
  }, [authLoading, user, router])

  const load = () => {
    setLoading(true)
    api.get(`/api/activity${entity ? `?entity=${entity}` : ''}`)
      .then(d => setLogs(d.logs || []))
      .finally(() => setLoading(false))
  }
  useEffect(() => { if (user && user.role !== 'FARMER') load() }, [entity, user]) // eslint-disable-line react-hooks/exhaustive-deps

  if (user?.role === 'FARMER') return null

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2"><History size={22} /> Log Aktivitas</h1>
        <p className="text-gray-500 text-sm mt-1">Catatan siapa menambah, mengubah, atau menghapus data — untuk transparansi GAPOKTAN</p>
      </div>

      <div className="mb-4 w-full sm:w-56">
        <Select label="" value={entity} onChange={e => setEntity(e.target.value)}
          options={[
            { value: '', label: 'Semua Aktivitas' },
            { value: 'Panen', label: 'Data Panen' },
            { value: 'Anggota', label: 'Data Anggota' },
            { value: 'Lahan', label: 'Data Lahan' },
            { value: 'Kebun', label: 'Kebun' },
            { value: 'Pengguna', label: 'Pengguna' },
          ]} />
      </div>

      {loading ? (
        <div className="flex justify-center py-16"><div className="h-8 w-8 animate-spin rounded-full border-4 border-green-600 border-t-transparent" /></div>
      ) : logs.length === 0 ? (
        <Card><CardContent className="text-center py-16 text-gray-400">
          <History size={40} className="mx-auto mb-3 opacity-30" />
          <p>Belum ada aktivitas tercatat</p>
        </CardContent></Card>
      ) : (
        <>
          {/* Mobile timeline */}
          <div className="sm:hidden space-y-3">
            {logs.map(l => {
              const m = ACTION_META[l.action] || ACTION_META.UPDATE
              return (
                <Card key={l.id}><CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <div className="mt-0.5"><m.icon size={16} className="text-gray-400" /></div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm text-gray-800">{l.detail}</p>
                      <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
                        <Badge variant={m.variant}>{m.label}</Badge>
                        <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">{l.entity}</span>
                      </div>
                      <p className="text-xs text-gray-400 mt-1.5">{l.user.name} ({ROLE_LABELS[l.user.role] || l.user.role}) · {formatDateTime(l.createdAt)}</p>
                    </div>
                  </div>
                </CardContent></Card>
              )
            })}
          </div>

          {/* Desktop table */}
          <Card className="hidden sm:block">
            <CardHeader><CardTitle>Riwayat ({logs.length})</CardTitle></CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b text-left text-gray-500">
                      <th className="pb-3 font-medium">Waktu</th>
                      <th className="pb-3 font-medium">Pengguna</th>
                      <th className="pb-3 font-medium">Aksi</th>
                      <th className="pb-3 font-medium">Jenis</th>
                      <th className="pb-3 font-medium">Detail</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {logs.map(l => {
                      const m = ACTION_META[l.action] || ACTION_META.UPDATE
                      return (
                        <tr key={l.id} className="hover:bg-gray-50">
                          <td className="py-3 text-gray-500 text-xs whitespace-nowrap">{formatDateTime(l.createdAt)}</td>
                          <td className="py-3">
                            <p className="font-medium text-gray-800">{l.user.name}</p>
                            <p className="text-xs text-gray-400">{ROLE_LABELS[l.user.role] || l.user.role}</p>
                          </td>
                          <td className="py-3"><Badge variant={m.variant}>{m.label}</Badge></td>
                          <td className="py-3 text-gray-600">{l.entity}</td>
                          <td className="py-3 text-gray-700">{l.detail}</td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  )
}
