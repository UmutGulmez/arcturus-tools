// Çalıştırmak için (vitest projede kurulu değil):
//   npx vitest run tests/flightParser.test.ts
import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { COLUMN_DEFS, deriveKey, lookupColumn, splitHeader } from '../app/utils/columns'
import { cell, decodeFlightBytes, FlightParseError, fixMojibake, parseFlightBuffer, parseFlightText } from '../app/utils/flightParser'

const sample = readFileSync(new URL('./fixtures/ornek-ucus.csv', import.meta.url))
const sampleText = sample.toString('utf8')
const ev = (d: ReturnType<typeof parseFlightText>, type: string) => d.events.find((e) => e.type === type)

describe('sütun sözlüğü', () => {
  it('58 sütun, benzersiz anahtarlar', () => {
    expect(COLUMN_DEFS).toHaveLength(58)
    expect(new Set(COLUMN_DEFS.map((c) => c.key)).size).toBe(58)
  })
  it('son parantez grubunu atar, iki parantezli adı korur', () => {
    expect(splitHeader('Vertical orientation (zenith) (°)')).toEqual({ name: 'Vertical orientation (zenith)', unit: '°' })
    expect(splitHeader('Stability margin calibers (​)')).toEqual({ name: 'Stability margin calibers', unit: '' })
    expect(lookupColumn('vertical ORIENTATION (zenith)')?.key).toBe('zenith')
    expect(lookupColumn('Latitude')?.key).toBe('lat')
  })
  it('bilinmeyen ad için anahtar türetir', () => {
    expect(deriveKey('Özel Sensör değeri')).toBe('ozelSensorDegeri')
  })
})

describe('örnek dosya', () => {
  const d = parseFlightBuffer(sample.buffer.slice(sample.byteOffset, sample.byteOffset + sample.byteLength))
  it('boyutlar ve başlık', () => {
    expect(d.rows).toBe(1538)
    expect(d.columns).toHaveLength(58)
    expect(d.columns.every((c) => c.known)).toBe(true)
    expect(d.name).toBe('TEKNOFEST (Up to date)')
    expect(d.declaredPoints).toBe(1538)
    expect(d.declaredVars).toBe(58)
    expect(d.warnings).toHaveLength(2)
    expect(d.warnings[1]).toContain('Ana Paraşüt')
    expect(d.notes).toEqual([])
  })
  it('olaylar', () => {
    expect(ev(d, 'IGNITION')?.t).toBe(0)
    expect(ev(d, 'LAUNCH')?.t).toBe(0)
    expect(ev(d, 'LIFTOFF')?.t).toBe(0.08)
    for (const t of ['LAUNCHROD', 'BURNOUT', 'APOGEE', 'GROUND_HIT', 'SIMULATION_END', 'RECOVERY_DEVICE_DEPLOYMENT', 'SIM_WARN']) {
      expect(ev(d, t), t).toBeTruthy()
    }
    expect(d.events.filter((e) => e.type === 'RECOVERY_DEVICE_DEPLOYMENT')).toHaveLength(2)
  })
  it('ilk satır değerleri', () => {
    expect(cell(d, 'mass', 0)).toBeCloseTo(28230, 6)
    expect(cell(d, 'motorMass', 0)).toBeCloseTo(12650, 6)
    expect(cell(d, 'refLen', 0)).toBe(12.5)
    expect(cell(d, 'cg', 0)).toBe(140.884)
  })
  it('NaN null olur, 0 olmaz', () => {
    expect(cell(d, 'cp', 0)).toBeNull()
    expect(cell(d, 'stab', 0)).toBeNull()
    expect(Number.isNaN(d.cols.cp![0]!)).toBe(true)
    expect(cell(d, 'cg', 0)).not.toBeNull()
  })
  it('stabilite tutarlılığı: (CP-CG)/refLen ≈ stab', () => {
    let worst = 0
    let n = 0
    for (let i = 0; i < d.rows; i++) {
      const cp = cell(d, 'cp', i), cg = cell(d, 'cg', i), st = cell(d, 'stab', i), rl = cell(d, 'refLen', i)
      if (cp === null || cg === null || st === null || rl === null) continue
      worst = Math.max(worst, Math.abs((cp - cg) / rl - st))
      n++
    }
    console.info(`stabilite tutarlılığı: ${n} satır, en büyük fark ${worst.toFixed(4)} kalibre`)
    expect(n).toBeGreaterThan(1000)
    expect(worst).toBeLessThan(0.05)
  })
})

const HEAD = '# Time (s),Altitude (m),Vertical orientation (zenith) (°),Stability margin calibers (​),Yeni Sütun (kPa)'

describe('sentetik girdiler', () => {
  it('yorum ve olay satırları araya serpiştirilmiş', () => {
    const t = ['# Sim A', '# 3 data points written for 5 variables.', '# Simulation warnings:', '#   uyarı bir', '#', HEAD,
      '# Event IGNITION occurred at t=0 seconds', '0,0,85,NaN,1', '# Event FOO_BAR occurred at t=0.5 seconds', '0.5,10,80,1.5,2', '', '# Event APOGEE occurred at t=1 seconds', '1,20,70,1.4,3'].join('\r\n')
    const d = parseFlightText(t)
    expect(d.rows).toBe(3)
    expect(d.events.map((e) => e.type)).toEqual(['IGNITION', 'FOO_BAR', 'APOGEE'])
    expect(d.warnings).toEqual(['uyarı bir'])
    expect(Array.from(d.cols.alt!)).toEqual([0, 10, 20])
    expect(cell(d, 'stab', 0)).toBeNull()
    expect(cell(d, 'stab', 1)).toBe(1.5)
  })
  it('bilinmeyen sütun atılmaz', () => {
    const d = parseFlightText(`${HEAD}\n0,0,85,1,7\n1,5,80,1,8`)
    const c = d.columns.find((x) => x.raw.startsWith('Yeni'))!
    expect(c.known).toBe(false)
    expect(c.group).toBe('Diğer')
    expect(c.key).toBe('yeniSutun')
    expect(c.unit).toBe('kPa')
    expect(Array.from(d.cols.yeniSutun!)).toEqual([7, 8])
  })
  it('eksik sütun çökmez', () => {
    const d = parseFlightText('# Time (s),Altitude (m)\n0,0\n1,5')
    expect(d.cols.mach).toBeUndefined()
    expect(cell(d, 'mach', 0)).toBeNull()
  })
  it('bozuk kodlamayı düzeltir (Mac Roman)', () => {
    const bad = '# Time (s),Vertical orientation (zenith) (¬∞),Stability margin calibers (‚Äã),Wind (m/s¬≤)\n# Simulation warnings:\n#   Ana Para≈ü√ºt a√ßƒ±ldƒ±\n0,1,2,3'
    const fx = fixMojibake(bad)
    expect(fx.fixed).toBe(true)
    expect(fx.text).toContain('(°)')
    expect(fx.text).toContain('m/s²')
    expect(fx.text).toContain('Ana Paraşüt açıldı')
    expect(fx.text).toContain('​')
    const d = parseFlightText(bad)
    expect(d.encodingFixed).toBe(true)
    expect(d.columns[1]!.key).toBe('zenith')
    expect(d.columns[1]!.unit).toBe('°')
    expect(d.warnings[0]).toBe('Ana Paraşüt açıldı')
  })
  it('gerçek UTF-8 baytları bozulmaz', () => {
    const r = decodeFlightBytes(new TextEncoder().encode('# Time (s)\n0').buffer as ArrayBuffer)
    expect(r.fixed).toBe(false)
    expect(fixMojibake('Paraşüt ° ²').fixed).toBe(false)
  })
  it('başlık satırı yoksa anlaşılır hata', () => {
    expect(() => parseFlightText('# Sim\n0,1,2\n3,4,5')).toThrow(FlightParseError)
    expect(() => parseFlightText('# Sim\n0,1,2')).toThrow(/Sütun başlık satırı bulunamadı/)
    expect(() => parseFlightText('')).toThrow(FlightParseError)
    expect(() => parseFlightText('# Altitude (m),Velocity (m/s),a,b,c\n1,2,3,4,5')).toThrow(/Zaman sütunu/)
  })
  it('hatalı sütun sayılı satırı atlar', () => {
    const d = parseFlightText('# Time (s),Altitude (m)\n0,0\n1\n2,5,9\n3,6')
    expect(d.rows).toBe(2)
    expect(d.notes.join(' ')).toMatch(/atlandı/)
  })
  it('100 bin satır hızlı ayrışır', () => {
    const lines = ['# Time (s),Altitude (m),Mach number (​)']
    for (let i = 0; i < 100_000; i++) lines.push(`${i * 0.01},${i % 977},${i % 7 ? 0.5 : 'NaN'}`)
    const t0 = performance.now()
    const d = parseFlightText(lines.join('\n'))
    const ms = performance.now() - t0
    console.info(`100k satır: ${ms.toFixed(0)} ms`)
    expect(d.rows).toBe(100_000)
    expect(ms).toBeLessThan(3000)
  })
})
