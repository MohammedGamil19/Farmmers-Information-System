import { PrismaClient } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import 'dotenv/config'
import bcrypt from 'bcryptjs'

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL })
const prisma = new PrismaClient({ adapter })

async function main() {
  // Plant Types
  const plantTypes = await Promise.all([
    prisma.plantType.upsert({ where: { name: 'Selada' }, update: {}, create: { name: 'Selada', description: 'Lettuce - mudah tumbuh', growthDays: 30 } }),
    prisma.plantType.upsert({ where: { name: 'Kangkung' }, update: {}, create: { name: 'Kangkung', description: 'Water spinach', growthDays: 21 } }),
    prisma.plantType.upsert({ where: { name: 'Bayam' }, update: {}, create: { name: 'Bayam', description: 'Spinach', growthDays: 25 } }),
    prisma.plantType.upsert({ where: { name: 'Tomat' }, update: {}, create: { name: 'Tomat', description: 'Tomato', growthDays: 70 } }),
    prisma.plantType.upsert({ where: { name: 'Cabai' }, update: {}, create: { name: 'Cabai', description: 'Chili pepper', growthDays: 90 } }),
    prisma.plantType.upsert({ where: { name: 'Sawi' }, update: {}, create: { name: 'Sawi', description: 'Mustard greens', growthDays: 30 } }),
  ])

  // Villages
  const village1 = await prisma.village.upsert({ where: { id: 'village-1' }, update: {}, create: { id: 'village-1', name: 'Desa Sumber Makmur', district: 'Kecamatan Sejahtera', province: 'Jawa Tengah' } })
  const village2 = await prisma.village.upsert({ where: { id: 'village-2' }, update: {}, create: { id: 'village-2', name: 'Desa Tani Jaya', district: 'Kecamatan Subur', province: 'Jawa Timur' } })

  // Users
  const pass = await bcrypt.hash('password123', 12)
  const superAdmin = await prisma.user.upsert({
    where: { email: 'superadmin@hydro.id' }, update: {},
    create: { email: 'superadmin@hydro.id', name: 'Super Administrator', password: pass, role: 'SUPER_ADMIN', phone: '081234567890' }
  })
  const villageAdmin = await prisma.user.upsert({
    where: { email: 'admin@desa1.id' }, update: {},
    create: { email: 'admin@desa1.id', name: 'Budi Santoso', password: pass, role: 'VILLAGE_ADMIN', phone: '081234567891', villageId: village1.id }
  })
  const farmer1 = await prisma.user.upsert({
    where: { email: 'petani1@desa1.id' }, update: {},
    create: { email: 'petani1@desa1.id', name: 'Pak Tani Slamet', password: pass, role: 'FARMER', phone: '081234567892', villageId: village1.id }
  })
  const farmer2 = await prisma.user.upsert({
    where: { email: 'petani2@desa1.id' }, update: {},
    create: { email: 'petani2@desa1.id', name: 'Bu Tani Suryani', password: pass, role: 'FARMER', phone: '081234567893', villageId: village1.id }
  })

  // Farms
  const farm1 = await prisma.farm.upsert({ where: { id: 'farm-1' }, update: {}, create: { id: 'farm-1', name: 'Kebun Selada Pak Slamet', location: 'Blok A', area: 50, ownerId: farmer1.id, villageId: village1.id, plantTypeId: plantTypes[0].id, plantingDate: new Date('2026-05-01'), estimatedHarvest: new Date('2026-06-15'), status: 'GROWING', cropStage: 'GROWING' } })
  const farm2 = await prisma.farm.upsert({ where: { id: 'farm-2' }, update: {}, create: { id: 'farm-2', name: 'Kebun Kangkung Bu Suryani', location: 'Blok B', area: 30, ownerId: farmer2.id, villageId: village1.id, plantTypeId: plantTypes[1].id, plantingDate: new Date('2026-05-15'), estimatedHarvest: new Date('2026-06-10'), status: 'READY_FOR_HARVEST', cropStage: 'READY_FOR_HARVEST' } })

  // Sample harvest (Panen) records over the past 8 weeks
  const today = new Date()
  const harvestSamples = [
    { farm: farm1, farmer: farmer1, pt: plantTypes[0], weeksAgo: 6, kg: 12.5, harga: 15000 },
    { farm: farm1, farmer: farmer1, pt: plantTypes[0], weeksAgo: 3, kg: 15.0, harga: 15000 },
    { farm: farm1, farmer: farmer1, pt: plantTypes[0], weeksAgo: 1, kg: 18.2, harga: 16000 },
    { farm: farm2, farmer: farmer2, pt: plantTypes[1], weeksAgo: 5, kg: 22.0, harga: 8000 },
    { farm: farm2, farmer: farmer2, pt: plantTypes[1], weeksAgo: 2, kg: 25.5, harga: 8500 },
  ]
  for (const s of harvestSamples) {
    const date = new Date(today)
    date.setDate(date.getDate() - s.weeksAgo * 7)
    await prisma.panen.create({
      data: {
        tanggalPanen: date,
        komoditas: s.pt.name,
        jumlahKg: s.kg,
        hargaJual: s.harga,
        farmId: s.farm.id,
        plantTypeId: s.pt.id,
        petaniId: s.farmer.id,
        villageId: village1.id,
      },
    })
  }

  // System settings
  await prisma.systemSetting.upsert({ where: { key: 'site_name' }, update: {}, create: { key: 'site_name', value: 'Sistem Informasi Dokumentasi Data Produksi Hasil Panen Pertanian' } })
  await prisma.systemSetting.upsert({ where: { key: 'contact_email' }, update: {}, create: { key: 'contact_email', value: 'info@gapoktan.id' } })

  console.log('Seed completed!')
  console.log('Login accounts:')
  console.log('Super Admin: superadmin@hydro.id / password123')
  console.log('Village Admin: admin@desa1.id / password123')
  console.log('Farmer 1: petani1@desa1.id / password123')
  console.log('Farmer 2: petani2@desa1.id / password123')
}

main().catch(console.error).finally(() => prisma.$disconnect())