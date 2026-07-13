import { ImageResponse } from 'next/og'
import { SITE_NAME } from '@/lib/site'

export const alt = 'Sistem Informasi Dokumentasi Data Produksi Hasil Panen Pertanian'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

export default function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'flex-start',
          justifyContent: 'center',
          padding: '80px',
          background: 'linear-gradient(135deg, #15803d 0%, #166534 100%)',
          color: 'white',
          fontFamily: 'sans-serif',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 20, marginBottom: 36 }}>
          <div
            style={{
              width: 84, height: 84, borderRadius: 24,
              background: 'rgba(255,255,255,0.15)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 48,
            }}
          >
            🌾
          </div>
          <div style={{ fontSize: 30, fontWeight: 700, opacity: 0.9 }}>{SITE_NAME}</div>
        </div>
        <div style={{ fontSize: 60, fontWeight: 800, lineHeight: 1.15, maxWidth: 940 }}>
          Dokumentasi Data Produksi Hasil Panen Pertanian
        </div>
        <div style={{ fontSize: 30, opacity: 0.85, marginTop: 28 }}>
          Platform digital GAPOKTAN — panen, kebun, jenis tanaman &amp; lahan
        </div>
      </div>
    ),
    { ...size }
  )
}
