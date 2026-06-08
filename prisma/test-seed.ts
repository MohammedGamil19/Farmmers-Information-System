import { PrismaClient } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import bcrypt from 'bcryptjs'
import 'dotenv/config'

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL })
const prisma = new PrismaClient({ adapter })

async function main() {
  const pass = await bcrypt.hash('password123', 12)

  // ─── PLANT TYPES ───────────────────────────────────────────────
  const [selada, kangkung, bayam, tomat, cabai, sawi] = await Promise.all([
    prisma.plantType.upsert({ where: { name: 'Selada' }, update: {}, create: { name: 'Selada', description: 'Lettuce - cepat panen', minPH: 6.0, maxPH: 7.0, minTDS: 560, maxTDS: 840, growthDays: 30 } }),
    prisma.plantType.upsert({ where: { name: 'Kangkung' }, update: {}, create: { name: 'Kangkung', description: 'Water spinach', minPH: 5.5, maxPH: 6.5, minTDS: 1120, maxTDS: 1680, growthDays: 21 } }),
    prisma.plantType.upsert({ where: { name: 'Bayam' }, update: {}, create: { name: 'Bayam', description: 'Spinach', minPH: 6.0, maxPH: 7.0, minTDS: 1260, maxTDS: 1610, growthDays: 25 } }),
    prisma.plantType.upsert({ where: { name: 'Tomat' }, update: {}, create: { name: 'Tomat', description: 'Tomato', minPH: 5.5, maxPH: 6.5, minTDS: 1400, maxTDS: 3500, growthDays: 70 } }),
    prisma.plantType.upsert({ where: { name: 'Cabai' }, update: {}, create: { name: 'Cabai', description: 'Chili pepper', minPH: 5.5, maxPH: 7.0, minTDS: 1260, maxTDS: 3500, growthDays: 90 } }),
    prisma.plantType.upsert({ where: { name: 'Sawi' }, update: {}, create: { name: 'Sawi', description: 'Mustard greens', minPH: 6.0, maxPH: 7.0, minTDS: 1050, maxTDS: 1400, growthDays: 30 } }),
  ])

  // ─── VILLAGES (6 villages across provinces) ───────────────────
  const [v1, v2, v3, v4, v5, v6] = await Promise.all([
    prisma.village.upsert({ where: { id: 'v1' }, update: { name: 'Desa Sumber Makmur', district: 'Kecamatan Sejahtera', province: 'Jawa Tengah' }, create: { id: 'v1', name: 'Desa Sumber Makmur', district: 'Kecamatan Sejahtera', province: 'Jawa Tengah', description: 'Desa percontohan hidroponik Jawa Tengah' } }),
    prisma.village.upsert({ where: { id: 'v2' }, update: { name: 'Desa Tani Jaya', district: 'Kecamatan Subur', province: 'Jawa Timur' }, create: { id: 'v2', name: 'Desa Tani Jaya', district: 'Kecamatan Subur', province: 'Jawa Timur', description: 'Pusat hidroponik Jawa Timur' } }),
    prisma.village.upsert({ where: { id: 'v3' }, update: { name: 'Desa Hijau Lestari', district: 'Kecamatan Maju', province: 'Jawa Barat' }, create: { id: 'v3', name: 'Desa Hijau Lestari', district: 'Kecamatan Maju', province: 'Jawa Barat', description: 'Desa agrowisata dan hidroponik' } }),
    prisma.village.upsert({ where: { id: 'v4' }, update: { name: 'Desa Mutiara Tani', district: 'Kecamatan Berkembang', province: 'DI Yogyakarta' }, create: { id: 'v4', name: 'Desa Mutiara Tani', district: 'Kecamatan Berkembang', province: 'DI Yogyakarta', description: 'Desa wisata pertanian modern' } }),
    prisma.village.upsert({ where: { id: 'v5' }, update: { name: 'Desa Mekar Sari', district: 'Kecamatan Indah', province: 'Bali' }, create: { id: 'v5', name: 'Desa Mekar Sari', district: 'Kecamatan Indah', province: 'Bali', description: 'Desa organik dan hidroponik Bali' } }),
    prisma.village.upsert({ where: { id: 'v6' }, update: { name: 'Desa Karya Mandiri', district: 'Kecamatan Sejuk', province: 'Sumatera Barat' }, create: { id: 'v6', name: 'Desa Karya Mandiri', district: 'Kecamatan Sejuk', province: 'Sumatera Barat', description: 'Desa pionir hidroponik Sumatera' } }),
  ])

  // ─── USERS ────────────────────────────────────────────────────
  const superAdmin = await prisma.user.upsert({ where: { email: 'superadmin@hydro.id' }, update: {}, create: { email: 'superadmin@hydro.id', name: 'Super Administrator', password: pass, role: 'SUPER_ADMIN', phone: '081200000001' } })

  const [va1, va2, va3] = await Promise.all([
    prisma.user.upsert({ where: { email: 'admin.v1@hydro.id' }, update: {}, create: { email: 'admin.v1@hydro.id', name: 'Budi Santoso', password: pass, role: 'VILLAGE_ADMIN', phone: '081200000002', villageId: v1.id } }),
    prisma.user.upsert({ where: { email: 'admin.v2@hydro.id' }, update: {}, create: { email: 'admin.v2@hydro.id', name: 'Siti Rahayu', password: pass, role: 'VILLAGE_ADMIN', phone: '081200000003', villageId: v2.id } }),
    prisma.user.upsert({ where: { email: 'admin.v3@hydro.id' }, update: {}, create: { email: 'admin.v3@hydro.id', name: 'Hendra Gunawan', password: pass, role: 'VILLAGE_ADMIN', phone: '081200000004', villageId: v3.id } }),
  ])

  const farmers = await Promise.all([
    prisma.user.upsert({ where: { email: 'petani1@hydro.id' }, update: {}, create: { email: 'petani1@hydro.id', name: 'Pak Slamet Riyadi', password: pass, role: 'FARMER', phone: '081200000010', villageId: v1.id } }),
    prisma.user.upsert({ where: { email: 'petani2@hydro.id' }, update: {}, create: { email: 'petani2@hydro.id', name: 'Bu Suryani Dewi', password: pass, role: 'FARMER', phone: '081200000011', villageId: v1.id } }),
    prisma.user.upsert({ where: { email: 'petani3@hydro.id' }, update: {}, create: { email: 'petani3@hydro.id', name: 'Pak Joko Widodo', password: pass, role: 'FARMER', phone: '081200000012', villageId: v2.id } }),
    prisma.user.upsert({ where: { email: 'petani4@hydro.id' }, update: {}, create: { email: 'petani4@hydro.id', name: 'Bu Ani Susanti', password: pass, role: 'FARMER', phone: '081200000013', villageId: v2.id } }),
    prisma.user.upsert({ where: { email: 'petani5@hydro.id' }, update: {}, create: { email: 'petani5@hydro.id', name: 'Pak Agus Salim', password: pass, role: 'FARMER', phone: '081200000014', villageId: v3.id } }),
    prisma.user.upsert({ where: { email: 'petani6@hydro.id' }, update: {}, create: { email: 'petani6@hydro.id', name: 'Bu Retno Wulandari', password: pass, role: 'FARMER', phone: '081200000015', villageId: v4.id } }),
    prisma.user.upsert({ where: { email: 'petani7@hydro.id' }, update: {}, create: { email: 'petani7@hydro.id', name: 'Pak Made Sudana', password: pass, role: 'FARMER', phone: '081200000016', villageId: v5.id } }),
    prisma.user.upsert({ where: { email: 'petani8@hydro.id' }, update: {}, create: { email: 'petani8@hydro.id', name: 'Pak Rizal Hakim', password: pass, role: 'FARMER', phone: '081200000017', villageId: v6.id } }),
  ])

  const [f1, f2, f3, f4, f5, f6, f7, f8] = farmers

  // ─── FARMS (all statuses & crop stages) ──────────────────────
  const farms = await Promise.all([
    // ACTIVE - SEEDLING (just started)
    prisma.farm.upsert({ where: { id: 'farm-1' }, update: {}, create: { id: 'farm-1', name: 'Kebun Selada Pak Slamet', location: 'Blok A', area: 50, status: 'ACTIVE', cropStage: 'SEEDLING', ownerId: f1.id, villageId: v1.id, plantTypeId: selada.id, plantingDate: new Date('2026-06-01'), estimatedHarvest: new Date('2026-07-01') } }),
    // GROWING - VEGETATIVE
    prisma.farm.upsert({ where: { id: 'farm-2' }, update: {}, create: { id: 'farm-2', name: 'Kebun Kangkung Bu Suryani', location: 'Blok B', area: 30, status: 'GROWING', cropStage: 'VEGETATIVE', ownerId: f2.id, villageId: v1.id, plantTypeId: kangkung.id, plantingDate: new Date('2026-05-20'), estimatedHarvest: new Date('2026-06-10') } }),
    // GROWING - GROWING stage
    prisma.farm.upsert({ where: { id: 'farm-3' }, update: {}, create: { id: 'farm-3', name: 'Kebun Bayam Pak Joko', location: 'Petak 1', area: 45, status: 'GROWING', cropStage: 'GROWING', ownerId: f3.id, villageId: v2.id, plantTypeId: bayam.id, plantingDate: new Date('2026-05-10'), estimatedHarvest: new Date('2026-06-08') } }),
    // READY_FOR_HARVEST
    prisma.farm.upsert({ where: { id: 'farm-4' }, update: {}, create: { id: 'farm-4', name: 'Kebun Tomat Bu Ani', location: 'Greenhouse 1', area: 80, status: 'READY_FOR_HARVEST', cropStage: 'READY_FOR_HARVEST', ownerId: f4.id, villageId: v2.id, plantTypeId: tomat.id, plantingDate: new Date('2026-03-28'), estimatedHarvest: new Date('2026-06-06') } }),
    // HARVESTED
    prisma.farm.upsert({ where: { id: 'farm-5' }, update: {}, create: { id: 'farm-5', name: 'Kebun Cabai Pak Agus', location: 'Lahan Utama', area: 100, status: 'HARVESTED', cropStage: 'HARVESTED', ownerId: f5.id, villageId: v3.id, plantTypeId: cabai.id, plantingDate: new Date('2026-02-01'), estimatedHarvest: new Date('2026-05-31'), actualHarvest: new Date('2026-05-30') } }),
    // ACTIVE - GROWING (problems: abnormal pH)
    prisma.farm.upsert({ where: { id: 'farm-6' }, update: {}, create: { id: 'farm-6', name: 'Kebun Sawi Bu Retno', location: 'Blok C', area: 25, status: 'GROWING', cropStage: 'GROWING', ownerId: f6.id, villageId: v4.id, plantTypeId: sawi.id, plantingDate: new Date('2026-05-15'), estimatedHarvest: new Date('2026-06-14') } }),
    // GROWING - near harvest (3 days left)
    prisma.farm.upsert({ where: { id: 'farm-7' }, update: {}, create: { id: 'farm-7', name: 'Kebun Selada Pak Made', location: 'Unit A', area: 60, status: 'READY_FOR_HARVEST', cropStage: 'READY_FOR_HARVEST', ownerId: f7.id, villageId: v5.id, plantTypeId: selada.id, plantingDate: new Date('2026-05-08'), estimatedHarvest: new Date('2026-06-10') } }),
    // ACTIVE - SEEDLING new farm
    prisma.farm.upsert({ where: { id: 'farm-8' }, update: {}, create: { id: 'farm-8', name: 'Kebun Kangkung Pak Rizal', location: 'Petak A1', area: 35, status: 'ACTIVE', cropStage: 'SEEDLING', ownerId: f8.id, villageId: v6.id, plantTypeId: kangkung.id, plantingDate: new Date('2026-06-05'), estimatedHarvest: new Date('2026-06-26') } }),
  ])

  const [farm1, farm2, farm3, farm4, farm5, farm6, farm7, farm8] = farms

  // ─── MONITORING RECORDS ───────────────────────────────────────
  const today = new Date()
  const recs: object[] = []

  // Farm1 - Selada - NORMAL readings (last 7 days)
  for (let i = 6; i >= 0; i--) {
    const d = new Date(today); d.setDate(d.getDate() - i)
    recs.push({ farmId: farm1.id, userId: f1.id, date: d, phValue: 6.2 + Math.random() * 0.4, tdsValue: 650 + Math.random() * 100, temperature: 24 + Math.random() * 3, phStatus: 'NORMAL', tdsStatus: 'NORMAL', notes: 'Pertumbuhan normal' })
  }

  // Farm2 - Kangkung - NORMAL (last 10 days)
  for (let i = 9; i >= 0; i--) {
    const d = new Date(today); d.setDate(d.getDate() - i)
    recs.push({ farmId: farm2.id, userId: f2.id, date: d, phValue: 5.8 + Math.random() * 0.5, tdsValue: 1200 + Math.random() * 300, temperature: 26 + Math.random() * 2, phStatus: 'NORMAL', tdsStatus: 'NORMAL', notes: 'Tumbuh dengan baik' })
  }

  // Farm3 - Bayam - MIXED (some abnormal)
  for (let i = 14; i >= 0; i--) {
    const d = new Date(today); d.setDate(d.getDate() - i)
    const ph = i < 3 ? 5.1 + Math.random() * 0.2 : 6.2 + Math.random() * 0.5 // recent pH too low
    const tds = 1300 + Math.random() * 200
    recs.push({ farmId: farm3.id, userId: f3.id, date: d, phValue: ph, tdsValue: tds, temperature: 25 + Math.random() * 3, phStatus: ph < 6.0 ? 'ABNORMAL' : 'NORMAL', tdsStatus: 'NORMAL', notes: ph < 6.0 ? 'pH mulai turun, perlu penanganan' : 'Kondisi baik' })
  }

  // Farm4 - Tomat - NORMAL all through (long history 30 days)
  for (let i = 29; i >= 0; i--) {
    const d = new Date(today); d.setDate(d.getDate() - i)
    const ph = 5.8 + Math.random() * 0.4
    const tds = 1800 + Math.random() * 500
    recs.push({ farmId: farm4.id, userId: f4.id, date: d, phValue: ph, tdsValue: tds, temperature: 27 + Math.random() * 3, phStatus: 'NORMAL', tdsStatus: 'NORMAL', notes: 'Siap panen!' })
  }

  // Farm5 - Cabai HARVESTED - historical records
  for (let i = 45; i >= 20; i--) {
    const d = new Date(today); d.setDate(d.getDate() - i)
    recs.push({ farmId: farm5.id, userId: f5.id, date: d, phValue: 6.0 + Math.random() * 0.8, tdsValue: 2000 + Math.random() * 800, temperature: 28 + Math.random() * 4, phStatus: 'NORMAL', tdsStatus: 'NORMAL', notes: 'Proses panen' })
  }

  // Farm6 - Sawi - HIGH pH (abnormal) + HIGH TDS
  for (let i = 7; i >= 0; i--) {
    const d = new Date(today); d.setDate(d.getDate() - i)
    const ph = 7.3 + Math.random() * 0.5   // pH too HIGH
    const tds = 1600 + Math.random() * 200 // TDS normal for sawi
    recs.push({ farmId: farm6.id, userId: f6.id, date: d, phValue: ph, tdsValue: tds, temperature: 25 + Math.random() * 2, phStatus: 'ABNORMAL', tdsStatus: 'NORMAL', notes: 'pH terlalu tinggi! Tambah pH Down' })
  }

  // Farm7 - Selada near harvest - NORMAL
  for (let i = 10; i >= 0; i--) {
    const d = new Date(today); d.setDate(d.getDate() - i)
    recs.push({ farmId: farm7.id, userId: f7.id, date: d, phValue: 6.3 + Math.random() * 0.3, tdsValue: 700 + Math.random() * 80, temperature: 24 + Math.random() * 2, phStatus: 'NORMAL', tdsStatus: 'NORMAL', notes: 'Hampir panen' })
  }

  // Farm8 - Kangkung new - only 2 records
  for (let i = 1; i >= 0; i--) {
    const d = new Date(today); d.setDate(d.getDate() - i)
    const tds = 400 + Math.random() * 100 // TDS too LOW (new seedling)
    recs.push({ farmId: farm8.id, userId: f8.id, date: d, phValue: 5.9 + Math.random() * 0.3, tdsValue: tds, temperature: 26, phStatus: 'NORMAL', tdsStatus: 'ABNORMAL', notes: 'TDS rendah, perlu tambah nutrisi' })
  }

  await prisma.monitoringRecord.createMany({ data: recs as any })

  // ─── NOTIFICATIONS ────────────────────────────────────────────
  const notifs = [
    { userId: f3.id, title: 'pH Terlalu Rendah!', message: 'Kebun Bayam Pak Joko: pH 5.2 di bawah batas minimum (6.0). Segera tambahkan larutan pH Up.', type: 'ABNORMAL_PH' as const },
    { userId: f6.id, title: 'pH Terlalu Tinggi!', message: 'Kebun Sawi Bu Retno: pH 7.8 di atas batas maksimum (7.0). Tambahkan larutan pH Down.', type: 'ABNORMAL_PH' as const },
    { userId: f8.id, title: 'TDS Terlalu Rendah!', message: 'Kebun Kangkung Pak Rizal: TDS 420 ppm jauh di bawah minimum (1120 ppm). Tambah larutan nutrisi segera!', type: 'ABNORMAL_TDS' as const },
    { userId: f4.id, title: 'Siap Panen!', message: 'Kebun Tomat Bu Ani sudah memasuki masa panen. Segera lakukan pemanenan.', type: 'UPCOMING_HARVEST' as const },
    { userId: f7.id, title: 'Siap Panen!', message: 'Kebun Selada Pak Made siap panen dalam 3 hari. Persiapkan peralatan panen.', type: 'UPCOMING_HARVEST' as const },
    { userId: f1.id, title: 'Catatan Harian Lengkap', message: 'Semua monitoring hari ini sudah diisi. Kebun Selada Pak Slamet dalam kondisi baik.', type: 'SYSTEM' as const },
    { userId: va1.id, title: 'Laporan Mingguan Desa Sumber Makmur', message: '2 kebun aktif, rata-rata pH 6.3, rata-rata TDS 720 ppm. Semua dalam kondisi normal.', type: 'SYSTEM' as const },
    { userId: superAdmin.id, title: 'Sistem Berjalan Normal', message: '8 kebun aktif, 30 catatan monitoring minggu ini. Platform berjalan dengan baik.', type: 'SYSTEM' as const },
    { userId: f5.id, title: 'Panen Berhasil!', message: 'Selamat! Kebun Cabai Pak Agus berhasil dipanen pada 30 Mei 2026.', type: 'SYSTEM' as const },
    { userId: f2.id, title: 'Pengingat Monitoring', message: 'Jangan lupa input data pH & TDS hari ini untuk Kebun Kangkung Bu Suryani.', type: 'MISSING_RECORD' as const },
  ]
  await prisma.notification.createMany({ data: notifs })

  // ─── SYSTEM SETTINGS ──────────────────────────────────────────
  await prisma.systemSetting.upsert({ where: { key: 'site_name' }, update: { value: 'Hydroponic pH & TDS Monitor' }, create: { key: 'site_name', value: 'Hydroponic pH & TDS Monitor' } })
  await prisma.systemSetting.upsert({ where: { key: 'contact_email' }, update: { value: 'info@hydromonitor.id' }, create: { key: 'contact_email', value: 'info@hydromonitor.id' } })

  console.log('\n✅ Full test data loaded!\n')
  console.log('📍 Villages: 6 (Jawa Tengah, Jawa Timur, Jawa Barat, Yogyakarta, Bali, Sumatera Barat)')
  console.log('👥 Users: 1 Super Admin + 3 Village Admins + 8 Farmers')
  console.log('🌿 Farms: 8 (all statuses & crop stages)')
  console.log('📊 Monitoring Records:', recs.length)
  console.log('🔔 Notifications:', notifs.length)
  console.log('\n🔐 Login Accounts:')
  console.log('   Super Admin  : superadmin@hydro.id / password123')
  console.log('   Village Admin: admin.v1@hydro.id / password123  (Desa Sumber Makmur)')
  console.log('   Village Admin: admin.v2@hydro.id / password123  (Desa Tani Jaya)')
  console.log('   Village Admin: admin.v3@hydro.id / password123  (Desa Hijau Lestari)')
  console.log('   Farmer 1     : petani1@hydro.id / password123  (Selada - SEEDLING)')
  console.log('   Farmer 2     : petani2@hydro.id / password123  (Kangkung - VEGETATIVE)')
  console.log('   Farmer 3     : petani3@hydro.id / password123  (Bayam - pH ABNORMAL ⚠️)')
  console.log('   Farmer 4     : petani4@hydro.id / password123  (Tomat - READY TO HARVEST 🌾)')
  console.log('   Farmer 5     : petani5@hydro.id / password123  (Cabai - HARVESTED ✅)')
  console.log('   Farmer 6     : petani6@hydro.id / password123  (Sawi - pH TOO HIGH ⚠️)')
  console.log('   Farmer 7     : petani7@hydro.id / password123  (Selada - NEAR HARVEST 🌾)')
  console.log('   Farmer 8     : petani8@hydro.id / password123  (Kangkung - TDS LOW ⚠️)')
}

main().catch(console.error).finally(() => prisma.$disconnect())