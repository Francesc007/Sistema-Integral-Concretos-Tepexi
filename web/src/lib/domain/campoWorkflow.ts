/**
 * Flujo Supervisión de Campo — candados entre etapas + semáforo de riesgo.
 */

import { computeVolumeM3, evaluateThicknessAlert } from "./calculations";
import type {
  ChecklistSectionId,
  RiskFlags,
  SupervisorAppState,
} from "./types";

export type CampoEtapaId =
  | "habilitacion"
  | "cubicacion"
  | "bombeo"
  | "coordinacion"
  | "cierre";

export type SemaphoreLevel = "verde" | "amarillo" | "rojo";

export interface PasoCandadoResult {
  desbloqueado: boolean;
  candadoPorEtapa?: CampoEtapaId;
  faltantes: string[];
}

/** Semáforo: cables bajos o pendiente fuerte con camión cargado → ROJO. */
export function computeRiskSemaphore(risks: RiskFlags): SemaphoreLevel {
  if (risks.lowPowerLines || risks.steepSlopeLoadedTruck) return "rojo";
  if (risks.veryNarrowAccess || risks.ravineHillside) return "amarillo";
  return "verde";
}

export function textoDetalleRiesgoCritico(risks: RiskFlags): string {
  const p: string[] = [];
  if (risks.lowPowerLines) p.push("Líneas/cables bajos");
  if (risks.steepSlopeLoadedTruck)
    p.push("Pendiente fuerte con camión cargado");
  return p.length ? p.join(" · ") : "Riesgo crítico detectado";
}

function volumenCalculado(state: SupervisorAppState): number | null {
  const t =
    typeof state.cubing.fieldThicknessM === "number"
      ? state.cubing.fieldThicknessM
      : state.cubing.nominalThicknessM;
  return computeVolumeM3(state.cubing.lengthM, state.cubing.widthM, t).volumeM3;
}

export function evaluarHabilitacion(state: SupervisorAppState): PasoCandadoResult {
  const faltantes: string[] = [];
  if (!state.route.clientContactForFormwork)
    faltantes.push("Contactar al cliente por estado del cimbrado.");
  if (!state.route.formworkComplete)
    faltantes.push('Confirmar que la cimbra está lista para cubicar.');
  if (!state.site.accessClearConfirmed)
    faltantes.push(
      "Confirmar acceso libre (altura, anchos y maniobra despejados para suministro).",
    );
  return {
    desbloqueado: faltantes.length === 0,
    faltantes,
  };
}

export function evaluarCubicacion(state: SupervisorAppState): PasoCandadoResult {
  const hab = evaluarHabilitacion(state);
  if (!hab.desbloqueado) {
    return {
      desbloqueado: false,
      candadoPorEtapa: "habilitacion",
      faltantes: [
        "Candado: complete antes Habilitación de obra (cimbra lista + acceso libre).",
      ],
    };
  }

  const faltantes: string[] = [];
  const vol = volumenCalculado(state);
  if (vol === null)
    faltantes.push(
      "Registrar largo, ancho y espesor válidos para obtener volumen (m³).",
    );
  if (!state.precalc.elementType.trim())
    faltantes.push("Indique el tipo de elemento (losa, firme, columna…).");
  if (!state.cubing.clientThicknessResponsibilityAck)
    faltantes.push(
      "Asentar responsabilidad del cliente sobre el espesor acordado.",
    );

  const esp = evaluateThicknessAlert(
    state.cubing.nominalThicknessM,
    state.cubing.fieldThicknessM,
    state.settings.thicknessToleranceMm,
  );
  if (esp)
    faltantes.push(
      "Resolver discrepancia de espesor nominal vs campo con programación antes de avanzar.",
    );

  return {
    desbloqueado: faltantes.length === 0,
    faltantes,
  };
}

export function evaluarBombeo(state: SupervisorAppState): PasoCandadoResult {
  const cub = evaluarCubicacion(state);
  if (!cub.desbloqueado) {
    return {
      desbloqueado: false,
      candadoPorEtapa: "cubicacion",
      faltantes: ["Candado: complete antes la etapa Cubicación."],
    };
  }

  const faltantes: string[] = [];
  if (!state.pump.clientManeuverAreaAck)
    faltantes.push("Cliente responsable del área de maniobras — confirmar.");
  if (typeof state.pump.pipeDistanceM !== "number")
    faltantes.push(
      "Medir y registrar distancia de tubería / bomba al elemento (m).",
    );
  if (!state.pump.supplyZoneNotes.trim())
    faltantes.push("Describir zona de vaciado y obstáculos relevados.");
  if (state.pumpedRules.serviceIsPumped) {
    if (!state.pumpedRules.clientNotifiedSandAndCementForLechada)
      faltantes.push(
        "Servicio bombeado: cliente notificado (arena + cemento para purga).",
      );
    if (!state.leftover.designatedLocationNotes.trim())
      faltantes.push("Definir ubicación del sobrante de tolva/bomba.");
  }

  return {
    desbloqueado: faltantes.length === 0,
    faltantes,
  };
}

export function evaluarCoordinacion(state: SupervisorAppState): PasoCandadoResult {
  const bom = evaluarBombeo(state);
  if (!bom.desbloqueado) {
    return {
      desbloqueado: false,
      candadoPorEtapa: "bombeo",
      faltantes: ["Candado: complete antes Bombeo y logística."],
    };
  }

  const faltantes: string[] = [];
  if (!state.coordination.pumpAreaCleaned)
    faltantes.push("Confirmar área limpia para bomba/unidades.");
  if (
    typeof state.coordination.plannedTruckUnits !== "number" ||
    state.coordination.plannedTruckUnits <= 0
  )
    faltantes.push("Registrar número de unidades (camiones) programadas.");
  if (!state.coordination.pourStartTime.trim())
    faltantes.push("Definir hora de inicio del colado.");

  return {
    desbloqueado: faltantes.length === 0,
    faltantes,
  };
}

export function evaluarCierre(state: SupervisorAppState): PasoCandadoResult {
  const coord = evaluarCoordinacion(state);
  if (!coord.desbloqueado) {
    return {
      desbloqueado: false,
      candadoPorEtapa: "coordinacion",
      faltantes: ["Candado: complete antes Coordinación de colado."],
    };
  }

  const sem = computeRiskSemaphore(state.risks);
  const faltantes: string[] = [];

  if (sem === "rojo") {
    faltantes.push(
      "Semáforo ROJO: coordine con programación antes de dar cierre formal.",
    );
  }
  if (!state.completion.completionProofDataUrl)
    faltantes.push("Adjuntar foto de evidencia del servicio terminado.");
  if (!state.completion.clientSupervisionDisclaimerAck)
    faltantes.push("Cliente informado sobre supervisión y garantía.");
  if (!state.vehicle.unitGoodConditionAck)
    faltantes.push("Confirmar unidad operativa / documentación vehicular.");

  return {
    desbloqueado: faltantes.length === 0,
    faltantes,
  };
}

export function evaluarEtapa(
  id: CampoEtapaId,
  state: SupervisorAppState,
): PasoCandadoResult {
  switch (id) {
    case "habilitacion":
      return evaluarHabilitacion(state);
    case "cubicacion":
      return evaluarCubicacion(state);
    case "bombeo":
      return evaluarBombeo(state);
    case "coordinacion":
      return evaluarCoordinacion(state);
    case "cierre":
      return evaluarCierre(state);
    default:
      return { desbloqueado: false, faltantes: [] };
  }
}

export const CAMPO_ETAPAS_ORDEN: CampoEtapaId[] = [
  "habilitacion",
  "cubicacion",
  "bombeo",
  "coordinacion",
  "cierre",
];

export const CAMPO_ETAPA_LABELS: Record<
  CampoEtapaId,
  { titulo: string; descripcion: string }
> = {
  habilitacion: {
    titulo: "Habilitación de obra",
    descripcion:
      "Cimbra lista, contacto con cliente y acceso libre para suministro.",
  },
  cubicacion: {
    titulo: "Cubicación",
    descripcion: "Elemento, volumen acordado y responsabilidad de espesor.",
  },
  bombeo: {
    titulo: "Bombeo y logística",
    descripcion:
      "Distancia de línea, zona de vaciado, maniobras y requisitos de bombeo.",
  },
  coordinacion: {
    titulo: "Coordinación de colado",
    descripcion:
      "Área lista, unidades, horario de colado y tiempo estimado.",
  },
  cierre: {
    titulo: "Cierre de supervisión",
    descripcion:
      "Evidencia fotográfica, garantías y semáforo distinto de ROJO.",
  },
};

/**
 * Candados del checklist por sección (alineado al flujo Supervisión de campo).
 */
export function checklistSectionCandado(
  sectionId: ChecklistSectionId,
  state: SupervisorAppState,
): { editable: boolean; mensaje: string | null } {
  switch (sectionId) {
    case "programacion":
    case "acceso_riesgos":
      return { editable: true, mensaje: null };

    case "elemento_precubicacion":
    case "cubicacion": {
      const h = evaluarHabilitacion(state);
      if (!h.desbloqueado) {
        return {
          editable: false,
          mensaje:
            "Candado: complete Habilitación de obra en Supervisión de campo (cimbra lista + acceso libre) antes de marcar esta sección.",
        };
      }
      return { editable: true, mensaje: null };
    }

    case "bombeo_suministro": {
      const c = evaluarCubicacion(state);
      if (!c.desbloqueado) {
        return {
          editable: false,
          mensaje:
            "Candado: complete la etapa Cubicación en Supervisión de campo antes de Bombeo y suministro.",
        };
      }
      return { editable: true, mensaje: null };
    }

    case "coordinacion": {
      const b = evaluarBombeo(state);
      if (!b.desbloqueado) {
        return {
          editable: false,
          mensaje:
            "Candado: complete Bombeo y logística en Supervisión de campo antes de Coordinación.",
        };
      }
      return { editable: true, mensaje: null };
    }

    case "cierre_admin": {
      const co = evaluarCoordinacion(state);
      if (!co.desbloqueado) {
        return {
          editable: false,
          mensaje:
            "Candado: complete Coordinación de colado en Supervisión de campo antes del cierre administrativo.",
        };
      }
      return { editable: true, mensaje: null };
    }

    default:
      return { editable: true, mensaje: null };
  }
}
