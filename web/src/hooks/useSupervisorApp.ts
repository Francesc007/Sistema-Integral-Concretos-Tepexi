"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  computeRiskSemaphore,
  textoDetalleRiesgoCritico,
} from "@/lib/domain/campoWorkflow";
import {
  computeVolumeM3,
  estimateServiceMinutes,
  evaluateThicknessAlert,
} from "@/lib/domain/calculations";
import { createInitialSupervisorState } from "@/lib/domain/initialState";
import {
  clearSupervisorStorage,
  loadSupervisorState,
  saveSupervisorState,
} from "@/lib/domain/persistState";
import { upsertServiciosActivosProgramador } from "@/lib/domain/serviciosProgramadorSync";
import type {
  ChecklistStep,
  CubingDimensions,
  DailyReportLine,
  PumpAndSupply,
  PumpedClientRequirements,
  RouteAndSchedule,
  SiteInspection,
  SupervisorAppState,
} from "@/lib/domain/types";

function uid(): string {
  return crypto.randomUUID();
}

type SemaphoreLevel = ReturnType<typeof computeRiskSemaphore>;

export function useSupervisorApp() {
  const [persistenceReady, setPersistenceReady] = useState(false);
  const [state, setState] = useState<SupervisorAppState>(() =>
    createInitialSupervisorState(),
  );

  const prevSemRef = useRef<SemaphoreLevel>("verde");
  const semInitializedRef = useRef(false);

  useEffect(() => {
    const loaded = loadSupervisorState();
    setState(() => {
      const obraSesionId =
        loaded.obraSesionId && loaded.obraSesionId.trim() !== ""
          ? loaded.obraSesionId.trim()
          : crypto.randomUUID();
      const base = { ...loaded, obraSesionId };
      const lista = upsertServiciosActivosProgramador(
        base.serviciosActivosProgramador,
        base,
      );
      return { ...base, serviciosActivosProgramador: lista };
    });
    setPersistenceReady(true);
  }, []);

  const programadorSyncSig = useMemo(
    () =>
      JSON.stringify({
        obraSesionId: state.obraSesionId,
        checklistSteps: state.checklistSteps.map((x) => ({
          id: x.id,
          done: x.done,
        })),
        route: state.route,
        site: state.site,
        risks: state.risks,
        precalc: state.precalc,
        cubing: state.cubing,
        pump: state.pump,
      }),
    [
      state.obraSesionId,
      state.checklistSteps,
      state.route,
      state.site,
      state.risks,
      state.precalc,
      state.cubing,
      state.pump,
    ],
  );

  useEffect(() => {
    if (!persistenceReady) return;
    setState((s) => {
      const lista = upsertServiciosActivosProgramador(
        s.serviciosActivosProgramador,
        s,
      );
      if (
        JSON.stringify(lista) === JSON.stringify(s.serviciosActivosProgramador)
      ) {
        return s;
      }
      return { ...s, serviciosActivosProgramador: lista };
    });
  }, [persistenceReady, programadorSyncSig]);

  useEffect(() => {
    if (!persistenceReady) return;
    const level = computeRiskSemaphore(state.risks);
    if (!semInitializedRef.current) {
      prevSemRef.current = level;
      semInitializedRef.current = true;
      return;
    }
    if (level === "rojo" && prevSemRef.current !== "rojo") {
      setState((s) => ({
        ...s,
        programacionAlerts: [
          {
            id: uid(),
            tipo: "riesgo_critico_semaforo" as const,
            titulo: "Semáforo ROJO — riesgo crítico en campo",
            detalle: textoDetalleRiesgoCritico(s.risks),
            creadoEn: new Date().toISOString(),
            leida: false,
          },
          ...s.programacionAlerts,
        ].slice(0, 40),
      }));
    }
    prevSemRef.current = level;
  }, [
    persistenceReady,
    state.risks.lowPowerLines,
    state.risks.steepSlopeLoadedTruck,
    state.risks.veryNarrowAccess,
    state.risks.ravineHillside,
  ]);

  useEffect(() => {
    if (!persistenceReady) return;
    saveSupervisorState(state);
  }, [persistenceReady, state]);

  const setRoute = useCallback((patch: Partial<RouteAndSchedule>) => {
    setState((s) => ({ ...s, route: { ...s.route, ...patch } }));
  }, []);

  const setSite = useCallback((patch: Partial<SiteInspection>) => {
    setState((s) => ({ ...s, site: { ...s.site, ...patch } }));
  }, []);

  const setRisks = useCallback(
    (patch: Partial<SupervisorAppState["risks"]>) => {
      setState((s) => ({ ...s, risks: { ...s.risks, ...patch } }));
    },
    [],
  );

  const setPrecalc = useCallback(
    (patch: Partial<SupervisorAppState["precalc"]>) => {
      setState((s) => ({ ...s, precalc: { ...s.precalc, ...patch } }));
    },
    [],
  );

  const setCubing = useCallback((patch: Partial<CubingDimensions>) => {
    setState((s) => ({ ...s, cubing: { ...s.cubing, ...patch } }));
  }, []);

  const setPump = useCallback((patch: Partial<PumpAndSupply>) => {
    setState((s) => ({ ...s, pump: { ...s.pump, ...patch } }));
  }, []);

  const setPumpedRules = useCallback(
    (patch: Partial<PumpedClientRequirements>) => {
      setState((s) => ({
        ...s,
        pumpedRules: { ...s.pumpedRules, ...patch },
      }));
    },
    [],
  );

  const setLeftover = useCallback(
    (patch: Partial<SupervisorAppState["leftover"]>) => {
      setState((s) => ({ ...s, leftover: { ...s.leftover, ...patch } }));
    },
    [],
  );

  const setCoordination = useCallback(
    (patch: Partial<SupervisorAppState["coordination"]>) => {
      setState((s) => ({
        ...s,
        coordination: { ...s.coordination, ...patch },
      }));
    },
    [],
  );

  const setCompletion = useCallback(
    (patch: Partial<SupervisorAppState["completion"]>) => {
      setState((s) => ({
        ...s,
        completion: { ...s.completion, ...patch },
      }));
    },
    [],
  );

  const setVehicle = useCallback(
    (patch: Partial<SupervisorAppState["vehicle"]>) => {
      setState((s) => ({ ...s, vehicle: { ...s.vehicle, ...patch } }));
    },
    [],
  );

  const updateChecklistStep = useCallback(
    (id: string, patch: Partial<ChecklistStep>) => {
      setState((s) => ({
        ...s,
        checklistSteps: s.checklistSteps.map((step) =>
          step.id === id ? { ...step, ...patch } : step,
        ),
      }));
    },
    [],
  );

  const addDailyReportLine = useCallback(() => {
    setState((s) => ({
      ...s,
      dailyReports: [
        ...s.dailyReports,
        {
          id: uid(),
          zone: "",
          volumeM3: "",
          element: "",
          incidents: "",
        },
      ],
    }));
  }, []);

  const updateDailyReportLine = useCallback(
    (id: string, patch: Partial<DailyReportLine>) => {
      setState((s) => ({
        ...s,
        dailyReports: s.dailyReports.map((row) =>
          row.id === id ? { ...row, ...patch } : row,
        ),
      }));
    },
    [],
  );

  const removeDailyReportLine = useCallback((id: string) => {
    setState((s) => ({
      ...s,
      dailyReports: s.dailyReports.filter((r) => r.id !== id),
    }));
  }, []);

  const resetAll = useCallback(() => {
    clearSupervisorStorage();
    prevSemRef.current = "verde";
    semInitializedRef.current = false;
    const fresh = createInitialSupervisorState();
    setState({
      ...fresh,
      obraSesionId: crypto.randomUUID(),
      serviciosActivosProgramador: [],
    });
  }, []);

  const acknowledgeProgramacionAlert = useCallback((id: string) => {
    setState((s) => ({
      ...s,
      programacionAlerts: s.programacionAlerts.map((a) =>
        a.id === id ? { ...a, leida: true } : a,
      ),
    }));
  }, []);

  const thicknessAlert = useMemo(
    () =>
      evaluateThicknessAlert(
        state.cubing.nominalThicknessM,
        state.cubing.fieldThicknessM,
      ),
    [state.cubing.nominalThicknessM, state.cubing.fieldThicknessM],
  );

  const volumeDerived = useMemo(() => {
    const tField =
      typeof state.cubing.fieldThicknessM === "number"
        ? state.cubing.fieldThicknessM
        : state.cubing.nominalThicknessM;
    return computeVolumeM3(
      state.cubing.lengthM,
      state.cubing.widthM,
      tField,
    );
  }, [
    state.cubing.lengthM,
    state.cubing.widthM,
    state.cubing.nominalThicknessM,
    state.cubing.fieldThicknessM,
  ]);

  const timeEstimate = useMemo(
    () =>
      estimateServiceMinutes({
        volumeM3: volumeDerived.volumeM3 ?? "",
        pumpType: state.pump.pumpType,
        pipeLengthM: state.pump.pipeDistanceM,
        hasPipeCuts: state.pump.pipeCuts,
        hasExcessiveAssembly: state.pump.excessivePipeAssembly,
      }),
    [
      volumeDerived.volumeM3,
      state.pump.pumpType,
      state.pump.pipeDistanceM,
      state.pump.pipeCuts,
      state.pump.excessivePipeAssembly,
    ],
  );

  const checklistProgress = useMemo(() => {
    const total = state.checklistSteps.length;
    const done = state.checklistSteps.filter((x) => x.done).length;
    return { done, total, pct: total ? Math.round((done / total) * 100) : 0 };
  }, [state.checklistSteps]);

  const pumpedReminderActive =
    state.pumpedRules.serviceIsPumped &&
    !state.pumpedRules.clientNotifiedSandAndCementForLechada;

  const riskSemaphoreLevel = useMemo(
    () => computeRiskSemaphore(state.risks),
    [
      state.risks.lowPowerLines,
      state.risks.steepSlopeLoadedTruck,
      state.risks.veryNarrowAccess,
      state.risks.ravineHillside,
    ],
  );

  return {
    state,
    persistenceReady,
    setRoute,
    setSite,
    setRisks,
    setPrecalc,
    setCubing,
    setPump,
    setPumpedRules,
    setLeftover,
    setCoordination,
    setCompletion,
    setVehicle,
    updateChecklistStep,
    addDailyReportLine,
    updateDailyReportLine,
    removeDailyReportLine,
    resetAll,
    acknowledgeProgramacionAlert,
    derived: {
      thicknessAlert,
      volumeDerived,
      timeEstimate,
      checklistProgress,
      pumpedReminderActive,
      riskSemaphoreLevel,
    },
  };
}
