<script setup lang="ts">
import { CHOICE, NUM, TEXT } from '~/utils/linkBudgetFields'
import type { NumKey } from '~/utils/linkBudgetFields'
import type { Group, LineForm } from '~/utils/linkBudgetFields'

const props = defineProps<{ group: Group; form: LineForm; errors: Record<string, string>; idPrefix: string }>()

const items = computed(() => props.group.items.filter((it) => !it.show || it.show(props.form)))
const spec = (key: string) => ({ ...NUM[key as NumKey], key: `${props.idPrefix}-${key}` })
const isFull = (it: Group['items'][number]) => it.kind === 'text' || it.kind === 'csv' || ('full' in it && it.full)
const id = (key: string) => `${props.idPrefix}-${key}`

async function onCsv(e: Event) {
  const f = (e.target as HTMLInputElement).files?.[0]
  if (!f) return
  props.form.patCsv = await f.text()
  ;(e.target as HTMLInputElement).value = ''
}
</script>

<template>
  <div class="grid grid-cols-2 gap-x-3 gap-y-3">
    <div v-for="it in items" :key="it.key" :class="isFull(it) ? 'col-span-2' : ''">
      <ParachuteFormField
        v-if="it.kind === 'num'"
        :spec="spec(it.key)"
        :model-value="form[it.key]!"
        :error="errors[it.key]"
        :compact="!isFull(it)"
        @update:model-value="form[it.key] = $event"
      />

      <div v-else-if="it.kind === 'choice'" class="group">
        <label :for="id(it.key)" class="mb-1 block text-[13px] font-medium leading-tight text-zinc-200">{{ CHOICE[it.key]!.label }}</label>
        <select :id="id(it.key)" v-model="form[it.key]" class="input" :aria-describedby="CHOICE[it.key]!.help ? `${id(it.key)}-help` : undefined">
          <option v-for="o in CHOICE[it.key]!.options" :key="o.value" :value="o.value">{{ o.label }}</option>
        </select>
        <p v-if="CHOICE[it.key]!.help" :id="`${id(it.key)}-help`" class="mt-1 hidden text-xs leading-snug text-zinc-500 group-focus-within:block">{{ CHOICE[it.key]!.help }}</p>
      </div>

      <div v-else-if="it.kind === 'text'" class="group">
        <label :for="id(it.key)" class="mb-1 block text-[13px] font-medium leading-tight text-zinc-200">{{ TEXT[it.key]!.label }}</label>
        <input :id="id(it.key)" v-model="form[it.key]" type="text" class="input" autocomplete="off" :placeholder="TEXT[it.key]!.placeholder" :aria-describedby="`${id(it.key)}-help`" />
        <p :id="`${id(it.key)}-help`" class="mt-1 hidden text-xs leading-snug text-zinc-500 group-focus-within:block">{{ TEXT[it.key]!.help }}</p>
      </div>

      <div v-else class="group">
        <label :for="id(it.key)" class="mb-1 block text-[13px] font-medium leading-tight text-zinc-200">Anten deseni tablosu (CSV)</label>
        <textarea
          :id="id(it.key)" v-model="form[it.key]" rows="5" class="input font-mono text-xs"
          :aria-invalid="errors[it.key] ? 'true' : 'false'" :aria-describedby="`${id(it.key)}-help`"
          placeholder="açı;kazanç&#10;0;0&#10;30;-2,5&#10;60;-10"
        />
        <p v-if="errors[it.key]" class="mt-1 flex items-start gap-1 text-xs text-rose-400" role="alert"><Icon name="lucide:circle-alert" size="12" class="mt-0.5 shrink-0" /> {{ errors[it.key] }}</p>
        <p :id="`${id(it.key)}-help`" class="mt-1 text-xs leading-snug text-zinc-500">Sütunlar: açı [°] (yükselme açısı), bağıl kazanç [dB]. Ondalık virgül için ; veya sekme ayracı kullanın.</p>
        <label class="btn mt-2 cursor-pointer !px-3 !py-1.5 text-xs"><Icon name="lucide:upload" size="14" /> CSV dosyası yükle
          <input type="file" accept=".csv,.tsv,.txt,text/csv,text/plain" class="sr-only" @change="onCsv" />
        </label>
      </div>
    </div>
  </div>
</template>
