'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Leaf } from 'lucide-react'

export function LandingNavbar() {
  const [scrolled, setScrolled] = useState(false)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20)
    window.addEventListener('scroll', onScroll, { passive: true })
    onScroll() // check on mount
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  return (
    <nav
      className={`fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-6 py-4 transition-all duration-300 ${
        scrolled
          ? 'bg-green-700/95 backdrop-blur-sm shadow-lg'
          : 'bg-transparent'
      }`}
    >
      {/* Logo */}
      <div className="flex items-center gap-2">
        <div className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors duration-300 ${scrolled ? 'bg-white/20' : 'bg-black/20'}`}>
          <Leaf size={18} className="text-white" />
        </div>
        <span className="font-bold text-lg text-white drop-shadow">Hydro Monitor</span>
      </div>

      {/* CTA */}
      <Link
        href="/login"
        className={`px-5 py-2 rounded-lg font-semibold text-sm transition-all duration-300 ${
          scrolled
            ? 'bg-white text-green-700 hover:bg-green-50'
            : 'bg-white/20 text-white border border-white/40 hover:bg-white/30 backdrop-blur-sm'
        }`}
      >
        Masuk →
      </Link>
    </nav>
  )
}
