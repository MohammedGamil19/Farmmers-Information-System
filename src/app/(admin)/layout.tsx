'use client'
import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/auth-context'
import { Sidebar } from '@/components/layout/sidebar'

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!loading && !user) router.push('/login')
    if (!loading && user && user.role === 'FARMER') router.push('/dashboard')
  }, [user, loading, router])

  if (loading || !user) return null

  return (
    <div className="min-h-screen bg-gray-50">
      <Sidebar />
      <main className="lg:ml-64 pt-14 lg:pt-0 min-h-screen">
        <div className="p-4 lg:p-6">{children}</div>
      </main>
    </div>
  )
}