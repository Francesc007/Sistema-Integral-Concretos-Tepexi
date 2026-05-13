/**
 * Esquema MVP — Supervisor de obra (Concretos Tepexi).
 * Basado en el manual de obligaciones y secuencia operativa (puntos 1–24).
 * Persistencia: localStorage en el cliente (MVP).
 */

export type PumpType = "pluma" | "estacionaria" | "directo";

/** Pasos del checklist en orden cronológico (agrupación del manual). */
export type ChecklistSectionId =
  | "programacion"
  | "acceso_riesgos"
  | "elemento_precubicacion"
  | "cubicacion"
  | "bombeo_suministro"
  | "coordinacion"
  | "cierre_admin";

export interface ChecklistStep {
  id: string;
  order: number;
  sectionId: ChecklistSectionId;
  title: string;
  /** Texto breve recordatorio / criterio de aceptación */
  hint?: string;
  /** Completado por el supervisor */
  done: boolean;
  observations: string;
}

export interface RouteAndSchedule {
  /** Servicio prioritario — fecha de referencia (YYYY-MM-DD) */
  serviceDate: string;
  surveyReportSubmitted: boolean;
  clientContactForFormwork: boolean;
  formworkComplete: boolean;
  /** @deprecated Preferir obraFullAddressNotes — se conserva por compatibilidad persistida */
  routeGpsNotes: string;
  /** Dirección o referencias de ubicación (captura manual supervisor). */
  obraFullAddressNotes: string;
  /** Texto de coordenadas / punto GPS (simulado o futuro API). */
  simulatedGpsPositionText: string;
  requiresPrintedSketch: boolean;
}

export interface SiteInspection {
  entranceHeightM: number | "";
  entranceWidthM: number | "";
  maneuverHeightClearM: number | "";
  singleAccessNoTurnaround: boolean;
  accessProcedureNotes: string;
  /** Permisos zona centro: responsabilidad del cliente (manual) */
  clientPermitsCentralZoneAck: boolean;
  /** Supervisor confirma acceso libre para suministro (candado Cubicación) */
  accessClearConfirmed: boolean;
}

export interface RiskFlags {
  lowPowerLines: boolean;
  veryNarrowAccess: boolean;
  ravineHillside: boolean;
  steepSlopeLoadedTruck: boolean;
  otherRiskNotes: string;
}

export interface ElementPrecalc {
  /** Tipo de elemento: losa, firme, columna, alberca, etc. */
  elementType: string;
  /** Margen de error esperado (manual punto 9) — texto libre MVP */
  errorMarginNotes: string;
  slabTypeNotes: string;
  formworkIrregularityNotes: string;
  adjustmentLeadTimeNotes: string;
}

export interface CubingDimensions {
  lengthM: number | "";
  widthM: number | "";
  /** Espesor de diseño / acordado con cliente */
  nominalThicknessM: number | "";
  /** Espesor real medido en obra (si difiere → alerta programador) */
  fieldThicknessM: number | "";
  volumeAdjustmentNotes: string;
  /** Cliente informado de responsabilidad por espesor (manual) */
  clientThicknessResponsibilityAck: boolean;
  /** Variaciones cimbra / elementos (manual 12) */
  irregularityAdjustmentNotes: string;
}

export interface PumpAndSupply {
  pumpType: PumpType;
  pipeDistanceM: number | "";
  /** Cortes en tubería → +20 min al total de programación */
  pipeCuts: boolean;
  /** Ensamble excesivo → +20 min al total de programación */
  excessivePipeAssembly: boolean;
  /** Zona de vaciado / obstáculos */
  supplyZoneNotes: string;
  clientManeuverAreaAck: boolean;
  alternateAccessNotes: string;
}

export interface Coordination {
  pumpAreaCleaned: boolean;
  plannedTruckUnits: number | "";
  pourStartTime: string;
  /** Estimación de duración del colado (min), puede alimentarse desde reglas */
  estimatedPourDurationMin: number | "";
  crewArrivalCoordinationNotes: string;
}

/** Servicio bombeado: lechada / purga (manual 20). */
export interface PumpedClientRequirements {
  serviceIsPumped: boolean;
  clientNotifiedSandAndCementForLechada: boolean;
}

/** Sobrante tolva según tipo de bomba (manual 21). */
export interface LeftoverPlan {
  designatedLocationNotes: string;
}

export interface CompletionAndReporting {
  /** Prueba de cierre — URL local (data URL) o vacío */
  completionProofDataUrl: string | null;
  clientSupervisionDisclaimerAck: boolean;
}

export interface VehicleLog {
  unitGoodConditionAck: boolean;
  preventiveMaintenanceNotes: string;
}

export interface DailyReportLine {
  id: string;
  zone: string;
  volumeM3: number | "";
  element: string;
  incidents: string;
}

export interface AppSettings {
  /** Tolerancia nominal vs campo para alerta de espesor (mm) */
  thicknessToleranceMm: number;
}

/** Alerta visible para el dashboard de programación (MVP: mismo navegador / localStorage). */
export interface ProgramacionAlert {
  id: string;
  tipo: "riesgo_critico_semaforo" | "otro";
  titulo: string;
  detalle: string;
  creadoEn: string;
  leida: boolean;
}

/** Fila que ve el programador (simula pull desde BD / mismo localStorage). */
export interface ServicioActivoProgramador {
  obraSesionId: string;
  referenciaObra: string;
  fechaServicio: string;
  checklistCompletados: number;
  checklistTotal: number;
  volumenM3: number | null;
  tiempoColadoEstimadoMin: number | null;
  tiempoColadoNota: string | null;
  semaforoRiesgo: "verde" | "amarillo" | "rojo";
  habilitacionOk: boolean;
  cubicacionOk: boolean;
  alertaEspesor: boolean;
  resumenParaProgramador: string;
  actualizadoEn: string;
}

export interface SupervisorAppState {
  /** Identifica la sesión de obra actual (una por “servicio” en demo local). */
  obraSesionId: string;
  settings: AppSettings;
  route: RouteAndSchedule;
  site: SiteInspection;
  risks: RiskFlags;
  precalc: ElementPrecalc;
  cubing: CubingDimensions;
  pump: PumpAndSupply;
  pumpedRules: PumpedClientRequirements;
  leftover: LeftoverPlan;
  coordination: Coordination;
  completion: CompletionAndReporting;
  vehicle: VehicleLog;
  dailyReports: DailyReportLine[];
  checklistSteps: ChecklistStep[];
  /** Bandeja tipo “dashboard programación” — sincronizada en localStorage */
  programacionAlerts: ProgramacionAlert[];
  /** Servicios que el supervisor “empuja” al guardar/avanzar checklist (MVP local). */
  serviciosActivosProgramador: ServicioActivoProgramador[];
}

export type ThicknessAlert =
  | {
      kind: "thickness_mismatch";
      nominalM: number;
      fieldM: number;
      deltaM: number;
      message: string;
    }
  | null;

export interface VolumeResult {
  volumeM3: number | null;
  formula: string;
}

export interface TimeEstimateLine {
  label: string;
  minutes: number;
}

export interface TimeEstimateResult {
  /** `true` si aplica motor proporcional (bomba estacionaria y volumen válido) */
  applicable: boolean;
  referenceNote: string;
  totalMinutes: number;
  lines: TimeEstimateLine[];
}
