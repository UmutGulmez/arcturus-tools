// ChuteMaker (rckTom, GPL-3.0) ile karşılaştırma. Kodu kullanılmaz; yalnızca aynı girdilerle
// yerelde çalıştırılıp alınan SAYISAL çıktı (mm) referans olarak tests/fixtures altında tutulur.
// ChuteMaker "çap" parametresi küre çapıdır (2R); bu araçta nominal çap D0 ve R = D0/(2√2)'dir.
// Bu yüzden ChuteMaker'a 2R = D0/√2 verildi.
import { describe, expect, it } from 'vitest'
import { buildGore, halfWidthAt, type GoreInput } from '../app/utils/gore'
import a from './fixtures/chutemaker-a.json'
import b from './fixtures/chutemaker-b.json'
import c from './fixtures/chutemaker-c.json'

type Ref = { right: [number, number][]; top: [number, number][]; left: [number, number][]; bottom: [number, number][] }
const cases: [string, Ref, number, number, number][] = [
  ['D0=1.0 m, N=8, vent 10 cm', a as Ref, 1.0, 8, 10],
  ['D0=2.4 m, N=12, vent 24 cm', b as Ref, 2.4, 12, 24],
  ['D0=0.8 m, N=6, vent ~0', c as Ref, 0.8, 6, 0.1],
]

describe.each(cases)('ChuteMaker karşılaştırması: %s', (_name, ref, d0, n, vent) => {
  const inp: GoreInput = { d0, shape: 'hemisphere', capAngleDeg: 90, n, ventCm: vent, seam: { right: 0, top: 0, left: 0, bottom: 0 }, hemCm: 0, join: 'miter' }
  const g = buildGore(inp)
  const mm = (cm: number) => cm * 10
  const refH = Math.max(...ref.right.map((p) => p[1]))

  it('dilim yüksekliği uyuşur (< 0,01 mm)', () => {
    expect(Math.abs(mm(g.height) - refH)).toBeLessThan(0.01)
  })
  it('etek (ekvator) ve tepe genişlikleri uyuşur', () => {
    const refBottom = 2 * ref.right[0]![0]
    const refTop = 2 * ref.right.at(-1)![0]
    expect(Math.abs(mm(g.widthBottom) - refBottom)).toBeLessThan(0.01)
    expect(Math.abs(mm(g.widthTop) - refTop)).toBeLessThan(0.01)
  })
  it('tüm referans noktalarında genişlik farkı < 0,05 mm', () => {
    let maxDiff = 0
    for (const [x, y] of ref.right) {
      // ChuteMaker'ın y'si etekten (0) tepeye doğru artar; bu araçta tepeden etege
      const ours = mm(halfWidthAt(g, (refH - y) / 10))
      maxDiff = Math.max(maxDiff, Math.abs(ours - x))
    }
    expect(maxDiff).toBeLessThan(0.05)
  })
})
