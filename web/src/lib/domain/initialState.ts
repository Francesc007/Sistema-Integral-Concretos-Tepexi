import { createInitialChecklist } from "./checklistSeed";
import type { SupervisorAppState } from "./types";

function todayISODate(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function createInitialSupervisorState(): SupervisorAppState {
  return {
    obraSesionId: "",
    route: {
      serviceDate: todayISODate(),
      clienteNombre: "",
      surveyReportSubmitted: false,
      clientContactForFormwork: false,
      formworkComplete: false,
      routeGpsNotes: "",
      obraFullAddressNotes: "",
      simulatedGpsPositionText: "",
      requiresPrintedSketch: false,
    },
    site: {
      entranceHeightM: "",
      entranceWidthM: "",
      maneuverHeightClearM: "",
      singleAccessNoTurnaround: false,
      accessProcedureNotes: "",
      clientPermitsCentralZoneAck: false,
      accessClearConfirmed: false,
    },
    risks: {
      lowPowerLines: false,
      veryNarrowAccess: false,
      ravineHillside: false,
      steepSlopeLoadedTruck: false,
      otherRiskNotes: "",
    },
    precalc: {
      elementType: "",
      errorMarginNotes: "",
      slabTypeNotes: "",
      formworkIrregularityNotes: "",
      adjustmentLeadTimeNotes: "",
    },
    cubing: {
      lengthM: "",
      widthM: "",
      nominalThicknessM: "",
      fieldThicknessM: "",
      volumeAdjustmentNotes: "",
      clientThicknessResponsibilityAck: false,
      irregularityAdjustmentNotes: "",
    },
    pump: {
      pumpType: "estacionaria",
      pipeDistanceM: "",
      pipeCuts: false,
      excessivePipeAssembly: false,
      supplyZoneNotes: "",
      clientManeuverAreaAck: false,
      alternateAccessNotes: "",
    },
    pumpedRules: {
      serviceIsPumped: true,
      clientNotifiedSandAndCementForLechada: false,
    },
    leftover: {
      designatedLocationNotes: "",
    },
    coordination: {
      pumpAreaCleaned: false,
      plannedTruckUnits: "",
      pourStartTime: "",
      estimatedPourDurationMin: "",
      crewArrivalCoordinationNotes: "",
    },
    completion: {
      completionProofDataUrl: null,
      clientSupervisionDisclaimerAck: false,
    },
    vehicle: {
      unitGoodConditionAck: false,
      preventiveMaintenanceNotes: "",
    },
    dailyReports: [],
    checklistSteps: createInitialChecklist(),
    programacionAlerts: [],
    serviciosActivosProgramador: [],
  };
}
