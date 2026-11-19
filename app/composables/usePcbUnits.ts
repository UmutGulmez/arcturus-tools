import { parseNumber } from '~/utils/format'
import { milToMm, mmToMil, ozToUm, umToOz } from '~/utils/pcbUnits'

/** Sayfa genelinde ortak birim seçimi (mm↔mil, oz↔µm). SSR-uyumlu (useState). */
export function usePcbUnits() {
  const len = useState<'mm' | 'mil'>('pcb-len', () => 'mm')
  const cu = useState<'oz' | 'um'>('pcb-cu', () => 'oz')
  return {
    len,
    cu,
    lenToMm: (v: number) => (len.value === 'mm' ? v : milToMm(v)),
    mmToLen: (mm: number) => (len.value === 'mm' ? mm : mmToMil(mm)),
    cuToUm: (v: number) => (cu.value === 'oz' ? ozToUm(v) : v),
    umToCu: (um: number) => (cu.value === 'oz' ? umToOz(um) : um),
  }
}

const round = (x: number) => String(Number(x.toPrecision(5)))

/** Birim anahtarı değişince, form içindeki ilgili alanların sayısal değerini yeni birime çevirir. */
export function convertFieldsOnUnitChange(form: Record<string, string>, lenKeys: string[], cuKeys: string[]) {
  const { len, cu } = usePcbUnits()
  watch(len, (now, old) => {
    for (const k of lenKeys) {
      const v = parseNumber(String(form[k]))
      if (v !== null && now !== old) form[k] = round(now === 'mil' ? mmToMil(v) : milToMm(v))
    }
  })
  watch(cu, (now, old) => {
    for (const k of cuKeys) {
      const v = parseNumber(String(form[k]))
      if (v !== null && now !== old) form[k] = round(now === 'um' ? ozToUm(v) : umToOz(v))
    }
  })
}
