import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatDate(date: Date | string): string {
  return new Date(date).toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' })
}

export function formatDateTime(date: Date | string): string {
  return new Date(date).toLocaleString('id-ID', { day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}

export function getDaysUntilHarvest(estimatedHarvest: Date | string): number {
  const harvest = new Date(estimatedHarvest)
  const now = new Date()
  const diff = harvest.getTime() - now.getTime()
  return Math.ceil(diff / (1000 * 60 * 60 * 24))
}

export function getCropStageLabel(stage: string): string {
  const labels: Record<string, string> = {
    SEEDLING: 'Persemaian',
    VEGETATIVE: 'Vegetatif',
    GROWING: 'Pertumbuhan',
    READY_FOR_HARVEST: 'Siap Panen',
    HARVESTED: 'Sudah Dipanen',
  }
  return labels[stage] || stage
}

export function getFarmStatusLabel(status: string): string {
  const labels: Record<string, string> = {
    ACTIVE: 'Aktif',
    GROWING: 'Tumbuh',
    READY_FOR_HARVEST: 'Siap Panen',
    HARVESTED: 'Sudah Dipanen',
  }
  return labels[status] || status
}

export function getRoleLabel(role: string): string {
  const labels: Record<string, string> = {
    SUPER_ADMIN: 'Super Admin',
    VILLAGE_ADMIN: 'Admin Desa',
    FARMER: 'Petani',
  }
  return labels[role] || role
}
