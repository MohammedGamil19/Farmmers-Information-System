export const dynamic = 'force-dynamic'
import Link from 'next/link'
import Image from 'next/image'
import { Leaf, BarChart3, Bell, Shield, CheckCircle, FlaskConical, Users, MapPin, Activity } from 'lucide-react'
import { prisma } from '@/lib/prisma'
import { HeroSlider } from '@/components/hero-slider'
import { LandingNavbar } from '@/components/landing-navbar'

// ─── CMS defaults ─────────────────────────────────────────────────────────────

const CMS_DEFAULTS = {
  cms_hero: {
    title: 'Hydroponic pH & TDS Monitoring System',
    subtitle: 'Membantu desa mendigitalisasi pertanian hidroponik melalui pemantauan cerdas dan keputusan berbasis data.',
    buttonText: 'Mulai Sekarang',
    images: [] as { id: string; url: string }[],
  },
  cms_about: {
    enabled: true,
    title: 'Tentang Program Hidroponik Desa',
    body: 'Program ini dikembangkan untuk membantu petani desa mengelola kebun hidroponik mereka secara digital. Dengan teknologi pemantauan modern, petani dapat memastikan tanaman tumbuh optimal setiap hari.',
    image: '',
  },
  cms_gallery: [] as { url: string; caption: string }[],
  cms_features: [
    { icon: 'FlaskConical', title: 'Monitor pH & TDS', desc: 'Catat dan pantau nilai pH dan TDS setiap hari secara real-time dengan validasi otomatis.' },
    { icon: 'BarChart3', title: 'Analitik Canggih', desc: 'Grafik tren pH dan TDS, analisis pertumbuhan tanaman, dan performa panen.' },
    { icon: 'Bell', title: 'Notifikasi Pintar', desc: 'Peringatan otomatis saat nilai pH/TDS tidak normal atau panen akan tiba.' },
    { icon: 'CheckCircle', title: 'Rekomendasi Otomatis', desc: 'Saran perbaikan otomatis berdasarkan nilai pH dan TDS yang terdeteksi.' },
    { icon: 'Shield', title: 'Manajemen Peran', desc: 'Akses terpisah untuk Super Admin, Admin Desa, dan Petani.' },
    { icon: 'Leaf', title: 'Lacak Siklus Panen', desc: 'Pantau dari persemaian hingga panen dengan timeline visual yang lengkap.' },
  ] as { icon: string; title: string; desc: string }[],
  cms_show_stats: true,
  cms_credits: {
    enabled: true,
    universityLogo: '',
    universityName: 'Universitas 17 Agustus 1945 Surabaya',
    universityShort: 'UNTAG Surabaya',
    teamLogo: '',
    teamName: 'KKN Reguler R4',
    village: 'Desa Sukorejo, Bungah, Gresik',
    supervisor: '',
    createdBy: '',
    year: '2026',
    extraLogos: [] as { id: string; url: string; label: string }[],
  },
}

const ICON_MAP: Record<string, React.ElementType> = {
  FlaskConical, BarChart3, Bell, CheckCircle, Shield, Leaf,
}

function GalleryCard({ img, className }: { img: { url: string; caption: string }; className?: string }) {
  return (
    <div className={`group relative rounded-2xl overflow-hidden shadow-md hover:shadow-xl transition-all duration-300 ${className ?? ''}`}>
      <Image src={img.url} alt={img.caption || 'Foto kebun'} fill className="object-cover group-hover:scale-105 transition-transform duration-500" unoptimized />
      {img.caption && (
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent flex items-end p-4">
          <p className="text-white text-sm font-medium">{img.caption}</p>
        </div>
      )}
    </div>
  )
}

async function getCms() {
  try {
    const rows = await prisma.systemSetting.findMany({
      where: { key: { in: [...Object.keys(CMS_DEFAULTS), 'cms_credits'] } },
    })
    const result = { ...CMS_DEFAULTS } as Record<string, unknown>
    for (const row of rows) {
      try { result[row.key] = JSON.parse(row.value) } catch { result[row.key] = row.value }
    }
    return result as typeof CMS_DEFAULTS
  } catch {
    return CMS_DEFAULTS
  }
}

async function getLiveStats() {
  try {
    const [farms, farmers, villages, records] = await Promise.all([
      prisma.farm.count({ where: { isActive: true } }),
      prisma.user.count({ where: { role: 'FARMER', isActive: true } }),
      prisma.village.count({ where: { isActive: true } }),
      prisma.monitoringRecord.count(),
    ])
    return { farms, farmers, villages, records }
  } catch {
    return { farms: 0, farmers: 0, villages: 0, records: 0 }
  }
}

// ─── Page ──────────────────────────────────────────────────────────────────────

export default async function HomePage() {
  const [cms, stats] = await Promise.all([getCms(), getLiveStats()])

  const hero    = cms.cms_hero    as typeof CMS_DEFAULTS.cms_hero
  const about   = cms.cms_about   as typeof CMS_DEFAULTS.cms_about
  const gallery = cms.cms_gallery as typeof CMS_DEFAULTS.cms_gallery
  const features= cms.cms_features as typeof CMS_DEFAULTS.cms_features
  const showStats = cms.cms_show_stats as boolean
  const credits = (cms as Record<string, unknown>).cms_credits as typeof CMS_DEFAULTS.cms_credits ?? CMS_DEFAULTS.cms_credits

  return (
    <div className="min-h-screen bg-white font-sans">

      {/* ── Navbar (transparent → solid on scroll) ──────────────────────────── */}
      <LandingNavbar />

      {/* ── Hero slider (client component) ─────────────────────────────────── */}
      <HeroSlider
        title={hero.title}
        subtitle={hero.subtitle}
        buttonText={hero.buttonText}
        images={hero.images ?? []}
      />

      {/* ── Live Stats ──────────────────────────────────────────────────────── */}
      {showStats && (
        <section className="bg-white py-12 px-6">
          <div className="max-w-4xl mx-auto">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
              {[
                { icon: Leaf,     label: 'Kebun Aktif',         value: stats.farms,                      color: 'text-green-600',  bg: 'bg-green-50'  },
                { icon: Users,    label: 'Petani Terdaftar',    value: stats.farmers,                    color: 'text-blue-600',   bg: 'bg-blue-50'   },
                { icon: MapPin,   label: 'Desa Binaan',         value: stats.villages,                   color: 'text-purple-600', bg: 'bg-purple-50' },
                { icon: Activity, label: 'Catatan Monitoring',  value: stats.records.toLocaleString('id'), color: 'text-orange-600', bg: 'bg-orange-50' },
              ].map((s, i) => (
                <div key={i} className="text-center p-6 rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
                  <div className={`w-12 h-12 ${s.bg} rounded-xl flex items-center justify-center mx-auto mb-3`}>
                    <s.icon className={s.color} size={22} />
                  </div>
                  <p className="text-3xl font-extrabold text-gray-800">{s.value}</p>
                  <p className="text-sm text-gray-500 mt-1">{s.label}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ── About / Village Info ─────────────────────────────────────────────── */}
      {about.enabled && (
        <section className="py-20 px-6 bg-gray-50">
          <div className="max-w-5xl mx-auto">
            <div className={`grid gap-12 items-center ${about.image ? 'md:grid-cols-2' : ''}`}>
              <div>
                <div className="inline-block bg-green-100 text-green-700 text-xs font-bold px-3 py-1 rounded-full mb-4 uppercase tracking-wide">
                  Tentang Program
                </div>
                <h2 className="text-3xl md:text-4xl font-bold text-gray-800 mb-5 leading-tight">
                  {about.title}
                </h2>
                <p className="text-gray-600 text-lg leading-relaxed whitespace-pre-line">
                  {about.body}
                </p>
              </div>
              {about.image && (
                <div className="relative rounded-2xl overflow-hidden shadow-xl aspect-[4/3]">
                  <Image src={about.image} alt={about.title} fill className="object-cover" unoptimized />
                </div>
              )}
            </div>
          </div>
        </section>
      )}

      {/* ── Photo Gallery ─────────────────────────────────────────────────────── */}
      {gallery.length > 0 && (
        <section className="py-20 px-6 bg-white">
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-12">
              <div className="inline-block bg-green-100 text-green-700 text-xs font-bold px-3 py-1 rounded-full mb-4 uppercase tracking-wide">
                Galeri
              </div>
              <h2 className="text-3xl md:text-4xl font-bold text-gray-800">Kebun Hidroponik Kami</h2>
            </div>
            {gallery.length === 1 && (
              <GalleryCard img={gallery[0]} className="max-w-2xl mx-auto aspect-[16/9]" />
            )}

            {gallery.length === 2 && (
              <div className="grid md:grid-cols-2 gap-4">
                {gallery.map((img, i) => <GalleryCard key={i} img={img} className="aspect-[4/3]" />)}
              </div>
            )}

            {gallery.length === 3 && (
              <div className="grid md:grid-cols-3 gap-4">
                {gallery.map((img, i) => <GalleryCard key={i} img={img} className="aspect-[4/3]" />)}
              </div>
            )}

            {gallery.length >= 4 && (
              <div className="space-y-4">
                {/* Featured row — both images the same height */}
                <div className="flex gap-4 h-[420px]">
                  <div className="relative flex-[2] rounded-2xl overflow-hidden shadow-md group">
                    <Image src={gallery[0].url} alt={gallery[0].caption || 'Foto kebun 1'} fill className="object-cover group-hover:scale-105 transition-transform duration-500" unoptimized />
                    {gallery[0].caption && (
                      <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent flex items-end p-4">
                        <p className="text-white text-sm font-medium">{gallery[0].caption}</p>
                      </div>
                    )}
                  </div>
                  <div className="relative flex-1 rounded-2xl overflow-hidden shadow-md group">
                    <Image src={gallery[1].url} alt={gallery[1].caption || 'Foto kebun 2'} fill className="object-cover group-hover:scale-105 transition-transform duration-500" unoptimized />
                    {gallery[1].caption && (
                      <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent flex items-end p-4">
                        <p className="text-white text-sm font-medium">{gallery[1].caption}</p>
                      </div>
                    )}
                  </div>
                </div>
                {/* Remaining images — equal grid */}
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  {gallery.slice(2).map((img, i) => <GalleryCard key={i} img={img} className="aspect-[4/3]" />)}
                </div>
              </div>
            )}

          </div>
        </section>
      )}

      {/* ── Features ──────────────────────────────────────────────────────────── */}
      <section className={`py-20 px-6 ${gallery.length > 0 ? 'bg-gray-50' : 'bg-white'}`}>
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-14">
            <div className="inline-block bg-green-100 text-green-700 text-xs font-bold px-3 py-1 rounded-full mb-4 uppercase tracking-wide">
              Fitur
            </div>
            <h2 className="text-3xl md:text-4xl font-bold text-gray-800">Fitur Unggulan</h2>
            <p className="text-gray-500 mt-3 max-w-xl mx-auto">Semua yang dibutuhkan petani modern untuk mengelola kebun hidroponik secara digital</p>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((f, i) => {
              const Icon = ICON_MAP[f.icon] || Leaf
              return (
                <div key={i} className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 hover:shadow-md hover:-translate-y-1 transition-all duration-200">
                  <div className="w-12 h-12 bg-gradient-to-br from-green-400 to-emerald-600 rounded-xl flex items-center justify-center mb-4 shadow-md">
                    <Icon className="text-white" size={22} />
                  </div>
                  <h3 className="font-bold text-gray-800 mb-2 text-lg">{f.title}</h3>
                  <p className="text-gray-500 text-sm leading-relaxed">{f.desc}</p>
                </div>
              )
            })}
          </div>
        </div>
      </section>

      {/* ── Target Users ──────────────────────────────────────────────────────── */}
      <section className="py-20 px-6 bg-white">
        <div className="max-w-5xl mx-auto text-center">
          <div className="inline-block bg-green-100 text-green-700 text-xs font-bold px-3 py-1 rounded-full mb-4 uppercase tracking-wide">
            Pengguna
          </div>
          <h2 className="text-3xl md:text-4xl font-bold text-gray-800 mb-4">Untuk Siapa?</h2>
          <p className="text-gray-500 mb-12 text-lg">Dirancang khusus untuk komunitas pertanian desa</p>
          <div className="grid sm:grid-cols-2 md:grid-cols-4 gap-6">
            {[
              { emoji: '👨‍🌾', label: 'Petani Desa',        desc: 'Catat & pantau kondisi kebun harian' },
              { emoji: '👩‍💼', label: 'Manajer Kebun',      desc: 'Kelola multi-kebun & laporan' },
              { emoji: '🧑‍🔬', label: 'Penyuluh Pertanian', desc: 'Analisis data & beri rekomendasi' },
              { emoji: '🏛️', label: 'Aparat Desa',         desc: 'Pantau program & statistik desa' },
            ].map((u, i) => (
              <div key={i} className="bg-gradient-to-b from-green-50 to-emerald-50 rounded-2xl p-6 text-center border border-green-100 hover:shadow-md transition-shadow">
                <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center mx-auto mb-4 text-3xl shadow-sm">
                  {u.emoji}
                </div>
                <p className="font-bold text-gray-800 mb-1">{u.label}</p>
                <p className="text-xs text-gray-500">{u.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>


      {/* ── Credits ───────────────────────────────────────────────────────────── */}
      {credits.enabled && (
        <section className="py-14 px-6 bg-gray-50 border-t border-gray-200">
          <div className="max-w-5xl mx-auto">
            <div className="text-center mb-10">
              <div className="inline-block bg-green-100 text-green-700 text-xs font-bold px-3 py-1 rounded-full mb-3 uppercase tracking-wide">
                Tentang Tim
              </div>
              <h2 className="text-2xl font-bold text-gray-800">Dibuat Oleh</h2>
            </div>

            {/* Logos row */}
            <div className="flex flex-wrap items-center justify-center gap-8 mb-10">
              {/* University logo */}
              {credits.universityLogo && (
                <div className="flex flex-col items-center gap-2">
                  <div className="w-24 h-24 rounded-2xl overflow-hidden bg-white shadow-md border border-gray-100 flex items-center justify-center p-2">
                    <Image src={credits.universityLogo} alt={credits.universityName} width={80} height={80} className="object-contain" unoptimized />
                  </div>
                  {credits.universityShort && <p className="text-xs text-gray-500 font-medium text-center max-w-[100px]">{credits.universityShort}</p>}
                </div>
              )}

              {/* Divider */}
              {credits.universityLogo && credits.teamLogo && (
                <div className="w-px h-16 bg-gray-200 hidden sm:block" />
              )}

              {/* Team / KKN logo */}
              {credits.teamLogo && (
                <div className="flex flex-col items-center gap-2">
                  <div className="w-24 h-24 rounded-2xl overflow-hidden bg-white shadow-md border border-gray-100 flex items-center justify-center p-2">
                    <Image src={credits.teamLogo} alt={credits.teamName} width={80} height={80} className="object-contain" unoptimized />
                  </div>
                  {credits.teamName && <p className="text-xs text-gray-500 font-medium text-center max-w-[100px]">{credits.teamName}</p>}
                </div>
              )}

              {/* Extra logos */}
              {credits.extraLogos?.map((logo) => (
                <div key={logo.id} className="flex flex-col items-center gap-2">
                  <div className="w-24 h-24 rounded-2xl overflow-hidden bg-white shadow-md border border-gray-100 flex items-center justify-center p-2">
                    <Image src={logo.url} alt={logo.label} width={80} height={80} className="object-contain" unoptimized />
                  </div>
                  {logo.label && <p className="text-xs text-gray-500 font-medium text-center max-w-[100px]">{logo.label}</p>}
                </div>
              ))}
            </div>

            {/* Info grid */}
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 max-w-3xl mx-auto">
              {credits.universityName && (
                <div className="bg-white rounded-xl p-4 text-center shadow-sm border border-gray-100">
                  <p className="text-xs text-gray-400 uppercase tracking-wide font-semibold mb-1">Universitas</p>
                  <p className="text-sm font-semibold text-gray-800 leading-snug">{credits.universityName}</p>
                </div>
              )}
              {credits.teamName && (
                <div className="bg-white rounded-xl p-4 text-center shadow-sm border border-gray-100">
                  <p className="text-xs text-gray-400 uppercase tracking-wide font-semibold mb-1">Program</p>
                  <p className="text-sm font-semibold text-gray-800 leading-snug">{credits.teamName}</p>
                </div>
              )}
              {credits.village && (
                <div className="bg-white rounded-xl p-4 text-center shadow-sm border border-gray-100">
                  <p className="text-xs text-gray-400 uppercase tracking-wide font-semibold mb-1">Lokasi</p>
                  <p className="text-sm font-semibold text-gray-800 leading-snug">{credits.village}</p>
                </div>
              )}
              {credits.year && (
                <div className="bg-white rounded-xl p-4 text-center shadow-sm border border-gray-100">
                  <p className="text-xs text-gray-400 uppercase tracking-wide font-semibold mb-1">Tahun</p>
                  <p className="text-sm font-semibold text-gray-800">{credits.year}</p>
                </div>
              )}
            </div>

            {/* Supervisor / Created by */}
            {(credits.supervisor || credits.createdBy) && (
              <div className="mt-6 flex flex-wrap gap-4 justify-center">
                {credits.supervisor && (
                  <div className="bg-white rounded-xl px-5 py-3 shadow-sm border border-gray-100 text-center">
                    <p className="text-xs text-gray-400 uppercase tracking-wide font-semibold mb-0.5">Dosen Pembimbing</p>
                    <p className="text-sm font-semibold text-gray-800">{credits.supervisor}</p>
                  </div>
                )}
                {credits.createdBy && (
                  <div className="bg-white rounded-xl px-5 py-3 shadow-sm border border-gray-100 text-center">
                    <p className="text-xs text-gray-400 uppercase tracking-wide font-semibold mb-0.5">Dikembangkan oleh</p>
                    <p className="text-sm font-semibold text-gray-800">{credits.createdBy}</p>
                  </div>
                )}
              </div>
            )}
          </div>
        </section>
      )}

      {/* ── Footer ────────────────────────────────────────────────────────────── */}
      <footer className="py-8 px-6 bg-gray-900 text-gray-400 text-center text-sm">
        <div className="flex items-center justify-center gap-2 mb-2">
          <div className="w-6 h-6 bg-green-700 rounded flex items-center justify-center">
            <Leaf className="text-white" size={12} />
          </div>
          <span className="text-white font-semibold">Hydro Monitor</span>
        </div>
        <p>© 2026 Hydroponic pH &amp; TDS Monitoring System. Untuk kemajuan pertanian desa Indonesia.</p>
      </footer>
    </div>
  )
}
