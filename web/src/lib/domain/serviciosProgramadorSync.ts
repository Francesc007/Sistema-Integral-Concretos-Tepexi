/**
 * Sincroniza un “servicio activo” para la vista Programador (MVP local).
 * Simula el push del supervisor → bandeja del programador.
 */

import {
  computeRiskSemaphore,
  evaluarCubicacion,
  evaluarHabilitacion,
} from "./campoWorkflow";
import {
  computeVolumeM3,
  DEFAULT_THICKNESS_TOLERANCE_MM,
  estimateServiceMinutes,
  evaluateThicknessAlert,
} from "./calculations";
import type { ServicioActivoProgramador, SupervisorAppState } from "./types";

export function debeMostrarseServicioEnProgramador(
  state: SupervisorAppState,
): boolean {
  return (
    typeof state.obraSesionId === "string" && state.obraSesionId.trim() !== ""
  );
}

export function buildServicioActivoProgramador(
  state: SupervisorAppState,
): ServicioActivoProgramador {
  const checklistTotal = state.checklistSteps.length;
  const checklistCompletados = state.checklistSteps.filter((s) => s.done)
    .length;

  const tVol =
    typeof state.cubing.fieldThicknessM === "number"
      ? state.cubing.fieldThicknessM
      : state.cubing.nominalThicknessM;
  const vol = computeVolumeM3(
    state.cubing.lengthM,
    state.cubing.widthM,
    tVol,
  ).volumeM3;

  const timeEst = estimateServiceMinutes({
    volumeM3: vol ?? "",
    pumpType: state.pump.pumpType,
    pipeLengthM: state.pump.pipeDistanceM,
    hasPipeCuts: state.pump.pipeCuts,
    hasExcessiveAssembly: state.pump.excessivePipeAssembly,
  });

  const sem = computeRiskSemaphore(state.risks);
  const espAlert = evaluateThicknessAlert(
    state.cubing.nominalThicknessM,
    state.cubing.fieldThicknessM,
    DEFAULT_THICKNESS_TOLERANCE_MM,
  );

  const hab = evaluarHabilitacion(state);
  const cub = evaluarCubicacion(state);

  const ref =
    state.route.obraFullAddressNotes.trim().slice(0, 96) ||
    state.route.routeGpsNotes.trim().slice(0, 96) ||
    `Obra · ${state.route.serviceDate}`;

  let resumen = `Checklist ${checklistCompletados}/${checklistTotal}.`;
  if (!hab.desbloqueado) {
    resumen +=
      " Pendiente habilitación (cimbra/acceso); no despachar sin confirmar.";
  } else if (!cub.desbloqueado) {
    resumen += " Cubicación incompleta o datos por validar.";
  } else {
    resumen += " Cubicación lista para ventana de colado.";
  }
  if (espAlert) {
    resumen += " ALERTA: discrepancia de espesor — revisar volumen.";
  }
  if (sem === "rojo") {
    resumen += " RIESGO CRÍTICO en campo.";
  }

  const bombaLbl =
    state.pump.pumpType === "estacionaria"
      ? "Estacionaria"
      : state.pump.pumpType === "pluma"
        ? "Pluma"
        : "Directo";
  resumen += ` Bomba ${bombaLbl}.`;

  return {
    obraSesionId: state.obraSesionId,
    referenciaObra: ref,
    fechaServicio: state.route.serviceDate,
    checklistCompletados,
    checklistTotal,
    volumenM3: vol,
    tiempoColadoEstimadoMin: timeEst.applicable ? timeEst.totalMinutes : null,
    tiempoColadoNota: timeEst.applicable ? null : timeEst.referenceNote,
    semaforoRiesgo: sem,
    habilitacionOk: hab.desbloqueado,
    cubicacionOk: cub.desbloqueado,
    alertaEspesor: espAlert !== null,
    resumenParaProgramador: resumen.trim(),
    actualizadoEn: new Date().toISOString(),
    ubicacionDireccion:
      state.route.obraFullAddressNotes.trim() !== ""
        ? state.route.obraFullAddressNotes.trim()
        : undefined,
    ubicacionGpsResumen:
      state.route.simulatedGpsPositionText.trim() !== ""
        ? state.route.simulatedGpsPositionText.trim()
        : undefined,
    nombreCliente:
      state.route.clienteNombre.trim() !== ""
        ? state.route.clienteNombre.trim()
        : undefined,
  };
}

export function upsertServiciosActivosProgramador(
  lista: ServicioActivoProgramador[],
  state: SupervisorAppState,
): ServicioActivoProgramador[] {
  if (!debeMostrarseServicioEnProgramador(state)) {
    return lista.filter((s) => s.obraSesionId !== state.obraSesionId);
  }
  const row = buildServicioActivoProgramador(state);
  const idx = lista.findIndex((s) => s.obraSesionId === state.obraSesionId);
  if (idx === -1) return [...lista, row];
  const next = [...lista];
  next[idx] = row;
  return next;
}
