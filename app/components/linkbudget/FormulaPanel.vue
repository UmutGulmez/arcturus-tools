<script setup lang="ts">
const steps = [
  { t: 'Dalga boyu ve geometri', f: 'λ = c / f      d_eğik = √(d_yatay² + (h_roket − h_yer)²)      el = atan2(h_roket − h_yer, d_yatay)',
    x: 'Dalga boyu yol kaybının temel boyutudur. Roket yükseldikçe eğik mesafe yatay mesafeden uzaklaşır ve yer istasyonunun roketi gördüğü yükselme açısı artar; bu açı anten deseni kaybını belirler.' },
  { t: 'Serbest uzay yol kaybı (FSPL)', f: 'L_fs = 20·log10(f[MHz]) + 20·log10(d[m]) − 27,55      ≡      32,44 + 20·log10(d[km]) + 20·log10(f[MHz])',
    x: 'Alıcı anten etkin alanı λ²/4π ile orantılı olduğundan, aynı mesafede frekans arttıkça aynı kazançlı anten daha az güç toplar: yol kaybı frekansla artar. Mesafe 2 katına çıkınca güç yoğunluğu 4 kat düşer: tam 6,02 dB. İki yazım biçimi aynı sonucu verir (fark 0,01 dB\'nin altında).' },
  { t: 'İki ışın yer yansıması', f: 'd_b = 4·h_t·h_r / λ      d < d_b: FSPL      d ≥ d_b: L = 40·log10(d) − 20·log10(h_t) − 20·log10(h_r)',
    x: 'Doğrudan ve yerden yansıyan ışın kırılma noktasından sonra zıt fazlı toplanır, kayıp mesafeyle 40 dB/dekad artar. Model yere yakın, düz arazi içindir; roket yükseldikçe serbest uzay daha gerçekçidir.' },
  { t: 'Anten deseni (ideal dipol)', f: 'f = cos(π/2 · sin el) / cos el      kayıp = −20·log10(f)  (üst sınırla kesilir)',
    x: 'Dikey monte yarım dalga dipolün ekseninde (tam tepede) ışıma yoktur. Yer istasyonu roketi tepeye yakın bir açıyla (yüksek yükselme açısı) gördüğünde kayıp hızla artar; bu en kötü durumdur. 90°\'ye yakın değerlerde sayısal güvenlik için kayıp kullanıcının belirlediği sınırda tutulur. Gerçek desen biliniyorsa CSV modu kullanılmalıdır.' },
  { t: 'Yagi hizalama kaybı (yaklaşık)', f: 'L_yagi ≈ 12 · (hata / hüzme)²',
    x: 'Ana lobun tepesine yakın bölgede kayıp açının karesiyle büyür; hata hüzme genişliğine eşitken kayıp ≈ 12 dB gibi görünür. Bu yalnızca küçük hatalar için yaklaşık bir formüldür.' },
  { t: 'Alınan güç ve EIRP', f: 'EIRP = P_tx + G_tx − L_tx      P_rx = P_tx + G_tx − L_tx − L_fs − L_prop + G_rx − L_rx      ERP = EIRP − 2,15',
    x: 'Tüm kazanç ve kayıplar dB cinsinden olduğundan toplanır/çıkarılır. L_prop; polarizasyon, desen, gövde, hizalama, multipath, atmosfer ve ek kayıp kalemlerinin toplamıdır.' },
  { t: 'LoRa hassasiyeti', f: 'S = −174 + 10·log10(BW[Hz]) + NF + SNR_gerekli      (SF7: −7,5 … SF12: −20 dB)',
    x: 'Gürültü tabanı bant genişliğiyle artar (−174 dBm/Hz + 10·log10 BW). SF arttıkça demodülatör daha düşük SNR\'de çalışır, hassasiyet iyileşir; ancak sembol süresi 2^SF/BW uzar, airtime artar ve bit hızı düşer.' },
  { t: 'Link marjı', f: 'Marj = P_rx − S      (<0: link yok, 0…istenen: sınırda, ≥ istenen: yeterli)',
    x: 'Fade marjı; sönümleme, hizalama hatası ve ölçüm belirsizliği gibi modellenmeyen etkiler için ayrılan paydır. Marj ne kadar büyükse model dışı olaylara karşı o kadar dayanıklıdır.' },
  { t: 'Maksimum menzil', f: 'marj(d) = hedef      →   ikiye bölme (bisection)',
    x: 'Anten deseni eğik mesafeye bağlı olduğundan marj mesafeyle monoton değildir; analitik çözüm yerine mesafe ızgarası taranıp son geçiş noktası ikiye bölme ile bulunur. Radyo ufku 4,12·(√h₁ + √h₂) km olup güç bütçesinden kısıtlayıcıysa menzili o belirler.' },
  { t: 'LoRa airtime', f: 'Tsym = 2^SF / BW      T_pre = (n_pre + 4,25)·Tsym      n_payload = 8 + max(⌈(8PL − 4SF + 28 + 16CRC − 20IH) / (4(SF − 2DE))⌉·(CR+4), 0)      Rb = SF·(BW/2^SF)·4/(4+CR)',
    x: 'Semtech formülü: toplam süre = preamble + (payload sembolü × Tsym). Tsym > 16 ms ise düşük veri hızı optimizasyonu (DE = 1) otomatik açılır. Kanal doluluğu = airtime × paket/s.' },
]
</script>

<template>
  <section aria-labelledby="lb-formul" class="panel">
    <ParachuteSectionHeader heading-id="lb-formul" icon="lucide:sigma" title="Nasıl hesaplanıyor?" subtitle="Formüller ve her adımın nedeni." />
    <div class="mt-4 divide-y divide-space-700">
      <details v-for="s in steps" :key="s.t" class="group py-3">
        <summary class="flex cursor-pointer list-none items-center justify-between gap-3 text-sm font-medium text-zinc-200">
          {{ s.t }}<Icon name="lucide:chevron-down" size="16" class="shrink-0 text-zinc-500 transition group-open:rotate-180" />
        </summary>
        <p class="mt-2 overflow-x-auto rounded-lg bg-space-900 px-3 py-2 font-mono text-xs text-arc-400">{{ s.f }}</p>
        <p class="mt-2 text-sm leading-relaxed text-zinc-400">{{ s.x }}</p>
      </details>
    </div>
  </section>
</template>
