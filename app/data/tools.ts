export interface Tool {
  slug: string;
  name: string;
  description: string;
  category: string;
  icon: string;
  status: "planned" | "ready";
}

export const categories = [
  "Kurtarma",
  "Haberleşme",
  "Aviyonik",
  "Elektronik",
  "Uçuş & Aerodinamik",
  "Tahrik",
  "Yapısal",
] as const;

export const tools: Tool[] = [
  {
    slug: "parasut-hiz",
    name: "Paraşüt Hız Hesaplayıcı",
    description: "Terminal iniş hızı, gereken çap, simülasyon ve Monte Carlo.",
    category: "Kurtarma",
    icon: "lucide:arrow-down-to-line",
    status: "ready",
  },
  {
    slug: "parasut-olusturucu",
    name: "Paraşüt Kalıp Oluşturucu",
    description: "Dilim kesim kalıbı, 1:1 PDF ve DXF, kumaş ve kordon hesabı.",
    category: "Kurtarma",
    icon: "lucide:scissors",
    status: "ready",
  },
  {
    slug: "parasut-dayanim",
    name: "Paraşüt Dayanım Hesaplayıcı",
    description: "Açılma şoku, ip ve kumaş dayanım analizi.",
    category: "Kurtarma",
    icon: "lucide:shield-check",
    status: "planned",
  },
  {
    slug: "link-butcesi",
    name: "RF Link Bütçesi",
    description:
      "Friis/FSPL, parçalı kayıp modeli, LoRa hassasiyeti, link marjı, menzil, airtime ve veri bütçesi.",
    category: "Aviyonik",
    icon: "lucide:radio-tower",
    status: "ready",
  },
  {
    slug: "pcb-hesaplayici",
    name: "PCB Hesaplayıcı Paketi",
    description:
      "İz genişliği/akım (IPC-2221), via, empedans, ısıl ve devre yardımcıları.",
    category: "Aviyonik",
    icon: "lucide:circuit-board",
    status: "ready",
  },
  {
    slug: "menzil",
    name: "Haberleşme Menzili",
    description: "Frekans ve güce göre tahmini menzil.",
    category: "Haberleşme",
    icon: "lucide:signal",
    status: "planned",
  },
  {
    slug: "kanatcik-flutter",
    name: "Kanatçık Flutter Hızı",
    description:
      "Kanatçık geometrisi ve malzemeden flutter hızı, uçuş hızıyla güvenlik marjı.",
    category: "Yapısal",
    icon: "lucide:audio-waveform",
    status: "planned",
  },
  {
    slug: "guc-butcesi",
    name: "Güç Bütçesi",
    description:
      "Bileşen akımları, batarya kapasitesi, çalışma süresi ve regülatör kaybı.",
    category: "Elektronik",
    icon: "lucide:battery-charging",
    status: "planned",
  },
  {
    slug: "ucus-analizi",
    name: "OpenRocket Uçuş Analizi",
    description:
      "OpenRocket simülasyon CSV'sini yükle; irtifa, hız, stabilite, itki ve yörünge grafikleri, KPI kartları ve karşılaştırma. Dosya tarayıcıdan çıkmaz.",
    category: "Uçuş & Aerodinamik",
    icon: "lucide:chart-line",
    status: "ready",
  },
  {
    slug: "atmosfer",
    name: "Atmosfer Modeli",
    description: "İrtifaya göre basınç, sıcaklık, yoğunluk.",
    category: "Uçuş & Aerodinamik",
    icon: "lucide:cloud",
    status: "planned",
  },
  {
    slug: "itki-agirlik",
    name: "İtki / Ağırlık Oranı",
    description: "Kalkış T/W oranı ve ray çıkış hızı.",
    category: "Tahrik",
    icon: "lucide:flame",
    status: "planned",
  },
  {
    slug: "motor-itki",
    name: "Motor İtki Analizi",
    description: "Toplam impuls ve ortalama itki.",
    category: "Tahrik",
    icon: "lucide:chart-line",
    status: "planned",
  },
];

export const getTool = (slug: string) => tools.find((t) => t.slug === slug);
