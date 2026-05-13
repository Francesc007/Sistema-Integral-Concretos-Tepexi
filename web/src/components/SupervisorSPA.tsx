"use client";

import Image from "next/image";
import { Map, MapPin } from "lucide-react";
import { useMemo, useEffect, useRef, useState, type ReactNode } from "react";
import { RiskSemaphore } from "@/components/RiskSemaphore";
import { CentroControlProgramacion } from "@/components/CentroControlProgramacion";
import { DecimalMeterInput } from "@/components/DecimalMeterInput";
import { ProgramadorView } from "@/components/ProgramadorView";
import { useSupervisorApp } from "@/hooks/useSupervisorApp";
import { leftoverWheelbarrowsHint } from "@/lib/domain/calculations";
import {
  CAMPO_ETAPA_LABELS,
  checklistBloqueoOperativoActual,
  checklistSectionCandado,
  firmaCandadoOperativoActivo,
  getChecklistCorrectionSectionIds,
  type ChecklistCandadoDetalle,
} from "@/lib/domain/campoWorkflow";
import type { ChecklistSectionId, ChecklistStep } from "@/lib/domain/types";

const CHECKLIST_SECTION_ORDER: ChecklistSectionId[] = [
  "programacion",
  "acceso_riesgos",
  "elemento_precubicacion",
  "cubicacion",
  "bombeo_suministro",
  "coordinacion",
  "cierre_admin",
];

/** Dueño visible junto a las demás vistas; pon en `false` para permitir acceso. */
const VISTA_DUENO_BLOQUEADA = true;

function getChecklistFocusSection(steps: ChecklistStep[]): ChecklistSectionId | "all" {
  for (const sec of CHECKLIST_SECTION_ORDER) {
    const secSteps = steps.filter((s) => s.sectionId === sec);
    if (secSteps.length === 0) continue;
    if (secSteps.some((s) => !s.done)) return sec;
  }
  return "all";
}

/** Primera sección del checklist dentro del conjunto de corrección candado (orden estable). */
function primeraCorreccionEnOrdenLista(
  candidatas: readonly ChecklistSectionId[],
): ChecklistSectionId | null {
  for (const oid of CHECKLIST_SECTION_ORDER) {
    if (candidatas.includes(oid)) return oid;
  }
  return candidatas.length > 0 ? (candidatas[0] ?? null) : null;
}

const sectionLabels: Record<ChecklistSectionId, string> = {
  programacion: "Programación y ruta",
  acceso_riesgos: "Acceso, permisos y riesgos",
  elemento_precubicacion: "Elemento y pre-cubicación",
  cubicacion: "Cubicación",
  bombeo_suministro: "Bombeo y suministro",
  coordinacion: "Coordinación",
  cierre_admin: "Cierre, garantía y reportes",
};

function scrollToChecklistSection(secId: ChecklistSectionId): void {
  document
    .getElementById(`checklist-sec-${secId}`)
    ?.scrollIntoView({ behavior: "smooth", block: "center" });
}

function ChecklistBloqueoAlertaPanel({
  variante,
  etiquetaSeccionTrabajo,
  detalle,
}: {
  variante: "destacado" | "compacto";
  etiquetaSeccionTrabajo?: string;
  detalle: ChecklistCandadoDetalle;
}) {
  if (detalle.editable) return null;

  const wrap =
    variante === "destacado"
      ? "rounded-lg border-2 border-red-600 bg-red-50 p-4 shadow-md"
      : "rounded-md border border-red-500 bg-red-50/95 p-3 shadow-sm";

  const etapaTitulo =
    detalle.etapaBloqueadora != null
      ? CAMPO_ETAPA_LABELS[detalle.etapaBloqueadora]?.titulo ??
        "Etapa anterior"
      : "Etapa anterior";

  const ordenRevision = CHECKLIST_SECTION_ORDER.filter((oid) =>
    detalle.revisarEnSecciones.includes(oid),
  );
  const primero = ordenRevision[0];

  const items =
    detalle.faltantesConcretos.length > 0
      ? detalle.faltantesConcretos
      : detalle.mensaje != null
        ? [detalle.mensaje]
        : ["Complete los datos anteriores del checklist antes de continuar."];

  return (
    <div className={wrap} role="alert" aria-live="polite">
      <p className="text-sm font-bold uppercase tracking-wide text-red-900">
        {variante === "destacado"
          ? `Candado activo — formularios abiertos más abajo: ${etiquetaSeccionTrabajo ?? "(ver lista)"}`
          : "Este bloque sigue esperando candado anterior"}
      </p>
      <p className="mt-2 text-xs font-semibold leading-snug text-red-950">
        Corrija o marque antes:{" "}
        <span className="font-bold underline decoration-red-700/70">
          {etapaTitulo}
        </span>
      </p>
      <ul className="mt-3 list-inside list-disc space-y-1 text-sm leading-relaxed text-red-950">
        {items.map((txt, i) => (
          <li key={`${txt}-${i}`}>{txt}</li>
        ))}
      </ul>
      {detalle.revisarEnSecciones.length > 0 ? (
        <div className="mt-4 flex flex-wrap gap-2">
          {primero != null ? (
            <button
              type="button"
              className="rounded-md bg-red-700 px-3 py-2 text-xs font-bold uppercase tracking-wide text-white shadow-sm transition hover:bg-red-600"
              onClick={() => scrollToChecklistSection(primero)}
            >
              Ir al primer pendiente (scroll)
            </button>
          ) : null}
          {ordenRevision.slice(1).map((sid) => (
            <button
              key={sid}
              type="button"
              className="rounded-md border border-red-700/35 bg-white px-2.5 py-1.5 text-[11px] font-semibold text-red-950 transition hover:bg-red-100"
              onClick={() => scrollToChecklistSection(sid)}
            >
              {sectionLabels[sid]}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}

function parseOptionalNumber(raw: string): number | "" {
  const t = raw.trim();
  if (t === "") return "";
  const n = Number(t.replace(",", "."));
  return Number.isFinite(n) ? n : "";
}

type VistaRol = "supervisor" | "programador" | "dueno";

function FieldLabel({
  children,
  htmlFor,
}: {
  children: ReactNode;
  htmlFor?: string;
}) {
  return (
    <label
      htmlFor={htmlFor}
      className="block text-xs font-semibold uppercase tracking-wide text-stone-600"
    >
      {children}
    </label>
  );
}

export function SupervisorSPA() {
  const [vistaRol, setVistaRol] = useState<VistaRol>("supervisor");
  const [gpsSimLoading, setGpsSimLoading] = useState(false);

  const {
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
    derived,
  } = useSupervisorApp();

  const wbHint = leftoverWheelbarrowsHint(state.pump.pumpType);

  const focusSection = useMemo(
    () => getChecklistFocusSection(state.checklistSteps),
    [state.checklistSteps],
  );

  const alertasActivasProgramacion = useMemo(
    () => state.programacionAlerts.filter((a) => !a.leida),
    [state.programacionAlerts],
  );

  const seccionesCorreccionCandado = useMemo(
    () => getChecklistCorrectionSectionIds(state),
    [state],
  );

  const bloqueoOperativoVisible = useMemo(
    () => checklistBloqueoOperativoActual(state),
    [state],
  );

  const firmaAutoScrollBloqueoRef = useRef<string>("");

  useEffect(() => {
    if (VISTA_DUENO_BLOQUEADA && vistaRol === "dueno") {
      setVistaRol("supervisor");
    }
  }, [vistaRol]);

  useEffect(() => {
    const bloqueo = checklistBloqueoOperativoActual(state);
    if (!bloqueo?.revisarEnSecciones.length) {
      firmaAutoScrollBloqueoRef.current = "";
      return;
    }
    const sig = firmaCandadoOperativoActivo(state);
    if (firmaAutoScrollBloqueoRef.current === sig) return;
    firmaAutoScrollBloqueoRef.current = sig;
    const firstSec = primeraCorreccionEnOrdenLista(bloqueo.revisarEnSecciones);
    if (firstSec !== null) {
      window.requestAnimationFrame(() => scrollToChecklistSection(firstSec));
    }
  }, [state]);

  const textoSeccionesCorreccion = useMemo(() => {
    if (seccionesCorreccionCandado.length === 0) return "";
    return CHECKLIST_SECTION_ORDER.filter((oid) =>
      seccionesCorreccionCandado.includes(oid),
    )
      .map((oid) => sectionLabels[oid])
      .join(" · ");
  }, [seccionesCorreccionCandado]);

  return (
    <div className="min-h-full bg-white text-stone-900">
      <header className="sticky top-0 z-20 border-b border-stone-200 bg-white/95 backdrop-blur">
        <div className="mx-auto max-w-6xl px-4 py-4">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex min-w-0 flex-1 items-start gap-4">
              <div className="relative h-14 w-[140px] shrink-0">
                <Image
                  src="/Tepexi%20A-R.jpeg"
                  alt="Concretos Tepexi"
                  fill
                  sizes="140px"
                  className="object-contain object-left"
                  priority
                />
              </div>
              <div className="min-w-0">
                <h1 className="text-xl font-semibold tracking-tight text-stone-900 sm:text-2xl">
                  {vistaRol === "supervisor" &&
                    "Supervisor de obra — checklist operativo"}
                  {vistaRol === "programador" &&
                    "Programador — servicios activos"}
                  {vistaRol === "dueno" &&
                    "Dueño — centro de control operativo"}
                </h1>
                {vistaRol === "programador" && (
                <p className="mt-1 max-w-2xl text-sm text-stone-600">
                  Bandeja que simula lo que programación vería al hacer pull desde
                  la nube: tiempo estimado de colado y semáforo de riesgo según lo
                  que firma el supervisor.
                </p>
                )}
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <div className="rounded-md border border-red-900/10 bg-stone-100 px-3 py-2 text-sm">
                <span className="text-stone-600">Avance</span>{" "}
                <span className="font-mono text-blue-700">
                  {derived.checklistProgress.done}/
                  {derived.checklistProgress.total}
                </span>{" "}
                <span className="text-stone-500">
                  ({derived.checklistProgress.pct}%)
                </span>
              </div>
              <button
                type="button"
                onClick={() => {
                  if (
                    confirm(
                      "¿Reiniciar todos los datos locales? Esta acción no se puede deshacer.",
                    )
                  ) {
                    resetAll();
                  }
                }}
                className="rounded-md border border-stone-300 px-3 py-2 text-sm font-medium text-stone-800 transition hover:border-blue-600 hover:bg-blue-50"
              >
                Reiniciar
              </button>
            </div>
          </div>
          <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-stone-100 pt-4">
            <span className="w-full text-[11px] font-semibold uppercase tracking-wide text-stone-500 sm:w-auto sm:mr-2">
              Vista / rol (demo)
            </span>
            <div className="flex flex-wrap gap-2">
              {(
                [
                  ["supervisor", "Supervisor"],
                  ["programador", "Programador"],
                  ["dueno", "Dueño"],
                ] as const
              ).map(([id, label]) => {
                const bloqueado = id === "dueno" && VISTA_DUENO_BLOQUEADA;
                return (
                  <button
                    key={id}
                    type="button"
                    disabled={bloqueado}
                    title={
                      bloqueado
                        ? "Vista no disponible por el momento (demo)."
                        : undefined
                    }
                    onClick={() => {
                      if (bloqueado) return;
                      setVistaRol(id);
                    }}
                    className={`rounded-full px-4 py-1.5 text-xs font-semibold transition ${
                      bloqueado
                        ? "cursor-not-allowed border border-stone-200 bg-stone-50 text-stone-400 opacity-75"
                        : vistaRol === id
                          ? "bg-blue-700 text-white shadow-sm"
                          : "border border-stone-300 bg-white text-stone-700 hover:border-blue-400"
                    }`}
                  >
                    {label}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
        {vistaRol === "supervisor" && (
          <nav className="mx-auto flex max-w-6xl flex-wrap gap-2 border-t border-stone-200 px-4 py-3 text-sm">
            <a
              className="font-semibold text-stone-900 underline decoration-yellow-500 decoration-2 underline-offset-4 hover:text-blue-900"
              href="#checklist"
            >
              Checklist secuencial
            </a>
            <span className="text-stone-600">·</span>
            <a className="text-stone-600 hover:text-stone-900" href="#reporte">
              Reporte diario
            </a>
          </nav>
        )}
      </header>

      <main className="mx-auto max-w-6xl space-y-12 px-4 py-10">
        {vistaRol === "programador" && (
          <ProgramadorView
            servicios={state.serviciosActivosProgramador}
            obraSesionActualId={state.obraSesionId}
            persistenceReady={persistenceReady}
          />
        )}

        {vistaRol === "dueno" && !VISTA_DUENO_BLOQUEADA && (
          <CentroControlProgramacion
            fechaEtiqueta={state.route.serviceDate.trim() || "(sin fecha)"}
            campoSemafotoNivel={derived.riskSemaphoreLevel}
            riesgosCampo={state.risks}
            obraUbicacionDireccion={state.route.obraFullAddressNotes}
            obraUbicacionGps={state.route.simulatedGpsPositionText}
          />
        )}

        {vistaRol === "supervisor" && (
          <>
        {/* Alertas críticas */}
        {derived.thicknessAlert && (
          <section
            role="alert"
            className="rounded-lg border border-red-200 bg-red-50 p-4 shadow-sm"
          >
            <p className="text-sm font-semibold text-red-800">
              Alerta programación: discrepancia de espesor
            </p>
            <p className="mt-2 text-sm text-red-900/90">
              Nominal {derived.thicknessAlert.nominalM.toFixed(3)} m vs campo{" "}
              {derived.thicknessAlert.fieldM.toFixed(3)} m (Δ{" "}
              {derived.thicknessAlert.deltaM >= 0 ? "+" : ""}
              {derived.thicknessAlert.deltaM.toFixed(3)} m).{" "}
              {derived.thicknessAlert.message}
            </p>
          </section>
        )}

        {derived.pumpedReminderActive && (
          <section className="rounded-lg border border-blue-200 border-l-4 border-l-red-600 bg-blue-50 p-4">
            <p className="text-sm font-semibold text-blue-900">
              Recordatorio servicio bombeado
            </p>
            <p className="mt-1 text-sm text-stone-700">
              Confirmar con el cliente: 1 carretilla de arena y 1 bulto de
              cemento para lechada de purga de línea.
            </p>
          </section>
        )}

        <div className="pointer-events-none fixed right-2 top-20 z-[60] sm:right-3 sm:top-[4.75rem]">
          <div className="pointer-events-auto origin-top-right scale-[0.82] transform sm:scale-[0.88]">
            <RiskSemaphore
              nivel={derived.riskSemaphoreLevel}
              compact
              className="max-w-[220px] border-amber-200/80 shadow-md"
            />
          </div>
        </div>

        <section id="checklist" className="scroll-mt-28 space-y-6 sm:pr-32">
          <div className="rounded-lg border border-stone-200 bg-stone-50 p-4 shadow-sm">
            <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-stone-500">
              Obra en curso
            </p>
            <div className="mt-3 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <div>
                <FieldLabel htmlFor="cab-fecha">Fecha</FieldLabel>
                <input
                  id="cab-fecha"
                  type="date"
                  className="mt-1 w-full rounded-md border border-stone-300 bg-white px-3 py-2 text-sm outline-none focus:border-blue-600/80 focus:ring-2 focus:ring-blue-600/35"
                  value={state.route.serviceDate}
                  onChange={(e) => setRoute({ serviceDate: e.target.value })}
                />
              </div>
              <div className="sm:col-span-2 lg:col-span-2">
                <FieldLabel htmlFor="cab-cliente">Cliente</FieldLabel>
                <input
                  id="cab-cliente"
                  type="text"
                  placeholder="Nombre o empresa"
                  className="mt-1 w-full rounded-md border border-stone-300 bg-white px-3 py-2 text-sm outline-none focus:border-blue-600/80 focus:ring-2 focus:ring-blue-600/35"
                  value={state.route.clienteNombre}
                  onChange={(e) => setRoute({ clienteNombre: e.target.value })}
                />
              </div>
            </div>
            <div className="mt-4 rounded-lg border border-blue-200/80 bg-white p-4">
              <div className="flex flex-wrap items-center gap-2">
                <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-50 text-blue-800 ring-1 ring-blue-100">
                  <MapPin className="h-5 w-5" strokeWidth={2} aria-hidden />
                </span>
                <div>
                  <p className="text-xs font-bold uppercase tracking-wide text-stone-500">
                    Dirección / GPS
                  </p>
                  <p className="text-[11px] text-stone-500">
                    Referencias y coordenadas (demo)
                  </p>
                </div>
              </div>
              <div className="mt-4">
                <FieldLabel htmlFor="cab-dir">Dirección o referencias</FieldLabel>
                <textarea
                  id="cab-dir"
                  rows={3}
                  placeholder="Ej. Av. …, entre calles, acceso por …"
                  className="mt-1 w-full resize-y rounded-md border border-stone-300 bg-white px-3 py-2 text-sm outline-none focus:border-blue-600/80 focus:ring-2 focus:ring-blue-600/35"
                  value={state.route.obraFullAddressNotes}
                  onChange={(e) =>
                    setRoute({ obraFullAddressNotes: e.target.value })
                  }
                />
              </div>
              <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <button
                  type="button"
                  disabled={gpsSimLoading}
                  onClick={() => {
                    setGpsSimLoading(true);
                    window.setTimeout(() => {
                      setRoute({
                        simulatedGpsPositionText:
                          "Coordenadas registradas: 19.9272, -99.3418 (Huehuetoca)",
                      });
                      setGpsSimLoading(false);
                    }, 900);
                  }}
                  className="inline-flex items-center justify-center gap-2 rounded-lg bg-blue-700 px-4 py-2 text-sm font-semibold text-white shadow-md transition hover:bg-blue-600 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <Map className="h-4 w-4 shrink-0" strokeWidth={2} aria-hidden />
                  {gpsSimLoading ? "Obteniendo ubicación…" : "GPS (demo)"}
                </button>
                <span className="text-[10px] font-medium uppercase tracking-wide text-amber-800">
                  Sin API real
                </span>
              </div>
              {state.route.simulatedGpsPositionText.trim() !== "" && (
                <p
                  className="mt-3 rounded-md border border-emerald-200 bg-emerald-50/90 px-3 py-2 font-mono text-xs font-medium text-emerald-950"
                  role="status"
                >
                  {state.route.simulatedGpsPositionText}
                </p>
              )}
            </div>
          </div>

          <div className="border-b border-stone-200 pb-3">
            <h2 className="text-lg font-semibold text-stone-900">
              Checklist secuencial
            </h2>
            <p className="text-sm text-stone-500">
              El avance por casillas puede ir antes que los candados operativos: si
              falta un requisito, aparece la alerta y se destacan los formularios
              que hacen falta. Todas las secciones hasta la que vas quedan
              visibles para revisarlas o cambiar algo.
            </p>
          </div>

          {bloqueoOperativoVisible && (
            <div
              id="checklist-global-bloqueo"
              className="sticky top-[5rem] z-[46] lg:top-[5.5rem]"
            >
              <ChecklistBloqueoAlertaPanel
                variante="destacado"
                etiquetaSeccionTrabajo={
                  textoSeccionesCorreccion || undefined
                }
                detalle={bloqueoOperativoVisible}
              />
            </div>
          )}

          <div className="space-y-10">
            {CHECKLIST_SECTION_ORDER.map((secId) => {
              const steps = state.checklistSteps.filter(
                (s) => s.sectionId === secId,
              );
              if (steps.length === 0) return null;
              const gate = checklistSectionCandado(secId, state);
              const idxEste = CHECKLIST_SECTION_ORDER.indexOf(secId);
              const idxPasoActual =
                focusSection === "all"
                  ? CHECKLIST_SECTION_ORDER.length - 1
                  : CHECKLIST_SECTION_ORDER.indexOf(focusSection);
              const embedOpen =
                seccionesCorreccionCandado.includes(secId) ||
                idxEste <= idxPasoActual;
              const ix = gate.editable;

              return (
                <div key={secId} id={`checklist-sec-${secId}`} className="scroll-mt-36">
                  <h3 className="border-l-4 border-red-600 pl-3 text-sm font-bold uppercase tracking-wide text-blue-800">
                    {sectionLabels[secId]}
                  </h3>

                  {embedOpen && (
                    <div className="mt-3 rounded-lg border border-stone-200 bg-white p-4 shadow-sm">
                      <div className={!ix ? "pointer-events-none opacity-60" : ""}>
                        {secId === "programacion" && (
                          <div className="space-y-4">
                            <div className="rounded-md border border-stone-100 bg-stone-50 p-4">
                              <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-stone-500">
                                Alertas a programación
                              </p>
                              {alertasActivasProgramacion.length === 0 ? (
                                <p className="mt-3 text-sm text-stone-600">
                                  Sin alertas pendientes.
                                </p>
                              ) : (
                                <ul className="mt-3 space-y-2">
                                  {alertasActivasProgramacion.map((a) => (
                                    <li
                                      key={a.id}
                                      className="flex flex-wrap items-start justify-between gap-2 rounded-md border border-red-200 bg-red-50 px-3 py-2"
                                    >
                                      <div className="min-w-0">
                                        <p className="text-sm font-semibold text-red-900">
                                          {a.titulo}
                                        </p>
                                        <p className="mt-0.5 text-xs text-red-800">
                                          {a.detalle}
                                        </p>
                                        <p className="mt-1 font-mono text-[10px] text-stone-500">
                                          {new Date(a.creadoEn).toLocaleString(
                                            "es-MX",
                                          )}
                                        </p>
                                      </div>
                                      <button
                                        type="button"
                                        onClick={() =>
                                          acknowledgeProgramacionAlert(a.id)
                                        }
                                        className="shrink-0 rounded border border-stone-300 bg-white px-2 py-1 text-[11px] font-medium text-stone-800 hover:border-amber-400 hover:bg-amber-50"
                                      >
                                        Marcar vista
                                      </button>
                                    </li>
                                  ))}
                                </ul>
                              )}
                            </div>
                            <div className="grid gap-3 sm:grid-cols-2">
                              <label className="flex cursor-pointer items-center gap-2 text-sm">
                                <input
                                  type="checkbox"
                                  checked={state.route.surveyReportSubmitted}
                                  onChange={(e) =>
                                    setRoute({
                                      surveyReportSubmitted: e.target.checked,
                                    })
                                  }
                                  disabled={!ix}
                                  className="h-4 w-4 rounded border-stone-300 bg-white accent-blue-600 disabled:opacity-50"
                                />
                                Levantamiento entregado a planta
                              </label>
                              <label className="flex cursor-pointer items-center gap-2 text-sm">
                                <input
                                  type="checkbox"
                                  checked={state.route.clientContactForFormwork}
                                  onChange={(e) =>
                                    setRoute({
                                      clientContactForFormwork: e.target.checked,
                                    })
                                  }
                                  disabled={!ix}
                                  className="h-4 w-4 rounded border-stone-300 bg-white accent-blue-600 disabled:opacity-50"
                                />
                                Cliente contactado — cimbrado listo
                              </label>
                              <label className="flex cursor-pointer items-center gap-2 text-sm">
                                <input
                                  type="checkbox"
                                  checked={state.route.formworkComplete}
                                  onChange={(e) =>
                                    setRoute({ formworkComplete: e.target.checked })
                                  }
                                  disabled={!ix}
                                  className="h-4 w-4 rounded border-stone-300 bg-white accent-blue-600 disabled:opacity-50"
                                />
                                Cimbrado completo verificado
                              </label>
                              <label className="flex cursor-pointer items-center gap-2 text-sm">
                                <input
                                  type="checkbox"
                                  checked={state.route.requiresPrintedSketch}
                                  onChange={(e) =>
                                    setRoute({
                                      requiresPrintedSketch: e.target.checked,
                                    })
                                  }
                                  disabled={!ix}
                                  className="h-4 w-4 rounded border-stone-300 bg-white accent-blue-600 disabled:opacity-50"
                                />
                                Ruta compleja → croquis a operadores
                              </label>
                            </div>
                          </div>
                        )}
                        {secId === "acceso_riesgos" && (
                          <div className="grid gap-6 lg:grid-cols-2">
                            <div>
                              <h4 className="text-xs font-semibold uppercase tracking-wide text-stone-600">
                                Inspección de acceso
                              </h4>
                              <div className="mt-3 grid gap-4 sm:grid-cols-3">
                                <div>
                                  <FieldLabel>Altura entrada (m)</FieldLabel>
                                  <input
                                    inputMode="decimal"
                                    disabled={!ix}
                                    className="mt-1 w-full rounded-md border border-stone-300 bg-white px-3 py-2 font-mono text-sm disabled:bg-stone-100"
                                    value={
                                      state.site.entranceHeightM === ""
                                        ? ""
                                        : String(state.site.entranceHeightM)
                                    }
                                    onChange={(e) =>
                                      setSite({
                                        entranceHeightM: parseOptionalNumber(
                                          e.target.value,
                                        ),
                                      })
                                    }
                                  />
                                </div>
                                <div>
                                  <FieldLabel>Ancho entrada (m)</FieldLabel>
                                  <input
                                    inputMode="decimal"
                                    disabled={!ix}
                                    className="mt-1 w-full rounded-md border border-stone-300 bg-white px-3 py-2 font-mono text-sm disabled:bg-stone-100"
                                    value={
                                      state.site.entranceWidthM === ""
                                        ? ""
                                        : String(state.site.entranceWidthM)
                                    }
                                    onChange={(e) =>
                                      setSite({
                                        entranceWidthM: parseOptionalNumber(
                                          e.target.value,
                                        ),
                                      })
                                    }
                                  />
                                </div>
                                <div>
                                  <FieldLabel>Maniobra libre altura (m)</FieldLabel>
                                  <input
                                    inputMode="decimal"
                                    disabled={!ix}
                                    className="mt-1 w-full rounded-md border border-stone-300 bg-white px-3 py-2 font-mono text-sm disabled:bg-stone-100"
                                    value={
                                      state.site.maneuverHeightClearM === ""
                                        ? ""
                                        : String(state.site.maneuverHeightClearM)
                                    }
                                    onChange={(e) =>
                                      setSite({
                                        maneuverHeightClearM:
                                          parseOptionalNumber(e.target.value),
                                      })
                                    }
                                  />
                                </div>
                              </div>
                              <label className="mt-3 flex cursor-pointer items-center gap-2 text-sm">
                                <input
                                  type="checkbox"
                                  checked={state.site.singleAccessNoTurnaround}
                                  onChange={(e) =>
                                    setSite({
                                      singleAccessNoTurnaround: e.target.checked,
                                    })
                                  }
                                  disabled={!ix}
                                  className="h-4 w-4 rounded border-stone-300 bg-white accent-blue-600 disabled:opacity-50"
                                />
                                Un solo acceso / sin vuelta — reportar método
                              </label>
                              <div className="mt-3">
                                <FieldLabel>Notas de acceso</FieldLabel>
                                <textarea
                                  rows={2}
                                  disabled={!ix}
                                  className="mt-1 w-full rounded-md border border-stone-300 bg-white px-3 py-2 text-sm disabled:bg-stone-100"
                                  value={state.site.accessProcedureNotes}
                                  onChange={(e) =>
                                    setSite({
                                      accessProcedureNotes: e.target.value,
                                    })
                                  }
                                />
                              </div>
                              <label className="mt-3 flex cursor-pointer items-start gap-3 text-sm text-stone-700">
                                <input
                                  type="checkbox"
                                  checked={state.site.accessClearConfirmed}
                                  onChange={(e) =>
                                    setSite({
                                      accessClearConfirmed: e.target.checked,
                                    })
                                  }
                                  disabled={!ix}
                                  className="mt-1 h-4 w-4 rounded border-stone-300 bg-white accent-blue-600 disabled:opacity-50"
                                />
                                <span>
                                  <strong>Acceso libre</strong> para suministro —
                                  habilitante para cubicación.
                                </span>
                              </label>
                              <label className="mt-3 flex cursor-pointer items-start gap-3 text-sm text-stone-700">
                                <input
                                  type="checkbox"
                                  checked={state.site.clientPermitsCentralZoneAck}
                                  onChange={(e) =>
                                    setSite({
                                      clientPermitsCentralZoneAck:
                                        e.target.checked,
                                    })
                                  }
                                  disabled={!ix}
                                  className="mt-1 h-4 w-4 rounded border-stone-300 bg-white accent-blue-600 disabled:opacity-50"
                                />
                                <span>
                                  Permisos zona centro — comunicado al cliente.
                                </span>
                              </label>
                            </div>
                            <div>
                              <h4 className="text-xs font-semibold uppercase tracking-wide text-stone-600">
                                Riesgos en obra
                              </h4>
                              <div className="mt-3 space-y-2 text-sm">
                                <label className="flex cursor-pointer items-center gap-2">
                                  <input
                                    type="checkbox"
                                    checked={state.risks.lowPowerLines}
                                    onChange={(e) =>
                                      setRisks({
                                        lowPowerLines: e.target.checked,
                                      })
                                    }
                                    disabled={!ix}
                                    className="h-4 w-4 rounded border-stone-300 bg-white accent-blue-600 disabled:opacity-50"
                                  />
                                  Cables / líneas bajas
                                </label>
                                <label className="flex cursor-pointer items-center gap-2">
                                  <input
                                    type="checkbox"
                                    checked={state.risks.veryNarrowAccess}
                                    onChange={(e) =>
                                      setRisks({
                                        veryNarrowAccess: e.target.checked,
                                      })
                                    }
                                    disabled={!ix}
                                    className="h-4 w-4 rounded border-stone-300 bg-white accent-blue-600 disabled:opacity-50"
                                  />
                                  Acceso muy angosto
                                </label>
                                <label className="flex cursor-pointer items-center gap-2">
                                  <input
                                    type="checkbox"
                                    checked={state.risks.ravineHillside}
                                    onChange={(e) =>
                                      setRisks({
                                        ravineHillside: e.target.checked,
                                      })
                                    }
                                    disabled={!ix}
                                    className="h-4 w-4 rounded border-stone-300 bg-white accent-blue-600 disabled:opacity-50"
                                  />
                                  Barranca / talud
                                </label>
                                <label className="flex cursor-pointer items-center gap-2">
                                  <input
                                    type="checkbox"
                                    checked={state.risks.steepSlopeLoadedTruck}
                                    onChange={(e) =>
                                      setRisks({
                                        steepSlopeLoadedTruck: e.target.checked,
                                      })
                                    }
                                    disabled={!ix}
                                    className="h-4 w-4 rounded border-stone-300 bg-white accent-blue-600 disabled:opacity-50"
                                  />
                                  Pendiente riesgosa con camión cargado
                                </label>
                              </div>
                              <div className="mt-4">
                                <FieldLabel>Otros riesgos</FieldLabel>
                                <textarea
                                  rows={3}
                                  disabled={!ix}
                                  className="mt-1 w-full rounded-md border border-stone-300 bg-white px-3 py-2 text-sm disabled:bg-stone-100"
                                  value={state.risks.otherRiskNotes}
                                  onChange={(e) =>
                                    setRisks({
                                      otherRiskNotes: e.target.value,
                                    })
                                  }
                                />
                              </div>
                            </div>
                          </div>
                        )}
                        {secId === "elemento_precubicacion" && (
                          <div className="space-y-4">
                            <p className="text-sm text-stone-600">
                              El espesor y el volumen en m³ se capturan en la
                              sección <strong>Cubicación</strong> de este mismo
                              checklist.
                            </p>
                            <div className="grid gap-4 lg:grid-cols-2">
                              <div>
                                <FieldLabel>Tipo de elemento</FieldLabel>
                                <input
                                  disabled={!ix}
                                  className="mt-1 w-full rounded-md border border-stone-300 bg-white px-3 py-2 text-sm disabled:bg-stone-100"
                                  placeholder="Losa, firme, columna…"
                                  value={state.precalc.elementType}
                                  onChange={(e) =>
                                    setPrecalc({ elementType: e.target.value })
                                  }
                                />
                                <div className="mt-3">
                                  <FieldLabel>Notas margen / volumen</FieldLabel>
                                  <textarea
                                    rows={2}
                                    disabled={!ix}
                                    className="mt-1 w-full rounded-md border border-stone-300 bg-white px-3 py-2 text-sm disabled:bg-stone-100"
                                    value={state.precalc.errorMarginNotes}
                                    onChange={(e) =>
                                      setPrecalc({
                                        errorMarginNotes: e.target.value,
                                      })
                                    }
                                  />
                                </div>
                                <div className="mt-3">
                                  <FieldLabel>Tipo de losa / detalle</FieldLabel>
                                  <textarea
                                    rows={2}
                                    disabled={!ix}
                                    className="mt-1 w-full rounded-md border border-stone-300 bg-white px-3 py-2 text-sm disabled:bg-stone-100"
                                    value={state.precalc.slabTypeNotes}
                                    onChange={(e) =>
                                      setPrecalc({
                                        slabTypeNotes: e.target.value,
                                      })
                                    }
                                  />
                                </div>
                              </div>
                              <div>
                                <FieldLabel>Irregularidades de cimbra</FieldLabel>
                                <textarea
                                  rows={3}
                                  disabled={!ix}
                                  className="mt-1 w-full rounded-md border border-stone-300 bg-white px-3 py-2 text-sm disabled:bg-stone-100"
                                  value={state.precalc.formworkIrregularityNotes}
                                  onChange={(e) =>
                                    setPrecalc({
                                      formworkIrregularityNotes: e.target.value,
                                    })
                                  }
                                />
                                <div className="mt-3">
                                  <FieldLabel>Tiempo para enviar ajuste</FieldLabel>
                                  <textarea
                                    rows={3}
                                    disabled={!ix}
                                    className="mt-1 w-full rounded-md border border-stone-300 bg-white px-3 py-2 text-sm disabled:bg-stone-100"
                                    value={state.precalc.adjustmentLeadTimeNotes}
                                    onChange={(e) =>
                                      setPrecalc({
                                        adjustmentLeadTimeNotes: e.target.value,
                                      })
                                    }
                                  />
                                </div>
                              </div>
                            </div>
                          </div>
                        )}
                        {secId === "cubicacion" && (
                          <div className="space-y-4">
                            <div className="grid gap-4 sm:grid-cols-3">
                              <div>
                                <FieldLabel htmlFor="chk-largo">Largo L (m)</FieldLabel>
                                <DecimalMeterInput
                                  id="chk-largo"
                                  disabled={!ix}
                                  value={state.cubing.lengthM}
                                  placeholder="Ej. 12.5"
                                  onCommit={(lengthM) => setCubing({ lengthM })}
                                />
                              </div>
                              <div>
                                <FieldLabel htmlFor="chk-ancho">Ancho A (m)</FieldLabel>
                                <DecimalMeterInput
                                  id="chk-ancho"
                                  disabled={!ix}
                                  value={state.cubing.widthM}
                                  placeholder="Ej. 8"
                                  onCommit={(widthM) => setCubing({ widthM })}
                                />
                              </div>
                              <div>
                                <FieldLabel htmlFor="chk-esp">Espesor E (m)</FieldLabel>
                                <DecimalMeterInput
                                  id="chk-esp"
                                  disabled={!ix}
                                  value={state.cubing.nominalThicknessM}
                                  placeholder="Ej. 0.10"
                                  onCommit={(nominalThicknessM) =>
                                    setCubing({ nominalThicknessM })
                                  }
                                />
                              </div>
                            </div>
                            <div className="rounded-md border border-stone-200 bg-stone-50 p-4">
                              <p className="text-xs uppercase tracking-wide text-stone-500">
                                Volumen
                              </p>
                              <p className="mt-2 font-mono text-2xl text-stone-900">
                                {derived.volumeDerived.volumeM3 !== null
                                  ? `${derived.volumeDerived.volumeM3.toFixed(3)} m³`
                                  : "—"}
                              </p>
                              <p className="mt-2 text-sm text-stone-600">
                                {derived.volumeDerived.formula}
                              </p>
                            </div>
                            <label className="flex cursor-pointer items-start gap-3 text-sm text-stone-700">
                              <input
                                type="checkbox"
                                checked={
                                  state.cubing.clientThicknessResponsibilityAck
                                }
                                disabled={!ix}
                                onChange={(e) =>
                                  setCubing({
                                    clientThicknessResponsibilityAck:
                                      e.target.checked,
                                  })
                                }
                                className="mt-1 h-4 w-4 rounded border-stone-300 bg-white accent-blue-600 disabled:opacity-50"
                              />
                              <span>
                                Cliente informado — responsabilidad sobre espesor
                                acordado.
                              </span>
                            </label>
                            <div>
                              <FieldLabel>
                                Ajustes por irregularidades (volumen)
                              </FieldLabel>
                              <textarea
                                rows={2}
                                disabled={!ix}
                                className="mt-1 w-full rounded-md border border-stone-300 bg-white px-3 py-2 text-sm disabled:bg-stone-100"
                                value={state.cubing.irregularityAdjustmentNotes}
                                onChange={(e) =>
                                  setCubing({
                                    irregularityAdjustmentNotes: e.target.value,
                                  })
                                }
                              />
                            </div>
                          </div>
                        )}
                        {secId === "bombeo_suministro" && (
                          <div className="grid gap-6 lg:grid-cols-2">
                            <div className="rounded-md border border-stone-100 bg-stone-50 p-4">
                              <h4 className="text-xs font-semibold uppercase tracking-wide text-stone-600">
                                Tiempos (MVP)
                              </h4>
                              <div className="mt-3 grid gap-4 sm:grid-cols-2">
                                <div className="sm:col-span-2">
                                  <FieldLabel htmlFor="bomba-t">Tipo bomba</FieldLabel>
                                  <select
                                    id="bomba-t"
                                    disabled={!ix}
                                    className="mt-1 w-full rounded-md border border-stone-300 bg-white px-3 py-2 text-sm outline-none disabled:bg-stone-100"
                                    value={state.pump.pumpType}
                                    onChange={(e) =>
                                      setPump({
                                        pumpType: e.target
                                          .value as typeof state.pump.pumpType,
                                      })
                                    }
                                  >
                                    <option value="estacionaria">
                                      Bomba estacionaria
                                    </option>
                                    <option value="pluma">Pluma</option>
                                    <option value="directo">Vaciado directo</option>
                                  </select>
                                </div>
                                <div>
                                  <FieldLabel>Longitud tubería (m)</FieldLabel>
                                  <input
                                    inputMode="decimal"
                                    disabled={!ix}
                                    className="mt-1 w-full rounded-md border border-stone-300 bg-white px-3 py-2 font-mono text-sm disabled:bg-stone-100"
                                    value={
                                      state.pump.pipeDistanceM === ""
                                        ? ""
                                        : String(state.pump.pipeDistanceM)
                                    }
                                    onChange={(e) =>
                                      setPump({
                                        pipeDistanceM: parseOptionalNumber(
                                          e.target.value,
                                        ),
                                      })
                                    }
                                  />
                                </div>
                                <div className="flex flex-col justify-end gap-3">
                                  <label className="flex cursor-pointer items-center gap-2 text-sm">
                                    <input
                                      type="checkbox"
                                      checked={state.pump.pipeCuts}
                                      onChange={(e) =>
                                        setPump({
                                          pipeCuts: e.target.checked,
                                        })
                                      }
                                      disabled={!ix}
                                      className="h-4 w-4 accent-blue-600 disabled:opacity-50"
                                    />
                                    Cortes de tubería (+20 min)
                                  </label>
                                  <label className="flex cursor-pointer items-center gap-2 text-sm">
                                    <input
                                      type="checkbox"
                                      checked={state.pump.excessivePipeAssembly}
                                      onChange={(e) =>
                                        setPump({
                                          excessivePipeAssembly:
                                            e.target.checked,
                                        })
                                      }
                                      disabled={!ix}
                                      className="h-4 w-4 accent-blue-600 disabled:opacity-50"
                                    />
                                    Ensamble excesivo (+20 min)
                                  </label>
                                </div>
                              </div>
                              <div className="mt-5 rounded-md border border-stone-200 bg-white p-4">
                                <p className="text-xs uppercase tracking-wide text-stone-500">
                                  Tiempo estimado colado / bomba
                                </p>
                                {derived.timeEstimate.applicable ? (
                                  <>
                                    <p className="mt-2 font-mono text-2xl text-stone-900">
                                      {derived.timeEstimate.totalMinutes} min
                                    </p>
                                    <ul className="mt-3 space-y-1 text-sm text-stone-600">
                                      {derived.timeEstimate.lines.map((ln) => (
                                        <li
                                          key={ln.label}
                                          className="flex justify-between gap-4"
                                        >
                                          <span>{ln.label}</span>
                                          <span className="font-mono text-stone-800">
                                            +{ln.minutes} min
                                          </span>
                                        </li>
                                      ))}
                                    </ul>
                                  </>
                                ) : (
                                  <p className="mt-2 text-sm text-blue-800">
                                    {derived.timeEstimate.referenceNote}
                                  </p>
                                )}
                              </div>
                            </div>
                            <div className="space-y-4">
                              <div className="rounded-md border border-stone-100 bg-stone-50 p-4">
                                <h4 className="text-xs font-semibold uppercase tracking-wide text-stone-600">
                                  Bombeado y sobrante
                                </h4>
                                <label className="mt-3 flex cursor-pointer items-start gap-3 text-sm">
                                  <input
                                    type="checkbox"
                                    checked={state.pumpedRules.serviceIsPumped}
                                    onChange={(e) =>
                                      setPumpedRules({
                                        serviceIsPumped: e.target.checked,
                                      })
                                    }
                                    disabled={!ix}
                                    className="mt-1 h-4 w-4 accent-blue-600 disabled:opacity-50"
                                  />
                                  <span>Servicio con bombeo</span>
                                </label>
                                <label className="mt-3 flex cursor-pointer items-start gap-3 text-sm">
                                  <input
                                    type="checkbox"
                                    checked={
                                      state.pumpedRules
                                        .clientNotifiedSandAndCementForLechada
                                    }
                                    onChange={(e) =>
                                      setPumpedRules({
                                        clientNotifiedSandAndCementForLechada:
                                          e.target.checked,
                                      })
                                    }
                                    disabled={!ix}
                                    className="mt-1 h-4 w-4 accent-blue-600 disabled:opacity-50"
                                  />
                                  <span>Avisado arena + cemento (purga)</span>
                                </label>
                                {wbHint && (
                                  <p className="mt-3 rounded-md border border-stone-200 bg-white p-3 text-sm text-stone-600">
                                    {wbHint}
                                  </p>
                                )}
                                <div className="mt-4">
                                  <FieldLabel>Ubicación sobrante</FieldLabel>
                                  <textarea
                                    rows={3}
                                    disabled={!ix}
                                    className="mt-1 w-full resize-y rounded-md border border-stone-300 bg-white px-3 py-2 text-sm disabled:bg-stone-100"
                                    value={state.leftover.designatedLocationNotes}
                                    onChange={(e) =>
                                      setLeftover({
                                        designatedLocationNotes: e.target.value,
                                      })
                                    }
                                  />
                                </div>
                              </div>
                              <div>
                                <FieldLabel>Zona de suministro</FieldLabel>
                                <textarea
                                  rows={3}
                                  disabled={!ix}
                                  className="mt-1 w-full rounded-md border border-stone-300 bg-white px-3 py-2 text-sm disabled:bg-stone-100"
                                  value={state.pump.supplyZoneNotes}
                                  onChange={(e) =>
                                    setPump({
                                      supplyZoneNotes: e.target.value,
                                    })
                                  }
                                />
                              </div>
                              <div>
                                <FieldLabel>Alternativas de acceso</FieldLabel>
                                <textarea
                                  rows={3}
                                  disabled={!ix}
                                  className="mt-1 w-full rounded-md border border-stone-300 bg-white px-3 py-2 text-sm disabled:bg-stone-100"
                                  value={state.pump.alternateAccessNotes}
                                  onChange={(e) =>
                                    setPump({
                                      alternateAccessNotes: e.target.value,
                                    })
                                  }
                                />
                                <label className="mt-3 flex cursor-pointer items-start gap-3 text-sm">
                                  <input
                                    type="checkbox"
                                    checked={state.pump.clientManeuverAreaAck}
                                    onChange={(e) =>
                                      setPump({
                                        clientManeuverAreaAck: e.target.checked,
                                      })
                                    }
                                    disabled={!ix}
                                    className="mt-1 h-4 w-4 accent-blue-600 disabled:opacity-50"
                                  />
                                  <span>Cliente responsable área maniobras</span>
                                </label>
                              </div>
                            </div>
                          </div>
                        )}
                        {secId === "coordinacion" && (
                          <div className="grid gap-4 lg:grid-cols-2">
                            <label className="flex cursor-pointer items-center gap-2 text-sm">
                              <input
                                type="checkbox"
                                checked={state.coordination.pumpAreaCleaned}
                                onChange={(e) =>
                                  setCoordination({
                                    pumpAreaCleaned: e.target.checked,
                                  })
                                }
                                disabled={!ix}
                                className="h-4 w-4 accent-blue-600 disabled:opacity-50"
                              />
                              Área limpia para bomba/unidades
                            </label>
                            <div>
                              <FieldLabel>Unidades programadas</FieldLabel>
                              <input
                                inputMode="numeric"
                                disabled={!ix}
                                className="mt-1 w-full rounded-md border border-stone-300 bg-white px-3 py-2 font-mono text-sm disabled:bg-stone-100"
                                value={
                                  state.coordination.plannedTruckUnits === ""
                                    ? ""
                                    : String(
                                        state.coordination.plannedTruckUnits,
                                      )
                                }
                                onChange={(e) =>
                                  setCoordination({
                                    plannedTruckUnits: parseOptionalNumber(
                                      e.target.value,
                                    ) as number | "",
                                  })
                                }
                              />
                            </div>
                            <div>
                              <FieldLabel>Hora inicio colado</FieldLabel>
                              <input
                                type="time"
                                disabled={!ix}
                                className="mt-1 w-full rounded-md border border-stone-300 bg-white px-3 py-2 text-sm disabled:bg-stone-100"
                                value={state.coordination.pourStartTime}
                                onChange={(e) =>
                                  setCoordination({
                                    pourStartTime: e.target.value,
                                  })
                                }
                              />
                            </div>
                            <div>
                              <FieldLabel>Duración estimada (min)</FieldLabel>
                              <input
                                inputMode="numeric"
                                disabled={!ix}
                                className="mt-1 w-full rounded-md border border-stone-300 bg-white px-3 py-2 font-mono text-sm disabled:bg-stone-100"
                                placeholder="Desde tiempo de bomba"
                                value={
                                  state.coordination.estimatedPourDurationMin === ""
                                    ? ""
                                    : String(
                                        state.coordination
                                          .estimatedPourDurationMin,
                                      )
                                }
                                onChange={(e) =>
                                  setCoordination({
                                    estimatedPourDurationMin:
                                      parseOptionalNumber(e.target.value),
                                  })
                                }
                              />
                              <button
                                type="button"
                                disabled={!ix || !derived.timeEstimate.applicable}
                                className="mt-2 text-xs font-medium text-blue-700 hover:text-blue-900 disabled:opacity-40"
                                onClick={() => {
                                  if (derived.timeEstimate.applicable) {
                                    setCoordination({
                                      estimatedPourDurationMin:
                                        derived.timeEstimate.totalMinutes,
                                    });
                                  }
                                }}
                              >
                                Copiar tiempo estimado (bomba + volumen)
                              </button>
                            </div>
                            <div className="lg:col-span-2">
                              <FieldLabel>Puntualidad y personal</FieldLabel>
                              <textarea
                                rows={3}
                                disabled={!ix}
                                className="mt-1 w-full rounded-md border border-stone-300 bg-white px-3 py-2 text-sm disabled:bg-stone-100"
                                value={
                                  state.coordination.crewArrivalCoordinationNotes
                                }
                                onChange={(e) =>
                                  setCoordination({
                                    crewArrivalCoordinationNotes: e.target.value,
                                  })
                                }
                              />
                            </div>
                          </div>
                        )}
                        {secId === "cierre_admin" && (
                          <div className="grid gap-6 lg:grid-cols-2">
                            <div>
                              <FieldLabel>Foto de terminación</FieldLabel>
                              <input
                                type="file"
                                accept="image/*"
                                capture="environment"
                                disabled={!ix}
                                className="mt-2 block w-full text-sm text-stone-600 file:mr-4 file:rounded-md file:border-0 file:bg-blue-700 file:px-3 file:py-2 file:text-sm file:font-semibold file:text-white disabled:opacity-50"
                                onChange={(e) => {
                                  const file = e.target.files?.[0];
                                  if (!file) {
                                    setCompletion({
                                      completionProofDataUrl: null,
                                    });
                                    return;
                                  }
                                  const reader = new FileReader();
                                  reader.onload = () => {
                                    setCompletion({
                                      completionProofDataUrl: String(
                                        reader.result,
                                      ),
                                    });
                                  };
                                  reader.readAsDataURL(file);
                                }}
                              />
                              {state.completion.completionProofDataUrl && (
                                <div className="mt-4 overflow-hidden rounded-md border border-stone-200">
                                  {/* eslint-disable-next-line @next/next/no-img-element */}
                                  <img
                                    src={
                                      state.completion.completionProofDataUrl
                                    }
                                    alt="Evidencia de servicio"
                                    className="max-h-56 w-full object-cover"
                                  />
                                </div>
                              )}
                              <label className="mt-4 flex cursor-pointer items-start gap-3 text-sm">
                                <input
                                  type="checkbox"
                                  checked={
                                    state.completion
                                      .clientSupervisionDisclaimerAck
                                  }
                                  onChange={(e) =>
                                    setCompletion({
                                      clientSupervisionDisclaimerAck:
                                        e.target.checked,
                                    })
                                  }
                                  disabled={!ix}
                                  className="mt-1 h-4 w-4 accent-blue-600 disabled:opacity-50"
                                />
                                <span>
                                  Cliente informado supervisión / garantía.
                                </span>
                              </label>
                            </div>
                            <div>
                              <label className="flex cursor-pointer items-center gap-2 text-sm">
                                <input
                                  type="checkbox"
                                  checked={state.vehicle.unitGoodConditionAck}
                                  onChange={(e) =>
                                    setVehicle({
                                      unitGoodConditionAck: e.target.checked,
                                    })
                                  }
                                  disabled={!ix}
                                  className="h-4 w-4 accent-blue-600 disabled:opacity-50"
                                />
                                Unidad OK y documentación en regla
                              </label>
                              <div className="mt-4">
                                <FieldLabel>Mantenimiento / notas unidad</FieldLabel>
                                <textarea
                                  rows={5}
                                  disabled={!ix}
                                  className="mt-1 w-full rounded-md border border-stone-300 bg-white px-3 py-2 text-sm disabled:bg-stone-100"
                                  placeholder="Aceite, balatas…"
                                  value={state.vehicle.preventiveMaintenanceNotes}
                                  onChange={(e) =>
                                    setVehicle({
                                      preventiveMaintenanceNotes:
                                        e.target.value,
                                    })
                                  }
                                />
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  <ul
                    className={`mt-3 divide-y divide-stone-200 rounded-lg border border-red-900/10 bg-stone-100 ${!gate.editable ? "opacity-[0.72]" : ""}`}
                  >
                    {steps.map((step) => (
                      <li
                        key={step.id}
                        className="flex flex-col gap-3 p-4 sm:flex-row sm:items-start"
                      >
                        <div className="sm:w-48">
                          <span className="font-mono text-xs text-stone-500">
                            #{step.order}
                          </span>
                          <label
                            className={`mt-1 flex items-start gap-2 ${gate.editable ? "cursor-pointer" : "cursor-not-allowed"}`}
                          >
                            <input
                              type="checkbox"
                              checked={step.done}
                              disabled={!gate.editable}
                              onChange={(e) => {
                                if (!gate.editable) return;
                                updateChecklistStep(step.id, {
                                  done: e.target.checked,
                                });
                              }}
                              className="mt-1 h-4 w-4 rounded border-stone-300 bg-white accent-blue-600 disabled:opacity-50"
                            />
                            <span className="text-sm font-medium text-stone-900">
                              {step.title}
                            </span>
                          </label>
                          {step.hint && (
                            <p className="mt-2 text-xs text-stone-500">
                              {step.hint}
                            </p>
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <FieldLabel htmlFor={`obs-${step.id}`}>
                            Observaciones
                          </FieldLabel>
                          <textarea
                            id={`obs-${step.id}`}
                            rows={2}
                            disabled={!gate.editable}
                            className="mt-1 w-full rounded-md border border-stone-300 bg-white px-3 py-2 text-sm outline-none focus:border-blue-600/80 focus:ring-2 focus:ring-blue-600/35 disabled:cursor-not-allowed disabled:bg-stone-100 disabled:text-stone-500"
                            value={step.observations}
                            onChange={(e) => {
                              if (!gate.editable) return;
                              updateChecklistStep(step.id, {
                                observations: e.target.value,
                              });
                            }}
                          />
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
              );
            })}
          </div>
        </section>

        <section id="reporte" className="scroll-mt-28 rounded-lg border border-red-900/10 bg-stone-100 p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold text-stone-900">
                Reporte diario de recorridos
              </h2>
              <p className="text-sm text-stone-500">
                Zona, volumen, elemento e incidencias (nota administrativa).
              </p>
            </div>
            <button
              type="button"
              onClick={addDailyReportLine}
              className="rounded-md bg-blue-700 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-600"
            >
              Añadir línea
            </button>
          </div>
          <div className="mt-6 space-y-4">
            {state.dailyReports.length === 0 && (
              <p className="text-sm text-stone-500">
                Sin líneas aún. Agregue una fila por obra o por vaciado.
              </p>
            )}
            {state.dailyReports.map((row) => (
              <div
                key={row.id}
                className="grid gap-3 rounded-md border border-stone-200 bg-white p-4 lg:grid-cols-12"
              >
                <div className="lg:col-span-3">
                  <FieldLabel>Zona</FieldLabel>
                  <input
                    className="mt-1 w-full rounded-md border border-stone-300 bg-white px-3 py-2 text-sm"
                    value={row.zone}
                    onChange={(e) =>
                      updateDailyReportLine(row.id, { zone: e.target.value })
                    }
                  />
                </div>
                <div className="lg:col-span-2">
                  <FieldLabel>Vol. (m³)</FieldLabel>
                  <input
                    inputMode="decimal"
                    className="mt-1 w-full rounded-md border border-stone-300 bg-white px-3 py-2 font-mono text-sm"
                    value={row.volumeM3 === "" ? "" : String(row.volumeM3)}
                    onChange={(e) =>
                      updateDailyReportLine(row.id, {
                        volumeM3: parseOptionalNumber(e.target.value),
                      })
                    }
                  />
                </div>
                <div className="lg:col-span-3">
                  <FieldLabel>Elemento</FieldLabel>
                  <input
                    className="mt-1 w-full rounded-md border border-stone-300 bg-white px-3 py-2 text-sm"
                    value={row.element}
                    onChange={(e) =>
                      updateDailyReportLine(row.id, {
                        element: e.target.value,
                      })
                    }
                  />
                </div>
                <div className="lg:col-span-3">
                  <FieldLabel>Eventos</FieldLabel>
                  <input
                    className="mt-1 w-full rounded-md border border-stone-300 bg-white px-3 py-2 text-sm"
                    value={row.incidents}
                    onChange={(e) =>
                      updateDailyReportLine(row.id, {
                        incidents: e.target.value,
                      })
                    }
                  />
                </div>
                <div className="flex items-end lg:col-span-1">
                  <button
                    type="button"
                    onClick={() => removeDailyReportLine(row.id)}
                    className="w-full rounded-md border border-stone-300 py-2 text-xs font-semibold uppercase tracking-wide text-stone-600 hover:border-red-400 hover:text-red-700"
                  >
                    Borrar
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>

          </>
        )}

        <footer className="border-t border-stone-200 pb-16 pt-8 text-center text-xs text-stone-600">
          Concretos Tepexi — herramienta interna MVP. Los datos se guardan en
          este navegador (localStorage) en este equipo.
        </footer>
      </main>
    </div>
  );
}
