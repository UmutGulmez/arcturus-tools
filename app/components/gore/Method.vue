<script setup lang="ts">
const items = [
  { t: 'Kubbe modeli', d: 'Kubbe, yüzey alanı nominal alana (S0 = πD0²/4) eşit bir küre kapağı olarak alınır. Kapak yarı açısı φ için alan 2πR²(1 − cos φ) olduğundan R = D0 / (2·√(2(1 − cos φ))). Yarım kürede (φ = 90°) R = D0 / (2√2).' },
  { t: 'Dilim genişliği', d: 'Tepeden etek yönüne yay uzunluğu s boyunca dilim genişliği w(s) = (2πR/N)·sin(s/R). Tepe deliği için s0 = R·asin(dv / 2R), etek için s_end = R·φ. Dilim yüksekliği s_end − s0’dır.' },
  { t: 'Düz kubbe', d: 'N kenarlı düzgün çokgen; alan nominal alana eşitlenir (apotem a = (D0/2)·√(π / (N·tan(π/N)))). Dilim ikizkenar üçgendir: w(y) = 2·y·tan(π/N); tepe deliği y0 = dv/2’de kesilir.' },
  { t: 'Dikiş payı', d: 'Dilim konturu kenar başına ayrı mesafeyle dışa ofsetlenir. Köşelerde miter (kenar doğrularının kesişimi) ya da bevel (kesik) birleşim seçilir. Miter çok uzarsa (pay × 4) kendiliğinden bevel’e düşer. Etek katlama payı alt kenarın payına eklenir.' },
  { t: 'Kumaş dizilimi', d: 'Basit satır dizilimi: komşu dilimler 180° çevrilerek (baş-sonlu) yan yana dizilir; iki yönlü deneme yapılır (dilim ekseni rulo boyunda ya da enine dik) ve kısa olan seçilir. Dilimler arasında boşluk yoktur (kesim çizgisi ortak). Damar yönü ve desen eşleştirme hesaba katılmaz.' },
]
const limits = [
  'Model nominal (serilmiş) çap ve küresel bir kubbe varsayar. Gerçek şişmiş çap, kubbe şekli ve Cd bu aracın konusu değildir.',
  'Dilim yan eğrisi, küre yüzeyinin düzleme gelişmesinin (meridyen dilimi) yaklaşığıdır; kumaş gerginliği ve dikiş çekmesi hesaba katılmaz.',
  'PDF’te Türkçe karakterlerden ğ, ı, ş, İ standart yazı tipinde bulunmadığı için ASCII karşılığıyla yazılır.',
  'Toroidal (halka) paraşüt ve tepe deliği çevresi takviye bandı bu sürümde yok.',
]
</script>

<template>
  <div class="space-y-4">
    <div class="panel space-y-4">
      <h2 class="text-base font-semibold text-white">Nasıl hesaplanıyor?</h2>
      <dl class="space-y-3 text-sm">
        <div v-for="i in items" :key="i.t">
          <dt class="font-medium text-zinc-100">{{ i.t }}</dt>
          <dd class="text-zinc-400">{{ i.d }}</dd>
        </div>
      </dl>
    </div>
    <div class="panel space-y-2">
      <h2 class="text-base font-semibold text-white">Sınırlar</h2>
      <ul class="list-disc space-y-1 pl-5 text-sm text-zinc-400">
        <li v-for="l in limits" :key="l">{{ l }}</li>
      </ul>
      <p class="pt-2 text-xs text-zinc-500">Kalıbı kumaşa aktarmadan önce PDF’teki 10 cm’lik kareyi cetvelle doğrulayın. Bu araç yapısal dayanım garantisi vermez.</p>
    </div>
  </div>
</template>
