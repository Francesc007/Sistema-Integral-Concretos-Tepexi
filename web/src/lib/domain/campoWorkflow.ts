/**
 * Flujo Supervisión de Campo — candados entre etapas + semáforo de riesgo.
 */

import {
  computeVolumeM3,
  DEFAULT_THICKNESS_TOLERANCE_MM,
  evaluateThicknessAlert,
} from "./calculations";
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
    ...(faltantes.length > 0 ? { candadoPorEtapa: "habilitacion" as const } : {}),
    faltantes,
  };
}

export function evaluarCubicacion(state: SupervisorAppState): PasoCandadoResult {
  const hab = evaluarHabilitacion(state);
  if (!hab.desbloqueado) {
    return {
      desbloqueado: false,
      candadoPorEtapa: "habilitacion",
      faltantes: hab.faltantes,
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
    DEFAULT_THICKNESS_TOLERANCE_MM,
  );
  if (esp)
    faltantes.push(
      "Resolver discrepancia de espesor nominal vs campo con programación antes de avanzar.",
    );

  return {
    desbloqueado: faltantes.length === 0,
    ...(faltantes.length > 0 ? { candadoPorEtapa: "cubicacion" as const } : {}),
    faltantes,
  };
}

export function evaluarBombeo(state: SupervisorAppState): PasoCandadoResult {
  const cub = evaluarCubicacion(state);
  if (!cub.desbloqueado) {
    return {
      desbloqueado: false,
      candadoPorEtapa: cub.candadoPorEtapa ?? "cubicacion",
      faltantes: cub.faltantes,
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
    ...(faltantes.length > 0 ? { candadoPorEtapa: "bombeo" as const } : {}),
    faltantes,
  };
}

export function evaluarCoordinacion(state: SupervisorAppState): PasoCandadoResult {
  const bom = evaluarBombeo(state);
  if (!bom.desbloqueado) {
    return {
      desbloqueado: false,
      candadoPorEtapa: bom.candadoPorEtapa ?? "bombeo",
      faltantes: bom.faltantes,
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
    ...(faltantes.length > 0 ? { candadoPorEtapa: "coordinacion" as const } : {}),
    faltantes,
  };
}

export function evaluarCierre(state: SupervisorAppState): PasoCandadoResult {
  const coord = evaluarCoordinacion(state);
  if (!coord.desbloqueado) {
    return {
      desbloqueado: false,
      candadoPorEtapa: coord.candadoPorEtapa ?? "coordinacion",
      faltantes: coord.faltantes,
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
    ...(faltantes.length > 0 ? { candadoPorEtapa: "cierre" as const } : {}),
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
            "Candado: indicar en checklist contacto cliente, cimbrado completo y acceso libre (sección Habilitación) antes de la pre-cubicación.",
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
            "Candado: complete antes la sección Cubicación del checklist— dimensiones válidas, elemento y volumen aclarados.",
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
            "Candado: complete antes Bombeo y suministro en el checklist antes de Coordinación.",
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
            "Candado: complete antes Coordinación de colado en el checklist antes del cierre administrativo.",
        };
      }
      return { editable: true, mensaje: null };
    }

    default:
      return { editable: true, mensaje: null };
  }
}

/** Dónde corregir datos en el checklist según la etapa operativa que falla. */
export function checklistSeccionesPorEtapaOperativa(
  etapa: CampoEtapaId,
): ChecklistSectionId[] {
  switch (etapa) {
    case "habilitacion":
      return ["programacion", "acceso_riesgos"];
    case "cubicacion":
      return ["elemento_precubicacion", "cubicacion"];
    case "bombeo":
      return ["bombeo_suministro"];
    case "coordinacion":
      return ["coordinacion"];
    case "cierre":
      return ["cierre_admin"];
    default:
      return [];
  }
}

/**
 * Primer candado operativo que falla: secciones del checklist cuyos formularios
 * deben mostrarse aunque el avance de checkboxes esté más adelante.
 */
export function getChecklistCorrectionSectionIds(
  state: SupervisorAppState,
): ChecklistSectionId[] {
  const hab = evaluarHabilitacion(state);
  if (!hab.desbloqueado) {
    return [...checklistSeccionesPorEtapaOperativa("habilitacion")];
  }
  const cub = evaluarCubicacion(state);
  if (!cub.desbloqueado) {
    return [
      ...checklistSeccionesPorEtapaOperativa(
        cub.candadoPorEtapa ?? "cubicacion",
      ),
    ];
  }
  const bom = evaluarBombeo(state);
  if (!bom.desbloqueado) {
    return [
      ...checklistSeccionesPorEtapaOperativa(bom.candadoPorEtapa ?? "bombeo"),
    ];
  }
  const coord = evaluarCoordinacion(state);
  if (!coord.desbloqueado) {
    return [
      ...checklistSeccionesPorEtapaOperativa(
        coord.candadoPorEtapa ?? "coordinacion",
      ),
    ];
  }
  return [];
}

/** Firma estable del candado activo (scroll / avisos sin duplicar lógica). */
export function firmaCandadoOperativoActivo(state: SupervisorAppState): string {
  const hab = evaluarHabilitacion(state);
  if (!hab.desbloqueado) {
    return `hab|${hab.faltantes.join("¦")}`;
  }
  const cub = evaluarCubicacion(state);
  if (!cub.desbloqueado) {
    return `cub|${cub.candadoPorEtapa ?? "cubicacion"}|${cub.faltantes.join("¦")}`;
  }
  const bom = evaluarBombeo(state);
  if (!bom.desbloqueado) {
    return `bom|${bom.candadoPorEtapa ?? "bombeo"}|${bom.faltantes.join("¦")}`;
  }
  const coord = evaluarCoordinacion(state);
  if (!coord.desbloqueado) {
    return `coord|${coord.candadoPorEtapa ?? "coordinacion"}|${coord.faltantes.join("¦")}`;
  }
  return "ok";
}

/**
 * Información unificada del primer candado operativo incompleto
 * (independiente de en qué fila del checklist vaya marcado).
 */
export function checklistBloqueoOperativoActual(
  state: SupervisorAppState,
): ChecklistCandadoDetalle | null {
  const hab = evaluarHabilitacion(state);
  if (!hab.desbloqueado) {
    return {
      editable: false,
      mensaje:
        "Habilitación incompleta: programación cliente/cimbra + acceso libre antes de siguientes etapas.",
      faltantesConcretos: hab.faltantes,
      revisarEnSecciones: checklistSeccionesPorEtapaOperativa("habilitacion"),
      etapaBloqueadora: "habilitacion",
    };
  }

  const cub = evaluarCubicacion(state);
  if (!cub.desbloqueado) {
    const etapa = cub.candadoPorEtapa ?? "cubicacion";
    return {
      editable: false,
      mensaje:
        "Complete elemento, volumen (L×A×E), responsabilidades de espesor y volumen válido antes de bombeo.",
      faltantesConcretos: cub.faltantes,
      revisarEnSecciones: checklistSeccionesPorEtapaOperativa(etapa),
      etapaBloqueadora: etapa,
    };
  }

  const bom = evaluarBombeo(state);
  if (!bom.desbloqueado) {
    const etapa = bom.candadoPorEtapa ?? "bombeo";
    return {
      editable: false,
      mensaje: checklistSectionCandado("bombeo_suministro", state).mensaje,
      faltantesConcretos: bom.faltantes,
      revisarEnSecciones: checklistSeccionesPorEtapaOperativa(etapa),
      etapaBloqueadora: etapa,
    };
  }

  const coord = evaluarCoordinacion(state);
  if (!coord.desbloqueado) {
    const etapa = coord.candadoPorEtapa ?? "coordinacion";
    return {
      editable: false,
      mensaje: checklistSectionCandado("coordinacion", state).mensaje,
      faltantesConcretos: coord.faltantes,
      revisarEnSecciones: checklistSeccionesPorEtapaOperativa(etapa),
      etapaBloqueadora: etapa,
    };
  }

  return null;
}

export interface ChecklistCandadoDetalle {
  editable: boolean;
  mensaje: string | null;
  faltantesConcretos: string[];
  revisarEnSecciones: ChecklistSectionId[];
  etapaBloqueadora: CampoEtapaId | null;
}

export function checklistSectionCandadoDetalle(
  sectionId: ChecklistSectionId,
  state: SupervisorAppState,
): ChecklistCandadoDetalle {
  const base = checklistSectionCandado(sectionId, state);
  if (base.editable) {
    return {
      editable: true,
      mensaje: null,
      faltantesConcretos: [],
      revisarEnSecciones: [],
      etapaBloqueadora: null,
    };
  }

  let ev: PasoCandadoResult;
  let etapaBloqueadora: CampoEtapaId;

  switch (sectionId) {
    case "elemento_precubicacion":
    case "cubicacion":
      ev = evaluarHabilitacion(state);
      etapaBloqueadora = ev.candadoPorEtapa ?? "habilitacion";
      break;
    case "bombeo_suministro":
      ev = evaluarCubicacion(state);
      etapaBloqueadora = ev.candadoPorEtapa ?? "cubicacion";
      break;
    case "coordinacion":
      ev = evaluarBombeo(state);
      etapaBloqueadora = ev.candadoPorEtapa ?? "bombeo";
      break;
    case "cierre_admin":
      ev = evaluarCoordinacion(state);
      etapaBloqueadora = ev.candadoPorEtapa ?? "coordinacion";
      break;
    default:
      return {
        editable: true,
        mensaje: null,
        faltantesConcretos: [],
        revisarEnSecciones: [],
        etapaBloqueadora: null,
      };
  }

  return {
    editable: false,
    mensaje: base.mensaje,
    faltantesConcretos: ev.faltantes,
    revisarEnSecciones: checklistSeccionesPorEtapaOperativa(etapaBloqueadora),
    etapaBloqueadora,
  };
}
