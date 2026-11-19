import { describe, expect, it } from 'vitest'
import { buildGore, goreStats, type GoreInput } from '../app/utils/gore'
import { cordList, nestGores } from '../app/utils/goreNest'
import { A4, goreDxf, gorePdf, goreSvg, pdfText, planTiles } from '../app/utils/goreExport'

const inp = (o: Partial<GoreInput> = {}): GoreInput => ({
  d0: 1.0, shape: 'hemisphere', capAngleDeg: 90, n: 8, ventCm: 10,
  seam: { right: 1, top: 1, left: 1, bottom: 1 }, hemCm: 2, join: 'miter', ...o,
})
const latin1 = (b: Uint8Array) => Array.from(b, (c) => String.fromCharCode(c)).join('')

describe('PDF', () => {
  const g = buildGore(inp())
  const { bytes, info } = gorePdf(g, { d0m: 1, n: 8 })
  const txt = latin1(bytes)

  it('geçerli PDF iskeleti: başlık, xref ofsetleri, sayfa sayısı', () => {
    expect(txt.startsWith('%PDF-1.4')).toBe(true)
    expect(txt.trimEnd().endsWith('%%EOF')).toBe(true)
    const sx = Number(/startxref\n(\d+)/.exec(txt)![1])
    expect(txt.slice(sx, sx + 4)).toBe('xref')
    // her nesne ofseti gerçekten "N 0 obj" gösterir
    const m = [...txt.slice(sx).matchAll(/(\d{10}) 00000 n /g)]
    m.forEach((x, i) => expect(txt.slice(Number(x[1]), Number(x[1]) + 10)).toMatch(new RegExp(`^${i + 1} 0 obj`)))
    expect(Number(/\/Count (\d+)/.exec(txt)![1])).toBe(info.pages)
  })
  it('sayfa kutusu A4 (595.276 × 841.890 pt)', () => {
    const mb = /\/MediaBox \[0 0 ([\d.]+) ([\d.]+)\]/.exec(txt)!
    expect(Number(mb[1])).toBeCloseTo((210 / 25.4) * 72, 2)
    expect(Number(mb[2])).toBeCloseTo((297 / 25.4) * 72, 2)
  })
  it('10 cm ölçek karesi PDF birimlerinden hesaplanınca 100,0 mm', () => {
    const r = /% olcek-karesi[\s\S]*?([\d.]+) ([\d.]+) ([\d.]+) ([\d.]+) re S/.exec(txt)!
    const w = Number(r[3])
    const h = Number(r[4])
    expect((w / 72) * 25.4).toBeCloseTo(100, 2)
    expect((h / 72) * 25.4).toBeCloseTo(100, 2)
  })
  it('kalıp çizgisi 1:1: sayfadaki kesim konturunun uzunluğu gerçek boyuttadır', () => {
    // poligon sayfa kırpmasından bağımsız olarak tam yazılır (yalnızca kırpılır); ilk kalıp sayfasında ölç
    const pages = txt.split('/Type /Page /Parent').slice(1)
    expect(pages.length).toBe(info.pages)
    const c = /BT[\s\S]*?ET/.exec(txt) // metin var
    expect(c).toBeTruthy()
    const stream = [...txt.matchAll(/\nstream\n([\s\S]*?)\nendstream/g)][1]![1]! // 2. akış = ilk kalıp sayfası
    const nums = [...stream.matchAll(/(-?[\d.]+) (-?[\d.]+) m ((?:-?[\d.]+ -?[\d.]+ l )+)h S/g)][0]!
    const pts = [[nums[1]!, nums[2]!], ...[...nums[3]!.matchAll(/(-?[\d.]+) (-?[\d.]+) l/g)].map((q) => [q[1]!, q[2]!])].map((p) => [Number(p[0]), Number(p[1])])
    const xs = pts.map((p) => p[0]!)
    const ys = pts.map((p) => p[1]!)
    const wMm = ((Math.max(...xs) - Math.min(...xs)) / 72) * 25.4
    const hMm = ((Math.max(...ys) - Math.min(...ys)) / 72) * 25.4
    const st = goreStats(g)
    expect(wMm).toBeCloseTo(st.boundsW * 10, 1)
    expect(hMm).toBeCloseTo(st.boundsH * 10, 1)
  })
  it('büyük kalıp A4 sayfalara bölünür, taşma bandı 10 mm', () => {
    const big = buildGore(inp({ d0: 3, n: 6 }))
    const p = planTiles(big)
    expect(p.cols * p.rows).toBeGreaterThan(1)
    expect(p.pages).toBeLessThanOrEqual(p.cols * p.rows)
    expect(gorePdf(big, { d0m: 3, n: 6 }).info.pages).toBe(p.pages + 1)
  })
  it('Türkçe metin WinAnsi’ye çevrilir', () => {
    expect(pdfText('Paraşüt ığİŞĞ')).toBe('Parasüt igISG')
    expect(pdfText('şığ')).toBe('sig')
    expect(pdfText('çöü')).toBe('çöü')
    expect(pdfText('a(b)')).toBe('a\\(b\\)')
    expect(A4.w).toBe(210)
  })
})

describe('DXF', () => {
  const g = buildGore(inp())
  const dxf = goreDxf(g)
  it('katmanlar ayrı ve bölümler dengeli', () => {
    for (const l of ['KESIM_DIKIS_PAYI', 'DIKIS_CIZGISI', 'EKSEN', 'OLCEK_KARESI']) expect(dxf).toContain(l)
    expect((dxf.match(/\nSECTION\n/g) ?? []).length).toBe((dxf.match(/\nENDSEC\n/g) ?? []).length)
    expect(dxf.trimEnd().endsWith('EOF')).toBe(true)
  })
  it('birim mm: ölçek karesi 100 mm', () => {
    const verts = [...dxf.split('POLYLINE').slice(-1)[0]!.matchAll(/\n10\n(-?[\d.]+)\n20\n(-?[\d.]+)\n/g)].map((m) => [Number(m[1]), Number(m[2])])
    const xs = verts.map((v) => v[0]!)
    expect(Math.max(...xs) - Math.min(...xs)).toBeCloseTo(100, 2)
  })
  it('kesim konturunun genişliği mm olarak yazılır', () => {
    const cutBlock = dxf.split('KESIM_DIKIS_PAYI').find((s) => s.includes('VERTEX'))!
    expect(cutBlock).toBeTruthy()
    const xs = [...dxf.split('0\nSEQEND')[0]!.matchAll(/\n10\n(-?[\d.]+)\n/g)].map((m) => Number(m[1]))
    expect(Math.max(...xs) - Math.min(...xs)).toBeCloseTo(goreStats(g).boundsW * 10, 1)
  })
})

describe('SVG', () => {
  const g = buildGore(inp())
  it('fiziksel çıktıda width cm cinsindendir ve viewBox ile aynı sayıdır', () => {
    const s = goreSvg(g, { grid: false, dims: false, theme: 'print', physical: true, scaleSquare: true })
    const w = /width="([\d.]+)cm"/.exec(s)![1]!
    const vb = /viewBox="[-\d.]+ [-\d.]+ ([\d.]+) ([\d.]+)"/.exec(s)!
    expect(Number(w)).toBeCloseTo(Number(vb[1]), 2)
    expect(s).toContain('width="10" height="10"')
  })
  it('önizleme: ızgara ve ölçü okları isteğe bağlı', () => {
    const a = goreSvg(g, { grid: true, dims: true, theme: 'screen', physical: false, scaleSquare: false })
    const b = goreSvg(g, { grid: false, dims: false, theme: 'screen', physical: false, scaleSquare: false })
    expect(a.length).toBeGreaterThan(b.length)
    expect(a).toContain('Etek')
    expect(b).not.toContain('Etek')
  })
})

describe('kumaş dizilimi ve kordon', () => {
  it('N × dilim alanı kullanılan alandır; fire ≥ 0, uzunluk ≥ ideal', () => {
    const g = buildGore(inp())
    const r = nestGores(g, 8, { rollWidthCm: 150, pricePerM: 200 })
    expect(r.feasible).toBe(true)
    expect(r.usedAreaCm2).toBeCloseTo(8 * goreStats(g).cutArea, 6)
    expect(r.wastePct!).toBeGreaterThan(0)
    expect(r.wastePct!).toBeLessThan(60)
    expect(r.lengthCm! * 150).toBeGreaterThanOrEqual(r.usedAreaCm2!)
    expect(r.cost).toBeCloseTo((r.lengthCm! / 100) * 200, 6)
    expect(r.polys!.length).toBe(8)
  })
  it('baş-sonlu dizilim, aynı yönlü dizilimden daha kısa kumaş kullanır', () => {
    const g = buildGore(inp())
    const r = nestGores(g, 8, { rollWidthCm: 150, pricePerM: null })
    // aynı yönlü basit sınır: her satır = en geniş dilim kadar yer
    const w = goreStats(g).boundsW
    const perRowSame = Math.floor(150 / w)
    const lenSame = Math.ceil(8 / perRowSame) * goreStats(g).boundsH
    expect(r.lengthCm!).toBeLessThanOrEqual(lenSame + 1e-6)
    expect(r.cost).toBeNull()
  })
  it('yerleşen dilimler birbiriyle çakışmaz (satırda sınır kutuları taşmaz) ve rulo enine sığar', () => {
    const g = buildGore(inp())
    const r = nestGores(g, 8, { rollWidthCm: 150, pricePerM: null })
    for (const poly of r.polys!) {
      const xs = poly.map((p) => p.x)
      expect(Math.min(...xs)).toBeGreaterThanOrEqual(-1e-6)
      expect(Math.max(...xs)).toBeLessThanOrEqual(150 + 1e-6)
    }
  })
  it('sığmayan dilim için net uyarı', () => {
    const g = buildGore(inp({ d0: 3, n: 4 }))
    const r = nestGores(g, 4, { rollWidthCm: 20, pricePerM: null })
    expect(r.feasible).toBe(false)
    expect(r.message).toMatch(/sığmıyor/)
  })
  it('kordon: adet = N, boy = çarpan × D0 + pay', () => {
    const c = cordList(2.4, 8, { factor: 1.0, allowanceCm: 10 })
    expect(c.count).toBe(8)
    expect(c.lengthCm).toBeCloseTo(250, 9)
    expect(c.totalM).toBeCloseTo(20, 9)
  })
})

// ---- çakışma: dışbükey çokgenler için ayırıcı eksen testi (SAT)
type P = { x: number; y: number }
function overlapDepth(A: P[], B: P[]): number {
  let minDepth = Infinity
  for (const poly of [A, B]) {
    for (let i = 0; i < poly.length; i++) {
      const a = poly[i]!
      const b = poly[(i + 1) % poly.length]!
      const nx = b.y - a.y
      const ny = a.x - b.x
      const len = Math.hypot(nx, ny) || 1
      const proj = (q: P) => (q.x * nx + q.y * ny) / len
      const pa = A.map(proj)
      const pb = B.map(proj)
      const depth = Math.min(Math.max(...pa), Math.max(...pb)) - Math.max(Math.min(...pa), Math.min(...pb))
      if (depth <= 0) return 0 // ayırıcı eksen bulundu
      minDepth = Math.min(minDepth, depth)
    }
  }
  return minDepth
}

describe('dizilimde çakışma yok', () => {
  for (const o of [{}, { d0: 2.4, n: 12 }, { shape: 'flat' as const }, { shape: 'cap' as const, capAngleDeg: 120, n: 10 }, { seam: { right: 0, top: 0, left: 0, bottom: 0 }, hemCm: 0 }]) {
    for (const roll of [60, 110, 150, 300]) {
      it(`${JSON.stringify(o)} rulo ${roll} cm`, () => {
        const g = buildGore(inp(o))
        const n = Math.round(g.input.n)
        const r = nestGores(g, n, { rollWidthCm: roll, pricePerM: null })
        if (!r.feasible) return
        expect(r.polys!.length).toBe(n)
        let worst = 0
        for (let i = 0; i < r.polys!.length; i++)
          for (let j = i + 1; j < r.polys!.length; j++) worst = Math.max(worst, overlapDepth(r.polys![i]!, r.polys![j]!))
        expect(worst).toBeLessThan(1e-6)
        for (const poly of r.polys!) {
          expect(Math.min(...poly.map((q) => q.x))).toBeGreaterThanOrEqual(-1e-6)
          expect(Math.max(...poly.map((q) => q.x))).toBeLessThanOrEqual(roll + 1e-6)
          expect(Math.max(...poly.map((q) => q.y))).toBeLessThanOrEqual(r.lengthCm! + 1e-6)
        }
      })
    }
  }
})
