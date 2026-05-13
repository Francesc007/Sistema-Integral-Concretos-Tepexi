import { createInitialSupervisorState } from "./initialState";
import type {
  ServicioActivoProgramador,
  SupervisorAppState,
} from "./types";

export const SUPERVISOR_STORAGE_KEY = "concretos-tepexi-supervisor-v1";

/**
 * Fusiona JSON guardado con el esquema actual (migración suave entre versiones).
 */
export function mergePersisted(raw: unknown): SupervisorAppState {
  const base = createInitialSupervisorState();
  if (!raw || typeof raw !== "object") return base;

  const p = raw as Partial<SupervisorAppState>;

  const tol =
    typeof p.settings?.thicknessToleranceMm === "number" &&
    Number.isFinite(p.settings.thicknessToleranceMm) &&
    p.settings.thicknessToleranceMm > 0
      ? p.settings.thicknessToleranceMm
      : base.settings.thicknessToleranceMm;

  const checklistSteps =
    Array.isArray(p.checklistSteps) && p.checklistSteps.length > 0
      ? p.checklistSteps
      : base.checklistSteps;

  const obraSesionId =
    typeof p.obraSesionId === "string" && p.obraSesionId.trim().length > 0
      ? p.obraSesionId.trim()
      : base.obraSesionId;

  let serviciosActivosProgramador: ServicioActivoProgramador[] =
    base.serviciosActivosProgramador;
  if (Array.isArray(p.serviciosActivosProgramador)) {
    serviciosActivosProgramador = p.serviciosActivosProgramador.filter(
      (row): row is ServicioActivoProgramador =>
        Boolean(row) &&
        typeof row === "object" &&
        typeof (row as ServicioActivoProgramador).obraSesionId === "string",
    );
  }

  const routeMerged = { ...base.route, ...p.route };
  const migDir =
    typeof routeMerged.obraFullAddressNotes === "string"
      ? routeMerged.obraFullAddressNotes.trim()
      : "";
  const migLegacy =
    typeof routeMerged.routeGpsNotes === "string"
      ? routeMerged.routeGpsNotes.trim()
      : "";
  const route: SupervisorAppState["route"] =
    migDir === "" && migLegacy !== ""
      ? { ...routeMerged, obraFullAddressNotes: routeMerged.routeGpsNotes }
      : routeMerged;

  return {
    obraSesionId,
    settings: { thicknessToleranceMm: tol },
    route,
    site: { ...base.site, ...p.site },
    risks: { ...base.risks, ...p.risks },
    precalc: { ...base.precalc, ...p.precalc },
    cubing: { ...base.cubing, ...p.cubing },
    pump: { ...base.pump, ...p.pump },
    pumpedRules: { ...base.pumpedRules, ...p.pumpedRules },
    leftover: { ...base.leftover, ...p.leftover },
    coordination: { ...base.coordination, ...p.coordination },
    completion: { ...base.completion, ...p.completion },
    vehicle: { ...base.vehicle, ...p.vehicle },
    dailyReports: Array.isArray(p.dailyReports)
      ? p.dailyReports
      : base.dailyReports,
    checklistSteps,
    programacionAlerts: Array.isArray(p.programacionAlerts)
      ? p.programacionAlerts
      : base.programacionAlerts,
    serviciosActivosProgramador,
  };
}

export function saveSupervisorState(state: SupervisorAppState): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(SUPERVISOR_STORAGE_KEY, JSON.stringify(state));
  } catch {
    try {
      const { completion, ...rest } = state;
      localStorage.setItem(
        SUPERVISOR_STORAGE_KEY,
        JSON.stringify({
          ...rest,
          completion: {
            ...completion,
            completionProofDataUrl: null,
          },
        }),
      );
    } catch {
      /* quota / privado */
    }
  }
}

export function clearSupervisorStorage(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(SUPERVISOR_STORAGE_KEY);
}

export function loadSupervisorState(): SupervisorAppState {
  if (typeof window === "undefined") return mergePersisted(null);
  try {
    const raw = localStorage.getItem(SUPERVISOR_STORAGE_KEY);
    if (!raw) return mergePersisted(null);
    return mergePersisted(JSON.parse(raw));
  } catch {
    return mergePersisted(null);
  }
}
