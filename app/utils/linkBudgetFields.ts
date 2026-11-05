// Hat formu: alan tanımları, doğrulama ve metin→LineInputs çözümleyici (Vue'dan bağımsız).
import { validateField } from './parachuteFields'
import type { FieldSpec } from './parachuteFields'
import { BW_OPTIONS, parsePatternCsv } from './linkBudget'
import type { LineInputs } from './linkBudget'

export type LineForm = Record<string, string>

export type NumKey = 'freq' | 'ptx' | 'gtx' | 'ltx' | 'grx' | 'lrx' | 'sensDs' | 'nf' | 'preamble' | 'payload' | 'horizKm' | 'altM' | 'gsH' | 'slantKm' | 'elev' | 'pol' | 'patManual' | 'patCap' | 'body' | 'yagiBeam' | 'yagiErr' | 'multipath' | 'atmos' | 'extra' | 'lpropSingle' | 'minMargin' | 'pktBytes' | 'pktRate' | 'duty' | 'eirpLimit'

const n = (s: FieldSpec) => s
export const NUM: Record<NumKey, FieldSpec> = {
  freq: n({ key: 'freq', label: 'Frekans', unit: 'MHz', required: true, min: 0, minExclusive: true, max: 100000, defaultValue: '', help: 'Taşıyıcı frekansı. Hazır seçenekler yukarıda.' }),
  ptx: n({ key: 'ptx', label: 'Verici çıkış gücü', unit: 'dBm', required: true, min: -50, max: 70, defaultValue: '', help: 'Modül çıkış gücü. mW ↔ dBm dönüştürücüyü kullanabilirsiniz.' }),
  gtx: n({ key: 'gtx', label: 'Verici anten kazancı', unit: 'dBi', required: true, min: -30, max: 50, defaultValue: '', help: 'Roket üzerindeki anten kazancı (kendi değerinizi girin).' }),
  ltx: n({ key: 'ltx', label: 'Verici bileşen kaybı (L_tx)', unit: 'dB', min: 0, max: 50, defaultValue: '0', help: 'Kablo, konnektör, modül içi kayıplar.' }),
  grx: n({ key: 'grx', label: 'Alıcı anten kazancı', unit: 'dBi', required: true, min: -30, max: 60, defaultValue: '', help: 'Yer istasyonu anten kazancı.' }),
  lrx: n({ key: 'lrx', label: 'Alıcı bileşen kaybı (L_rx)', unit: 'dB', min: 0, max: 50, defaultValue: '0', help: 'Kablo, konnektör, LNA öncesi kayıplar.' }),
  sensDs: n({ key: 'sensDs', label: 'Datasheet hassasiyeti', unit: 'dBm', min: -200, max: -20, defaultValue: '', help: 'Üretici hassasiyeti; hangi hava hızı/SF/BW için geçerli olduğunu aşağıya yazın.' }),
  nf: n({ key: 'nf', label: 'Gürültü figürü (NF)', unit: 'dB', min: 0, max: 30, defaultValue: '6', help: 'Teorik hassasiyet için alıcı gürültü figürü.' }),
  preamble: n({ key: 'preamble', label: 'Preamble', unit: 'sembol', integer: true, min: 0, max: 65535, defaultValue: '8', help: 'Preamble sembol sayısı.' }),
  payload: n({ key: 'payload', label: 'Payload', unit: 'bayt', integer: true, min: 1, max: 255, defaultValue: '20', help: 'Airtime hesabı için payload boyutu.' }),
  horizKm: n({ key: 'horizKm', label: 'Yatay mesafe', unit: 'km', min: 0, minExclusive: true, max: 5000, defaultValue: '', help: 'Yer istasyonu – roket yatay mesafesi.' }),
  altM: n({ key: 'altM', label: 'Roket irtifası', unit: 'm', min: 0, max: 200000, defaultValue: '', help: 'Yerden yükseklik (AGL).' }),
  gsH: n({ key: 'gsH', label: 'Yer anteni yüksekliği', unit: 'm', min: 0, max: 10000, defaultValue: '0', help: 'Yer istasyonu anteninin yüksekliği.' }),
  slantKm: n({ key: 'slantKm', label: 'Eğik mesafe', unit: 'km', min: 0, minExclusive: true, max: 5000, defaultValue: '', help: 'Doğrudan eğik mesafe (alternatif mod).' }),
  elev: n({ key: 'elev', label: 'Yükselme açısı', unit: '°', min: 0, max: 90, defaultValue: '0', help: 'Eğik mesafe modunda anten deseni kaybı için; yataydan ölçülür.' }),
  pol: n({ key: 'pol', label: 'Polarizasyon uyumsuzluğu', unit: 'dB', min: 0, max: 60, defaultValue: '0', help: 'Aynı lineer = 0, lineer–dairesel = 3.' }),
  patManual: n({ key: 'patManual', label: 'Anten deseni kaybı', unit: 'dB', min: 0, max: 60, defaultValue: '0', help: 'Elle girilen desen kaybı.' }),
  patCap: n({ key: 'patCap', label: 'Desen kaybı üst sınırı', unit: 'dB', min: 0, minExclusive: true, max: 80, defaultValue: '30', help: 'İdeal dipol çukurunda kayıp bu değerde kesilir.' }),
  body: n({ key: 'body', label: 'Gövde/fairing gölgelemesi', unit: 'dB', min: 0, max: 60, defaultValue: '0', help: 'Roket gövdesi veya burun konisinin gölgeleme kaybı.' }),
  yagiBeam: n({ key: 'yagiBeam', label: 'Yagi 3 dB hüzme genişliği', unit: '°', min: 0, minExclusive: true, max: 360, defaultValue: '', help: 'Boş bırakılırsa hizalama kaybı hesaplanmaz.' }),
  yagiErr: n({ key: 'yagiErr', label: 'Yönlendirme hatası', unit: '°', min: 0, max: 180, defaultValue: '0', help: 'Yer anteninin roketi izleme hatası.' }),
  multipath: n({ key: 'multipath', label: 'Multipath/fade payı', unit: 'dB', min: 0, max: 60, defaultValue: '0', help: 'Çok yollu yayılım ve hızlı sönümleme için ayrılan pay.' }),
  atmos: n({ key: 'atmos', label: 'Atmosfer/yağmur', unit: 'dB', min: 0, max: 60, defaultValue: '0', help: 'Atmosferik soğurma ve yağmur kaybı.' }),
  extra: n({ key: 'extra', label: 'Ek kayıp', unit: 'dB', min: 0, max: 60, defaultValue: '0', help: 'Yukarıdakilerin dışında kalan kayıplar.' }),
  lpropSingle: n({ key: 'lpropSingle', label: 'L_prop (tek kalem)', unit: 'dB', min: 0, max: 150, defaultValue: '0', help: 'Tüm yayılım kayıplarının toplamı (mevcut raporlarla karşılaştırma için).' }),
  minMargin: n({ key: 'minMargin', label: 'İstenen minimum fade marjı', unit: 'dB', min: 0, max: 60, defaultValue: '10', help: 'Link yeterli sayılması için gereken marj.' }),
  pktBytes: n({ key: 'pktBytes', label: 'Telemetri paket boyutu', unit: 'bayt', min: 0, minExclusive: true, max: 255, defaultValue: '', help: 'Veri bütçesi için (isteğe bağlı).' }),
  pktRate: n({ key: 'pktRate', label: 'İstenen paket hızı', unit: 'paket/s', min: 0, minExclusive: true, max: 10000, defaultValue: '', help: 'Saniyedeki paket sayısı.' }),
  duty: n({ key: 'duty', label: 'Duty cycle limiti', unit: '%', min: 0, minExclusive: true, max: 100, defaultValue: '', help: 'Kendi bölgenizin mevzuatına göre siz girin (isteğe bağlı).' }),
  eirpLimit: n({ key: 'eirpLimit', label: 'EIRP limiti', unit: 'dBm', min: -50, max: 100, defaultValue: '', help: 'Kullanıcı girer; araç hiçbir ülke için limit değeri öne sürmez.' }),
}

export interface ChoiceDef {
  label: string
  default: string
  options: { value: string; label: string }[]
  help?: string
}
const yn = [{ value: '1', label: 'Evet' }, { value: '0', label: 'Hayır' }]
export const CHOICE: Record<string, ChoiceDef> = {
  sf: { label: 'Yayılma faktörü (SF)', default: '7', options: [7, 8, 9, 10, 11, 12].map((v) => ({ value: String(v), label: `SF${v}` })) },
  bw: { label: 'Bant genişliği (BW)', default: '125', options: BW_OPTIONS.map((v) => ({ value: String(v), label: `${String(v).replace('.', ',')} kHz` })) },
  cr: { label: 'Kodlama oranı (CR)', default: '1', options: [1, 2, 3, 4].map((v) => ({ value: String(v), label: `4/${4 + v}` })) },
  header: { label: 'Header', default: 'explicit', options: [{ value: 'explicit', label: 'Explicit' }, { value: 'implicit', label: 'Implicit' }] },
  crc: { label: 'CRC', default: '1', options: [{ value: '1', label: 'Açık' }, { value: '0', label: 'Kapalı' }] },
  ldro: { label: 'Düşük veri hızı optimizasyonu', default: 'auto', options: [{ value: 'auto', label: 'Otomatik (Tsym > 16 ms)' }, { value: 'on', label: 'Açık' }, { value: 'off', label: 'Kapalı' }] },
  sensBasis: { label: 'Marjda kullanılacak hassasiyet', default: 'both', options: [{ value: 'both', label: 'İkisi de (kötümser olan)' }, { value: 'datasheet', label: 'Datasheet' }, { value: 'theory', label: 'Teorik' }], help: '"İkisi de": marj her iki hassasiyetle ayrı gösterilir, menzil kötümser olanla hesaplanır.' },
  geoMode: { label: 'Mesafe girişi', default: 'horizontal', options: [{ value: 'horizontal', label: 'Yatay mesafe + irtifa' }, { value: 'slant', label: 'Doğrudan eğik mesafe' }] },
  patMode: { label: 'Anten deseni kaybı modu', default: 'manual', options: [{ value: 'manual', label: 'Elle gir' }, { value: 'dipole', label: 'İdeal yarım dalga dipol' }, { value: 'csv', label: 'Desen CSV yükle' }] },
  single: { label: 'Kayıp girişi', default: '0', options: [{ value: '0', label: 'Kalem kalem' }, { value: '1', label: 'Tek kalem L_prop' }] },
  rxOmni: { label: 'Alıcı anten omni mi?', default: '0', options: yn, help: 'Omni ise Yagi hizalama kaybı pasif olur.' },
  propModel: { label: 'Yayılım modeli', default: 'fspl', options: [{ value: 'fspl', label: 'Serbest uzay (FSPL)' }, { value: 'tworay', label: 'İki ışın (yer yansıması)' }] },
  fsplForm: { label: 'FSPL gösterim biçimi', default: 'm', options: [{ value: 'm', label: '20log f + 20log d(m) − 27,55' }, { value: 'km', label: '32,44 + 20log d(km) + 20log f' }], help: 'İki biçim aynı sonucu verir (fark < 0,01 dB).' },
}

export const TEXT: Record<string, { label: string; placeholder: string; help: string }> = {
  name: { label: 'Hat adı', placeholder: 'ör. Ö-UKB, Görev yükü', help: 'Serbest metin.' },
  txModel: { label: 'Verici modül/anten modeli', placeholder: 'etiket', help: 'Yalnızca etiket; hiçbir değer otomatik doldurulmaz.' },
  rxModel: { label: 'Alıcı modül/anten modeli', placeholder: 'etiket', help: 'Yalnızca etiket; hiçbir değer otomatik doldurulmaz.' },
  sensNote: { label: 'Hassasiyet hangi ayar için geçerli?', placeholder: 'ör. SF12, BW 7,8 kHz', help: 'Datasheet hassasiyetinin geçerli olduğu hava hızı/SF/BW.' },
}

export function defaultLineForm(): LineForm {
  const f: LineForm = { patCsv: '' }
  for (const [k, s] of Object.entries(NUM)) f[k] = s.defaultValue
  for (const [k, c] of Object.entries(CHOICE)) f[k] = c.default
  for (const k of Object.keys(TEXT)) f[k] = ''
  return f
}
export const FORM_KEYS = Object.keys(defaultLineForm())

export interface Resolved {
  inputs: LineInputs | null
  errors: Record<string, string>
}

export function resolveLine(form: LineForm): Resolved {
  const errors: Record<string, string> = {}
  const v = {} as Record<NumKey, number | null>
  const f = (k: string) => form[k] ?? ''
  for (const k of Object.keys(NUM) as NumKey[]) {
    const r = validateField(NUM[k], form[k] ?? '')
    v[k] = r.value
    if (r.error) errors[k] = r.error
  }
  const need = (k: NumKey) => {
    if (!errors[k] && v[k] === null) errors[k] = 'Bu alan zorunlu.'
  }
  const horizontal = f('geoMode') === 'horizontal'
  const single = f('single') === '1'
  const tworay = f('propModel') === 'tworay'
  if (horizontal) { need('horizKm'); need('altM') } else need('slantKm')
  if (f('sensBasis') === 'datasheet') {
    if (!errors.sensDs && v.sensDs === null) errors.sensDs = 'Datasheet esas seçildi; hassasiyeti girin.'
  }
  const gs = v.gsH ?? 0
  const alt = v.altM
  if (!errors.altM && !errors.gsH && alt !== null && alt < gs) errors.altM = 'Roket irtifası yer anteni yüksekliğinden küçük olamaz.'
  if (!horizontal && !errors.slantKm && !errors.altM && v.slantKm !== null && alt !== null && v.slantKm * 1000 < alt - gs) {
    errors.slantKm = 'Eğik mesafe, irtifa farkından küçük olamaz.'
  }
  if (tworay) {
    if (!errors.gsH && gs <= 0) errors.gsH = 'İki ışın modeli için yer anteni yüksekliği > 0 olmalı.'
    if (!errors.altM && (alt === null || alt <= 0)) errors.altM = 'İki ışın modeli için roket irtifası > 0 olmalı.'
  }
  let pattern = parsePatternCsv(f('patCsv'))
  if (f('patMode') === 'csv' && pattern.length < 2) errors.patCsv = 'En az 2 satırlık "açı;kazanç" tablosu gerekli (açı = yükselme açısı, kazanç = tepe değere göre dB).'
  if (f('patMode') !== 'csv') pattern = []

  if (Object.keys(errors).length) return { inputs: null, errors }
  const sf = Number(f('sf'))
  const inputs: LineInputs = {
    name: f('name').trim(), freqMHz: v.freq!, ptxDbm: v.ptx!, gtxDbi: v.gtx!, ltxDb: v.ltx!, grxDbi: v.grx!, lrxDb: v.lrx!,
    txModel: f('txModel'), rxModel: f('rxModel'), sensDsDbm: v.sensDs, sensNote: f('sensNote'),
    sensBasis: f('sensBasis') as LineInputs['sensBasis'],
    sf, bwKHz: Number(f('bw')), cr: Number(f('cr')), nfDb: v.nf!, preamble: v.preamble!, payload: v.payload!,
    explicitHeader: f('header') === 'explicit', crc: f('crc') === '1', ldro: f('ldro') as LineInputs['ldro'],
    geoMode: f('geoMode') as LineInputs['geoMode'], horizM: (v.horizKm ?? 0) * 1000, altM: alt, gsHeightM: gs,
    slantM: (v.slantKm ?? 0) * 1000, elevDeg: v.elev!,
    polDb: v.pol!, patternMode: f('patMode') as LineInputs['patternMode'], patternManualDb: v.patManual!, patternCapDb: v.patCap!, pattern,
    bodyDb: v.body!, rxOmni: f('rxOmni') === '1', yagiBeamDeg: v.yagiBeam, yagiErrDeg: v.yagiErr!,
    multipathDb: v.multipath!, atmosDb: v.atmos!, extraDb: v.extra!, singleLprop: single, lpropSingleDb: v.lpropSingle!,
    propModel: f('propModel') as LineInputs['propModel'], fsplForm: f('fsplForm') as LineInputs['fsplForm'], minMarginDb: v.minMargin!,
    packetBytes: v.pktBytes, packetRate: v.pktRate, dutyLimitPct: v.duty, eirpLimitDbm: v.eirpLimit,
  }
  return { inputs, errors }
}

/** Test bölümündeki iki referans hat (tek kalem L_prop, eğik mesafe 10 km). */
export function referenceForms(): [LineForm, LineForm] {
  const common = { geoMode: 'slant', slantKm: '10', ptx: '30', ltx: '1', lrx: '2', single: '1', lpropSingle: '20', sf: '12', bw: '7.8', sensBasis: 'datasheet', sensNote: 'SF12, BW 7,8 kHz' }
  return [
    { ...defaultLineForm(), ...common, name: 'Hat A (433 MHz)', freq: '433', gtx: '3', grx: '12', sensDs: '-147' },
    { ...defaultLineForm(), ...common, name: 'Hat B (868 MHz)', freq: '868', gtx: '2.15', grx: '9', sensDs: '-150' },
  ]
}

// ---- form yerleşimi
export type Item =
  | { kind: 'num'; key: string; show?: (f: LineForm) => boolean; full?: boolean }
  | { kind: 'choice'; key: string; show?: (f: LineForm) => boolean; full?: boolean }
  | { kind: 'text'; key: string; show?: (f: LineForm) => boolean; full?: boolean }
  | { kind: 'csv'; key: string; show?: (f: LineForm) => boolean }

export interface Group {
  id: string
  title: string
  icon: string
  items: Item[]
}
const num = (key: string, extra: Partial<Extract<Item, { kind: 'num' }>> = {}): Item => ({ kind: 'num', key, ...extra })
const choice = (key: string, extra: Partial<Extract<Item, { kind: 'choice' }>> = {}): Item => ({ kind: 'choice', key, ...extra })

export const MAIN_GROUPS: Group[] = [
  { id: 'tx', title: 'Frekans ve verici', icon: 'lucide:radio-tower', items: [
    { kind: 'text', key: 'name', full: true }, num('freq'), num('ptx'), num('gtx'), num('ltx'),
    { kind: 'text', key: 'txModel', full: true },
  ] },
  { id: 'rx', title: 'Alıcı', icon: 'lucide:satellite-dish', items: [
    num('grx'), num('lrx'), { kind: 'text', key: 'rxModel', full: true },
  ] },
  { id: 'sens', title: 'Hassasiyet ve LoRa', icon: 'lucide:audio-lines', items: [
    num('sensDs'), choice('sensBasis'), { kind: 'text', key: 'sensNote', full: true },
    choice('sf'), choice('bw'), choice('cr'), num('nf'), num('preamble'), num('payload'),
    choice('header'), choice('crc'), choice('ldro', { full: true }),
  ] },
  { id: 'geo', title: 'Geometri', icon: 'lucide:ruler', items: [
    choice('geoMode', { full: true }),
    num('horizKm', { show: (f) => f.geoMode === 'horizontal' }),
    num('altM', { show: (f) => f.geoMode === 'horizontal' || f.propModel === 'tworay' }),
    num('slantKm', { show: (f) => f.geoMode === 'slant' }),
    num('elev', { show: (f) => f.geoMode === 'slant' && f.patMode !== 'manual' }),
    num('gsH'),
  ] },
  { id: 'model', title: 'Model ve hedefler', icon: 'lucide:function-square', items: [
    choice('propModel', { full: true }), choice('fsplForm', { full: true }), num('minMargin'),
  ] },
  { id: 'data', title: 'Veri ve mevzuat', icon: 'lucide:database', items: [
    num('pktBytes'), num('pktRate'), num('duty'), num('eirpLimit'),
  ] },
]

export const LOSS_GROUP: Group = {
  id: 'loss', title: 'Kayıp kalemleri (L_prop)', icon: 'lucide:trending-down', items: [
    choice('single', { full: true }),
    num('lpropSingle', { show: (f) => f.single === '1', full: true }),
    num('pol', { show: (f) => f.single !== '1' }),
    choice('patMode', { show: (f) => f.single !== '1', full: true }),
    num('patManual', { show: (f) => f.single !== '1' && f.patMode === 'manual' }),
    num('patCap', { show: (f) => f.single !== '1' && f.patMode === 'dipole' }),
    { kind: 'csv', key: 'patCsv', show: (f) => f.single !== '1' && f.patMode === 'csv' },
    num('body', { show: (f) => f.single !== '1' }),
    choice('rxOmni', { show: (f) => f.single !== '1' }),
    num('yagiBeam', { show: (f) => f.single !== '1' && f.rxOmni !== '1' }),
    num('yagiErr', { show: (f) => f.single !== '1' && f.rxOmni !== '1' }),
    num('multipath', { show: (f) => f.single !== '1' }),
    num('atmos', { show: (f) => f.single !== '1' }),
    num('extra', { show: (f) => f.single !== '1' }),
  ],
}
