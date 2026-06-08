export interface Recommendation {
  type: 'danger' | 'warning' | 'success' | 'info'
  title: string
  message: string
  action?: string
}

export function getPhRecommendations(ph: number, minPH = 5.5, maxPH = 7.0): Recommendation[] {
  const recs: Recommendation[] = []
  if (ph < minPH - 0.5) {
    recs.push({ type: 'danger', title: 'pH Terlalu Rendah', message: `pH ${ph} sangat rendah. Segera tambahkan larutan pH Up untuk menaikkan pH.`, action: 'Tambahkan pH Up solution' })
  } else if (ph < minPH) {
    recs.push({ type: 'warning', title: 'pH Rendah', message: `pH ${ph} sedikit di bawah ideal (${minPH}-${maxPH}). Pertimbangkan menambahkan larutan pH Up.`, action: 'Tambahkan sedikit pH Up solution' })
  } else if (ph > maxPH + 0.5) {
    recs.push({ type: 'danger', title: 'pH Terlalu Tinggi', message: `pH ${ph} sangat tinggi. Segera tambahkan larutan pH Down untuk menurunkan pH.`, action: 'Tambahkan pH Down solution' })
  } else if (ph > maxPH) {
    recs.push({ type: 'warning', title: 'pH Tinggi', message: `pH ${ph} sedikit di atas ideal (${minPH}-${maxPH}). Pertimbangkan menambahkan larutan pH Down.`, action: 'Tambahkan sedikit pH Down solution' })
  } else {
    recs.push({ type: 'success', title: 'pH Normal', message: `pH ${ph} berada dalam rentang ideal (${minPH}-${maxPH}). Pertahankan kondisi ini.` })
  }
  return recs
}

export function getTdsRecommendations(tds: number, minTDS = 800, maxTDS = 2000): Recommendation[] {
  const recs: Recommendation[] = []
  if (tds < minTDS - 200) {
    recs.push({ type: 'danger', title: 'TDS Sangat Rendah', message: `TDS ${tds} ppm sangat rendah. Konsentrasi nutrisi tidak mencukupi. Tambahkan larutan nutrisi segera.`, action: 'Tambahkan larutan nutrisi segera' })
  } else if (tds < minTDS) {
    recs.push({ type: 'warning', title: 'TDS Rendah', message: `TDS ${tds} ppm di bawah ideal (${minTDS}-${maxTDS} ppm). Konsentrasi nutrisi kurang mencukupi.`, action: 'Tambahkan larutan nutrisi' })
  } else if (tds > maxTDS + 200) {
    recs.push({ type: 'danger', title: 'TDS Sangat Tinggi', message: `TDS ${tds} ppm sangat tinggi. Konsentrasi nutrisi berlebihan. Encerkan dengan menambah air bersih.`, action: 'Encerkan larutan dengan air bersih' })
  } else if (tds > maxTDS) {
    recs.push({ type: 'warning', title: 'TDS Tinggi', message: `TDS ${tds} ppm sedikit di atas ideal (${minTDS}-${maxTDS} ppm). Pertimbangkan pengenceran.`, action: 'Tambah sedikit air bersih' })
  } else {
    recs.push({ type: 'success', title: 'TDS Normal', message: `TDS ${tds} ppm berada dalam rentang ideal (${minTDS}-${maxTDS} ppm). Pertahankan kondisi ini.` })
  }
  return recs
}

export function getPhStatus(ph: number, minPH = 5.5, maxPH = 7.0): string {
  if (ph < minPH || ph > maxPH) return 'ABNORMAL'
  return 'NORMAL'
}

export function getTdsStatus(tds: number, minTDS = 800, maxTDS = 2000): string {
  if (tds < minTDS || tds > maxTDS) return 'ABNORMAL'
  return 'NORMAL'
}
