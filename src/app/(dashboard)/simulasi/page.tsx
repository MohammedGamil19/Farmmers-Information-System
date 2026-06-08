'use client'
import { useEffect, useState, useCallback, useRef } from 'react'
import { api } from '@/lib/api'
import { getPhRecommendations, getTdsRecommendations, getPhStatus, getTdsStatus } from '@/lib/recommendations'
import {
  Activity, RefreshCw, FlaskConical, Droplets, Thermometer,
  Clock, AlertTriangle, CheckCircle, Sliders, Wifi, WifiOff,
  Zap, Leaf, MapPin, User, ChevronDown, ChevronUp, Wrench,
} from 'lucide-react'

// ─── Types ────────────────────────────────────────────────────────────────────
type PlantType = { id: string; name: string; minPH: number; maxPH: number; minTDS: number; maxTDS: number }
type LatestRecord = {
  id: string; date: string; phValue: number; tdsValue: number
  temperature: number | null; humidity: number | null
  phStatus: string; tdsStatus: string; actionTaken: string | null
}
type Farm = {
  id: string; name: string; location: string | null; area: number | null
  status: string; cropStage: string; plantingDate: string
  plantType: PlantType
  owner: { id: string; name: string }
  village: { id: string; name: string }
  monitoringRecords: LatestRecord[]
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function timeSince(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins  = Math.floor(diff / 60000)
  const hours = Math.floor(mins / 60)
  const days  = Math.floor(hours / 24)
  if (days  > 0) return `${days} hari lalu`
  if (hours > 0) return `${hours} jam lalu`
  if (mins  > 0) return `${mins} menit lalu`
  return 'Baru saja'
}

function isOverdue(dateStr: string): boolean {
  return Date.now() - new Date(dateStr).getTime() > 24 * 60 * 60 * 1000
}

function overallHealth(farm: Farm, simPh?: number, simTds?: number): 'normal' | 'abnormal' | 'nodata' {
  const rec = farm.monitoringRecords[0]
  if (!rec && simPh === undefined) return 'nodata'
  const ph  = simPh  ?? rec?.phValue
  const tds = simTds ?? rec?.tdsValue
  if (ph === undefined || tds === undefined) return 'nodata'
  const phAb  = getPhStatus(ph,   farm.plantType.minPH,  farm.plantType.maxPH)  === 'ABNORMAL'
  const tdsAb = getTdsStatus(tds, farm.plantType.minTDS, farm.plantType.maxTDS) === 'ABNORMAL'
  return (phAb || tdsAb) ? 'abnormal' : 'normal'
}

const STAGE_LABEL: Record<string, string> = {
  SEEDLING: 'Pembibitan', VEGETATIVE: 'Vegetatif', GROWING: 'Tumbuh',
  READY_FOR_HARVEST: 'Siap Panen', HARVESTED: 'Dipanen',
}

// ─── Gauge bar ───────────────────────────────────────────────────────────────
function GaugeBar({
  value, min, max, scale, type, animated,
}: {
  value: number; min: number; max: number; scale: number
  type: 'ph' | 'tds'; animated?: boolean
}) {
  const pct     = Math.min(Math.max((value / scale) * 100, 0), 100)
  const minPct  = (min / scale) * 100
  const maxPct  = (max / scale) * 100
  const inRange = value >= min && value <= max
  const trackColor = type === 'ph' ? 'bg-green-100' : 'bg-blue-100'
  const dotColor   = inRange
    ? (type === 'ph' ? 'bg-green-500' : 'bg-blue-500')
    : 'bg-red-500'

  return (
    <div className="w-full">
      <div className="relative h-4 rounded-full bg-gray-100 overflow-hidden">
        {/* safe zone */}
        <div
          className={`absolute h-full rounded-full transition-all duration-300 ${trackColor}`}
          style={{ left: `${minPct}%`, width: `${maxPct - minPct}%` }}
        />
        {/* fill up to needle */}
        <div
          className={`absolute h-full rounded-full opacity-60 transition-all duration-300 ${dotColor}`}
          style={{ width: `${pct}%` }}
        />
        {/* needle */}
        <div
          className={`absolute top-0.5 bottom-0.5 w-3 rounded-full -translate-x-1/2 shadow-sm border-2 border-white transition-all duration-300 ${dotColor} ${animated ? 'ring-2 ring-offset-1 ' + (inRange ? 'ring-green-300' : 'ring-red-300') : ''}`}
          style={{ left: `${pct}%` }}
        />
      </div>
      <div className="flex justify-between text-[10px] text-gray-400 mt-0.5 px-0.5">
        <span>0</span>
        <span className={`font-semibold ${inRange ? (type === 'ph' ? 'text-green-600' : 'text-blue-600') : 'text-red-500'}`}>
          {min}–{max}
        </span>
        <span>{scale}</span>
      </div>
    </div>
  )
}

// ─── Trend Badge ─────────────────────────────────────────────────────────────
function TrendBadge({ current, previous, unit }: { current: number; previous: number; unit: string }) {
  const diff = current - previous
  if (Math.abs(diff) < 0.01) return <span className="text-xs text-gray-400 font-medium">→ Stabil</span>
  const up = diff > 0
  return (
    <span className={`text-xs font-semibold flex items-center gap-0.5 ${up ? 'text-blue-500' : 'text-orange-500'}`}>
      {up ? '↑' : '↓'} {Math.abs(diff).toFixed(unit === 'ppm' ? 0 : 2)} {unit}
    </span>
  )
}

// ─── Farm Card ────────────────────────────────────────────────────────────────
function FarmCard({ farm, simMode }: { farm: Farm; simMode: boolean }) {
  const rec  = farm.monitoringRecords[0] ?? null
  const prev = farm.monitoringRecords[1] ?? null   // second-latest for trend
  const pt   = farm.plantType

  // Simulation state — initialise from last reading or midpoint of safe range
  const initPh  = rec ? rec.phValue  : parseFloat(((pt.minPH  + pt.maxPH)  / 2).toFixed(1))
  const initTds = rec ? rec.tdsValue : Math.round((pt.minTDS + pt.maxTDS) / 2)

  const [simPh,  setSimPh]  = useState(initPh)
  const [simTds, setSimTds] = useState(initTds)
  const [expanded, setExpanded] = useState(false)

  // Reset sim values when underlying data changes
  useEffect(() => {
    setSimPh(rec ? rec.phValue  : parseFloat(((pt.minPH  + pt.maxPH)  / 2).toFixed(1)))
    setSimTds(rec ? rec.tdsValue : Math.round((pt.minTDS + pt.maxTDS) / 2))
  }, [farm.id, rec?.id])  // eslint-disable-line react-hooks/exhaustive-deps

  // Decide which values to display
  const dispPh  = simMode ? simPh  : (rec?.phValue  ?? null)
  const dispTds = simMode ? simTds : (rec?.tdsValue ?? null)

  const health  = overallHealth(farm, simMode ? simPh : undefined, simMode ? simTds : undefined)
  const phAb    = dispPh  !== null && getPhStatus(dispPh,   pt.minPH,  pt.maxPH)  === 'ABNORMAL'
  const tdsAb   = dispTds !== null && getTdsStatus(dispTds, pt.minTDS, pt.maxTDS) === 'ABNORMAL'

  // Live recommendations (only relevant in sim mode or when data exists)
  const phRecs  = dispPh  !== null ? getPhRecommendations(dispPh,   pt.minPH,  pt.maxPH)  : []
  const tdsRecs = dispTds !== null ? getTdsRecommendations(dispTds, pt.minTDS, pt.maxTDS) : []
  const topRec  = [...phRecs, ...tdsRecs].find(r => r.type === 'danger' || r.type === 'warning') ?? phRecs[0] ?? null

  // Card accent colour
  const accent = health === 'normal'  ? 'border-l-green-500'
               : health === 'abnormal'? 'border-l-red-500'
               :                       'border-l-gray-300'

  const headerBg = health === 'normal'  ? 'bg-green-50'
                 : health === 'abnormal'? 'bg-red-50'
                 :                       'bg-gray-50'

  const pulsing = health === 'abnormal' && !simMode

  const recColors: Record<string, string> = {
    danger:  'bg-red-50    border-red-200    text-red-700',
    warning: 'bg-yellow-50 border-yellow-200 text-yellow-700',
    success: 'bg-green-50  border-green-200  text-green-700',
    info:    'bg-blue-50   border-blue-200   text-blue-700',
  }

  return (
    <div className={`bg-white rounded-2xl border-l-4 border border-gray-200 shadow-sm overflow-hidden transition-all duration-300 ${accent} ${pulsing ? 'ring-1 ring-red-200' : ''}`}>
      {/* Card header */}
      <div className={`px-4 py-3 ${headerBg}`}>
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="font-bold text-gray-800 text-sm truncate">{farm.name}</h3>
              {/* Health badge */}
              {health === 'normal' && (
                <span className="flex items-center gap-1 text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-medium">
                  <CheckCircle size={11} />Normal
                </span>
              )}
              {health === 'abnormal' && (
                <span className={`flex items-center gap-1 text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded-full font-medium ${pulsing ? 'animate-pulse' : ''}`}>
                  <AlertTriangle size={11} />Abnormal
                </span>
              )}
              {health === 'nodata' && (
                <span className="flex items-center gap-1 text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full font-medium">
                  <WifiOff size={11} />Belum Ada Data
                </span>
              )}
              {simMode && (
                <span className="flex items-center gap-1 text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full font-medium">
                  <Zap size={11} />Simulasi
                </span>
              )}
            </div>
            <div className="flex items-center gap-3 mt-1 text-xs text-gray-500 flex-wrap">
              <span className="flex items-center gap-1"><Leaf size={11} />{pt.name}</span>
              {farm.village && <span className="flex items-center gap-1"><MapPin size={11} />{farm.village.name}</span>}
              <span className="flex items-center gap-1"><User size={11} />{farm.owner.name}</span>
            </div>
          </div>

          {/* Stage chip */}
          <span className="shrink-0 text-[10px] bg-white border border-gray-200 text-gray-600 px-2 py-1 rounded-lg font-medium">
            {STAGE_LABEL[farm.cropStage] ?? farm.cropStage}
          </span>
        </div>
      </div>

      {/* Gauges */}
      <div className="px-4 pt-3 pb-2 space-y-3">
        {/* pH */}
        <div>
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs font-semibold text-gray-500 flex items-center gap-1">
              <Droplets size={12} className={phAb ? 'text-red-500' : 'text-green-500'} />pH
            </span>
            <div className="flex items-center gap-2">
              {!simMode && rec && prev && (
                <TrendBadge current={rec.phValue} previous={prev.phValue} unit="" />
              )}
              <span className={`font-bold text-lg leading-none tabular-nums ${phAb ? 'text-red-600' : dispPh !== null ? 'text-green-700' : 'text-gray-300'}`}>
                {dispPh !== null ? dispPh.toFixed(1) : '—'}
              </span>
              {phAb
                ? <span className="text-[10px] bg-red-100 text-red-600 px-1.5 py-0.5 rounded font-medium">ABNORMAL</span>
                : dispPh !== null
                  ? <span className="text-[10px] bg-green-100 text-green-600 px-1.5 py-0.5 rounded font-medium">NORMAL</span>
                  : null}
            </div>
          </div>
          {dispPh !== null
            ? <GaugeBar value={dispPh} min={pt.minPH} max={pt.maxPH} scale={14} type="ph" animated={simMode} />
            : <div className="h-4 bg-gray-100 rounded-full" />}
          {simMode && (
            <div className="mt-2">
              <input
                type="range" min={0} max={14} step={0.1}
                value={simPh}
                onChange={e => setSimPh(parseFloat(e.target.value))}
                className="w-full h-1.5 rounded-full appearance-none cursor-pointer accent-green-600"
              />
              <div className="flex justify-between text-[10px] text-gray-400">
                <span>0 (Asam)</span><span>7 (Netral)</span><span>14 (Basa)</span>
              </div>
            </div>
          )}
        </div>

        {/* TDS */}
        <div>
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs font-semibold text-gray-500 flex items-center gap-1">
              <FlaskConical size={12} className={tdsAb ? 'text-red-500' : 'text-blue-500'} />TDS
            </span>
            <div className="flex items-center gap-2">
              {!simMode && rec && prev && (
                <TrendBadge current={rec.tdsValue} previous={prev.tdsValue} unit="ppm" />
              )}
              <span className={`font-bold text-lg leading-none tabular-nums ${tdsAb ? 'text-red-600' : dispTds !== null ? 'text-blue-700' : 'text-gray-300'}`}>
                {dispTds !== null ? `${Math.round(dispTds)}` : '—'}
                <span className="text-xs font-normal ml-0.5 text-gray-500">ppm</span>
              </span>
              {tdsAb
                ? <span className="text-[10px] bg-red-100 text-red-600 px-1.5 py-0.5 rounded font-medium">ABNORMAL</span>
                : dispTds !== null
                  ? <span className="text-[10px] bg-blue-100 text-blue-600 px-1.5 py-0.5 rounded font-medium">NORMAL</span>
                  : null}
            </div>
          </div>
          {dispTds !== null
            ? <GaugeBar value={dispTds} min={pt.minTDS} max={pt.maxTDS} scale={Math.max(pt.maxTDS * 1.5, 3000)} type="tds" animated={simMode} />
            : <div className="h-4 bg-gray-100 rounded-full" />}
          {simMode && (
            <div className="mt-2">
              <input
                type="range" min={0} max={3000} step={10}
                value={simTds}
                onChange={e => setSimTds(parseFloat(e.target.value))}
                className="w-full h-1.5 rounded-full appearance-none cursor-pointer accent-blue-600"
              />
              <div className="flex justify-between text-[10px] text-gray-400">
                <span>0 ppm</span><span>1500 ppm</span><span>3000 ppm</span>
              </div>
            </div>
          )}
        </div>

        {/* Recommendation */}
        {topRec && (
          <div className={`text-xs border rounded-xl px-3 py-2 transition-all duration-300 ${recColors[topRec.type]}`}>
            <span className="font-semibold">{topRec.title}: </span>{topRec.message}
          </div>
        )}
      </div>

      {/* Footer — last check / temperature / action */}
      <div className="px-4 pb-3">
        <div className="flex items-center justify-between text-xs text-gray-500 border-t pt-2.5">
          <div className="flex items-center gap-3">
            {rec ? (
              <span className={`flex items-center gap-1 ${isOverdue(rec.date) ? 'text-orange-500 font-medium' : 'text-gray-400'}`}>
                <Clock size={11} />
                {isOverdue(rec.date) ? `⚠ ${timeSince(rec.date)}` : timeSince(rec.date)}
              </span>
            ) : (
              <span className="flex items-center gap-1 text-gray-300 italic">
                <Clock size={11} />Belum pernah dicatat
              </span>
            )}
            {/* Record count badge */}
            {farm.monitoringRecords.length > 0 && !simMode && (
              <span className="text-[10px] bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded font-medium">
                {farm.monitoringRecords.length >= 3 ? '3+' : farm.monitoringRecords.length} catatan terbaru
              </span>
            )}
            {rec?.temperature != null && (
              <span className="flex items-center gap-1"><Thermometer size={11} />{rec.temperature.toFixed(1)}°C</span>
            )}
            {rec?.humidity != null && (
              <span>{rec.humidity}%</span>
            )}
          </div>

          {/* Expand detail button */}
          {(rec?.actionTaken || (health !== 'nodata' && !simMode)) && (
            <button
              onClick={() => setExpanded(v => !v)}
              className="text-gray-400 hover:text-gray-600 flex items-center gap-1 transition-colors"
            >
              {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            </button>
          )}
        </div>

        {/* Expandable: action taken */}
        {expanded && rec && !simMode && (
          <div className="mt-2 space-y-1.5 border-t pt-2">
            {rec.actionTaken ? (
              <div className={`flex items-start gap-2 text-xs rounded-lg p-2 border ${
                rec.actionTaken.includes('Belum ada')
                  ? 'bg-yellow-50 border-yellow-200 text-yellow-800'
                  : 'bg-emerald-50 border-emerald-200 text-emerald-800'
              }`}>
                <Wrench size={12} className="mt-0.5 shrink-0" />
                <span><strong>Tindakan:</strong> {rec.actionTaken}</span>
              </div>
            ) : (rec.phStatus === 'ABNORMAL' || rec.tdsStatus === 'ABNORMAL') ? (
              <div className="text-xs text-gray-400 italic flex items-center gap-1">
                <Wrench size={11} />Tidak ada tindakan yang dicatat
              </div>
            ) : null}
            {farm.location && (
              <p className="text-xs text-gray-400 flex items-center gap-1">
                <MapPin size={11} />{farm.location}
              </p>
            )}
          </div>
        )}

        {/* Simulation mode: what-if summary */}
        {expanded && simMode && (
          <div className="mt-2 border-t pt-2 space-y-1.5">
            <p className="text-xs font-semibold text-purple-700 flex items-center gap-1">
              <Zap size={11} />Hasil Simulasi
            </p>
            {[...phRecs, ...tdsRecs].slice(0, 3).map((r, i) => (
              <div key={i} className={`text-xs border rounded-lg px-2.5 py-2 ${recColors[r.type]}`}>
                <span className="font-semibold">{r.title}: </span>{r.message}
              </div>
            ))}
            {health === 'normal' && (
              <div className="text-xs border rounded-lg px-2.5 py-2 bg-green-50 border-green-200 text-green-700">
                ✅ Dengan nilai ini sistem tidak akan mengirimkan notifikasi apapun.
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════════
export default function SimulasiPage() {
  const [farms,       setFarms]       = useState<Farm[]>([])
  const [loading,     setLoading]     = useState(true)
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null)
  const [autoRefresh, setAutoRefresh] = useState(true)
  const [simMode,     setSimMode]     = useState(false)
  const [refreshing,  setRefreshing]  = useState(false)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const load = useCallback(async (showSpinner = false) => {
    if (showSpinner) setRefreshing(true)
    try {
      const data = await api.get('/api/farms')
      setFarms(data.farms)
      setLastRefresh(new Date())
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  // Auto-refresh every 30 s
  useEffect(() => {
    if (autoRefresh && !simMode) {
      timerRef.current = setInterval(() => load(), 30000)
    } else {
      if (timerRef.current) clearInterval(timerRef.current)
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current) }
  }, [autoRefresh, simMode, load])

  // ── Computed stats ──────────────────────────────────────────────────────────
  const total      = farms.length
  const withData   = farms.filter(f => f.monitoringRecords.length > 0)
  const normalCnt  = withData.filter(f => overallHealth(f) === 'normal').length
  const abnormalCnt= withData.filter(f => overallHealth(f) === 'abnormal').length
  const noDataCnt  = farms.filter(f => f.monitoringRecords.length === 0).length
  const overdueCnt = withData.filter(f => isOverdue(f.monitoringRecords[0].date)).length

  const stats = [
    { label: 'Total Kebun',      value: total,       color: 'text-blue-600',   bg: 'bg-blue-50',   border: 'border-blue-200'   },
    { label: 'Kondisi Normal',   value: normalCnt,   color: 'text-green-600',  bg: 'bg-green-50',  border: 'border-green-200'  },
    { label: 'Perlu Perhatian',  value: abnormalCnt, color: abnormalCnt > 0 ? 'text-red-600' : 'text-gray-400', bg: abnormalCnt > 0 ? 'bg-red-50' : 'bg-gray-50', border: abnormalCnt > 0 ? 'border-red-200' : 'border-gray-200' },
    { label: 'Belum Dicatat',    value: noDataCnt + overdueCnt, color: (noDataCnt + overdueCnt) > 0 ? 'text-orange-500' : 'text-gray-400', bg: (noDataCnt + overdueCnt) > 0 ? 'bg-orange-50' : 'bg-gray-50', border: (noDataCnt + overdueCnt) > 0 ? 'border-orange-200' : 'border-gray-200' },
  ]

  return (
    <div className="space-y-5">

      {/* ── Page header ───────────────────────────────────────────────────── */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
            <Activity size={24} className="text-green-600" />Monitor Pusat
          </h1>
          <p className="text-gray-500 text-sm mt-0.5">
            Status real-time seluruh kebun dan simulasi kondisi nutrisi
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Refresh time */}
          {lastRefresh && !simMode && (
            <span className="text-xs text-gray-400 flex items-center gap-1">
              <Wifi size={11} className="text-green-500" />
              Diperbarui {lastRefresh.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
            </span>
          )}

          {/* Manual refresh */}
          {!simMode && (
            <button
              onClick={() => load(true)}
              disabled={refreshing}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors disabled:opacity-50"
            >
              <RefreshCw size={13} className={refreshing ? 'animate-spin' : ''} />
              Refresh
            </button>
          )}

          {/* Auto-refresh toggle */}
          {!simMode && (
            <button
              onClick={() => setAutoRefresh(v => !v)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm border transition-colors ${
                autoRefresh
                  ? 'bg-green-50 border-green-300 text-green-700'
                  : 'border-gray-200 text-gray-500 hover:bg-gray-50'
              }`}
            >
              <span className={`w-2 h-2 rounded-full ${autoRefresh ? 'bg-green-500 animate-pulse' : 'bg-gray-300'}`} />
              Auto 30s
            </button>
          )}

          {/* Simulation mode toggle */}
          <button
            onClick={() => setSimMode(v => !v)}
            className={`flex items-center gap-2 px-4 py-1.5 rounded-xl text-sm font-semibold border-2 transition-all ${
              simMode
                ? 'bg-purple-600 border-purple-600 text-white shadow-lg shadow-purple-200'
                : 'bg-white border-purple-300 text-purple-700 hover:bg-purple-50'
            }`}
          >
            <Sliders size={14} />
            {simMode ? '⚡ Mode Simulasi Aktif' : 'Mode Simulasi'}
          </button>
        </div>
      </div>

      {/* Simulation banner */}
      {simMode && (
        <div className="bg-purple-50 border-2 border-purple-200 rounded-2xl px-4 py-3 flex items-start gap-3">
          <div className="w-8 h-8 rounded-xl bg-purple-100 flex items-center justify-center shrink-0 mt-0.5">
            <Zap size={16} className="text-purple-600" />
          </div>
          <div>
            <p className="font-semibold text-purple-800 text-sm">Mode Simulasi Aktif</p>
            <p className="text-purple-600 text-xs mt-0.5">
              Geser slider pH dan TDS pada setiap kartu untuk melihat bagaimana sistem merespons secara real-time.
              Data asli tidak akan berubah. Auto-refresh dinonaktifkan selama simulasi berjalan.
            </p>
          </div>
          <button onClick={() => setSimMode(false)} className="ml-auto text-purple-400 hover:text-purple-600 text-xs whitespace-nowrap">
            Keluar
          </button>
        </div>
      )}

      {/* ── Stats row ─────────────────────────────────────────────────────── */}
      {!loading && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {stats.map((s, i) => (
            <div key={i} className={`rounded-2xl border p-4 ${s.bg} ${s.border}`}>
              <p className={`text-3xl font-bold ${s.color}`}>{s.value}</p>
              <p className="text-xs text-gray-600 font-medium mt-0.5">{s.label}</p>
            </div>
          ))}
        </div>
      )}

      {/* ── Farm grid ─────────────────────────────────────────────────────── */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 text-gray-400">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-green-600 border-t-transparent mb-3" />
          <p className="text-sm">Memuat data kebun...</p>
        </div>
      ) : farms.length === 0 ? (
        <div className="text-center py-20 text-gray-400">
          <Leaf size={44} className="mx-auto mb-3 opacity-30" />
          <p className="font-semibold text-base">Belum ada kebun terdaftar</p>
          <p className="text-sm mt-1">Tambahkan kebun terlebih dahulu untuk mulai memantau</p>
        </div>
      ) : (
        <>
          {/* Sort: abnormal first, then overdue, then normal, then no data */}
          {(() => {
            const sorted = [...farms].sort((a, b) => {
              const order = (f: Farm) => {
                if (overallHealth(f) === 'abnormal') return 0
                if (f.monitoringRecords.length > 0 && isOverdue(f.monitoringRecords[0].date)) return 1
                if (overallHealth(f) === 'normal') return 2
                return 3 // no data
              }
              return order(a) - order(b)
            })
            return (
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
                {sorted.map(farm => (
                  <FarmCard key={farm.id} farm={farm} simMode={simMode} />
                ))}
              </div>
            )
          })()}

          {/* Legend */}
          <div className="flex items-center gap-4 flex-wrap text-xs text-gray-400 pt-2 border-t">
            <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm bg-green-500" />Kondisi Normal</span>
            <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm bg-red-500" />Nilai Abnormal</span>
            <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm bg-gray-300" />Belum Ada Data</span>
            <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm bg-orange-400" />Belum Dicatat Hari Ini</span>
            {simMode && <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm bg-purple-500" />Nilai Simulasi (tidak disimpan)</span>}
          </div>
        </>
      )}
    </div>
  )
}
