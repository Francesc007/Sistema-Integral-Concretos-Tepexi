import type {
  PumpType,
  ThicknessAlert,
  TimeEstimateResult,
  VolumeResult,
} from "./types";

/** Valor por defecto cuando no se pasa tolerancia explícita (10 mm). */
export const DEFAULT_THICKNESS_TOLERANCE_MM = 10;

/** En metros, para `evaluateThicknessAlert` cuando se usa el default. */
export const DEFAULT_THICKNESS_TOLERANCE_M =
  DEFAULT_THICKNESS_TOLERANCE_MM / 1000;

/** Volumen de referencia para escalar el tiempo base (m³). */
export const TIME_RULE_REFERENCE_VOLUME_M3 = 7;

/**
 * Volumen teórico en m³: Largo × Ancho × Espesor (metros).
 * Usa espesor nominal si no hay campo en obra; si hay ambos, prioriza campo para el m³
 * y la comparación nominal vs campo genera alerta (ver `evaluateThicknessAlert`).
 */
export function computeVolumeM3(
  lengthM: number | "",
  widthM: number | "",
  thicknessForVolumeM: number | "",
): VolumeResult {
  const L = typeof lengthM === "number" ? lengthM : NaN;
  const W = typeof widthM === "number" ? widthM : NaN;
  const T = typeof thicknessForVolumeM === "number" ? thicknessForVolumeM : NaN;

  if (!Number.isFinite(L) || !Number.isFinite(W) || !Number.isFinite(T)) {
    return {
      volumeM3: null,
      formula: "Complete largo, ancho y espesor (m) para calcular m³.",
    };
  }

  if (L <= 0 || W <= 0 || T <= 0) {
    return {
      volumeM3: null,
      formula: "Las dimensiones deben ser mayores que cero.",
    };
  }

  const v = L * W * T;
  return {
    volumeM3: Math.round(v * 1000) / 1000,
    formula: `${L} × ${W} × ${T} = ${v.toFixed(3)} m³`,
  };
}

export function evaluateThicknessAlert(
  nominalThicknessM: number | "",
  fieldThicknessM: number | "",
  toleranceMm: number = DEFAULT_THICKNESS_TOLERANCE_MM,
): ThicknessAlert {
  const toleranceM =
    Number.isFinite(toleranceMm) && toleranceMm > 0
      ? toleranceMm / 1000
      : DEFAULT_THICKNESS_TOLERANCE_M;

  const n =
    typeof nominalThicknessM === "number" ? nominalThicknessM : null;
  const f = typeof fieldThicknessM === "number" ? fieldThicknessM : null;

  if (n === null || f === null) return null;
  if (n <= 0 || f <= 0) return null;

  const delta = f - n;
  if (Math.abs(delta) <= toleranceM) return null;

  return {
    kind: "thickness_mismatch",
    nominalM: n,
    fieldM: f,
    deltaM: delta,
    message:
      "El espesor medido en obra no coincide con el nominal. Notificar al programador de inmediato para ajustar volumen y tiempos.",
  };
}

/** Armado tubería 20–30 m (manual logística — ejemplo tablero 30 min). */
const STATIONARY_ASSEMBLY_20_30_MIN = 30;
/** Colado estándar por 7 m³ — referencia 20–30 min; usamos punto medio 25 min. */
const STATIONARY_POUR_STANDARD_PER_7_MIN = 25;
/** Colado losa con cortes por 7 m³ — referencia ~50 min (escala con V/7). */
const STATIONARY_POUR_CUTS_PER_7_MIN = 50;
/** Lavado línea/bomba — referencia ≤30 min (7 m³, ~30 m tubería). */
const STATIONARY_WASH_MIN = 30;

const BOOM_SETUP_MIN = 10;
const BOOM_POUR_PER_7_MIN = 10;
const BOOM_WASH_MIN = 10;

/** Tiro directo: referencia hasta ~60 min por 7 m³ (vaciado + enjuague). */
const DIRECT_POUR_PER_7_MIN = 60;

/**
 * Motor de tiempos — logística de programación (manual planta).
 *
 * - **Estacionaria:** armado (20–30 m tubería) + colado escalado (25 o 50 min por 7 m³)
 *   + lavado 30 min. Ejemplo 7 m³, 30 m tubería, con cortes: 30 + 50 + 30 = 110 min.
 * - **Pluma:** 10 min instalación + (V/7)×10 vaciado + 10 min lavado.
 * - **Directo:** (V/7)×60 min por olla (referencia máx. ~1 h por 7 m³).
 */
export function estimateServiceMinutes(params: {
  volumeM3: number | "";
  pumpType: PumpType;
  pipeLengthM: number | "";
  hasPipeCuts: boolean;
  hasExcessiveAssembly: boolean;
}): TimeEstimateResult {
  const vol =
    typeof params.volumeM3 === "number" ? params.volumeM3 : NaN;
  const pipe =
    typeof params.pipeLengthM === "number" ? params.pipeLengthM : null;

  if (!Number.isFinite(vol) || vol <= 0) {
    return {
      applicable: false,
      referenceNote:
        "Indique un volumen calculado mayor que cero (m³) para estimar el tiempo.",
      totalMinutes: 0,
      lines: [],
    };
  }

  const factor = vol / TIME_RULE_REFERENCE_VOLUME_M3;

  if (params.pumpType === "estacionaria") {
    const lines: { label: string; minutes: number }[] = [];

    if (pipe !== null && pipe >= 20 && pipe <= 30) {
      let assemblyMin = STATIONARY_ASSEMBLY_20_30_MIN;
      if (params.hasExcessiveAssembly) {
        assemblyMin *= 2;
      }
      lines.push({
        label: params.hasExcessiveAssembly
          ? "Armado tubería (20–30 m) — factor inclinación / complejidad ×2"
          : "Armado tubería (20–30 m, referencia logística)",
        minutes: assemblyMin,
      });
    }

    const pourPer7 = params.hasPipeCuts
      ? STATIONARY_POUR_CUTS_PER_7_MIN
      : STATIONARY_POUR_STANDARD_PER_7_MIN;
    lines.push({
      label: params.hasPipeCuts
        ? "Colado (losa con cortes ~50 min por 7 m³, escalado)"
        : "Colado (20–30 min por 7 m³ típico, escalado · punto medio 25)",
      minutes: Math.round(factor * pourPer7),
    });

    lines.push({
      label:
        "Lavado línea / bomba (referencia ≤30 min · olla 7 m³ · tubería ~30 m)",
      minutes: STATIONARY_WASH_MIN,
    });

    const total = lines.reduce((s, x) => s + x.minutes, 0);

    return {
      applicable: true,
      referenceNote:
        pipe !== null && pipe >= 20 && pipe <= 30
          ? "Motor bomba estacionaria (manual logística): armado en tramo 20–30 m + colado escalado + lavado."
          : "Motor bomba estacionaria: sin tramo 20–30 m declarado no se suma línea de armado; confirmar metros en obra.",
      totalMinutes: total,
      lines,
    };
  }

  if (params.pumpType === "pluma") {
    const lines: { label: string; minutes: number }[] = [
      { label: "Instalación de pluma", minutes: BOOM_SETUP_MIN },
      {
        label: "Vaciado (~10 min por 7 m³)",
        minutes: Math.round(factor * BOOM_POUR_PER_7_MIN),
      },
      { label: "Lavado", minutes: BOOM_WASH_MIN },
    ];
    const total = lines.reduce((s, x) => s + x.minutes, 0);
    return {
      applicable: true,
      referenceNote:
        "Motor bomba pluma: instalación + vaciado escalado + lavado (manual planta).",
      totalMinutes: total,
      lines,
    };
  }

  const lines: { label: string; minutes: number }[] = [
    {
      label:
        "Tiro directo (referencia hasta ~60 min por 7 m³ incl. enjuague; considerar guarnición/cuneta/carretilla)",
      minutes: Math.round(factor * DIRECT_POUR_PER_7_MIN),
    },
  ];
  const total = lines.reduce((s, x) => s + x.minutes, 0);
  return {
    applicable: true,
    referenceNote:
      "Motor tiro directo: tiempo por volumen según manual; rutas GPS para revolvedoras suelen duplicarse vs bomba.",
    totalMinutes: total,
    lines,
  };
}

/** Sugerencia operativa de sobrantes en carretillas según manual. */
export function leftoverWheelbarrowsHint(pumpType: PumpType): string | null {
  if (pumpType === "estacionaria")
    return "Referencia manual: ~2 carretillas de sobrante (tolva estacionaria).";
  if (pumpType === "pluma")
    return "Referencia manual: ~4 carretillas de sobrante (pluma).";
  return null;
}
