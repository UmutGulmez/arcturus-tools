/**
 * OpenRocket "Export to CSV" sütun sözlüğü.
 * Eşleştirme birime değil, normalize edilmiş ada göredir (son parantez grubu atılır, harf duyarsız).
 */
export type ColumnGroup =
  | 'Zaman' | 'Konum' | 'Hız' | 'Yönelim' | 'Kütle' | 'Stabilite'
  | 'İtki' | 'Aerodinamik' | 'Atmosfer' | 'Diğer'

export interface ColumnDef {
  key: string
  /** OpenRocket'teki özgün ad (birimsiz) */
  name: string
  label: string
  group: ColumnGroup
  /** Sözlükteki kanonik birim; boş = boyutsuz */
  unit: string
}

const d = (name: string, unit: string, key: string, label: string, group: ColumnGroup): ColumnDef => ({ name, unit, key, label, group })

export const COLUMN_DEFS: ColumnDef[] = [
  d('Time', 's', 'time', 'Zaman', 'Zaman'),
  d('Altitude', 'm', 'alt', 'İrtifa (AGL)', 'Konum'),
  d('Altitude above sea level', 'm', 'altAsl', 'İrtifa (deniz seviyesi)', 'Konum'),
  d('Vertical velocity', 'm/s', 'vVert', 'Dikey hız', 'Hız'),
  d('Total velocity', 'm/s', 'vTotal', 'Toplam hız', 'Hız'),
  d('Vertical acceleration', 'm/s²', 'aVert', 'Dikey ivme', 'Hız'),
  d('Total acceleration', 'm/s²', 'aTotal', 'Toplam ivme', 'Hız'),
  d('Position East of launch', 'm', 'posEast', 'Doğu konumu', 'Konum'),
  d('Position North of launch', 'm', 'posNorth', 'Kuzey konumu', 'Konum'),
  d('Lateral distance', 'm', 'latDist', 'Yanal mesafe', 'Konum'),
  d('Lateral direction', '°', 'latDir', 'Yanal yön', 'Konum'),
  d('Lateral velocity', 'm/s', 'vLat', 'Yanal hız', 'Hız'),
  d('Lateral acceleration', 'm/s²', 'aLat', 'Yanal ivme', 'Hız'),
  d('Latitude', '° N', 'lat', 'Enlem', 'Konum'),
  d('Longitude', '° E', 'lon', 'Boylam', 'Konum'),
  d('Angle of attack', '°', 'aoa', 'Hücum açısı', 'Yönelim'),
  d('Roll rate', '°/s', 'rollRate', 'Yatış hızı', 'Yönelim'),
  d('Pitch rate', '°/s', 'pitchRate', 'Yunuslama hızı', 'Yönelim'),
  d('Yaw rate', '°/s', 'yawRate', 'Sapma hızı', 'Yönelim'),
  d('Vertical orientation (zenith)', '°', 'zenith', 'Dikey yönelim (zenit)', 'Yönelim'),
  d('Lateral orientation (azimuth)', '°', 'azimuth', 'Yanal yönelim (azimut)', 'Yönelim'),
  d('Mass', 'g', 'mass', 'Toplam kütle', 'Kütle'),
  d('Motor mass', 'g', 'motorMass', 'Motor kütlesi', 'Kütle'),
  d('Longitudinal moment of inertia', 'kg·m²', 'ixLong', 'Boyuna atalet momenti', 'Kütle'),
  d('Rotational moment of inertia', 'kg·m²', 'ixRot', 'Dönel atalet momenti', 'Kütle'),
  d('Gravitational acceleration', 'm/s²', 'g', 'Yerçekimi ivmesi', 'Diğer'),
  d('CP location', 'cm', 'cp', 'CP konumu (burundan)', 'Stabilite'),
  d('CG location', 'cm', 'cg', 'CG konumu (burundan)', 'Stabilite'),
  d('Stability margin calibers', '', 'stab', 'Stabilite marjı (kalibre)', 'Stabilite'),
  d('Thrust', 'N', 'thrust', 'İtki', 'İtki'),
  d('Thrust-to-weight ratio', '', 'tw', 'İtki/ağırlık oranı', 'İtki'),
  d('Drag force', 'N', 'dragForce', 'Sürükleme kuvveti', 'Aerodinamik'),
  d('Drag coefficient', '', 'cd', 'Cd (toplam)', 'Aerodinamik'),
  d('Friction drag coefficient', '', 'cdFriction', 'Cd sürtünme', 'Aerodinamik'),
  d('Pressure drag coefficient', '', 'cdPressure', 'Cd basınç', 'Aerodinamik'),
  d('Base drag coefficient', '', 'cdBase', 'Cd taban', 'Aerodinamik'),
  d('Axial drag coefficient', '', 'cdAxial', 'Cd eksenel', 'Aerodinamik'),
  d('Normal force coefficient', '', 'cn', 'Normal kuvvet katsayısı', 'Aerodinamik'),
  d('Pitch moment coefficient', '', 'cmPitch', 'Yunuslama moment katsayısı', 'Aerodinamik'),
  d('Yaw moment coefficient', '', 'cmYaw', 'Sapma moment katsayısı', 'Aerodinamik'),
  d('Side force coefficient', '', 'cSide', 'Yan kuvvet katsayısı', 'Aerodinamik'),
  d('Roll moment coefficient', '', 'cmRoll', 'Yatış moment katsayısı', 'Aerodinamik'),
  d('Roll forcing coefficient', '', 'cRollForcing', 'Yatış zorlama katsayısı', 'Aerodinamik'),
  d('Roll damping coefficient', '', 'cRollDamp', 'Yatış sönümleme katsayısı', 'Aerodinamik'),
  d('Pitch damping coefficient', '', 'cPitchDamp', 'Yunuslama sönümleme katsayısı', 'Aerodinamik'),
  d('Wind velocity', 'm/s', 'windSpeed', 'Rüzgâr hızı', 'Atmosfer'),
  d('Wind direction', '°', 'windDir', 'Rüzgâr yönü', 'Atmosfer'),
  d('Air temperature', '°C', 'temp', 'Hava sıcaklığı', 'Atmosfer'),
  d('Air pressure', 'mbar', 'pressure', 'Hava basıncı', 'Atmosfer'),
  d('Air density', 'g/cm³', 'rho', 'Hava yoğunluğu', 'Atmosfer'),
  d('Speed of sound', 'm/s', 'sos', 'Ses hızı', 'Atmosfer'),
  d('Mach number', '', 'mach', 'Mach sayısı', 'Atmosfer'),
  d('Reynolds number', '', 'reynolds', 'Reynolds sayısı', 'Atmosfer'),
  d('Reference length', 'cm', 'refLen', 'Referans uzunluk (çap)', 'Diğer'),
  d('Reference area', 'cm²', 'refArea', 'Referans alan', 'Diğer'),
  d('Simulation time step', 's', 'dt', 'Simülasyon adımı', 'Diğer'),
  d('Computation time', 's', 'compTime', 'Hesaplama süresi', 'Diğer'),
  d('Coriolis acceleration', 'm/s²', 'coriolis', 'Coriolis ivmesi', 'Diğer'),
]

export const GROUP_ORDER: ColumnGroup[] = [
  'Zaman', 'Konum', 'Hız', 'Yönelim', 'Kütle', 'Stabilite', 'İtki', 'Aerodinamik', 'Atmosfer', 'Diğer',
]

/** Sıfır genişlikli ve görünmez karakterler */
const INVISIBLE = /[​-‍⁠﻿]/g

/** Başlıktan son parantez grubunu (birim) ayırır. "A (b) (°)" -> ad "A (b)", birim "°" */
export function splitHeader(raw: string): { name: string; unit: string } {
  const s = raw.replace(INVISIBLE, '').trim()
  const m = /^(.*?)\s*\(([^()]*)\)\s*$/.exec(s)
  if (!m) return { name: s, unit: '' }
  return { name: (m[1] ?? '').trim(), unit: (m[2] ?? '').trim() }
}

export const normalizeName = (name: string) => name.replace(INVISIBLE, '').replace(/\s+/g, ' ').trim().toLowerCase()

const BY_NAME = new Map(COLUMN_DEFS.map((c) => [normalizeName(c.name), c]))
export const COLUMN_BY_KEY = new Map(COLUMN_DEFS.map((c) => [c.key, c]))

export function lookupColumn(headerName: string): ColumnDef | undefined {
  return BY_NAME.get(normalizeName(headerName))
}

/** Bilinmeyen sütun için addan camelCase anahtar türetir */
export function deriveKey(name: string): string {
  const ascii = name
    .replace(/ı/g, 'i').replace(/İ/g, 'I').replace(/ş/g, 's').replace(/Ş/g, 'S')
    .replace(/ğ/g, 'g').replace(/Ğ/g, 'G').replace(/ü/g, 'u').replace(/Ü/g, 'U')
    .replace(/ö/g, 'o').replace(/Ö/g, 'O').replace(/ç/g, 'c').replace(/Ç/g, 'C')
  const parts = ascii.split(/[^A-Za-z0-9]+/).filter(Boolean)
  if (!parts.length) return 'col'
  return parts.map((p, i) => (i === 0 ? p.toLowerCase() : p[0]!.toUpperCase() + p.slice(1).toLowerCase())).join('')
}
