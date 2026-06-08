'use client'
import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/auth-context'
import { Sidebar } from '@/components/layout/sidebar'

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!loading && !user) router.push('/login')
  }, [user, loading, router])

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <div className="inline-block h-12 w-12 animate-spin rounded-full border-4 border-green-600 border-t-transparent" />
        <p className="mt-4 text-gray-600">Memuat...</p>
      </div>
    </div>
  )
  if (!user) return null

  return (
    <div className="min-h-screen bg-gray-50">
      <Sidebar />
      <main className="lg:ml-64 pt-14 lg:pt-0 min-h-screen">
        <div className="p-4 lg:p-6">{children}</div>
      </main>
    </div>
  )
}