'use client'
import { useState, useEffect, useRef, useCallback } from 'react'
import Link from 'next/link'

interface HeroSlide { id: string; url: string }

interface Props {
  title: string
  subtitle: string
  buttonText: string
  images: HeroSlide[]
}

export function HeroSlider({ title, subtitle, buttonText, images }: Props) {
  // For infinite loop: wrap with clones [last, ...real, first]
  const hasMultiple = images.length > 1
  const extended = hasMultiple
    ? [images[images.length - 1], ...images, images[0]]
    : images.length === 1
      ? images
      : [{ id: 'default', url: '' }]

  const [current, setCurrent] = useState(hasMultiple ? 1 : 0)
  const [transition, setTransition] = useState(true)
  const [canSlide, setCanSlide] = useState(true)
  const touchStartX = useRef<number | null>(null)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // Preload all images
  useEffect(() => {
    images.forEach(s => { if (s.url) { const img = new window.Image(); img.src = s.url } })
  }, [images])

  const slide = useCallback((dir: 'next' | 'prev') => {
    if (!hasMultiple || !canSlide) return
    setCanSlide(false)
    setCurrent(p => dir === 'next' ? p + 1 : p - 1)
  }, [hasMultiple, canSlide])

  // Auto-slide every 5 s
  useEffect(() => {
    if (!hasMultiple) return
    intervalRef.current = setInterval(() => slide('next'), 5000)
    return () => { if (intervalRef.current) clearInterval(intervalRef.current) }
  }, [hasMultiple, slide])

  const resetTimer = () => {
    if (intervalRef.current) clearInterval(intervalRef.current)
    intervalRef.current = setInterval(() => slide('next'), 5000)
  }

  const go = (dir: 'next' | 'prev') => { resetTimer(); slide(dir) }

  // Handle infinite-loop jump after transition
  const onTransitionEnd = () => {
    setCanSlide(true)
    if (current === extended.length - 1) {
      setTransition(false); setCurrent(1)
    }
    if (current === 0) {
      setTransition(false); setCurrent(extended.length - 2)
    }
  }

  useEffect(() => {
    if (!transition) {
      const t = setTimeout(() => setTransition(true), 50)
      return () => clearTimeout(t)
    }
  }, [transition])

  // Real index for dots
  const dotIndex = hasMultiple
    ? (current - 1 + images.length) % images.length
    : 0

  // Touch / swipe
  const onTouchStart = (e: React.TouchEvent) => { if (hasMultiple) touchStartX.current = e.touches[0].clientX }
  const onTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX.current === null || !hasMultiple) return
    const diff = touchStartX.current - e.changedTouches[0].clientX
    if (diff > 50) go('next')
    else if (diff < -50) go('prev')
    touchStartX.current = null
  }

  // Click left/right half
  const onClick = (e: React.MouseEvent<HTMLElement>) => {
    if (!hasMultiple) return
    if ((e.target as HTMLElement).closest('button,a')) return
    const half = e.currentTarget.clientWidth / 2
    if (e.clientX < half) go('prev'); else go('next')
  }

  const bgStyle = (url: string) =>
    url ? { backgroundImage: `url(${url})` } : { backgroundColor: '#1a2e1a' }

  return (
    <section
      className="relative min-h-[560px] md:min-h-[720px] flex items-center justify-center overflow-hidden select-none cursor-pointer group"
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
      onClick={onClick}
    >
      {/* ── Slider track ── */}
      <div
        className="absolute inset-0 flex"
        onTransitionEnd={onTransitionEnd}
        style={{
          transform: hasMultiple ? `translateX(-${current * 100}%)` : 'none',
          transition: transition && hasMultiple ? 'transform 900ms cubic-bezier(0.4, 0, 0.2, 1)' : 'none',
          willChange: 'transform',
        }}
      >
        {extended.map((slide, i) => (
          <div
            key={`${slide.id}-${i}`}
            className="flex-shrink-0 w-full h-full bg-cover bg-center"
            style={bgStyle(slide.url)}
          />
        ))}
      </div>

      {/* ── Overlay ── */}
      <div className="absolute inset-0 bg-gradient-to-b from-black/50 via-black/35 to-black/60" />

      {/* Decorative blobs (only when no image) */}
      {images.length === 0 && (
        <>
          <div className="absolute inset-0 bg-gradient-to-br from-green-700 via-emerald-600 to-teal-700" />
          <div className="absolute top-20 right-10 w-72 h-72 bg-white/5 rounded-full blur-3xl" />
          <div className="absolute bottom-20 left-10 w-96 h-96 bg-emerald-400/10 rounded-full blur-3xl" />
        </>
      )}

      {/* ── Content ── */}
      <div className="relative z-10 w-full max-w-5xl mx-auto px-6 text-white text-center pointer-events-none">
        <div className="inline-flex items-center gap-2 bg-white/15 rounded-full px-4 py-1.5 text-sm mb-6 font-medium border border-white/20 pointer-events-none">
          🌿 Sistem Monitoring Hidroponik Desa
        </div>
        <h1 className="text-4xl md:text-6xl font-extrabold mb-5 leading-tight drop-shadow-xl">
          {title}
        </h1>
        <p className="text-lg md:text-xl text-white/85 mb-10 max-w-2xl mx-auto leading-relaxed drop-shadow">
          {subtitle}
        </p>
        <Link
          href="/login"
          className="pointer-events-auto inline-flex items-center gap-2 bg-white text-green-700 px-8 py-4 rounded-xl font-bold text-lg hover:bg-green-50 transition-all shadow-xl hover:shadow-2xl hover:-translate-y-0.5"
          onClick={e => e.stopPropagation()}
        >
          {buttonText} →
        </Link>

        {/* Scroll hint */}
        <div className="mt-14 flex justify-center pointer-events-none">
          <div className="w-6 h-10 border-2 border-white/40 rounded-full flex items-start justify-center p-1">
            <div className="w-1.5 h-3 bg-white/60 rounded-full animate-bounce" />
          </div>
        </div>
      </div>



    </section>
  )
}
