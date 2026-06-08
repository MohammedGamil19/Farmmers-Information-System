# Hydroponic pH & TDS Monitoring System

Sistem pemantauan pH & TDS hidroponik berbasis web untuk komunitas pertanian desa.

## Fitur Utama

- **Dashboard** - Ringkasan statistik, grafik tren, notifikasi
- **Manajemen Kebun** - CRUD kebun, timeline siklus panen
- **Monitoring Harian** - Input pH & TDS dengan validasi real-time
- **Rekomendasi Cerdas** - Saran perbaikan otomatis berbasis nilai pH/TDS
- **Analitik** - Grafik tren, distribusi status, filter periode
- **Laporan** - Export PDF & Excel
- **Notifikasi** - Alert nilai abnormal & panen
- **Manajemen Pengguna** - CRUD pengguna dengan RBAC
- **Manajemen Desa** - CRUD data desa
- **Dark/Light Mode** - Melalui next-themes

## Peran Pengguna

| Peran | Akses |
|-------|-------|
| Super Admin | Semua fitur, konfigurasi sistem |
| Village Admin | Manajemen desa & petani, laporan |
| Farmer/Petani | Input monitoring, lihat kebun sendiri |

## Akun Demo

| Email | Password | Peran |
|-------|----------|-------|
| superadmin@hydro.id | password123 | Super Admin |
| admin@desa1.id | password123 | Admin Desa |
| petani1@desa1.id | password123 | Petani |
| petani2@desa1.id | password123 | Petani |

## Stack Teknologi

- **Frontend:** Next.js 15 + TypeScript + TailwindCSS
- **Backend:** Next.js API Routes (Route Handlers)
- **Database:** PostgreSQL
- **ORM:** Prisma 7
- **Auth:** JWT + bcryptjs + RBAC
- **Charts:** Recharts
- **Export:** jsPDF + xlsx

## Persyaratan Sistem

- Node.js >= 20.9
- PostgreSQL >= 14
- npm >= 9

## Instalasi & Menjalankan

### 1. Clone / salin project

```bash
cd hydroponic-monitor
npm install
```

### 2. Konfigurasi Environment

Salin `.env.example` atau edit `.env`:

```env
DATABASE_URL="postgresql://username:password@localhost:5432/hydroponic_monitor?schema=public"
JWT_SECRET="ganti-dengan-secret-panjang-yang-aman"
NEXT_PUBLIC_APP_NAME="Hydroponic pH & TDS Monitor"
NEXT_PUBLIC_APP_URL="http://localhost:3000"
```

### 3. Setup Database

```bash
# Push schema ke database
npm run db:push

# Isi data sample (opsional)
npm run db:seed
```

### 4. Jalankan Development Server

```bash
npm run dev
```

Buka http://localhost:3000

### 5. Build Production

```bash
npm run build
npm run start
```

## Deployment

### Vercel (Direkomendasikan)

1. Push ke GitHub
2. Hubungkan repo ke Vercel
3. Tambahkan environment variables di Vercel Dashboard
4. Deploy otomatis

### Railway / Render

1. Buat PostgreSQL database
2. Set `DATABASE_URL` dari database yang dibuat
3. Deploy Next.js app

### Self-hosted (VPS)

```bash
npm run build
pm2 start npm --name "hydro-monitor" -- start
```

Gunakan Nginx sebagai reverse proxy ke port 3000.

## Struktur Folder

```
hydroponic-monitor/
├── prisma/
│   ├── schema.prisma        # Database schema
│   └── seed.ts              # Data sample
├── src/
│   ├── app/
│   │   ├── api/             # API Routes
│   │   │   ├── auth/        # Login, logout, me
│   │   │   ├── farms/       # CRUD kebun
│   │   │   ├── monitoring/  # CRUD monitoring records
│   │   │   ├── villages/    # CRUD desa
│   │   │   ├── users/       # CRUD pengguna
│   │   │   ├── analytics/   # Data analitik
│   │   │   ├── notifications/ # Notifikasi
│   │   │   └── plant-types/ # Jenis tanaman
│   │   ├── (auth)/          # Halaman login
│   │   ├── (dashboard)/     # Halaman dashboard utama
│   │   └── (admin)/         # Halaman admin
│   ├── components/
│   │   ├── ui/              # Komponen UI reusable
│   │   └── layout/          # Sidebar, navbar
│   └── lib/
│       ├── auth.ts          # JWT utilities
│       ├── auth-context.tsx # React auth context
│       ├── api.ts           # API client
│       ├── prisma.ts        # Prisma client
│       ├── recommendations.ts # Engine rekomendasi
│       └── utils.ts         # Helper functions
```

## API Endpoints

| Method | Endpoint | Deskripsi |
|--------|----------|-----------|
| POST | /api/auth/login | Login |
| POST | /api/auth/logout | Logout |
| GET | /api/auth/me | Info user login |
| GET/POST | /api/farms | Daftar/buat kebun |
| GET/PUT/DELETE | /api/farms/[id] | Detail/edit/hapus kebun |
| GET/POST | /api/monitoring | Daftar/buat monitoring |
| PUT/DELETE | /api/monitoring/[id] | Edit/hapus monitoring |
| GET/POST | /api/villages | Daftar/buat desa |
| PUT/DELETE | /api/villages/[id] | Edit/hapus desa |
| GET/POST | /api/users | Daftar/buat pengguna |
| PUT/DELETE | /api/users/[id] | Edit/hapus pengguna |
| GET | /api/analytics | Data analitik |
| GET/POST | /api/plant-types | Jenis tanaman |
| GET/PATCH | /api/notifications | Notifikasi |

## Keamanan

- Password di-hash menggunakan bcryptjs (12 rounds)
- JWT token dengan expiry 7 hari
- Role-Based Access Control di setiap endpoint
- HTTP-only cookie untuk token
- Input validation di semua form
- Proteksi SQL injection via Prisma ORM

## Range pH & TDS per Tanaman

| Tanaman | pH Min | pH Max | TDS Min | TDS Max |
|---------|--------|--------|---------|---------|
| Selada | 6.0 | 7.0 | 560 | 840 ppm |
| Kangkung | 5.5 | 6.5 | 1120 | 1680 ppm |
| Bayam | 6.0 | 7.0 | 1260 | 1610 ppm |
| Tomat | 5.5 | 6.5 | 1400 | 3500 ppm |
| Cabai | 5.5 | 7.0 | 1260 | 3500 ppm |
| Sawi | 6.0 | 7.0 | 1050 | 1400 ppm |

---

Dibuat untuk digitalisasi pertanian hidroponik desa Indonesia. 🌿