'use client'
import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useAuth } from '@/lib/auth-context'
import { cn } from '@/lib/utils'
import {
  LayoutDashboard, Leaf, BarChart3, FileText,
  Bell, User, Settings, LogOut, Menu, X, MapPin, Users, Sprout, Globe,
  Layers, Megaphone, CalendarDays, Wheat, History
} from 'lucide-react'

// scope: 'all' = both roles, 'admin' = admins only, 'farmer' = farmers only
// section: groups items under a quiet header for scannability
const navItems = [
  { href: '/dashboard', icon: LayoutDashboard, label: 'Dashboard', scope: 'all', section: 'Utama' },
  { href: '/panen', icon: Wheat, label: 'Data Panen', scope: 'all', section: 'Utama' },
  { href: '/farms', icon: Leaf, label: 'Kebun Saya', scope: 'farmer', section: 'Utama' },
  // Farm & crop data (admin)
  { href: '/farms', icon: Leaf, label: 'Semua Kebun', scope: 'admin', section: 'Data Pertanian' },
  { href: '/tanaman', icon: Sprout, label: 'Jenis Tanaman', scope: 'admin', section: 'Data Pertanian' },
  { href: '/lahan', icon: Layers, label: 'Data Lahan', scope: 'admin', section: 'Data Pertanian' },
  // Communication
  { href: '/pengumuman', icon: Megaphone, label: 'Pengumuman', scope: 'all', section: 'Informasi' },
  { href: '/kalender', icon: CalendarDays, label: 'Kalender Kegiatan', scope: 'admin', section: 'Informasi' },
  { href: '/notifications', icon: Bell, label: 'Notifikasi', scope: 'all', section: 'Informasi' },
  // Analysis
  { href: '/analytics', icon: BarChart3, label: 'Analitik', scope: 'admin', section: 'Analisis' },
  { href: '/reports', icon: FileText, label: 'Laporan', scope: 'admin', section: 'Analisis' },
  { href: '/aktivitas', icon: History, label: 'Log Aktivitas', scope: 'admin', section: 'Analisis' },
  // Administration
  { href: '/admin/users', icon: Users, label: 'Manajemen Pengguna', scope: 'admin', section: 'Administrasi' },
  { href: '/admin/villages', icon: MapPin, label: 'Desa', scope: 'admin', section: 'Administrasi' },
  { href: '/admin/cms', icon: Globe, label: 'Halaman Utama', scope: 'admin', section: 'Administrasi' },
  { href: '/admin/settings', icon: Settings, label: 'Pengaturan', scope: 'admin', section: 'Administrasi' },
]

const SECTION_ORDER = ['Utama', 'Data Pertanian', 'Informasi', 'Analisis', 'Administrasi']

export function Sidebar() {
  const [open, setOpen] = useState(false)
  const pathname = usePathname()
  const { user, logout } = useAuth()

  const isAdmin = !!user && user.role !== 'FARMER'
  const items = navItems.filter(i => {
    if (i.scope === 'admin') return isAdmin
    if (i.scope === 'farmer') return !isAdmin
    return true
  })
  const groups = SECTION_ORDER
    .map(section => ({ section, items: items.filter(i => i.section === section) }))
    .filter(g => g.items.length > 0)

  const NavLink = ({ item }: { item: (typeof navItems)[number] }) => {
    const active = pathname === item.href || pathname.startsWith(item.href + '/')
    return (
      <Link
        href={item.href}
        onClick={() => setOpen(false)}
        aria-current={active ? 'page' : undefined}
        className={cn(
          'group relative flex items-center gap-3 pl-4 pr-3 py-2 rounded-lg text-sm transition-all duration-150',
          active
            ? 'bg-white/15 text-white font-semibold'
            : 'text-green-100/90 font-medium hover:bg-white/10 hover:text-white'
        )}
      >
        {active && <span className="absolute left-0 top-1/2 -translate-y-1/2 h-5 w-1 rounded-r-full bg-white" />}
        <item.icon size={18} className={cn('shrink-0 transition-colors', active ? 'text-white' : 'text-green-200/70 group-hover:text-white')} />
        <span className="truncate">{item.label}</span>
      </Link>
    )
  }

  const SidebarContent = () => (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="px-5 py-5 border-b border-white/10 shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-white/15 ring-1 ring-white/20 flex items-center justify-center shrink-0">
            <Leaf className="text-white" size={22} />
          </div>
          <div className="min-w-0">
            <p className="text-white font-bold text-sm leading-tight truncate">SI Dokumentasi Panen</p>
            <p className="text-green-300 text-xs truncate">Produksi Hasil Panen Pertanian</p>
          </div>
        </div>
      </div>
      <nav className="flex-1 px-3 py-3 overflow-y-auto">
        {groups.map(group => (
          <div key={group.section} className="mb-1">
            <p className="px-3 pt-3 pb-1 text-[10px] font-semibold uppercase tracking-wider text-green-300/60">{group.section}</p>
            <div className="space-y-0.5">
              {group.items.map(item => <NavLink key={item.href + item.label} item={item} />)}
            </div>
          </div>
        ))}
      </nav>
      <div className="p-3 border-t border-white/10 shrink-0">
        <div className="flex items-center gap-3 px-3 py-2 rounded-lg bg-white/10 mb-1">
          <div className="w-9 h-9 rounded-full bg-white/20 flex items-center justify-center text-white text-sm font-bold shrink-0">
            {user?.name?.charAt(0).toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-white text-sm font-medium truncate">{user?.name}</p>
            <p className="text-green-300 text-xs truncate">{isAdmin ? 'Admin' : 'Petani'}</p>
          </div>
        </div>
        <Link href="/profile" onClick={() => setOpen(false)} className="flex items-center gap-3 px-3 py-2 text-green-100/90 hover:text-white hover:bg-white/10 rounded-lg text-sm transition-colors">
          <User size={16} className="text-green-200/70" /> Profil
        </Link>
        <button onClick={logout} className="w-full flex items-center gap-3 px-3 py-2 text-green-100/90 hover:text-white hover:bg-white/10 rounded-lg text-sm transition-colors">
          <LogOut size={16} className="text-green-200/70" /> Keluar
        </button>
      </div>
    </div>
  )

  return (
    <>
      {/* Mobile header */}
      <div className="lg:hidden fixed top-0 left-0 right-0 z-40 bg-green-800 flex items-center justify-between px-4 py-3 shadow-sm">
        <div className="flex items-center gap-2">
          <Leaf className="text-white" size={20} />
          <span className="text-white font-bold text-sm">SI Dokumentasi Panen</span>
        </div>
        <button onClick={() => setOpen(!open)} className="text-white p-1" aria-label="Menu">
          {open ? <X size={22} /> : <Menu size={22} />}
        </button>
      </div>
      {/* Mobile overlay */}
      {open && <div className="lg:hidden fixed inset-0 z-40 bg-black/50" onClick={() => setOpen(false)} />}
      {/* Mobile sidebar */}
      <aside className={cn('lg:hidden fixed top-0 left-0 h-full w-64 bg-gradient-to-b from-green-700 to-green-800 z-50 transform transition-transform duration-200', open ? 'translate-x-0' : '-translate-x-full')}>
        <SidebarContent />
      </aside>
      {/* Desktop sidebar */}
      <aside className="hidden lg:flex flex-col w-64 bg-gradient-to-b from-green-700 to-green-800 h-screen fixed top-0 left-0 shadow-xl">
        <SidebarContent />
      </aside>
    </>
  )
}