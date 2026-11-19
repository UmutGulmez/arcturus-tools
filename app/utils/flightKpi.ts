import { G0, evaluateThresholds, type FlightMetrics, type Status, type Thresholds } from './flightMetrics'
import type { UnitPrefs } from './flightChart'
import { toCsv, type Cell } from './export'

export interface Kpi {
  id: string
  group: 'Performans' | 'Motor' | 'Stabilite' | 'Kurtarma ve iniş'
  label: string
  unit: string
  digits: number
  value: number | null
  sub?: string
  status: Status
  icon: string
  /** Yaklaşık değer uyarısı */
  approx?: boolean
}

const sec = (t: number | null | undefined) => (t === null || t === undefined || Number.isNaN(t) ? undefined : `t = ${t.toFixed(2)} s`)

export function buildKpis(m: FlightMetrics, th: Thresholds, u: UnitPrefs): Kpi[] {
  const sp = u.speed === 'kmh' ? { k: 3.6, unit: 'km/h' } : { k: 1, unit: 'm/s' }
  const ac = u.acc === 'g' ? { k: 1 / G0, unit: 'g' } : { k: 1, unit: 'm/s²' }
  const st = evaluateThresholds(m, th)
  const k = (v: number | null | undefined, f: number) => (v === null || v === undefined ? null : v * f)
  const out: Kpi[] = [
    { id: 'apogee', group: 'Performans', label: 'Zirve irtifası (AGL)', unit: 'm', digits: 0, value: m.apogee?.alt ?? null, sub: sec(m.apogee?.t), status: 'none', icon: 'lucide:mountain' },
    { id: 'maxVel', group: 'Performans', label: 'Maks. hız', unit: sp.unit, digits: 1, value: k(m.maxVel?.v, sp.k), sub: sec(m.maxVel?.t), status: 'none', icon: 'lucide:gauge' },
    { id: 'maxMach', group: 'Performans', label: 'Maks. Mach', unit: '', digits: 2, value: m.maxMach?.v ?? null, sub: sec(m.maxMach?.t), status: 'none', icon: 'lucide:wind' },
    { id: 'maxAcc', group: 'Performans', label: 'Maks. ivme', unit: ac.unit, digits: u.acc === 'g' ? 1 : 0, value: k(m.maxAccelG?.v, G0 * ac.k), sub: sec(m.maxAccelG?.t), status: 'none', icon: 'lucide:move-up-right' },
    { id: 'maxQ', group: 'Performans', label: 'Maks. dinamik basınç', unit: 'kPa', digits: 1, value: k(m.maxQ?.q, 0.001), sub: m.maxQ ? `${sec(m.maxQ.t)}${m.maxQ.mach !== null ? `, Mach ${m.maxQ.mach.toFixed(2)}` : ''}` : undefined, status: 'none', icon: 'lucide:wind-arrow-down' },
    { id: 'rail', group: 'Performans', label: 'Raf çıkış hızı', unit: sp.unit, digits: 1, value: k(m.railExitSpeed, sp.k), sub: [sec(m.railExitT), th.railMin !== null ? `eşik ${(th.railMin * sp.k).toFixed(0)} ${sp.unit}` : ''].filter(Boolean).join(', ') || undefined, status: st.railExit, icon: 'lucide:rocket' },
    { id: 'flightTime', group: 'Performans', label: 'Toplam uçuş süresi', unit: 's', digits: 1, value: m.flightTime, status: 'none', icon: 'lucide:timer' },

    { id: 'burnTime', group: 'Motor', label: 'Yanma süresi', unit: 's', digits: 2, value: m.burnTime, sub: m.burnout !== null ? `yanma sonu t = ${m.burnout.toFixed(2)} s${m.burnoutFromEvent ? '' : ' (itkiden)'}` : undefined, status: 'none', icon: 'lucide:flame' },
    { id: 'impulse', group: 'Motor', label: 'Toplam itki impulsu', unit: 'N·s', digits: 0, value: m.totalImpulse, status: 'none', icon: 'lucide:sigma' },
    { id: 'avgThrust', group: 'Motor', label: 'Ortalama itki', unit: 'N', digits: 0, value: m.avgThrust, sub: 'yanma süresi boyunca', status: 'none', icon: 'lucide:activity' },
    { id: 'peakThrust', group: 'Motor', label: 'Tepe itki', unit: 'N', digits: 0, value: m.peakThrust, status: 'none', icon: 'lucide:trending-up' },
    { id: 'liftoffTW', group: 'Motor', label: 'Kalkış itki/ağırlık', unit: '', digits: 1, value: m.liftoffTW, sub: 'LIFTOFF anında', status: 'none', icon: 'lucide:scale' },
    { id: 'massStart', group: 'Motor', label: 'Kalkış kütlesi', unit: 'kg', digits: 2, value: m.launchMassKg, status: 'none', icon: 'lucide:weight' },
    { id: 'massBurnout', group: 'Motor', label: 'Yanma sonu kütlesi', unit: 'kg', digits: 2, value: m.burnoutMassKg, status: 'none', icon: 'lucide:weight' },
    { id: 'isp', group: 'Motor', label: 'Ort. Isp (yaklaşık)', unit: 's', digits: 0, value: m.ispApprox, sub: 'itki / (g₀·Δm_motor)', status: 'none', icon: 'lucide:fuel', approx: true },

    { id: 'stabRail', group: 'Stabilite', label: 'Stabilite: raf çıkışı', unit: 'kal', digits: 2, value: m.stabRail, sub: th.stabWarn !== null ? `uyarı < ${th.stabWarn}${th.stabCrit !== null ? `, kritik < ${th.stabCrit}` : ''}` : undefined, status: st.stabRail, icon: 'lucide:crosshair' },
    { id: 'stabBurnout', group: 'Stabilite', label: 'Stabilite: yanma sonu', unit: 'kal', digits: 2, value: m.stabBurnout, status: st.stabBurnout, icon: 'lucide:crosshair' },
    { id: 'stabMin', group: 'Stabilite', label: 'Min. stabilite (motorlu)', unit: 'kal', digits: 2, value: m.stabMinBurn?.v ?? null, sub: sec(m.stabMinBurn?.t), status: st.stabMinBurn, icon: 'lucide:crosshair' },
    { id: 'stabMinAsc', group: 'Stabilite', label: 'Min. stabilite (yükseliş)', unit: 'kal', digits: 2, value: m.stabMinAll?.v ?? null, sub: sec(m.stabMinAll?.t), status: 'none', icon: 'lucide:crosshair' },
    { id: 'aoa', group: 'Stabilite', label: 'Maks. hücum açısı (motorlu)', unit: '°', digits: 1, value: m.maxAoaBurn?.v ?? null, sub: 'hız ≥ 10 m/s satırlar', status: 'none', icon: 'lucide:corner-right-up' },

    { id: 'landing', group: 'Kurtarma ve iniş', label: 'İniş hızı', unit: sp.unit, digits: 1, value: k(m.landingSpeed, sp.k), sub: th.landMax !== null ? `sınır ${(th.landMax * sp.k).toFixed(1)} ${sp.unit}` : 'yere çarpmadan önceki ~2 s ortalaması', status: st.landing, icon: 'lucide:arrow-down-to-line' },
  ]
  m.chutes.slice(0, 3).forEach((c, i) => {
    const v = c.speed ?? c.warnSpeed
    out.push({
      id: `chute${i}`, group: 'Kurtarma ve iniş', label: `Paraşüt ${i + 1} açılış hızı`, unit: sp.unit, digits: 1, value: k(v, sp.k),
      sub: [c.name, Number.isNaN(c.t) ? undefined : sec(c.t), c.alt !== null ? `${c.alt.toFixed(0)} m` : undefined].filter(Boolean).join(', ') || undefined,
      status: 'none', icon: 'lucide:umbrella',
    })
  })
  out.push(
    { id: 'drift', group: 'Kurtarma ve iniş', label: 'Yanal sürüklenme (iniş)', unit: 'm', digits: 0, value: m.driftEnd?.dist ?? null, sub: m.driftEnd?.dir != null ? `yön ${m.driftEnd.dir.toFixed(0)}°` : undefined, status: 'none', icon: 'lucide:move-diagonal' },
    { id: 'maxLat', group: 'Kurtarma ve iniş', label: 'Maks. yanal mesafe', unit: 'm', digits: 0, value: m.maxLateral?.v ?? null, sub: sec(m.maxLateral?.t), status: 'none', icon: 'lucide:move-horizontal' },
  )
  return out.filter((x) => x.value !== null)
}

export function fmtKpi(k: Pick<Kpi, 'value' | 'digits'>): string {
  if (k.value === null) return '—'
  return new Intl.NumberFormat('tr-TR', { minimumFractionDigits: k.digits, maximumFractionDigits: k.digits }).format(k.value)
}

export function kpiCsv(files: { name: string; kpis: Kpi[] }[]): string {
  const ids = new Map<string, Kpi>()
  for (const f of files) for (const k of f.kpis) if (!ids.has(k.id)) ids.set(k.id, k)
  const rows: Cell[][] = [['Grup', 'Gösterge', 'Birim', ...files.map((f) => f.name)]]
  for (const k of ids.values()) {
    rows.push([k.group, k.label, k.unit, ...files.map((f) => f.kpis.find((x) => x.id === k.id)?.value ?? null)])
  }
  return toCsv(rows)
}
