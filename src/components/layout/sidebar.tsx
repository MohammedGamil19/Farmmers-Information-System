'use client'
import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useAuth } from '@/lib/auth-context'
import { cn } from '@/lib/utils'
import {
  LayoutDashboard, Leaf, BarChart3, FileText,
  Bell, User, Settings, LogOut, Menu, X, MapPin, Users, Sprout, Globe,
  UserCheck, Layers, Megaphone, CalendarDays, Wheat
} from 'lucide-react'

const navItems = [
  { href: '/dashboard', icon: LayoutDashboard, label: 'Dashboard', roles: ['SUPER_ADMIN', 'VILLAGE_ADMIN', 'FARMER'] },
  // GAPOKTAN — primary focus: harvest production data documentation
  { href: '/panen', icon: Wheat, label: 'Data Panen', roles: ['SUPER_ADMIN', 'VILLAGE_ADMIN', 'FARMER'] },
  { href: '/anggota', icon: UserCheck, label: 'Data Anggota', roles: ['SUPER_ADMIN', 'VILLAGE_ADMIN', 'FARMER'] },
  { href: '/lahan', icon: Layers, label: 'Data Lahan', roles: ['SUPER_ADMIN', 'VILLAGE_ADMIN', 'FARMER'] },
  { href: '/pengumuman', icon: Megaphone, label: 'Pengumuman', roles: ['SUPER_ADMIN', 'VILLAGE_ADMIN', 'FARMER'] },
  { href: '/kalender', icon: CalendarDays, label: 'Kalender Kegiatan', roles: ['SUPER_ADMIN', 'VILLAGE_ADMIN', 'FARMER'] },
  { href: '/analytics', icon: BarChart3, label: 'Analitik', roles: ['SUPER_ADMIN', 'VILLAGE_ADMIN', 'FARMER'] },
  { href: '/reports', icon: FileText, label: 'Laporan', roles: ['SUPER_ADMIN', 'VILLAGE_ADMIN'] },
  { href: '/farms', icon: Leaf, label: 'Kebun Saya', roles: ['FARMER'] },
  { href: '/farms', icon: Leaf, label: 'Semua Kebun', roles: ['SUPER_ADMIN', 'VILLAGE_ADMIN'] },
  { href: '/tanaman', icon: Sprout, label: 'Jenis Tanaman', roles: ['SUPER_ADMIN', 'VILLAGE_ADMIN', 'FARMER'] },
  // Admin
  { href: '/notifications', icon: Bell, label: 'Notifikasi', roles: ['SUPER_ADMIN', 'VILLAGE_ADMIN', 'FARMER'] },
  { href: '/admin/users', icon: Users, label: 'Pengguna', roles: ['SUPER_ADMIN', 'VILLAGE_ADMIN'] },
  { href: '/admin/villages', icon: MapPin, label: 'Desa', roles: ['SUPER_ADMIN'] },
  { href: '/admin/cms', icon: Globe, label: 'Halaman Utama', roles: ['SUPER_ADMIN', 'VILLAGE_ADMIN'] },
  { href: '/admin/settings', icon: Settings, label: 'Pengaturan', roles: ['SUPER_ADMIN'] },
]

export function Sidebar() {
  const [open, setOpen] = useState(false)
  const pathname = usePathname()
  const { user, logout } = useAuth()

  const items = navItems.filter(i => user && i.roles.includes(user.role))

  const SidebarContent = () => (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="p-6 border-b border-green-800 shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center">
            <Leaf className="text-white" size={22} />
          </div>
          <div>
            <p className="text-white font-bold text-sm leading-tight">SI Dokumentasi Panen</p>
            <p className="text-green-300 text-xs">Produksi Hasil Panen Pertanian</p>
          </div>
        </div>
      </div>
      <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
        {items.map(item => {
          const active = pathname === item.href || pathname.startsWith(item.href + '/')
          return (
            <Link key={item.href + item.label} href={item.href} onClick={() => setOpen(false)}
              className={cn('flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors', active ? 'bg-white/20 text-white' : 'text-green-100 hover:bg-white/10 hover:text-white')}>
              <item.icon size={18} />
              {item.label}
            </Link>
          )
        })}
      </nav>
      <div className="p-4 border-t border-green-800 shrink-0">
        <div className="flex items-center gap-3 px-3 py-2 rounded-lg bg-white/10 mb-2">
          <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center text-white text-sm font-bold">
            {user?.name?.charAt(0).toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-white text-sm font-medium truncate">{user?.name}</p>
            <p className="text-green-300 text-xs truncate">{user?.role === 'SUPER_ADMIN' ? 'Super Admin' : user?.role === 'VILLAGE_ADMIN' ? 'Admin Desa' : 'Petani'}</p>
          </div>
        </div>
        <Link href="/profile" className="flex items-center gap-3 px-3 py-2 text-green-100 hover:text-white hover:bg-white/10 rounded-lg text-sm">
          <User size={16} /> Profil
        </Link>
        <button onClick={logout} className="w-full flex items-center gap-3 px-3 py-2 text-green-100 hover:text-white hover:bg-white/10 rounded-lg text-sm">
          <LogOut size={16} /> Keluar
        </button>
      </div>
    </div>
  )

  return (
    <>
      {/* Mobile header */}
      <div className="lg:hidden fixed top-0 left-0 right-0 z-40 bg-green-700 flex items-center justify-between px-4 py-3">
        <div className="flex items-center gap-2">
          <Leaf className="text-white" size={20} />
          <span className="text-white font-bold text-sm">SI Dokumentasi Panen</span>
        </div>
        <button onClick={() => setOpen(!open)} className="text-white p-1">
          {open ? <X size={22} /> : <Menu size={22} />}
        </button>
      </div>
      {/* Mobile overlay */}
      {open && <div className="lg:hidden fixed inset-0 z-40 bg-black/50" onClick={() => setOpen(false)} />}
      {/* Mobile sidebar */}
      <aside className={cn('lg:hidden fixed top-0 left-0 h-full w-64 bg-green-700 z-50 transform transition-transform', open ? 'translate-x-0' : '-translate-x-full')}>
        <SidebarContent />
      </aside>
      {/* Desktop sidebar */}
      <aside className="hidden lg:flex flex-col w-64 bg-green-700 h-screen fixed top-0 left-0">
        <SidebarContent />
      </aside>
    </>
  )
}