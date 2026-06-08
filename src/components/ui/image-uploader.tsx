'use client'
import { useRef, useState, DragEvent } from 'react'
import { Upload, Link2, X, Loader2 } from 'lucide-react'
import { toast } from './toaster'

interface Props {
  value: string
  onChange: (url: string) => void
  label?: string
  hint?: string
  aspectClass?: string
}

// Upload directly from browser to Cloudinary (no server size limit)
async function uploadToCloudinary(file: File): Promise<string> {
  const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME
  const uploadPreset = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET
  if (!cloudName || !uploadPreset) throw new Error('Cloudinary belum dikonfigurasi')

  const fd = new FormData()
  fd.append('file', file)
  fd.append('upload_preset', uploadPreset)
  fd.append('folder', 'hydroponic-monitor')

  const res = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, {
    method: 'POST',
    body: fd,
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.error?.message || 'Upload gagal')
  }
  const data = await res.json()
  return data.secure_url as string
}

export function ImageUploader({ value, onChange, label, hint, aspectClass = 'aspect-video' }: Props) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [mode, setMode] = useState<'upload' | 'url'>('upload')
  const [urlInput, setUrlInput] = useState(value.startsWith('http') ? value : '')
  const [uploading, setUploading] = useState(false)
  const [dragging, setDragging] = useState(false)

  const uploadFile = async (file: File) => {
    if (!file.type.startsWith('image/')) { toast('error', 'Hanya file gambar yang diizinkan'); return }
    if (file.size > 10 * 1024 * 1024) { toast('error', 'Ukuran file maksimal 10 MB'); return }
    setUploading(true)
    try {
      const url = await uploadToCloudinary(file)
      onChange(url)
      toast('success', 'Gambar berhasil diunggah')
    } catch (err: unknown) {
      toast('error', err instanceof Error ? err.message : 'Upload gagal')
    } finally { setUploading(false) }
  }

  const handleDrop = (e: DragEvent) => {
    e.preventDefault(); setDragging(false)
    const file = e.dataTransfer.files[0]
    if (file) uploadFile(file)
  }

  const applyUrl = () => {
    if (!urlInput.trim()) { toast('warning', 'URL tidak boleh kosong'); return }
    onChange(urlInput.trim())
    toast('success', 'URL gambar diterapkan')
  }

  const clear = () => { onChange(''); setUrlInput('') }

  return (
    <div>
      {label && <label className="block text-sm font-medium text-gray-700 mb-1.5">{label}</label>}

      {/* Mode switcher */}
      <div className="flex gap-1 mb-3 bg-gray-100 p-1 rounded-lg w-fit text-xs">
        <button
          type="button"
          onClick={() => setMode('upload')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md font-medium transition-all ${mode === 'upload' ? 'bg-white text-green-700 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
        >
          <Upload size={12} /> Unggah dari Perangkat
        </button>
        <button
          type="button"
          onClick={() => setMode('url')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md font-medium transition-all ${mode === 'url' ? 'bg-white text-green-700 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
        >
          <Link2 size={12} /> Paste URL
        </button>
      </div>

      {/* Upload zone */}
      {mode === 'upload' && (
        <div
          onDragOver={e => { e.preventDefault(); setDragging(true) }}
          onDragLeave={() => setDragging(false)}
          onDrop={handleDrop}
          onClick={() => !uploading && inputRef.current?.click()}
          className={`relative border-2 border-dashed rounded-xl cursor-pointer transition-all select-none
            ${dragging ? 'border-green-500 bg-green-50' : 'border-gray-300 bg-gray-50 hover:border-green-400 hover:bg-green-50/50'}
            ${uploading ? 'pointer-events-none opacity-70' : ''}`}
        >
          {value && !value.startsWith('__') ? (
            <div className={`relative ${aspectClass} rounded-xl overflow-hidden`}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={value} alt="preview" className="w-full h-full object-cover" />
              <div className="absolute inset-0 bg-black/40 opacity-0 hover:opacity-100 transition-opacity flex items-center justify-center">
                <span className="text-white text-sm font-medium">Klik untuk ganti</span>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-10 gap-3">
              {uploading ? (
                <Loader2 size={32} className="text-green-600 animate-spin" />
              ) : (
                <div className="w-14 h-14 bg-green-100 rounded-2xl flex items-center justify-center">
                  <Upload size={24} className="text-green-600" />
                </div>
              )}
              <div className="text-center">
                <p className="text-sm font-semibold text-gray-700">
                  {uploading ? 'Mengunggah...' : 'Klik atau seret foto ke sini'}
                </p>
                <p className="text-xs text-gray-400 mt-1">JPG, PNG, WEBP, GIF · Maks. 10 MB</p>
              </div>
            </div>
          )}

          {uploading && (
            <div className="absolute inset-0 bg-white/60 rounded-xl flex items-center justify-center">
              <Loader2 size={32} className="text-green-600 animate-spin" />
            </div>
          )}
        </div>
      )}

      {/* URL input */}
      {mode === 'url' && (
        <div className="space-y-2">
          <div className="flex gap-2">
            <input
              type="url"
              value={urlInput}
              onChange={e => setUrlInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && applyUrl()}
              placeholder="https://..."
              className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-400"
            />
            <button
              type="button"
              onClick={applyUrl}
              className="px-4 py-2 bg-green-600 text-white text-sm font-medium rounded-lg hover:bg-green-700 transition-colors"
            >
              Terapkan
            </button>
          </div>
          {value && (
            <div className={`relative ${aspectClass} rounded-xl overflow-hidden border border-gray-200`}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={value} alt="preview" className="w-full h-full object-cover" />
            </div>
          )}
        </div>
      )}

      {/* Clear button */}
      {value && (
        <button
          type="button"
          onClick={clear}
          className="mt-2 flex items-center gap-1.5 text-xs text-red-500 hover:text-red-700 transition-colors"
        >
          <X size={12} /> Hapus gambar
        </button>
      )}

      {hint && <p className="text-xs text-gray-400 mt-1.5">{hint}</p>}

      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif"
        className="hidden"
        onChange={e => { const f = e.target.files?.[0]; if (f) uploadFile(f); e.target.value = '' }}
      />
    </div>
  )
}
