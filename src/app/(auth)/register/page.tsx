'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Leaf, Eye, EyeOff } from 'lucide-react'
import { useAuth } from '@/lib/auth-context'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'

export default function RegisterPage() {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [villageId, setVillageId] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPass, setShowPass] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [villages, setVillages] = useState<{ id: string; name: string; district: string | null }[]>([])
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const { register } = useAuth()
  const router = useRouter()

  useEffect(() => {
    fetch('/api/villages/public')
      .then(r => r.json())
      .then(data => setVillages(data.villages || []))
      .catch(() => {})
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (password.length < 6) {
      setError('Password minimal 6 karakter')
      return
    }
    if (password !== confirmPassword) {
      setError('Konfirmasi password tidak sama')
      return
    }

    setLoading(true)
    try {
      await register({ name, email, password, phone: phone || undefined, villageId: villageId || undefined })
      router.push('/dashboard')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Pendaftaran gagal')
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
          <h1 className="text-2xl font-bold text-gray-800">Buat Akun Baru</h1>
          <p className="text-gray-500 mt-1">Daftar untuk mulai menggunakan SI Dokumentasi Panen</p>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4 text-sm text-red-700">{error}</div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <Input label="Nama Lengkap *" value={name} onChange={e => setName(e.target.value)} placeholder="Nama Anda" required />
          <Input label="Email *" type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="petani@desa.id" required />
          <Input label="No. HP" value={phone} onChange={e => setPhone(e.target.value)} placeholder="08xxxxxxxxxx" />
          <Select
            label="Desa"
            value={villageId}
            onChange={e => setVillageId(e.target.value)}
            options={[{ value: '', label: '-- Pilih Desa --' }, ...villages.map(v => ({ value: v.id, label: v.district ? `${v.name}, ${v.district}` : v.name }))]}
          />
          <div className="relative">
            <Input label="Password *" type={showPass ? 'text' : 'password'} value={password} onChange={e => setPassword(e.target.value)} placeholder="Minimal 6 karakter" required />
            <button type="button" onClick={() => setShowPass(!showPass)} className="absolute right-3 top-8 text-gray-400">
              {showPass ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>
          <div className="relative">
            <Input label="Konfirmasi Password *" type={showConfirm ? 'text' : 'password'} value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} placeholder="Ulangi password" required />
            <button type="button" onClick={() => setShowConfirm(!showConfirm)} className="absolute right-3 top-8 text-gray-400">
              {showConfirm ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>
          <Button type="submit" loading={loading} className="w-full" size="lg">Daftar</Button>
        </form>

        <div className="mt-6 text-center text-sm text-gray-500">
          <p>Sudah punya akun? <Link href="/login" className="text-green-600 font-medium hover:underline">Masuk di sini</Link></p>
        </div>
      </div>
    </div>
  )
}
