// Canonical site URL. Defaults to the live custom domain; override with
// NEXT_PUBLIC_SITE_URL only if the domain ever changes.
export const SITE_URL = (
  process.env.NEXT_PUBLIC_SITE_URL || 'https://gapoktansukorejo.com'
).replace(/\/$/, '')

export const SITE_NAME = 'SI Dokumentasi Panen'
export const SITE_TITLE = 'Sistem Informasi Dokumentasi Data Produksi Hasil Panen Pertanian'
export const SITE_DESCRIPTION =
  'Platform digital GAPOKTAN untuk mendokumentasikan data produksi hasil panen, kebun, jenis tanaman, keanggotaan, dan lahan pertanian secara terstruktur dan mudah diakses.'
