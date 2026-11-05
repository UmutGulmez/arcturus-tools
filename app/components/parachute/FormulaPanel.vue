<script setup lang="ts">
const steps = [
  {
    title: 'Ağırlık = sürüklenme dengesi',
    formula: 'm·g = ½ · ρ · v² · Cd · A   →   v = √( 2·m·g / (ρ·Cd·A) )',
    text: `Paraşüt sabit hızla indiğinde ivme sıfırdır: aşağı çeken ağırlık, yukarı iten aerodinamik sürüklenmeye eşittir. Bu eşitlikten terminal hız çıkar. Kütle büyüdükçe hız artar; ρ, Cd veya alan büyüdükçe azalır.`,
  },
  {
    title: 'Hava yoğunluğu rakımla neden düşer? (ISA)',
    formula: 'T = 288,15 + ΔT − 0,0065·h     p = 101325·(1 − 2,25577·10⁻⁵·h)^5,25588     ρ = p / (287,05·T)',
    text: `Yükseldikçe üstteki hava kolonu hafifler, basınç düşer ve hava seyrelir. Daha az yoğun hava aynı hızda daha az sürükleme üretir; bu yüzden yüksek rakımlı sahada paraşüt daha hızlı iner. Formül troposfer (0–11 km) için geçerlidir; ΔT sıcak/soğuk günü temsil eder.`,
  },
  {
    title: 'Etkin alan ve izdüşüm oranı',
    formula: 'A = π · (k·d / 2)²     CdA = Cd · A     (k = izdüşüm çapı / nominal çap)',
    text: `Şişmiş paraşüt düz serilmiş halinden daha dar bir daire oluşturur. Nominal çap yerine gerçek izdüşüm çapı kullanılmazsa alan olduğundan büyük sayılır ve hız düşük çıkar. Cd değeri nominal alana göre verilmişse k = 1 bırakın; izdüşüm alanına göre verilmişse gerçek oranı girin ve ikisini karıştırmayın.`,
  },
  {
    title: 'Tepe deliği neden alandan düşülmüyor?',
    formula: 'A = π·(k·d/2)²   (delik çıkarılmaz)',
    text: `Tepe deliğinin etkisi (hava çıkışı, kararlılık) ölçülmüş Cd değerinin içine zaten gömülüdür. Alandan bir de düşersek aynı etkiyi iki kez saymış oluruz. Bu yüzden delik yalnızca bilgi/uyarı amaçlıdır ve kullandığınız Cd'nin aynı geometriye ait olması gerekir.`,
  },
  {
    title: 'Ters boyutlandırma',
    formula: 'd = (2/k) · √( 2·m·g / (π·ρ·Cd·v²_hedef) )',
    text: `Terminal hız formülü alan için çözülür, alandan da nominal çap bulunur. Sonuç, hedef hız için gereken minimum nominal çaptır; mevcut çapla farkı da gösterilir.`,
  },
  {
    title: 'Enerji ve eşdeğer düşme yüksekliği',
    formula: 'E = ½·m·v²     h_eq = v² / (2·g)',
    text: `İniş enerjisi gövdenin hasar riskini belirler. Eşdeğer düşme yüksekliği, aynı hıza serbest düşüşle kaç metrede ulaşılacağını söyler.`,
  },
  {
    title: 'Dinamik simülasyon (RK4)',
    formula: 'dh/dt = −v     dv/dt = g − ρ(h)·v²·CdA / (2·m)',
    text: `Dördüncü mertebe Runge–Kutta ile 0,01 s adımlarla çözülür. ρ her adımda saha rakımı + irtifa için ISA'dan alınır. Paraşütün başlangıçta tam açık olduğu varsayılır; açılma şoku modellenmez.`,
  },
  {
    title: 'Duyarlılık ve Monte Carlo',
    formula: 'Δv% = (v(p·(1±0,1)) / v − 1)·100     p ~ N(p₀, (σ·p₀)²)',
    text: `Duyarlılık tablosu hangi girdideki belirsizliğin hıza en çok yansıdığını gösterir (v ∝ m^½, d⁻¹, Cd^−½, ρ^−½). Monte Carlo ise girdileri seed'li rastgele sayılarla (mulberry32 + Box–Muller) birlikte değiştirip çıkış dağılımını ve limit aşma olasılığını verir.`,
  },
]
</script>

<template>
  <section aria-labelledby="formul-baslik" class="panel">
    <ParachuteSectionHeader heading-id="formul-baslik" icon="lucide:sigma" title="Nasıl hesaplanıyor?" subtitle="Kullanılan formüller ve her adımın nedeni." />
    <div class="mt-4 divide-y divide-space-700">
      <details v-for="s in steps" :key="s.title" class="group py-3">
        <summary class="flex cursor-pointer list-none items-center justify-between gap-3 text-sm font-medium text-zinc-200">
          {{ s.title }}
          <Icon name="lucide:chevron-down" size="16" class="shrink-0 text-zinc-500 transition group-open:rotate-180" />
        </summary>
        <p class="mt-2 overflow-x-auto rounded-lg bg-space-900 px-3 py-2 font-mono text-xs text-arc-400">{{ s.formula }}</p>
        <p class="mt-2 text-sm leading-relaxed text-zinc-400">{{ s.text }}</p>
      </details>
    </div>
  </section>
</template>
