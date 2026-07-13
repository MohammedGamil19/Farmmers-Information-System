// Canonical site URL. Set NEXT_PUBLIC_SITE_URL in Vercel once you attach a
// custom domain; falls back to the current Vercel production URL.
export const SITE_URL = (
  process.env.NEXT_PUBLIC_SITE_URL || 'https://hydroponic-monitor-seven.vercel.app'
).replace(/\/$/, '')

export const SITE_NAME = 'SI Dokumentasi Panen'
export const SITE_TITLE = 'Sistem Informasi Dokumentasi Data Produksi Hasil Panen Pertanian'
export const SITE_DESCRIPTION =
  'Platform digital GAPOKTAN untuk mendokumentasikan data produksi hasil panen, kebun, jenis tanaman, keanggotaan, dan lahan pertanian secara terstruktur dan mudah diakses.'
