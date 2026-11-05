<script setup lang="ts">
import { computeStatic } from '~/utils/parachute'
import type { StaticInputs } from '~/utils/parachute'
import { downloadText, parseDelimited, toCsv } from '~/utils/export'
import { fmt, parseNumber } from '~/utils/format'
import { FIELDS, validateField } from '~/utils/parachuteFields'

const props = defineProps<{ env: { g: number; dT: number; proj: number } }>()

interface Row {
  id: number
  name: string
  m: string
  d: string
  cd: string
  h: string
}

let nextId = 1
const mk = (name: string, m: string, d: string, cd = '0,8', h = '0'): Row => ({ id: nextId++, name, m, d, cd, h })
const rows = ref<Row[]>([mk('Örnek 1', '14,4', '1'), mk('Örnek 2', '4,05', '0,8'), mk('Örnek 3', '14,1', '2,4')])

const evaluated = computed(() =>
  rows.value.map((r) => {
    const checks = (['m', 'd', 'cd', 'h'] as const).map((k) => [k, validateField(FIELDS[k], r[k])] as const)
    const errors: Partial<Record<'m' | 'd' | 'cd' | 'h', string>> = {}
    for (const [k, c] of checks) if (c.error) errors[k] = c.error
    if (Object.keys(errors).length) return { row: r, errors, result: null }
    const v = Object.fromEntries(checks.map(([k, c]) => [k, c.value!])) as Record<'m' | 'd' | 'cd' | 'h', number>
    const inputs: StaticInputs = {
      m: v.m, mChute: 0, d: v.d, cd: v.cd, h: v.h, dT: props.env.dT, g: props.env.g,
      proj: props.env.proj, holeD: 0, rhoFixed: null,
    }
    return { row: r, errors, result: computeStatic(inputs) }
  }),
)

const addRow = () => rows.value.push(mk(`Satır ${rows.value.length + 1}`, '', ''))
const removeRow = (id: number) => (rows.value = rows.value.filter((r) => r.id !== id))

const importMsg = ref('')
const pasteText = ref('')

function importText(text: string) {
  const table = parseDelimited(text)
  if (!table.length) { importMsg.value = 'İçe aktarılacak satır bulunamadı.'; return }
  // Başlık satırı: ikinci sütun sayı değilse atla.
  const first = table[0]!
  const hasHeader = first[1] !== undefined && parseNumber(first[1]) === null
  const body = hasHeader ? table.slice(1) : table
  const imported = body.map((c, k) => mk(c[0] || `Satır ${k + 1}`, c[1] ?? '', c[2] ?? '', c[3] || '0,8', c[4] || '0'))
  if (!imported.length) { importMsg.value = 'Veri satırı bulunamadı.'; return }
  rows.value = imported
  importMsg.value = `${imported.length} satır içe aktarıldı.`
}

async function onFile(e: Event) {
  const file = (e.target as HTMLInputElement).files?.[0]
  if (!file) return
  importText(await file.text())
  ;(e.target as HTMLInputElement).value = ''
}

function exportCsv() {
  const out: (string | number | null)[][] = [['İsim', 'm (kg)', 'd (m)', 'Cd', 'h (m)', 'v (m/s)', 'v (km/h)', 'E (J)', 'rho (kg/m3)']]
  for (const e of evaluated.value) {
    const r = e.result
    out.push([e.row.name, e.row.m, e.row.d, e.row.cd, e.row.h, r?.v ?? null, r?.vKmh ?? null, r?.energy ?? null, r?.rho ?? null])
  }
  downloadText('parasut-karsilastirma.csv', toCsv(out), 'text/csv')
}
</script>

<template>
  <section aria-labelledby="karsilastirma-baslik" class="space-y-4">
    <div class="panel">
      <ParachuteSectionHeader
        heading-id="karsilastirma-baslik"
        icon="lucide:table-2"
        title="Çoklu karşılaştırma"
        :subtitle="`Her satır için terminal hız, enerji ve yoğunluk. g (${fmt(env.g, 3)}), ΔT (${fmt(env.dT, 1)} K) ve izdüşüm oranı (${fmt(env.proj, 2)}) hesaplayıcı sekmesinden alınır.`"
      />

      <div class="relative mt-4 overflow-x-auto">
        <table class="data-table min-w-[44rem]">
          <caption class="sr-only">Karşılaştırma girdileri ve sonuçları</caption>
          <thead>
            <tr>
              <th scope="col">İsim</th>
              <th scope="col">m [kg]</th>
              <th scope="col">d [m]</th>
              <th scope="col">Cd</th>
              <th scope="col">h [m]</th>
              <th scope="col" class="num">v [m/s]</th>
              <th scope="col" class="num">E [J]</th>
              <th scope="col" class="num">ρ [kg/m³]</th>
              <th scope="col"><span class="sr-only">Sil</span></th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(e, idx) in evaluated" :key="e.row.id">
              <td>
                <input v-model="e.row.name" class="input !w-32" :aria-label="`Satır ${idx + 1} isim`" />
              </td>
              <td v-for="k in (['m', 'd', 'cd', 'h'] as const)" :key="k">
                <input
                  v-model="e.row[k]"
                  class="input !w-20"
                  inputmode="decimal"
                  :aria-label="`Satır ${idx + 1} ${k}`"
                  :aria-invalid="e.errors[k] ? 'true' : 'false'"
                  :title="e.errors[k]"
                />
              </td>
              <template v-if="e.result">
                <td class="num font-medium">{{ fmt(e.result.v, 2) }}</td>
                <td class="num">{{ fmt(e.result.energy, 1) }}</td>
                <td class="num">{{ fmt(e.result.rho, 4) }}</td>
              </template>
              <td v-else colspan="3" class="text-xs text-rose-400" role="alert">{{ Object.values(e.errors)[0] }}</td>
              <td>
                <button type="button" class="btn !p-1.5" :aria-label="`Satır ${idx + 1} sil`" @click="removeRow(e.row.id)">
                  <Icon name="lucide:trash-2" size="14" />
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <div class="mt-4 flex flex-wrap gap-2">
        <button type="button" class="btn" @click="addRow"><Icon name="lucide:plus" size="16" /> Satır ekle</button>
        <label class="btn cursor-pointer">
          <Icon name="lucide:upload" size="16" /> CSV yükle
          <input type="file" accept=".csv,.tsv,.txt,text/csv,text/plain" class="sr-only" @change="onFile" />
        </label>
        <button type="button" class="btn" :disabled="!rows.length" @click="exportCsv"><Icon name="lucide:download" size="16" /> CSV indir</button>
      </div>
    </div>

    <div class="panel">
      <label for="csv-yapistir" class="text-sm font-medium text-zinc-200">CSV yapıştır</label>
      <p class="mt-1 text-xs text-zinc-500">
        Sütunlar: isim, m, d, Cd, h (Cd ve h isteğe bağlı). Ondalık virgül kullanıyorsanız ayraç olarak ; veya sekme kullanın.
      </p>
      <textarea
        id="csv-yapistir"
        v-model="pasteText"
        rows="4"
        class="input mt-2 font-mono"
        placeholder="isim;m;d;cd;h&#10;Ana;14,4;1;0,8;0"
      />
      <div class="mt-2 flex items-center gap-3">
        <button type="button" class="btn" :disabled="!pasteText.trim()" @click="importText(pasteText)">İçe aktar</button>
        <p v-if="importMsg" class="text-sm text-zinc-400" role="status">{{ importMsg }}</p>
      </div>
    </div>
  </section>
</template>
