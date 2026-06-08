'use client'
import { useEffect, useState, useCallback } from 'react'

// Upload directly from browser to Cloudinary — bypasses Vercel 4.5MB body limit
async function uploadToCloudinary(file: File): Promise<string> {
  const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME
  const uploadPreset = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET
  if (!cloudName || !uploadPreset) throw new Error('Cloudinary belum dikonfigurasi')
  const fd = new FormData()
  fd.append('file', file)
  fd.append('upload_preset', uploadPreset)
  fd.append('folder', 'hydroponic-monitor')
  const res = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, { method: 'POST', body: fd })
  if (!res.ok) { const e = await res.json().catch(() => ({})); throw new Error(e.error?.message || 'Upload gagal') }
  return (await res.json()).secure_url as string
}
import { api } from '@/lib/api'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { toast } from '@/components/ui/toaster'
import { ImageUploader } from '@/components/ui/image-uploader'
import {
  Globe, Image as ImageIcon, Info, Sparkles, BarChart3, Trash2,
  Plus, ExternalLink, Save, Eye, GripVertical, ToggleLeft, ToggleRight, Loader2,
  Images, Award, Lock, KeyRound, EyeOff,
} from 'lucide-react'

const CREDITS_PASSWORD = '1289233'

// ─── Types ────────────────────────────────────────────────────────────────────

interface HeroImage { id: string; url: string }
interface Hero { title: string; subtitle: string; buttonText: string; images: HeroImage[] }
interface About { enabled: boolean; title: string; body: string; image: string }
interface GalleryItem { url: string; caption: string }
interface Feature { icon: string; title: string; desc: string }
interface ExtraLogo { id: string; url: string; label: string }
interface Credits {
  enabled: boolean
  universityLogo: string
  universityName: string
  universityShort: string
  teamLogo: string
  teamName: string
  village: string
  supervisor: string
  createdBy: string
  year: string
  extraLogos: ExtraLogo[]
}

type Tab = 'hero' | 'about' | 'gallery' | 'features' | 'stats' | 'credits'

const TABS: { id: Tab; label: string; icon: React.ElementType }[] = [
  { id: 'hero', label: 'Hero', icon: Globe },
  { id: 'about', label: 'Tentang', icon: Info },
  { id: 'gallery', label: 'Galeri', icon: ImageIcon },
  { id: 'features', label: 'Fitur', icon: Sparkles },
  { id: 'stats', label: 'Statistik', icon: BarChart3 },
  { id: 'credits', label: 'Kredit', icon: Award },
]

const ICON_OPTIONS = ['FlaskConical', 'BarChart3', 'Bell', 'CheckCircle', 'Shield', 'Leaf', 'Users', 'MapPin', 'Activity', 'Star', 'Zap']

function SectionHeader({ title, desc }: { title: string; desc: string }) {
  return (
    <div className="mb-6 pb-4 border-b border-gray-100">
      <h3 className="text-lg font-bold text-gray-800">{title}</h3>
      <p className="text-sm text-gray-500 mt-0.5">{desc}</p>
    </div>
  )
}

function FieldLabel({ children }: { children: React.ReactNode }) {
  return <label className="block text-sm font-medium text-gray-700 mb-1.5">{children}</label>
}

// ─── Inline image-upload row (for gallery & hero slides) ─────────────────────

function ImageUploadRow({ onAdd, addLabel = 'Tambahkan' }: { onAdd: (url: string) => void; addLabel?: string }) {
  const [imgUrl, setImgUrl] = useState('')
  const [uploading, setUploading] = useState(false)

  const uploadFile = async (file: File) => {
    if (file.size > 10 * 1024 * 1024) { toast('error', 'Maks 10 MB'); return }
    setUploading(true)
    try {
      const url = await uploadToCloudinary(file)
      setImgUrl(url)
      toast('success', 'Gambar diunggah')
    } catch (err: unknown) {
      toast('error', err instanceof Error ? err.message : 'Gagal upload')
    } finally { setUploading(false) }
  }

  const handleAdd = () => {
    if (!imgUrl.trim()) { toast('warning', 'Pilih atau masukkan URL gambar'); return }
    onAdd(imgUrl.trim())
    setImgUrl('')
  }

  return (
    <div className="border-2 border-dashed border-green-200 rounded-xl p-5 bg-green-50/40 space-y-4">
      <div className="grid md:grid-cols-2 gap-4">
        {/* Device upload */}
        <div>
          <FieldLabel>Unggah dari Perangkat</FieldLabel>
          <label className={`flex flex-col items-center justify-center gap-2 h-28 border-2 border-dashed rounded-xl cursor-pointer transition-all
            ${uploading ? 'border-green-400 bg-green-50 opacity-70 pointer-events-none' : 'border-gray-300 bg-white hover:border-green-400 hover:bg-green-50'}`}>
            {uploading
              ? <Loader2 size={22} className="text-green-600 animate-spin" />
              : <ImageIcon size={22} className="text-gray-400" />}
            <span className="text-xs text-gray-500 text-center px-2">
              {uploading ? 'Mengunggah...' : 'Klik atau seret foto\nJPG PNG WEBP · Maks 5 MB'}
            </span>
            <input type="file" accept="image/*" className="hidden"
              onChange={e => { const f = e.target.files?.[0]; if (f) uploadFile(f); e.target.value = '' }} />
          </label>
        </div>
        {/* URL paste */}
        <div>
          <FieldLabel>Atau Paste URL Gambar</FieldLabel>
          <input type="url" value={imgUrl} onChange={e => setImgUrl(e.target.value)}
            placeholder="https://..."
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-400" />
          {imgUrl && (
            <div className="mt-2 h-16 rounded-lg overflow-hidden border border-gray-200">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={imgUrl} alt="preview" className="w-full h-full object-cover" />
            </div>
          )}
        </div>
      </div>
      <Button onClick={handleAdd} disabled={!imgUrl || uploading} className="w-full sm:w-auto">
        <Plus size={15} /> {addLabel}
      </Button>
    </div>
  )
}

// ─── Gallery image-with-caption upload row ───────────────────────────────────

function GalleryUploadRow({ onAdd }: { onAdd: (item: GalleryItem) => void }) {
  const [imgUrl, setImgUrl] = useState('')
  const [caption, setCaption] = useState('')
  const [uploading, setUploading] = useState(false)

  const uploadFile = async (file: File) => {
    if (file.size > 10 * 1024 * 1024) { toast('error', 'Maks 10 MB'); return }
    setUploading(true)
    try {
      const url = await uploadToCloudinary(file)
      setImgUrl(url)
      toast('success', 'Gambar diunggah')
    } catch (err: unknown) {
      toast('error', err instanceof Error ? err.message : 'Gagal upload')
    } finally { setUploading(false) }
  }

  const handleAdd = () => {
    if (!imgUrl.trim()) { toast('warning', 'Pilih atau masukkan URL gambar'); return }
    onAdd({ url: imgUrl.trim(), caption: caption.trim() })
    setImgUrl(''); setCaption('')
  }

  return (
    <div className="border-2 border-dashed border-green-200 rounded-xl p-5 bg-green-50/40 space-y-4">
      <div className="grid md:grid-cols-2 gap-4">
        <div>
          <FieldLabel>Unggah dari Perangkat</FieldLabel>
          <label className={`flex flex-col items-center justify-center gap-2 h-28 border-2 border-dashed rounded-xl cursor-pointer transition-all
            ${uploading ? 'border-green-400 bg-green-50 opacity-70 pointer-events-none' : 'border-gray-300 bg-white hover:border-green-400 hover:bg-green-50'}`}>
            {uploading ? <Loader2 size={22} className="text-green-600 animate-spin" /> : <ImageIcon size={22} className="text-gray-400" />}
            <span className="text-xs text-gray-500 text-center px-2">{uploading ? 'Mengunggah...' : 'Klik atau seret foto\nJPG PNG WEBP · Maks 5 MB'}</span>
            <input type="file" accept="image/*" className="hidden"
              onChange={e => { const f = e.target.files?.[0]; if (f) uploadFile(f); e.target.value = '' }} />
          </label>
        </div>
        <div>
          <FieldLabel>Atau Paste URL Gambar</FieldLabel>
          <input type="url" value={imgUrl} onChange={e => setImgUrl(e.target.value)} placeholder="https://..."
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-400" />
          {imgUrl && (
            <div className="mt-2 h-16 rounded-lg overflow-hidden border border-gray-200">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={imgUrl} alt="preview" className="w-full h-full object-cover" />
            </div>
          )}
        </div>
      </div>
      <div className="flex gap-3 items-end">
        <div className="flex-1">
          <FieldLabel>Keterangan (opsional)</FieldLabel>
          <Input value={caption} onChange={e => setCaption(e.target.value)} placeholder="Contoh: Kebun selada, Maret 2026" />
        </div>
        <Button onClick={handleAdd} disabled={!imgUrl || uploading}>
          <Plus size={15} /> Tambahkan ke Galeri
        </Button>
      </div>
    </div>
  )
}

// ─── Page ──────────────────────────────────────────────────────────────────────

export default function CmsPage() {
  const [activeTab, setActiveTab] = useState<Tab>('hero')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState<string | null>(null)

  const [hero, setHero] = useState<Hero>({ title: '', subtitle: '', buttonText: '', images: [] })
  const [about, setAbout] = useState<About>({ enabled: true, title: '', body: '', image: '' })
  const [gallery, setGallery] = useState<GalleryItem[]>([])
  const [features, setFeatures] = useState<Feature[]>([])
  const [showStats, setShowStats] = useState(true)
  const [credits, setCredits] = useState<Credits>({
    enabled: true, universityLogo: '', universityName: '', universityShort: '',
    teamLogo: '', teamName: '', village: '', supervisor: '', createdBy: '', year: '', extraLogos: [],
  })
  const [creditsUnlocked, setCreditsUnlocked] = useState(false)
  const [pwInput, setPwInput] = useState('')
  const [pwVisible, setPwVisible] = useState(false)
  const [pwError, setPwError] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const { cms } = await api.get('/api/cms')
      setHero({ ...cms.cms_hero, images: cms.cms_hero.images ?? [] })
      setAbout(cms.cms_about)
      setGallery(cms.cms_gallery || [])
      setFeatures(cms.cms_features || [])
      setShowStats(cms.cms_show_stats ?? true)
      if (cms.cms_credits) setCredits(cms.cms_credits)
    } catch { toast('error', 'Gagal memuat konten') }
    finally { setLoading(false) }
  }, [])

  useEffect(() => { load() }, [load])

  const save = async (key: string, value: unknown) => {
    setSaving(key)
    try {
      await api.put('/api/cms', { key, value })
      toast('success', 'Perubahan tersimpan!')
    } catch { toast('error', 'Gagal menyimpan') }
    finally { setSaving(null) }
  }

  // ── Hero image helpers
  const addHeroImage = (url: string) => {
    const updated: Hero = { ...hero, images: [...hero.images, { id: crypto.randomUUID(), url }] }
    setHero(updated)
    save('cms_hero', updated)
  }

  const removeHeroImage = (id: string) => {
    const updated: Hero = { ...hero, images: hero.images.filter(img => img.id !== id) }
    setHero(updated)
    save('cms_hero', updated)
  }

  const moveHeroImage = (idx: number, dir: -1 | 1) => {
    const target = idx + dir
    if (target < 0 || target >= hero.images.length) return
    const imgs = [...hero.images];
    [imgs[idx], imgs[target]] = [imgs[target], imgs[idx]]
    const updated: Hero = { ...hero, images: imgs }
    setHero(updated)
    save('cms_hero', updated)
  }

  // ── Gallery helpers
  const addGalleryItem = (item: GalleryItem) => {
    const updated = [...gallery, item]
    setGallery(updated)
    save('cms_gallery', updated)
  }

  const removeGalleryItem = (idx: number) => {
    const updated = gallery.filter((_, i) => i !== idx)
    setGallery(updated)
    save('cms_gallery', updated)
  }

  const moveGalleryItem = (idx: number, dir: -1 | 1) => {
    const target = idx + dir
    if (target < 0 || target >= gallery.length) return
    const updated = [...gallery];
    [updated[idx], updated[target]] = [updated[target], updated[idx]]
    setGallery(updated)
    save('cms_gallery', updated)
  }

  // ── Feature helpers
  const updateFeature = (idx: number, field: keyof Feature, val: string) => {
    setFeatures(prev => prev.map((f, i) => i === idx ? { ...f, [field]: val } : f))
  }

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="h-10 w-10 animate-spin rounded-full border-4 border-green-600 border-t-transparent" />
    </div>
  )

  return (
    <div>
      {/* Sticky header + tabs */}
      <div className="sticky top-0 z-30 bg-gray-50 pb-4 -mx-4 lg:-mx-6 px-4 lg:px-6 -mt-4 lg:-mt-6 pt-4 lg:pt-6 border-b border-gray-200 mb-6">
        {/* Header */}
        <div className="flex items-center justify-between flex-wrap gap-3 mb-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-800">Manajemen Halaman Utama</h1>
            <p className="text-gray-500 text-sm">Edit konten, gambar, dan seksi yang tampil di halaman publik</p>
          </div>
          <a href="/" target="_blank" rel="noopener noreferrer"
            className="inline-flex items-center gap-2 text-sm text-green-600 border border-green-300 px-4 py-2 rounded-lg hover:bg-green-50 transition-colors">
            <Eye size={14} /> Lihat Halaman Publik <ExternalLink size={12} />
          </a>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 bg-gray-100 p-1 rounded-xl w-fit flex-wrap">
        {TABS.map(t => (
          <button
            key={t.id}
            onClick={() => {
              setActiveTab(t.id)
              if (t.id !== 'credits') { setCreditsUnlocked(false); setPwInput(''); setPwError(false) }
            }}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${activeTab === t.id ? 'bg-white text-green-700 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
          >
            <t.icon size={15} /> {t.label}
            {t.id === 'credits' && !creditsUnlocked && <Lock size={11} className="text-amber-500" />}
          </button>
        ))}
        </div>{/* end tabs */}
      </div>{/* end sticky header */}

      {/* ── HERO ── */}
      {activeTab === 'hero' && (
        <div className="space-y-6">
          {/* Text content */}
          <Card>
            <CardHeader><CardTitle className="flex items-center gap-2"><Globe size={18} />Teks Hero</CardTitle></CardHeader>
            <CardContent>
              <SectionHeader title="Konten Teks" desc="Judul, sub-judul, dan teks tombol yang tampil di atas slider." />
              <div className="space-y-5 max-w-2xl">
                <div>
                  <FieldLabel>Judul Utama</FieldLabel>
                  <Input value={hero.title} onChange={e => setHero(h => ({ ...h, title: e.target.value }))} placeholder="Judul halaman utama" />
                </div>
                <div>
                  <FieldLabel>Deskripsi / Sub-judul</FieldLabel>
                  <textarea value={hero.subtitle} onChange={e => setHero(h => ({ ...h, subtitle: e.target.value }))} rows={3}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-400 resize-none"
                    placeholder="Deskripsi singkat program..." />
                </div>
                <div>
                  <FieldLabel>Teks Tombol CTA</FieldLabel>
                  <Input value={hero.buttonText} onChange={e => setHero(h => ({ ...h, buttonText: e.target.value }))} placeholder="Mulai Sekarang" />
                </div>
                <Button onClick={() => save('cms_hero', hero)} loading={saving === 'cms_hero'}>
                  <Save size={15} /> Simpan Teks Hero
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Slider images */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Images size={18} />Foto Slider Hero
                <span className="ml-auto text-sm font-normal text-gray-400">{hero.images.length} foto</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <SectionHeader
                title="Foto Latar Slider"
                desc="Tambahkan satu atau beberapa foto. Jika lebih dari satu, akan otomatis berganti setiap 5 detik dengan efek geser. Foto pertama tampil pertama kali."
              />

              {/* Add new image */}
              <div className="mb-6">
                <p className="text-sm font-semibold text-gray-700 mb-3">Tambah Foto Baru</p>
                <ImageUploadRow onAdd={addHeroImage} addLabel="Tambahkan ke Slider" />
              </div>

              {/* Image list */}
              {hero.images.length === 0 ? (
                <div className="text-center py-10 text-gray-400 border border-dashed border-gray-200 rounded-xl">
                  <ImageIcon size={36} className="mx-auto mb-3 opacity-30" />
                  <p className="font-medium">Belum ada foto slider</p>
                  <p className="text-xs mt-1">Tanpa foto, hero akan tampil dengan gradien hijau</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {hero.images.map((img, i) => (
                    <div key={img.id} className="flex items-center gap-3 p-3 border border-gray-100 rounded-xl hover:bg-gray-50 group">
                      <div className="text-gray-300 flex-shrink-0"><GripVertical size={18} /></div>
                      {/* Thumbnail */}
                      <div className="w-24 h-14 rounded-lg overflow-hidden flex-shrink-0 bg-gray-100 border border-gray-200">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={img.url} alt={`Slide ${i + 1}`} className="w-full h-full object-cover" />
                      </div>
                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-700">Slide {i + 1}</p>
                        <p className="text-xs text-gray-400 truncate">{img.url}</p>
                        {i === 0 && (
                          <span className="inline-block text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full mt-1 font-medium">
                            ★ Slide pertama
                          </span>
                        )}
                      </div>
                      {/* Actions */}
                      <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={() => moveHeroImage(i, -1)} disabled={i === 0} title="Pindah ke atas"
                          className="p-1.5 text-gray-400 hover:text-gray-700 disabled:opacity-20 rounded-lg hover:bg-gray-100">↑</button>
                        <button onClick={() => moveHeroImage(i, 1)} disabled={i === hero.images.length - 1} title="Pindah ke bawah"
                          className="p-1.5 text-gray-400 hover:text-gray-700 disabled:opacity-20 rounded-lg hover:bg-gray-100">↓</button>
                        <button onClick={() => { if (confirm('Hapus foto ini dari slider?')) removeHeroImage(img.id) }} title="Hapus"
                          className="p-1.5 text-red-400 hover:text-red-600 rounded-lg hover:bg-red-50">
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                  ))}
                  <p className="text-xs text-gray-400 text-center pt-1">
                    Arahkan kursor ke slide untuk melihat tombol aksi. Gunakan ↑↓ untuk mengubah urutan.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* ── ABOUT ── */}
      {activeTab === 'about' && (
        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2"><Info size={18} />Seksi Tentang</CardTitle></CardHeader>
          <CardContent>
            <SectionHeader title="Tentang Program / Desa" desc="Ceritakan tentang program hidroponik dan desa Anda. Bisa dinonaktifkan jika tidak diperlukan." />
            <div className="space-y-5 max-w-2xl">
              <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
                <div>
                  <p className="font-medium text-gray-800 text-sm">Tampilkan Seksi Ini</p>
                  <p className="text-xs text-gray-500 mt-0.5">Nonaktifkan untuk menyembunyikan dari halaman publik</p>
                </div>
                <button onClick={() => setAbout(a => ({ ...a, enabled: !a.enabled }))}>
                  {about.enabled ? <ToggleRight size={32} className="text-green-600" /> : <ToggleLeft size={32} className="text-gray-400" />}
                </button>
              </div>
              <div>
                <FieldLabel>Judul Seksi</FieldLabel>
                <Input value={about.title} onChange={e => setAbout(a => ({ ...a, title: e.target.value }))}
                  placeholder="Tentang Program Hidroponik Desa" disabled={!about.enabled} />
              </div>
              <div>
                <FieldLabel>Isi Teks</FieldLabel>
                <textarea value={about.body} onChange={e => setAbout(a => ({ ...a, body: e.target.value }))} rows={6}
                  disabled={!about.enabled}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-400 resize-none disabled:opacity-50"
                  placeholder="Ceritakan tentang program dan desa Anda..." />
                <p className="text-xs text-gray-400 mt-1">Gunakan baris baru untuk paragraf baru.</p>
              </div>
              <div className={!about.enabled ? 'opacity-50 pointer-events-none' : ''}>
                <ImageUploader label="Foto Pendamping (opsional)" value={about.image}
                  onChange={url => setAbout(a => ({ ...a, image: url }))}
                  hint="Foto kebun, kegiatan petani, atau suasana desa." aspectClass="aspect-[4/3]" />
              </div>
              <Button onClick={() => save('cms_about', about)} loading={saving === 'cms_about'}>
                <Save size={15} /> Simpan Tentang
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ── GALLERY ── */}
      {activeTab === 'gallery' && (
        <div className="space-y-6">
          <Card>
            <CardHeader><CardTitle className="flex items-center gap-2"><Plus size={18} />Tambah Foto ke Galeri</CardTitle></CardHeader>
            <CardContent><GalleryUploadRow onAdd={addGalleryItem} /></CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ImageIcon size={18} />Foto Galeri ({gallery.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              {gallery.length === 0 ? (
                <div className="text-center py-12 text-gray-400">
                  <ImageIcon size={40} className="mx-auto mb-3 opacity-30" />
                  <p>Belum ada foto. Tambahkan foto kebun di atas.</p>
                  <p className="text-xs mt-1">Foto pertama akan tampil lebih besar di halaman publik.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {gallery.map((img, i) => (
                    <div key={i} className="flex items-center gap-3 p-3 border border-gray-100 rounded-xl hover:bg-gray-50 group">
                      <div className="text-gray-300 flex-shrink-0"><GripVertical size={18} /></div>
                      <div className="w-20 h-14 rounded-lg overflow-hidden flex-shrink-0 bg-gray-100 border border-gray-200">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={img.url} alt={img.caption} className="w-full h-full object-cover"
                          onError={e => { (e.target as HTMLImageElement).style.display = 'none' }} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-700 truncate">
                          {img.caption || <span className="text-gray-400 italic">Tanpa keterangan</span>}
                        </p>
                        <p className="text-xs text-gray-400 truncate">{img.url}</p>
                        {i === 0 && <span className="inline-block text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full mt-1 font-medium">★ Foto Utama (tampil lebih besar)</span>}
                      </div>
                      <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={() => moveGalleryItem(i, -1)} disabled={i === 0} title="Pindah ke atas"
                          className="p-1.5 text-gray-400 hover:text-gray-700 disabled:opacity-20 rounded-lg hover:bg-gray-100">↑</button>
                        <button onClick={() => moveGalleryItem(i, 1)} disabled={i === gallery.length - 1} title="Pindah ke bawah"
                          className="p-1.5 text-gray-400 hover:text-gray-700 disabled:opacity-20 rounded-lg hover:bg-gray-100">↓</button>
                        <button onClick={() => { if (confirm('Hapus foto ini dari galeri?')) removeGalleryItem(i) }} title="Hapus"
                          className="p-1.5 text-red-400 hover:text-red-600 rounded-lg hover:bg-red-50">
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                  ))}
                  <p className="text-xs text-gray-400 text-center pt-2">Arahkan kursor ke foto untuk melihat tombol aksi.</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* ── FEATURES ── */}
      {activeTab === 'features' && (
        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2"><Sparkles size={18} />Seksi Fitur</CardTitle></CardHeader>
          <CardContent>
            <SectionHeader title="Kartu Fitur Unggulan" desc="6 kartu yang menjelaskan kemampuan sistem. Edit judul dan deskripsi masing-masing." />
            <div className="space-y-4">
              {features.map((f, i) => (
                <div key={i} className="p-4 border border-gray-200 rounded-xl hover:border-green-200 transition-colors">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="w-7 h-7 bg-green-100 rounded-lg flex items-center justify-center text-green-700 text-xs font-bold">{i + 1}</div>
                    <span className="text-sm font-medium text-gray-600">Fitur #{i + 1}</span>
                  </div>
                  <div className="grid md:grid-cols-[160px_1fr_1fr] gap-3">
                    <div>
                      <FieldLabel>Ikon</FieldLabel>
                      <select value={f.icon} onChange={e => updateFeature(i, 'icon', e.target.value)}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-400">
                        {ICON_OPTIONS.map(ic => <option key={ic} value={ic}>{ic}</option>)}
                      </select>
                    </div>
                    <div>
                      <FieldLabel>Judul</FieldLabel>
                      <Input value={f.title} onChange={e => updateFeature(i, 'title', e.target.value)} placeholder="Judul fitur..." />
                    </div>
                    <div>
                      <FieldLabel>Deskripsi</FieldLabel>
                      <Input value={f.desc} onChange={e => updateFeature(i, 'desc', e.target.value)} placeholder="Deskripsi singkat..." />
                    </div>
                  </div>
                </div>
              ))}
              <Button onClick={() => save('cms_features', features)} loading={saving === 'cms_features'} className="mt-2">
                <Save size={15} /> Simpan Semua Fitur
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ── CREDITS ── */}
      {activeTab === 'credits' && !creditsUnlocked && (
        <div className="flex items-center justify-center min-h-[420px]">
          <div className="w-full max-w-sm">
            <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-8 text-center">
              {/* Icon */}
              <div className="w-16 h-16 bg-amber-100 rounded-2xl flex items-center justify-center mx-auto mb-5">
                <Lock size={28} className="text-amber-600" />
              </div>
              <h3 className="text-xl font-bold text-gray-800 mb-1">Akses Terkunci</h3>
              <p className="text-sm text-gray-500 mb-6">
                Masukkan kata sandi untuk mengedit seksi Kredit &amp; Tim.
              </p>

              {/* Password input */}
              <div className="relative mb-3">
                <KeyRound size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type={pwVisible ? 'text' : 'password'}
                  value={pwInput}
                  onChange={e => { setPwInput(e.target.value); setPwError(false) }}
                  onKeyDown={e => {
                    if (e.key === 'Enter') {
                      if (pwInput === CREDITS_PASSWORD) { setCreditsUnlocked(true); setPwInput('') }
                      else { setPwError(true); setPwInput('') }
                    }
                  }}
                  placeholder="Masukkan kata sandi..."
                  className={`w-full border rounded-xl pl-9 pr-10 py-3 text-sm focus:outline-none focus:ring-2 transition-colors ${
                    pwError ? 'border-red-400 focus:ring-red-300 bg-red-50' : 'border-gray-300 focus:ring-green-400'
                  }`}
                  autoFocus
                />
                <button
                  type="button"
                  onClick={() => setPwVisible(v => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {pwVisible ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>

              {pwError && (
                <p className="text-xs text-red-500 mb-3 text-left">Kata sandi salah. Coba lagi.</p>
              )}

              <button
                onClick={() => {
                  if (pwInput === CREDITS_PASSWORD) { setCreditsUnlocked(true); setPwInput('') }
                  else { setPwError(true); setPwInput('') }
                }}
                className="w-full bg-green-600 hover:bg-green-700 text-white font-semibold py-3 rounded-xl transition-colors text-sm"
              >
                Buka Akses
              </button>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'credits' && creditsUnlocked && (
        <div className="space-y-6">
          {/* Lock again button */}
          <div className="flex justify-end">
            <button
              onClick={() => { setCreditsUnlocked(false); setPwInput('') }}
              className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-700 border border-gray-200 px-3 py-1.5 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <Lock size={12} /> Kunci Kembali
            </button>
          </div>
          {/* Toggle + basic info */}
          <Card>
            <CardHeader><CardTitle className="flex items-center gap-2"><Award size={18} />Informasi Tim &amp; Kredit</CardTitle></CardHeader>
            <CardContent>
              <SectionHeader
                title="Seksi Kredit di Halaman Publik"
                desc="Tampilkan logo universitas, logo tim KKN, dosen pembimbing, dan informasi lainnya sebelum footer."
              />
              {/* Toggle */}
              <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl mb-6">
                <div>
                  <p className="font-medium text-gray-800 text-sm">Tampilkan Seksi Kredit</p>
                  <p className="text-xs text-gray-500 mt-0.5">Nonaktifkan untuk menyembunyikan dari halaman publik</p>
                </div>
                <button onClick={() => setCredits(c => ({ ...c, enabled: !c.enabled }))}>
                  {credits.enabled ? <ToggleRight size={32} className="text-green-600" /> : <ToggleLeft size={32} className="text-gray-400" />}
                </button>
              </div>

              <div className={`space-y-5 ${!credits.enabled ? 'opacity-50 pointer-events-none' : ''}`}>
                <div className="grid md:grid-cols-2 gap-5">
                  <div>
                    <FieldLabel>Nama Universitas (lengkap)</FieldLabel>
                    <Input value={credits.universityName} onChange={e => setCredits(c => ({ ...c, universityName: e.target.value }))}
                      placeholder="Universitas 17 Agustus 1945 Surabaya" />
                  </div>
                  <div>
                    <FieldLabel>Nama Universitas (singkat)</FieldLabel>
                    <Input value={credits.universityShort} onChange={e => setCredits(c => ({ ...c, universityShort: e.target.value }))}
                      placeholder="UNTAG Surabaya" />
                  </div>
                  <div>
                    <FieldLabel>Nama Program / Tim KKN</FieldLabel>
                    <Input value={credits.teamName} onChange={e => setCredits(c => ({ ...c, teamName: e.target.value }))}
                      placeholder="KKN Reguler R4" />
                  </div>
                  <div>
                    <FieldLabel>Lokasi Desa</FieldLabel>
                    <Input value={credits.village} onChange={e => setCredits(c => ({ ...c, village: e.target.value }))}
                      placeholder="Desa Sukorejo, Bungah, Gresik" />
                  </div>
                  <div>
                    <FieldLabel>Dosen Pembimbing</FieldLabel>
                    <Input value={credits.supervisor} onChange={e => setCredits(c => ({ ...c, supervisor: e.target.value }))}
                      placeholder="Nama dosen pembimbing..." />
                  </div>
                  <div>
                    <FieldLabel>Dikembangkan oleh</FieldLabel>
                    <Input value={credits.createdBy} onChange={e => setCredits(c => ({ ...c, createdBy: e.target.value }))}
                      placeholder="Tim KKN Desa Sukorejo" />
                  </div>
                  <div>
                    <FieldLabel>Tahun</FieldLabel>
                    <Input value={credits.year} onChange={e => setCredits(c => ({ ...c, year: e.target.value }))}
                      placeholder="2026" />
                  </div>
                </div>
                <Button onClick={() => save('cms_credits', credits)} loading={saving === 'cms_credits'}>
                  <Save size={15} /> Simpan Informasi
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* University logo */}
          <Card>
            <CardHeader><CardTitle className="flex items-center gap-2"><ImageIcon size={18} />Logo Universitas</CardTitle></CardHeader>
            <CardContent>
              <div className="max-w-xs">
                <ImageUploader
                  label="Logo Universitas"
                  value={credits.universityLogo}
                  onChange={url => { const updated = { ...credits, universityLogo: url }; setCredits(updated); save('cms_credits', updated) }}
                  hint="Format transparan (PNG) lebih baik. Ukuran tampil 96×96 px."
                  aspectClass="aspect-square"
                />
              </div>
            </CardContent>
          </Card>

          {/* Team / KKN logo */}
          <Card>
            <CardHeader><CardTitle className="flex items-center gap-2"><ImageIcon size={18} />Logo Tim / KKN</CardTitle></CardHeader>
            <CardContent>
              <div className="max-w-xs">
                <ImageUploader
                  label="Logo Tim KKN"
                  value={credits.teamLogo}
                  onChange={url => { const updated = { ...credits, teamLogo: url }; setCredits(updated); save('cms_credits', updated) }}
                  hint="Logo tim atau lambang desa. Format transparan (PNG) lebih baik."
                  aspectClass="aspect-square"
                />
              </div>
            </CardContent>
          </Card>

          {/* Extra logos */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Images size={18} />Logo Tambahan
                <span className="ml-auto text-sm font-normal text-gray-400">{credits.extraLogos.length} logo</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-500 mb-4">Tambahkan logo lain seperti sponsor, mitra, atau lambang desa.</p>

              {/* Add extra logo */}
              <div className="border-2 border-dashed border-green-200 rounded-xl p-4 bg-green-50/40 mb-4">
                <ImageUploadRow
                  onAdd={url => {
                    const updated = { ...credits, extraLogos: [...credits.extraLogos, { id: crypto.randomUUID(), url, label: '' }] }
                    setCredits(updated); save('cms_credits', updated)
                  }}
                  addLabel="Tambah Logo"
                />
              </div>

              {/* Extra logos list */}
              {credits.extraLogos.length === 0 ? (
                <p className="text-sm text-gray-400 text-center py-4">Belum ada logo tambahan.</p>
              ) : (
                <div className="space-y-3">
                  {credits.extraLogos.map((logo, i) => (
                    <div key={logo.id} className="flex items-center gap-3 p-3 border border-gray-100 rounded-xl hover:bg-gray-50 group">
                      <div className="w-14 h-14 rounded-xl overflow-hidden bg-white border border-gray-200 flex-shrink-0 flex items-center justify-center">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={logo.url} alt={logo.label} className="w-full h-full object-contain p-1" />
                      </div>
                      <div className="flex-1">
                        <input
                          value={logo.label}
                          onChange={e => {
                            const updated = { ...credits, extraLogos: credits.extraLogos.map((l, idx) => idx === i ? { ...l, label: e.target.value } : l) }
                            setCredits(updated)
                          }}
                          onBlur={() => save('cms_credits', credits)}
                          placeholder="Label / keterangan logo..."
                          className="w-full border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-400"
                        />
                      </div>
                      <button
                        onClick={() => {
                          const updated = { ...credits, extraLogos: credits.extraLogos.filter((_, idx) => idx !== i) }
                          setCredits(updated); save('cms_credits', updated)
                        }}
                        className="p-1.5 text-red-400 hover:text-red-600 rounded-lg hover:bg-red-50 opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* ── STATS ── */}
      {activeTab === 'stats' && (
        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2"><BarChart3 size={18} />Statistik Live</CardTitle></CardHeader>
          <CardContent>
            <SectionHeader title="Tampilkan Statistik Real-time" desc="Angka kebun aktif, petani terdaftar, desa binaan, dan total catatan monitoring diambil langsung dari database." />
            <div className="p-5 border border-gray-200 rounded-xl max-w-md">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-semibold text-gray-800">Tampilkan Blok Statistik</p>
                  <p className="text-sm text-gray-500 mt-1">4 kartu angka di bawah Hero yang menampilkan data live</p>
                </div>
                <button onClick={() => { const next = !showStats; setShowStats(next); save('cms_show_stats', next) }} className="ml-4">
                  {showStats ? <ToggleRight size={36} className="text-green-600" /> : <ToggleLeft size={36} className="text-gray-400" />}
                </button>
              </div>
            </div>
            <div className="mt-5 p-4 bg-green-50 rounded-xl text-sm text-green-700 border border-green-200">
              <strong>Catatan:</strong> Statistik diambil otomatis dari database saat halaman dimuat. Tidak perlu mengisi angka manual — selalu akurat dan real-time.
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
