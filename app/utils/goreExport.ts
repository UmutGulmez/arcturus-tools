// Dilim kalıbı dışa aktarımı: SVG (önizleme ve 1:1 dosya), PDF (A4 parçalı, 1:1) ve DXF (R12).
// Üçü de bağımlılıksız, elle yazılmış metin üreticileridir. Birim: SVG'de cm, PDF/DXF'de mm.
import type { Gore, Pt } from './gore'

const f3 = (v: number) => (Math.abs(v) < 5e-7 ? 0 : v).toFixed(3)

export interface Bounds { minX: number; minY: number; maxX: number; maxY: number }

export function boundsOf(pts: Pt[]): Bounds {
  const xs = pts.map((p) => p.x)
  const ys = pts.map((p) => p.y)
  return { minX: Math.min(...xs), maxX: Math.max(...xs), minY: Math.min(...ys), maxY: Math.max(...ys) }
}

const shapeLabel = (g: Gore) =>
  g.input.shape === 'hemisphere' ? 'Yarım küre' : g.input.shape === 'cap' ? `Küre kapağı ${g.input.capAngleDeg}°` : 'Düz (çokgen)'

/* ============================== SVG ============================== */

export interface SvgOpts {
  grid: boolean
  dims: boolean
  /** 'screen': koyu zemin için açık çizgiler; 'print': beyaz zemin, siyah çizgiler (dosya). */
  theme: 'screen' | 'print'
  /** true: width/height cm cinsinden yazılır (1:1). */
  physical: boolean
  scaleSquare: boolean
}

function ptsAttr(p: Pt[]) {
  return p.map((q) => `${f3(q.x)},${f3(q.y)}`).join(' ')
}

export function goreSvg(g: Gore, o: SvgOpts): string {
  const b = boundsOf(g.cut)
  // Ölçü yazıları büyük kalıplarda da okunur kalsın diye çizim boyutuyla ölçeklenir
  const k = o.dims ? Math.max(1, Math.max(b.maxX - b.minX, b.maxY - b.minY) / 24) : 1
  const m = o.dims ? 2.9 * k : 1.5
  const sq = o.scaleSquare ? 10 : 0
  const minX = b.minX - m
  const minY = b.minY - m
  let w = b.maxX - b.minX + 2 * m
  let h = b.maxY - b.minY + 2 * m + (sq ? sq + 2.5 : 0)
  const light = o.theme === 'screen'
  const cutC = light ? '#f4f4f5' : '#000000'
  const seamC = light ? '#f59e0b' : '#d00000'
  const axisC = light ? '#71717a' : '#555555'
  const gridC = light ? '#2a3350' : '#d9d9d9'
  const textC = light ? '#a1a1aa' : '#222222'
  const sw = 0.06
  const fs = 0.55 * k
  const out: string[] = []
  const x0 = minX
  const y0 = minY
  const x1 = minX + w
  const y1 = minY + h

  if (o.grid) {
    const gl: string[] = []
    for (let x = Math.ceil(x0); x <= x1; x++) gl.push(`M${x} ${f3(y0)}V${f3(y1)}`)
    for (let y = Math.ceil(y0); y <= y1; y++) gl.push(`M${f3(x0)} ${y}H${f3(x1)}`)
    out.push(`<path d="${gl.join('')}" stroke="${gridC}" stroke-width="0.02" fill="none"/>`)
  }
  // dikiş payı dahil kesim çizgisi ve dikiş çizgisi
  out.push(`<polygon points="${ptsAttr(g.cut)}" fill="${light ? 'rgba(245,158,11,0.06)' : 'none'}" stroke="${cutC}" stroke-width="${sw}" stroke-linejoin="miter"/>`)
  out.push(`<polygon points="${ptsAttr(g.contour)}" fill="none" stroke="${seamC}" stroke-width="${sw}" stroke-dasharray="0.3 0.18"/>`)
  // eksen (kumaş damar yönü): dilim ortasından
  out.push(`<line x1="0" y1="${f3(b.minY - 0.8)}" x2="0" y2="${f3(b.maxY + 0.8)}" stroke="${axisC}" stroke-width="0.04" stroke-dasharray="0.6 0.15 0.08 0.15"/>`)

  if (o.dims) {
    const arrow = (ax: number, ay: number, bx: number, by: number, label: string, lx: number, ly: number, anchor = 'middle', rot = 0) => {
      const L = Math.hypot(bx - ax, by - ay) || 1
      const ux = (bx - ax) / L
      const uy = (by - ay) / L
      const hd = 0.4 * k
      const hw = 0.14 * k
      const head = (px: number, py: number, dir: number) =>
        `<polygon points="${f3(px)},${f3(py)} ${f3(px - dir * ux * hd - uy * hw)},${f3(py - dir * uy * hd + ux * hw)} ${f3(px - dir * ux * hd + uy * hw)},${f3(py - dir * uy * hd - ux * hw)}" fill="${textC}"/>`
      out.push(`<line x1="${f3(ax)}" y1="${f3(ay)}" x2="${f3(bx)}" y2="${f3(by)}" stroke="${textC}" stroke-width="${0.04 * k}"/>`)
      out.push(head(ax, ay, -1), head(bx, by, 1))
      const tr = rot ? ` transform="rotate(${rot} ${f3(lx)} ${f3(ly)})"` : ''
      out.push(`<text x="${f3(lx)}" y="${f3(ly)}" font-size="${fs}" fill="${textC}" text-anchor="${anchor}" font-family="ui-sans-serif,system-ui,sans-serif"${tr}>${label}</text>`)
    }
    const wb = g.widthBottom
    const wt = g.widthTop
    const yb = b.maxY + 1.2 * k
    arrow(-wb / 2, yb, wb / 2, yb, `Etek ${wb.toFixed(1)} cm`, 0, yb + 0.95 * k)
    const yt = b.minY - 1.2 * k
    arrow(-wt / 2, yt, wt / 2, yt, `Tepe ${wt.toFixed(1)} cm`, 0, yt - 0.4 * k)
    const xr = b.maxX + 1.6 * k
    arrow(xr, 0, xr, g.height, `Yükseklik ${g.height.toFixed(1)} cm`, xr + 0.95 * k, g.height / 2, 'middle', 90)
  }
  if (sq) {
    const sx = -5
    const top = y1 - sq - 0.6
    out.push(`<rect x="${sx}" y="${f3(top)}" width="10" height="10" fill="none" stroke="${cutC}" stroke-width="${sw}"/>`)
    out.push(`<text x="0" y="${f3(top + 5.2)}" font-size="${fs}" fill="${textC}" text-anchor="middle" font-family="ui-sans-serif,system-ui,sans-serif">10 cm × 10 cm ölçek karesi</text>`)
  }

  const size = o.physical ? ` width="${f3(w)}cm" height="${f3(h)}cm"` : ''
  const bg = light ? '' : `<rect x="${f3(x0)}" y="${f3(y0)}" width="${f3(w)}" height="${f3(h)}" fill="#ffffff"/>`
  w = Math.round(w * 1000) / 1000
  h = Math.round(h * 1000) / 1000
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${f3(x0)} ${f3(y0)} ${f3(w)} ${f3(h)}"${size} preserveAspectRatio="xMidYMid meet">${bg}${out.join('')}</svg>`
}

/* ============================== DXF ============================== */

/** DXF R12 (AC1009). Birim mm. Y ekseni ters çevrilir (tepe yukarıda). Katmanlar ayrı. */
export function goreDxf(g: Gore): string {
  const L: string[] = []
  const add = (...v: (string | number)[]) => v.forEach((x) => L.push(String(x)))
  const mm = (cm: number) => cm * 10
  const poly = (layer: string, pts: Pt[], closed: boolean) => {
    add(0, 'POLYLINE', 8, layer, 66, 1, 70, closed ? 1 : 0)
    for (const p of pts) add(0, 'VERTEX', 8, layer, 10, f3(mm(p.x)), 20, f3(-mm(p.y)), 30, 0)
    add(0, 'SEQEND', 8, layer)
  }
  const line = (layer: string, a: Pt, c: Pt) =>
    add(0, 'LINE', 8, layer, 10, f3(mm(a.x)), 20, f3(-mm(a.y)), 30, 0, 11, f3(mm(c.x)), 21, f3(-mm(c.y)), 31, 0)

  add(0, 'SECTION', 2, 'HEADER', 9, '$ACADVER', 1, 'AC1009', 0, 'ENDSEC')
  add(0, 'SECTION', 2, 'TABLES')
  add(0, 'TABLE', 2, 'LTYPE', 70, 2)
  add(0, 'LTYPE', 2, 'CONTINUOUS', 70, 0, 3, 'Solid line', 72, 65, 73, 0, 40, 0.0)
  add(0, 'LTYPE', 2, 'DASHED', 70, 0, 3, 'Dashed', 72, 65, 73, 2, 40, 15.0, 49, 10.0, 49, -5.0)
  add(0, 'ENDTAB')
  add(0, 'TABLE', 2, 'LAYER', 70, 4)
  add(0, 'LAYER', 2, 'KESIM_DIKIS_PAYI', 70, 0, 62, 7, 6, 'CONTINUOUS')
  add(0, 'LAYER', 2, 'DIKIS_CIZGISI', 70, 0, 62, 1, 6, 'DASHED')
  add(0, 'LAYER', 2, 'EKSEN', 70, 0, 62, 8, 6, 'DASHED')
  add(0, 'LAYER', 2, 'OLCEK_KARESI', 70, 0, 62, 3, 6, 'CONTINUOUS')
  add(0, 'ENDTAB', 0, 'ENDSEC')
  add(0, 'SECTION', 2, 'ENTITIES')
  poly('KESIM_DIKIS_PAYI', g.cut, true)
  poly('DIKIS_CIZGISI', g.contour, true)
  const b = boundsOf(g.cut)
  line('EKSEN', { x: 0, y: b.minY - 0.8 }, { x: 0, y: b.maxY + 0.8 })
  // 10 cm ölçek karesi: kalıbın sağında
  const sx = b.maxX + 3
  poly('OLCEK_KARESI', [{ x: sx, y: b.minY }, { x: sx + 10, y: b.minY }, { x: sx + 10, y: b.minY + 10 }, { x: sx, y: b.minY + 10 }], true)
  add(0, 'ENDSEC', 0, 'EOF')
  return L.join('\n') + '\n'
}

/* ============================== PDF ============================== */

const MM = 72 / 25.4
export const A4 = { w: 210, h: 297 }
const MARGIN = 10 // mm
const OVERLAP = 10 // mm
const CW = A4.w - 2 * MARGIN // 190
const CH = A4.h - 2 * MARGIN // 277

/** Standart Helvetica (WinAnsi) için metin: ğ ş ı İ Ş Ğ ASCII'ye düşer; ç ö ü korunur. */
export function pdfText(s: string): string {
  const map: Record<string, string> = { ğ: 'g', Ğ: 'G', ı: 'i', İ: 'I', ş: 's', Ş: 'S', '–': '-', '—': '-', '’': "'", '≈': '~' }
  let out = ''
  for (const ch of s) {
    const c = map[ch] ?? ch
    out += c.charCodeAt(0) <= 255 ? c : '?'
  }
  return out.replace(/\\/g, '\\\\').replace(/\(/g, '\\(').replace(/\)/g, '\\)')
}

export interface TilePlan {
  cols: number
  rows: number
  drawW: number // mm
  drawH: number
  /** [satır][sütun] -> basılacak mı (geometri var mı) */
  used: boolean[][]
  pages: number
  /** Kalıbın çizim koordinatına kayması (mm). */
  offX: number
  offY: number
}

const DRAW_MARGIN = 10 // mm, kalıp çevresindeki boşluk

export function planTiles(g: Gore): TilePlan {
  const b = boundsOf(g.cut)
  const drawW = (b.maxX - b.minX) * 10 + 2 * DRAW_MARGIN
  const drawH = (b.maxY - b.minY) * 10 + 2 * DRAW_MARGIN
  const stepX = CW - OVERLAP
  const stepY = CH - OVERLAP
  const cols = Math.max(1, Math.ceil((drawW - OVERLAP) / stepX))
  const rows = Math.max(1, Math.ceil((drawH - OVERLAP) / stepY))
  const offX = DRAW_MARGIN - b.minX * 10
  const offY = DRAW_MARGIN - b.minY * 10
  // Kontur boyunca yoğun örnekleme; bir kutuya düşen nokta varsa sayfa basılır
  const samples: Pt[] = []
  for (const poly of [g.cut]) {
    for (let i = 0; i < poly.length; i++) {
      const a = poly[i]!
      const c = poly[(i + 1) % poly.length]!
      const len = Math.hypot(c.x - a.x, c.y - a.y) * 10
      const k = Math.max(1, Math.ceil(len / 4))
      for (let j = 0; j <= k; j++) samples.push({ x: (a.x + ((c.x - a.x) * j) / k) * 10 + offX, y: (a.y + ((c.y - a.y) * j) / k) * 10 + offY })
    }
  }
  const used: boolean[][] = []
  let pages = 0
  for (let r = 0; r < rows; r++) {
    used.push([])
    for (let c = 0; c < cols; c++) {
      const x0 = c * stepX
      const y0 = r * stepY
      const u = samples.some((p) => p.x >= x0 && p.x <= x0 + CW && p.y >= y0 && p.y <= y0 + CH)
      used[r]!.push(u)
      if (u) pages++
    }
  }
  return { cols, rows, drawW, drawH, used, pages, offX, offY }
}

class Page {
  s: string[] = []
  op(x: string) { this.s.push(x) }
  /** mm cinsinden üst-sol köşeli sayfa koordinatını PDF puntosuna çevirir. */
  X(mm: number) { return f3(mm * MM) }
  Y(mm: number) { return f3((A4.h - mm) * MM) }
  line(x1: number, y1: number, x2: number, y2: number) { this.op(`${this.X(x1)} ${this.Y(y1)} m ${this.X(x2)} ${this.Y(y2)} l S`) }
  poly(pts: { x: number; y: number }[], close = true) {
    this.op(pts.map((p, i) => `${this.X(p.x)} ${this.Y(p.y)} ${i === 0 ? 'm' : 'l'}`).join(' ') + (close ? ' h S' : ' S'))
  }
  text(x: number, y: number, size: number, t: string, bold = false) {
    this.op(`BT /${bold ? 'F2' : 'F1'} ${size} Tf ${this.X(x)} ${this.Y(y)} Td (${pdfText(t)}) Tj ET`)
  }
}

function crossMark(p: Page, x: number, y: number) {
  const r = 4
  p.op('0.5 w [] 0 d')
  p.line(x - r, y, x + r, y)
  p.line(x, y - r, x, y + r)
  // küçük daire (hedef)
  const k = 1.4 * MM
  const cx = x * MM
  const cy = (A4.h - y) * MM
  p.op(`${f3(cx + k)} ${f3(cy)} m ${f3(cx + k)} ${f3(cy + 0.5523 * k)} ${f3(cx + 0.5523 * k)} ${f3(cy + k)} ${f3(cx)} ${f3(cy + k)} c ` +
    `${f3(cx - 0.5523 * k)} ${f3(cy + k)} ${f3(cx - k)} ${f3(cy + 0.5523 * k)} ${f3(cx - k)} ${f3(cy)} c ` +
    `${f3(cx - k)} ${f3(cy - 0.5523 * k)} ${f3(cx - 0.5523 * k)} ${f3(cy - k)} ${f3(cx)} ${f3(cy - k)} c ` +
    `${f3(cx + 0.5523 * k)} ${f3(cy - k)} ${f3(cx + k)} ${f3(cy - 0.5523 * k)} ${f3(cx + k)} ${f3(cy)} c S`)
}

export interface PdfInfo { pages: number; cols: number; rows: number }

export function gorePdf(g: Gore, meta: { d0m: number; n: number }): { bytes: Uint8Array; info: PdfInfo } {
  const plan = planTiles(g)
  const stepX = CW - OVERLAP
  const stepY = CH - OVERLAP
  const pagesContent: string[] = []
  const toMm = (pts: Pt[]) => pts.map((p) => ({ x: p.x * 10 + plan.offX, y: p.y * 10 + plan.offY }))
  const cutMm = toMm(g.cut)
  const seamMm = toMm(g.contour)

  // --- Kapak sayfası: ölçek karesi ve yönerge
  {
    const p = new Page()
    p.text(MARGIN, 18, 16, 'Paraşüt dilim kalıbı (1:1)', true)
    p.text(MARGIN, 26, 10, `${shapeLabel(g)} · Nominal çap D0 = ${(meta.d0m * 100).toFixed(1)} cm · ${meta.n} dilim`)
    p.text(MARGIN, 32, 10, `Dilim yüksekliği ${g.height.toFixed(1)} cm · etek genişliği ${g.widthBottom.toFixed(1)} cm · tepe genişliği ${g.widthTop.toFixed(1)} cm`)
    p.text(MARGIN, 44, 11, 'YAZDIRMA AYARI', true)
    p.text(MARGIN, 50, 10, 'Ölçek: %100 / "Gerçek boyut" (Sığdır, Sayfaya uydur, Küçült KAPALI). Kağıt: A4.')
    p.text(MARGIN, 56, 10, 'Yazdırdıktan sonra aşağıdaki kareyi cetvelle ölçün: kenarları tam 10,0 cm olmalı.')
    // ölçek karesi
    const sx = MARGIN
    const sy = 64
    p.op('% olcek-karesi')
    p.op('0.6 w [] 0 d 0 G')
    p.op(`${p.X(sx)} ${f3((A4.h - sy - 100) * MM)} ${f3(100 * MM)} ${f3(100 * MM)} re S`)
    p.text(sx + 8, sy + 52, 11, '10 cm × 10 cm ölçek karesi', true)
    p.text(sx + 8, sy + 58, 9, 'Ölçü 10,0 cm değilse yazıcı ayarını düzeltip yeniden yazdırın.')
    // sağ taraf: sayfa düzeni haritası
    const mx = 125
    const my = 70
    p.text(mx, 64, 11, 'Sayfa düzeni', true)
    const cell = Math.min(14, 70 / Math.max(plan.cols, plan.rows))
    let no = 0
    p.op('0.4 w')
    for (let r = 0; r < plan.rows; r++) {
      for (let c = 0; c < plan.cols; c++) {
        const x = mx + c * cell
        const y = my + r * cell
        p.op(`${p.X(x)} ${f3((A4.h - y - cell) * MM)} ${f3(cell * MM)} ${f3(cell * MM)} re S`)
        if (plan.used[r]![c]) {
          no++
          p.text(x + cell / 2 - 1.2, y + cell / 2 + 1.5, 9, String(no + 1))
        } else p.text(x + cell / 2 - 1, y + cell / 2 + 1.5, 8, '-')
      }
    }
    p.text(mx, my + plan.rows * cell + 6, 8, `Kağıt numaraları. "-": basılmaz. Toplam ${plan.pages + 1} sayfa (bu kapak dahil).`)
    // yönerge
    const iy = 180
    p.text(MARGIN, iy, 11, 'BİRLEŞTİRME YÖNERGESİ', true)
    const steps = [
      `1. ${plan.pages} kalıp sayfasını yazdırın (bu kapak sayfası kalıp değildir).`,
      '2. Her sayfanın dört köşesindeki hedef işaretlerini (artı + daire) kesmeden bırakın; sayfaları kenarlarındaki',
      `   ${OVERLAP} mm'lik taşma bandı üst üste gelecek şekilde, komşu sayfanın işaretleriyle çakıştırarak hizalayın.`,
      '3. Soldan sağa, yukarıdan aşağıya sırayla birleştirin (yukarıdaki düzen haritası). Bantla yapıştırın.',
      '4. Düz çizgi = kesim çizgisi (dikiş payı dahil). Kırmızı kesikli çizgi = dikiş çizgisi. Ortadaki çizgi = kumaş ekseni.',
      '5. Kalıbı kumaşa dikiş payı dahil çizgiden kesin. Kumaşın damar yönünü eksenle hizalayın.',
    ]
    steps.forEach((t, i) => p.text(MARGIN, iy + 7 + i * 5.5, 9, t))
    p.text(MARGIN, 280, 8, 'Arcturus Tools · Paraşüt Kalıp Oluşturucu · Tüm hesaplar tarayıcıda yapıldı.')
    pagesContent.push(p.s.join('\n'))
  }

  // --- Kalıp sayfaları
  let pageNo = 1
  for (let r = 0; r < plan.rows; r++) {
    for (let c = 0; c < plan.cols; c++) {
      if (!plan.used[r]![c]) continue
      pageNo++
      const p = new Page()
      const ox = c * stepX
      const oy = r * stepY
      // kırpma alanı
      p.op('q')
      p.op(`${p.X(MARGIN)} ${f3((A4.h - MARGIN - CH) * MM)} ${f3(CW * MM)} ${f3(CH * MM)} re W n`)
      const tf = (q: { x: number; y: number }) => ({ x: MARGIN + q.x - ox, y: MARGIN + q.y - oy })
      p.op('0 G 0.9 w [] 0 d')
      p.poly(cutMm.map(tf))
      p.op('0.8 0 0 RG 0.6 w [8 5] 0 d')
      p.poly(seamMm.map(tf))
      p.op('0.4 G 0.4 w [14 3 2 3] 0 d')
      const a = tf({ x: plan.offX, y: DRAW_MARGIN - 4 })
      p.line(a.x, a.y, a.x, a.y + plan.drawH)
      p.op('Q')
      // taşma bandı sınırları (ince kesikli) ve kayıt işaretleri
      p.op('0 G 0.25 w [2 2] 0 d 0.6 G')
      p.line(MARGIN, MARGIN + OVERLAP, MARGIN + CW, MARGIN + OVERLAP)
      p.line(MARGIN + OVERLAP, MARGIN, MARGIN + OVERLAP, MARGIN + CH)
      p.line(MARGIN, MARGIN + CH - OVERLAP, MARGIN + CW, MARGIN + CH - OVERLAP)
      p.line(MARGIN + CW - OVERLAP, MARGIN, MARGIN + CW - OVERLAP, MARGIN + CH)
      p.op('0 G')
      for (const [x, y] of [[MARGIN, MARGIN], [MARGIN + CW, MARGIN], [MARGIN, MARGIN + CH], [MARGIN + CW, MARGIN + CH]] as const) crossMark(p, x, y)
      p.op('0 g')
      p.text(MARGIN + 8, 6, 8, `Paraşüt dilim kalıbı · Sayfa ${pageNo}/${plan.pages + 1} · Satır ${r + 1}, Sütun ${c + 1} · %100 ölçek`)
      pagesContent.push(p.s.join('\n'))
    }
  }

  // --- PDF'i ham bayt olarak birleştir (latin-1: 1 karakter = 1 bayt)
  const objs: string[] = []
  const pageIds: number[] = []
  // 1: katalog, 2: sayfalar, 3: F1, 4: F2; sonra sayfa/içerik çiftleri
  objs.push('<< /Type /Catalog /Pages 2 0 R >>')
  objs.push('') // yer tutucu
  objs.push('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>')
  objs.push('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>')
  for (const content of pagesContent) {
    const pid = objs.length + 1
    pageIds.push(pid)
    objs.push(
      `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${f3(A4.w * MM)} ${f3(A4.h * MM)}] /Resources << /Font << /F1 3 0 R /F2 4 0 R >> >> /Contents ${pid + 1} 0 R >>`,
    )
    objs.push(`<< /Length ${content.length} >>\nstream\n${content}\nendstream`)
  }
  objs[1] = `<< /Type /Pages /Count ${pageIds.length} /Kids [${pageIds.map((i) => `${i} 0 R`).join(' ')}] >>`
  let out = '%PDF-1.4\n%âãÏÓ\n'
  const offsets: number[] = []
  objs.forEach((o, i) => {
    offsets.push(out.length)
    out += `${i + 1} 0 obj\n${o}\nendobj\n`
  })
  const xref = out.length
  out += `xref\n0 ${objs.length + 1}\n0000000000 65535 f \n`
  for (const off of offsets) out += `${String(off).padStart(10, '0')} 00000 n \n`
  out += `trailer\n<< /Size ${objs.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`
  const bytes = new Uint8Array(out.length)
  for (let i = 0; i < out.length; i++) bytes[i] = out.charCodeAt(i) & 0xff
  return { bytes, info: { pages: pagesContent.length, cols: plan.cols, rows: plan.rows } }
}

/** 5 cm adımlı istasyon çizelgesi (CSV). */
export function stationsCsvRows(st: { y: number; width: number; cutWidth: number }[]): (string | number)[][] {
  const rows: (string | number)[][] = [['Tepe deliği kenarından uzaklık (cm)', 'Dikiş çizgisi genişliği (cm)', 'Kesim genişliği, dikiş payı dahil (cm)']]
  for (const s of st) rows.push([+s.y.toFixed(2), +s.width.toFixed(2), +s.cutWidth.toFixed(2)])
  return rows
}
