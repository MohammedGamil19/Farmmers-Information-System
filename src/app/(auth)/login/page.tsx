'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Leaf, Eye, EyeOff } from 'lucide-react'
import { useAuth } from '@/lib/auth-context'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

export default function LoginPage() {
  const [identifier, setIdentifier] = useState('')
  const [password, setPassword] = useState('')
  const [showPass, setShowPass] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const { login } = useAuth()
  const router = useRouter()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await login(identifier, password)
      router.push('/dashboard')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login gagal')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="w-full max-w-md">
      <div className="bg-white rounded-2xl shadow-xl p-8">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-green-100 rounded-2xl mb-4">
            <Leaf className="text-green-600" size={32} />
          </div>
          <h1 className="text-2xl font-bold text-gray-800">Selamat Datang</h1>
          <p className="text-gray-500 mt-1">Masuk ke SI Dokumentasi Panen</p>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4 text-sm text-red-700">{error}</div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <Input label="Email atau No. HP" type="text" value={identifier} onChange={e => setIdentifier(e.target.value)} placeholder="08xxxxxxxxxx atau email" required />
          <div className="relative">
            <Input label="Password" type={showPass ? 'text' : 'password'} value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••" required />
            <button type="button" onClick={() => setShowPass(!showPass)} className="absolute right-3 top-8 text-gray-400">
              {showPass ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>
          <Button type="submit" loading={loading} className="w-full" size="lg">Masuk</Button>
        </form>

        <div className="mt-6 text-center text-sm text-gray-500">
          <p>Belum punya akun? <Link href="/register" className="text-green-600 font-medium hover:underline">Daftar di sini</Link></p>
        </div>
      </div>
    </div>
  )
}