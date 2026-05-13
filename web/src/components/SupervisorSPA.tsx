"use client";

import Image from "next/image";
import { Map, MapPin } from "lucide-react";
import { useState, type ReactNode } from "react";
import { CampoSupervisionModule } from "@/components/CampoSupervisionModule";
import { CentroControlProgramacion } from "@/components/CentroControlProgramacion";
import { DecimalMeterInput } from "@/components/DecimalMeterInput";
import { ProgramadorView } from "@/components/ProgramadorView";
import { useSupervisorApp } from "@/hooks/useSupervisorApp";
import { leftoverWheelbarrowsHint } from "@/lib/domain/calculations";
import { checklistSectionCandado } from "@/lib/domain/campoWorkflow";
import type { ChecklistSectionId } from "@/lib/domain/types";

const sectionLabels: Record<ChecklistSectionId, string> = {
  programacion: "Programación y ruta",
  acceso_riesgos: "Acceso, permisos y riesgos",
  elemento_precubicacion: "Elemento y pre-cubicación",
  cubicacion: "Cubicación",
  bombeo_suministro: "Bombeo y suministro",
  coordinacion: "Coordinación",
  cierre_admin: "Cierre, garantía y reportes",
};

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
    setSettings,
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
                  {vistaRol === "dueno" && "Dueño / Dirección — centro de control"}
                </h1>
                <p className="mt-1 max-w-2xl text-sm text-stone-600">
                  {vistaRol === "supervisor" &&
                    "MVP en navegador (datos guardados en este dispositivo). Use esta guía para seguir la secuencia del manual y evitar errores costosos en programación y vaciado."}
                  {vistaRol === "programador" &&
                    "Bandeja que simula lo que programación vería al hacer pull desde la nube: tiempo estimado de colado y semáforo de riesgo según lo que firma el supervisor."}
                  {vistaRol === "dueno" &&
                  "Centro de control: servicios del día, línea de tiempo, rentabilidad y cierres — misma línea visual que supervision y programador."}
                </p>
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
              ).map(([id, label]) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => setVistaRol(id)}
                  className={`rounded-full px-4 py-1.5 text-xs font-semibold transition ${
                    vistaRol === id
                      ? "bg-blue-700 text-white shadow-sm"
                      : "border border-stone-300 bg-white text-stone-700 hover:border-blue-400"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
        </div>
        {vistaRol === "supervisor" && (
          <nav className="mx-auto flex max-w-6xl flex-wrap gap-2 border-t border-stone-200 px-4 py-3 text-sm">
          <a
            className="font-semibold text-stone-900 underline decoration-yellow-500 decoration-2 underline-offset-4 hover:text-blue-900"
            href="#campo-supervision"
          >
            Supervisión campo
          </a>
          <span className="text-stone-600">·</span>
          <a className="text-stone-600 hover:text-stone-900" href="#configuracion">
            Configuración
          </a>
          <span className="text-stone-600">·</span>
          <a className="font-medium text-blue-700 hover:text-blue-900" href="#cerebro">
            Calculador de Rendimiento Operativo (cálculo)
          </a>
          <span className="text-stone-600">·</span>
          <a className="text-stone-600 hover:text-stone-900" href="#checklist">
            Checklist 1–25
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
          />
        )}

        {vistaRol === "dueno" && (
          <CentroControlProgramacion
            fechaEtiqueta={state.route.serviceDate}
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

        <CampoSupervisionModule
          state={state}
          acknowledgeProgramacionAlert={acknowledgeProgramacionAlert}
          setRoute={setRoute}
          setSite={setSite}
          setRisks={setRisks}
          setCompletion={setCompletion}
          setVehicle={setVehicle}
        />

        <section
          id="configuracion"
          className="scroll-mt-28 rounded-lg border border-red-900/10 bg-stone-100 p-5"
        >
          <h2 className="text-lg font-semibold text-stone-900">Configuración</h2>
          <p className="mt-1 text-sm text-stone-500">
            La tolerancia define cuándo se considera que el espesor nominal y el
            medido en obra &quot;coinciden&quot;. Si la diferencia supera este
            valor, se muestra la alerta roja para programación.
          </p>
          <div className="mt-4 max-w-sm">
            <FieldLabel htmlFor="tol-mm">
              Tolerancia de espesor (mm)
            </FieldLabel>
            <input
              id="tol-mm"
              type="number"
              min={0.1}
              step={0.5}
              inputMode="decimal"
              className="mt-1 w-full rounded-md border border-stone-300 bg-white px-3 py-2 font-mono text-sm outline-none focus:border-blue-600/80 focus:ring-2 focus:ring-blue-600/35"
              value={state.settings.thicknessToleranceMm}
              onChange={(e) => {
                const v = Number(e.target.value.replace(",", "."));
                if (Number.isFinite(v) && v > 0) {
                  setSettings({ thicknessToleranceMm: v });
                }
              }}
              aria-describedby="tol-hint"
            />
            <p id="tol-hint" className="mt-2 text-xs text-stone-500">
              Valor por defecto: 10 mm. Vigente en la comparación nominal vs
              campo.
            </p>
          </div>
        </section>

        <section id="cerebro" className="scroll-mt-28 space-y-6">
          <div className="flex items-end justify-between gap-4 border-b border-stone-200 pb-3">
            <div>
              <h2 className="text-lg font-semibold text-stone-900">
                Calculador de Rendimiento Operativo — volumen y tiempos
              </h2>
              <p className="text-sm text-stone-500">
                <strong className="text-stone-700">Aquí va el número en metros</strong>{" "}
                para calcular L × A × E, alertar nominal vs campo y alimentar el motor de
                tiempos. Una losa de 10 cm se captura como{" "}
                <code className="rounded bg-stone-200 px-1 font-mono text-xs">0.10</code>{" "}
                (no como 1 m). Los valores decimales se confirman al salir del campo (Tab,
                Enter o clic fuera).
              </p>
              <p className="mt-2 text-sm text-stone-500">
                <strong className="text-stone-700">Elemento y pre-cubicación</strong> (más
                abajo) sirve para describir{" "}
                <em>qué</em> se vacía (losa, firme, márgenes en texto). No sustituye el
                espesor numérico: el cubicado y programación siguen este Calculador de
                Rendimiento Operativo.
              </p>
            </div>
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            <div className="rounded-lg border border-red-900/10 bg-stone-100 p-5">
              <h3 className="text-sm font-semibold uppercase tracking-wide text-stone-700">
                Dimensiones y cubicación
              </h3>
              <div className="mt-4 grid gap-4 sm:grid-cols-3">
                <div>
                  <FieldLabel htmlFor="largo">Largo (m)</FieldLabel>
                  <DecimalMeterInput
                    id="largo"
                    value={state.cubing.lengthM}
                    placeholder="Ej. 12.5"
                    onCommit={(lengthM) => setCubing({ lengthM })}
                  />
                </div>
                <div>
                  <FieldLabel htmlFor="ancho">Ancho (m)</FieldLabel>
                  <DecimalMeterInput
                    id="ancho"
                    value={state.cubing.widthM}
                    placeholder="Ej. 8"
                    onCommit={(widthM) => setCubing({ widthM })}
                  />
                </div>
                <div>
                  <FieldLabel htmlFor="nominal">Espesor nominal (m)</FieldLabel>
                  <DecimalMeterInput
                    id="nominal"
                    value={state.cubing.nominalThicknessM}
                    placeholder="Ej. 0.10 (10 cm)"
                    onCommit={(nominalThicknessM) =>
                      setCubing({ nominalThicknessM })
                    }
                  />
                </div>
                <div className="sm:col-span-3">
                  <FieldLabel htmlFor="campo">
                    Espesor medido en obra (m) — opcional
                  </FieldLabel>
                  <DecimalMeterInput
                    id="campo"
                    value={state.cubing.fieldThicknessM}
                    placeholder="Si difiere del nominal, dispara alerta"
                    onCommit={(fieldThicknessM) =>
                      setCubing({ fieldThicknessM })
                    }
                  />
                </div>
              </div>

              <div className="mt-5 rounded-md border border-stone-200 bg-white p-4">
                <p className="text-xs uppercase tracking-wide text-stone-500">
                  Resultado
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

              <label className="mt-4 flex cursor-pointer items-start gap-3 text-sm text-stone-700">
                <input
                  type="checkbox"
                  checked={state.cubing.clientThicknessResponsibilityAck}
                  onChange={(e) =>
                    setCubing({
                      clientThicknessResponsibilityAck: e.target.checked,
                    })
                  }
                  className="mt-1 h-4 w-4 rounded border-stone-300 bg-white accent-blue-600 focus:ring-blue-500/40"
                />
                <span>
                  Cliente/residente informado y responsable del espesor
                  acordado (evita faltantes/sobrantes).
                </span>
              </label>
            </div>

            <div className="space-y-6">
              <div className="rounded-lg border border-red-900/10 bg-stone-100 p-5">
                <h3 className="text-sm font-semibold uppercase tracking-wide text-stone-700">
                  Estimación de tiempo (regla MVP)
                </h3>
                <p className="mt-2 text-sm text-stone-500">
                  Bomba estacionaria: tiempo base proporcional{" "}
                  <span className="font-mono text-stone-700">
                    (Volumen / 7) × 30 min
                  </span>
                  ; +20 min por cortes de tubería; +20 min por ensamble
                  excesivo; +40 min si la tubería mide entre 20 y 30 m.
                </p>
                <div className="mt-4 grid gap-4 sm:grid-cols-2">
                  <div className="sm:col-span-2">
                    <FieldLabel htmlFor="tipo-bomba">
                      Tipo de bomba / vaciado
                    </FieldLabel>
                    <select
                      id="tipo-bomba"
                      aria-label="Tipo de bomba o modo de vaciado"
                      className="mt-1 w-full rounded-md border border-stone-300 bg-white px-3 py-2 text-sm outline-none focus:border-blue-600/80 focus:ring-2 focus:ring-blue-600/35"
                      value={state.pump.pumpType}
                      onChange={(e) =>
                        setPump({
                          pumpType: e.target.value as typeof state.pump.pumpType,
                        })
                      }
                    >
                      <option value="estacionaria">Bomba estacionaria</option>
                      <option value="pluma">Pluma</option>
                      <option value="directo">Vaciado directo (sin bomba)</option>
                    </select>
                  </div>
                  <div>
                    <FieldLabel htmlFor="tuberia-m">Longitud tubería (m)</FieldLabel>
                    <input
                      id="tuberia-m"
                      inputMode="decimal"
                      className="mt-1 w-full rounded-md border border-stone-300 bg-white px-3 py-2 font-mono text-sm outline-none focus:border-blue-600/80 focus:ring-2 focus:ring-blue-600/35"
                      value={
                        state.pump.pipeDistanceM === ""
                          ? ""
                          : String(state.pump.pipeDistanceM)
                      }
                      onChange={(e) =>
                        setPump({
                          pipeDistanceM: parseOptionalNumber(e.target.value),
                        })
                      }
                    />
                  </div>
                  <div className="flex flex-col justify-end gap-3">
                    <label className="flex cursor-pointer items-center gap-2 text-sm text-stone-700">
                      <input
                        type="checkbox"
                        checked={state.pump.pipeCuts}
                        onChange={(e) =>
                          setPump({ pipeCuts: e.target.checked })
                        }
                        className="h-4 w-4 rounded border-stone-300 bg-white accent-blue-600 focus:ring-blue-500/40"
                      />
                      Hay cortes de tubería (+20 min)
                    </label>
                    <label className="flex cursor-pointer items-center gap-2 text-sm text-stone-700">
                      <input
                        type="checkbox"
                        checked={state.pump.excessivePipeAssembly}
                        onChange={(e) =>
                          setPump({
                            excessivePipeAssembly: e.target.checked,
                          })
                        }
                        className="h-4 w-4 rounded border-stone-300 bg-white accent-blue-600 focus:ring-blue-500/40"
                      />
                      Ensamble excesivo de tubería (+20 min)
                    </label>
                  </div>
                </div>

                <div className="mt-5 rounded-md border border-stone-200 bg-white p-4">
                  <p className="text-xs uppercase tracking-wide text-stone-500">
                    Tiempo estimado
                  </p>
                  {derived.timeEstimate.applicable ? (
                    <>
                      <p className="mt-2 font-mono text-2xl text-stone-900">
                        {derived.timeEstimate.totalMinutes} min
                      </p>
                      <ul className="mt-3 space-y-1 text-sm text-stone-600">
                        {derived.timeEstimate.lines.map((ln) => (
                          <li key={ln.label} className="flex justify-between gap-4">
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
                  <p className="mt-3 text-xs text-stone-600">
                    Ajuste fino lo define planta según colas, tránsito y
                    unidades; esto es una guía para programación rápida.
                  </p>
                </div>
              </div>

              <div className="rounded-lg border border-red-900/10 bg-stone-100 p-5">
                <h3 className="text-sm font-semibold uppercase tracking-wide text-stone-700">
                  Bombeado y sobrante
                </h3>
                <label className="mt-3 flex cursor-pointer items-start gap-3 text-sm text-stone-700">
                  <input
                    type="checkbox"
                    checked={state.pumpedRules.serviceIsPumped}
                    onChange={(e) =>
                      setPumpedRules({ serviceIsPumped: e.target.checked })
                    }
                    className="mt-1 h-4 w-4 rounded border-stone-300 bg-white accent-blue-600 focus:ring-blue-500/40"
                  />
                  <span>Servicio con bombeo</span>
                </label>
                <label className="mt-3 flex cursor-pointer items-start gap-3 text-sm text-stone-700">
                  <input
                    type="checkbox"
                    checked={
                      state.pumpedRules.clientNotifiedSandAndCementForLechada
                    }
                    onChange={(e) =>
                      setPumpedRules({
                        clientNotifiedSandAndCementForLechada:
                          e.target.checked,
                      })
                    }
                    className="mt-1 h-4 w-4 rounded border-stone-300 bg-white accent-blue-600 focus:ring-blue-500/40"
                  />
                  <span>
                    Cliente notificado: arena + cemento para lechada (purga)
                  </span>
                </label>
                {wbHint && (
                  <p className="mt-3 rounded-md border border-stone-200 bg-white p-3 text-sm text-stone-600">
                    {wbHint}
                  </p>
                )}
                <div className="mt-4">
                  <FieldLabel htmlFor="sobrante">
                    Ubicación acordada para sobrante
                  </FieldLabel>
                  <textarea
                    id="sobrante"
                    rows={3}
                    className="mt-1 w-full resize-y rounded-md border border-stone-300 bg-white px-3 py-2 text-sm outline-none focus:border-blue-600/80 focus:ring-2 focus:ring-blue-600/35"
                    value={state.leftover.designatedLocationNotes}
                    onChange={(e) =>
                      setLeftover({
                        designatedLocationNotes: e.target.value,
                      })
                    }
                  />
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Programación compact */}
        <section id="obra-programacion" className="rounded-lg border border-red-900/10 bg-stone-100 p-5">
          <h2 className="text-lg font-semibold text-stone-900">
            Programación y obra
          </h2>
          <div className="mt-4 grid gap-4 lg:grid-cols-3">
            <div>
              <FieldLabel htmlFor="fecha">Fecha del servicio</FieldLabel>
              <input
                id="fecha"
                type="date"
                className="mt-1 w-full rounded-md border border-stone-300 bg-white px-3 py-2 text-sm outline-none focus:border-blue-600/80 focus:ring-2 focus:ring-blue-600/35"
                value={state.route.serviceDate}
                onChange={(e) =>
                  setRoute({ serviceDate: e.target.value })
                }
              />
            </div>
            <div className="flex flex-col gap-3 lg:col-span-2">
              <label className="flex cursor-pointer items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={state.route.surveyReportSubmitted}
                  onChange={(e) =>
                    setRoute({ surveyReportSubmitted: e.target.checked })
                  }
                  className="h-4 w-4 rounded border-stone-300 bg-white accent-blue-600"
                />
                Levantamiento entregado a planta
              </label>
              <label className="flex cursor-pointer items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={state.route.clientContactForFormwork}
                  onChange={(e) =>
                    setRoute({ clientContactForFormwork: e.target.checked })
                  }
                  className="h-4 w-4 rounded border-stone-300 bg-white accent-blue-600"
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
                  className="h-4 w-4 rounded border-stone-300 bg-white accent-blue-600"
                />
                Cimbrado completo verificado
              </label>
              <label className="flex cursor-pointer items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={state.route.requiresPrintedSketch}
                  onChange={(e) =>
                    setRoute({ requiresPrintedSketch: e.target.checked })
                  }
                  className="h-4 w-4 rounded border-stone-300 bg-white accent-blue-600"
                />
                Ruta compleja → croquis impreso a operadores
              </label>
            </div>
          </div>
          <div className="mt-6 rounded-lg border border-blue-200/80 bg-white p-4 shadow-sm">
            <div className="flex flex-wrap items-center gap-2">
              <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-50 text-blue-800 ring-1 ring-blue-100">
                <MapPin className="h-5 w-5" strokeWidth={2} aria-hidden />
              </span>
              <div>
                <p className="text-xs font-bold uppercase tracking-wide text-stone-500">
                  Ubicación de la obra
                </p>
                <p className="text-[11px] text-stone-500">
                  Referencias en planta y captura GPS (demo)
                </p>
              </div>
            </div>
            <div className="mt-4">
              <FieldLabel htmlFor="obra-dir-completa">
                Dirección completa o referencias
              </FieldLabel>
              <textarea
                id="obra-dir-completa"
                rows={4}
                placeholder="Ej. Av. …, entre calles, acceso por …"
                className="mt-1 w-full resize-y rounded-md border border-stone-300 bg-white px-3 py-2 text-sm outline-none focus:border-blue-600/80 focus:ring-2 focus:ring-blue-600/35"
                value={state.route.obraFullAddressNotes}
                onChange={(e) =>
                  setRoute({ obraFullAddressNotes: e.target.value })
                }
              />
            </div>
            <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
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
                className="inline-flex items-center justify-center gap-2 rounded-lg bg-blue-700 px-4 py-2.5 text-sm font-semibold text-white shadow-md transition hover:bg-blue-600 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <Map className="h-4 w-4 shrink-0" strokeWidth={2} aria-hidden />
                {gpsSimLoading
                  ? "Obteniendo ubicación…"
                  : "Obtener ubicación actual (GPS)"}
              </button>
              <span className="text-[10px] font-medium uppercase tracking-wide text-amber-800">
                Pro · simulación (sin API)
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
        </section>

        <section className="grid gap-6 lg:grid-cols-2">
          <div className="rounded-lg border border-red-900/10 bg-stone-100 p-5">
            <h3 className="text-lg font-semibold text-stone-900">
              Inspección de acceso
            </h3>
            <div className="mt-4 grid gap-4 sm:grid-cols-3">
              <div>
                <FieldLabel>Altura entrada (m)</FieldLabel>
                <input
                  inputMode="decimal"
                  className="mt-1 w-full rounded-md border border-stone-300 bg-white px-3 py-2 font-mono text-sm"
                  value={
                    state.site.entranceHeightM === ""
                      ? ""
                      : String(state.site.entranceHeightM)
                  }
                  onChange={(e) =>
                    setSite({
                      entranceHeightM: parseOptionalNumber(e.target.value),
                    })
                  }
                />
              </div>
              <div>
                <FieldLabel>Ancho entrada (m)</FieldLabel>
                <input
                  inputMode="decimal"
                  className="mt-1 w-full rounded-md border border-stone-300 bg-white px-3 py-2 font-mono text-sm"
                  value={
                    state.site.entranceWidthM === ""
                      ? ""
                      : String(state.site.entranceWidthM)
                  }
                  onChange={(e) =>
                    setSite({
                      entranceWidthM: parseOptionalNumber(e.target.value),
                    })
                  }
                />
              </div>
              <div>
                <FieldLabel>Maniobra libre altura (m)</FieldLabel>
                <input
                  inputMode="decimal"
                  className="mt-1 w-full rounded-md border border-stone-300 bg-white px-3 py-2 font-mono text-sm"
                  value={
                    state.site.maneuverHeightClearM === ""
                      ? ""
                      : String(state.site.maneuverHeightClearM)
                  }
                  onChange={(e) =>
                    setSite({
                      maneuverHeightClearM: parseOptionalNumber(
                        e.target.value,
                      ),
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
                  setSite({ singleAccessNoTurnaround: e.target.checked })
                }
                className="h-4 w-4 rounded border-stone-300 bg-white accent-blue-600"
              />
              Un solo acceso / sin vuelta — reportar método de ingreso
            </label>
            <div className="mt-3">
              <FieldLabel>Notas de acceso</FieldLabel>
              <textarea
                rows={2}
                className="mt-1 w-full rounded-md border border-stone-300 bg-white px-3 py-2 text-sm"
                value={state.site.accessProcedureNotes}
                onChange={(e) =>
                  setSite({ accessProcedureNotes: e.target.value })
                }
              />
            </div>
            <label className="mt-3 flex cursor-pointer items-start gap-3 text-sm text-stone-700">
              <input
                type="checkbox"
                checked={state.site.accessClearConfirmed}
                onChange={(e) =>
                  setSite({ accessClearConfirmed: e.target.checked })
                }
                className="mt-1 h-4 w-4 rounded border-stone-300 bg-white accent-blue-600"
              />
              <span>
                <strong>Acceso libre</strong> para suministro — alturas, anchos y
                maniobra despejados (desbloquea cubicación en Supervisión de
                campo).
              </span>
            </label>
            <label className="mt-3 flex cursor-pointer items-start gap-3 text-sm text-stone-700">
              <input
                type="checkbox"
                checked={state.site.clientPermitsCentralZoneAck}
                onChange={(e) =>
                  setSite({
                    clientPermitsCentralZoneAck: e.target.checked,
                  })
                }
                className="mt-1 h-4 w-4 rounded border-stone-300 bg-white accent-blue-600"
              />
              <span>
                Permisos zona centro: responsabilidad del cliente — quedó
                comunicado.
              </span>
            </label>
          </div>

          <div className="rounded-lg border border-red-900/10 bg-stone-100 p-5">
            <h3 className="text-lg font-semibold text-stone-900">Riesgos</h3>
            <div className="mt-4 space-y-2 text-sm">
              <label className="flex cursor-pointer items-center gap-2">
                <input
                  type="checkbox"
                  checked={state.risks.lowPowerLines}
                  onChange={(e) =>
                    setRisks({ lowPowerLines: e.target.checked })
                  }
                  className="h-4 w-4 rounded border-stone-300 bg-white accent-blue-600"
                />
                Cables / líneas bajas
              </label>
              <label className="flex cursor-pointer items-center gap-2">
                <input
                  type="checkbox"
                  checked={state.risks.veryNarrowAccess}
                  onChange={(e) =>
                    setRisks({ veryNarrowAccess: e.target.checked })
                  }
                  className="h-4 w-4 rounded border-stone-300 bg-white accent-blue-600"
                />
                Acceso muy angosto
              </label>
              <label className="flex cursor-pointer items-center gap-2">
                <input
                  type="checkbox"
                  checked={state.risks.ravineHillside}
                  onChange={(e) =>
                    setRisks({ ravineHillside: e.target.checked })
                  }
                  className="h-4 w-4 rounded border-stone-300 bg-white accent-blue-600"
                />
                Barranca / talud
              </label>
              <label className="flex cursor-pointer items-center gap-2">
                <input
                  type="checkbox"
                  checked={state.risks.steepSlopeLoadedTruck}
                  onChange={(e) =>
                    setRisks({ steepSlopeLoadedTruck: e.target.checked })
                  }
                  className="h-4 w-4 rounded border-stone-300 bg-white accent-blue-600"
                />
                Pendiente riesgosa con camión cargado
              </label>
            </div>
            <div className="mt-4">
              <FieldLabel>Otros riesgos</FieldLabel>
              <textarea
                rows={3}
                className="mt-1 w-full rounded-md border border-stone-300 bg-white px-3 py-2 text-sm"
                value={state.risks.otherRiskNotes}
                onChange={(e) =>
                  setRisks({ otherRiskNotes: e.target.value })
                }
              />
            </div>
          </div>
        </section>

        <section id="elemento-bombeo" className="rounded-lg border border-red-900/10 bg-stone-100 p-5">
          <h2 className="text-lg font-semibold text-stone-900">
            Elemento, pre-cubicación y bombeo
          </h2>
          <p className="mt-2 max-w-3xl text-sm text-stone-600">
            Describe el <strong className="text-stone-800">tipo de elemento</strong> y
            notas (márgenes, irregularidades operativas, tubería). El espesor en{" "}
            <strong>metros para cubicar</strong> sigue viviendo en{" "}
            <a className="font-medium text-blue-700 hover:underline" href="#cerebro">
              Calculador de Rendimiento Operativo
            </a>{" "}
            para no duplicar números en dos sitios.
          </p>
          <div className="mt-4 grid gap-4 lg:grid-cols-2">
            <div>
              <FieldLabel>Tipo de elemento</FieldLabel>
              <input
                className="mt-1 w-full rounded-md border border-stone-300 bg-white px-3 py-2 text-sm"
                placeholder="Losa, firme, columna, alberca..."
                value={state.precalc.elementType}
                onChange={(e) =>
                  setPrecalc({ elementType: e.target.value })
                }
              />
              <div className="mt-3">
                <FieldLabel>Notas margen de error / volumen</FieldLabel>
                <textarea
                  rows={2}
                  className="mt-1 w-full rounded-md border border-stone-300 bg-white px-3 py-2 text-sm"
                  value={state.precalc.errorMarginNotes}
                  onChange={(e) =>
                    setPrecalc({ errorMarginNotes: e.target.value })
                  }
                />
              </div>
              <div className="mt-3">
                <FieldLabel>Tipo de losa / detalle</FieldLabel>
                <textarea
                  rows={2}
                  className="mt-1 w-full rounded-md border border-stone-300 bg-white px-3 py-2 text-sm"
                  value={state.precalc.slabTypeNotes}
                  onChange={(e) =>
                    setPrecalc({ slabTypeNotes: e.target.value })
                  }
                />
              </div>
            </div>
            <div>
              <FieldLabel>Irregularidades de cimbra</FieldLabel>
              <textarea
                rows={3}
                className="mt-1 w-full rounded-md border border-stone-300 bg-white px-3 py-2 text-sm"
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
                  className="mt-1 w-full rounded-md border border-stone-300 bg-white px-3 py-2 text-sm"
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
          <div className="mt-4">
            <FieldLabel>Ajustes por irregularidades (volumen)</FieldLabel>
            <textarea
              rows={2}
              className="mt-1 w-full rounded-md border border-stone-300 bg-white px-3 py-2 text-sm"
              value={state.cubing.irregularityAdjustmentNotes}
              onChange={(e) =>
                setCubing({ irregularityAdjustmentNotes: e.target.value })
              }
            />
          </div>
          <div className="mt-4 grid gap-4 lg:grid-cols-2">
            <div>
              <FieldLabel>Zona de suministro (libre de obstáculos)</FieldLabel>
              <textarea
                rows={3}
                className="mt-1 w-full rounded-md border border-stone-300 bg-white px-3 py-2 text-sm"
                value={state.pump.supplyZoneNotes}
                onChange={(e) =>
                  setPump({ supplyZoneNotes: e.target.value })
                }
              />
            </div>
            <div>
              <FieldLabel>Alternativas de acceso</FieldLabel>
              <textarea
                rows={3}
                className="mt-1 w-full rounded-md border border-stone-300 bg-white px-3 py-2 text-sm"
                value={state.pump.alternateAccessNotes}
                onChange={(e) =>
                  setPump({ alternateAccessNotes: e.target.value })
                }
              />
              <label className="mt-3 flex cursor-pointer items-start gap-3 text-sm text-stone-700">
                <input
                  type="checkbox"
                  checked={state.pump.clientManeuverAreaAck}
                  onChange={(e) =>
                    setPump({ clientManeuverAreaAck: e.target.checked })
                  }
                  className="mt-1 h-4 w-4 rounded border-stone-300 bg-white accent-blue-600"
                />
                <span>
                  Cliente responsable del área de maniobras para vaciado.
                </span>
              </label>
            </div>
          </div>
        </section>

        <section id="obra-coordinacion" className="rounded-lg border border-red-900/10 bg-stone-100 p-5">
          <h2 className="text-lg font-semibold text-stone-900">Coordinación</h2>
          <div className="mt-4 grid gap-4 lg:grid-cols-2">
            <label className="flex cursor-pointer items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={state.coordination.pumpAreaCleaned}
                onChange={(e) =>
                  setCoordination({ pumpAreaCleaned: e.target.checked })
                }
                className="h-4 w-4 rounded border-stone-300 bg-white accent-blue-600"
              />
              Área limpia para bomba/unidades
            </label>
            <div>
              <FieldLabel>Unidades programadas</FieldLabel>
              <input
                inputMode="numeric"
                className="mt-1 w-full rounded-md border border-stone-300 bg-white px-3 py-2 font-mono text-sm"
                value={
                  state.coordination.plannedTruckUnits === ""
                    ? ""
                    : String(state.coordination.plannedTruckUnits)
                }
                onChange={(e) =>
                  setCoordination({
                    plannedTruckUnits: parseOptionalNumber(e.target.value) as
                      | number
                      | "",
                  })
                }
              />
            </div>
            <div>
              <FieldLabel>Hora inicio colado</FieldLabel>
              <input
                type="time"
                className="mt-1 w-full rounded-md border border-stone-300 bg-white px-3 py-2 text-sm"
                value={state.coordination.pourStartTime}
                onChange={(e) =>
                  setCoordination({ pourStartTime: e.target.value })
                }
              />
            </div>
            <div>
              <FieldLabel>Duración estimada (min)</FieldLabel>
              <input
                inputMode="numeric"
                className="mt-1 w-full rounded-md border border-stone-300 bg-white px-3 py-2 font-mono text-sm"
                placeholder="Puede igualarse al calculador de rendimiento"
                value={
                  state.coordination.estimatedPourDurationMin === ""
                    ? ""
                    : String(state.coordination.estimatedPourDurationMin)
                }
                onChange={(e) =>
                  setCoordination({
                    estimatedPourDurationMin: parseOptionalNumber(
                      e.target.value,
                    ),
                  })
                }
              />
              <button
                type="button"
                className="mt-2 text-xs font-medium text-blue-700 hover:text-blue-900"
                onClick={() => {
                  if (derived.timeEstimate.applicable) {
                    setCoordination({
                      estimatedPourDurationMin:
                        derived.timeEstimate.totalMinutes,
                    });
                  }
                }}
              >
                Copiar tiempo del Calculador de Rendimiento Operativo (si aplica bomba
                estacionaria y volumen válido)
              </button>
            </div>
          </div>
          <div className="mt-4">
            <FieldLabel>Puntualidad y notas de personal</FieldLabel>
            <textarea
              rows={3}
              className="mt-1 w-full rounded-md border border-stone-300 bg-white px-3 py-2 text-sm"
              value={state.coordination.crewArrivalCoordinationNotes}
              onChange={(e) =>
                setCoordination({
                  crewArrivalCoordinationNotes: e.target.value,
                })
              }
            />
          </div>
        </section>

        <section id="obra-cierre" className="rounded-lg border border-red-900/10 bg-stone-100 p-5">
          <h2 className="text-lg font-semibold text-stone-900">
            Cierre, evidencia y unidad
          </h2>
          <div className="mt-4 grid gap-6 lg:grid-cols-2">
            <div>
              <FieldLabel>Foto de terminación (prueba local)</FieldLabel>
              <input
                type="file"
                accept="image/*"
                capture="environment"
                className="mt-2 block w-full text-sm text-stone-600 file:mr-4 file:rounded-md file:border-0 file:bg-blue-700 file:px-3 file:py-2 file:text-sm file:font-semibold file:text-white file:transition hover:file:bg-blue-600"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (!file) {
                    setCompletion({ completionProofDataUrl: null });
                    return;
                  }
                  const reader = new FileReader();
                  reader.onload = () => {
                    setCompletion({
                      completionProofDataUrl: String(reader.result),
                    });
                  };
                  reader.readAsDataURL(file);
                }}
              />
              {state.completion.completionProofDataUrl && (
                <div className="mt-4 overflow-hidden rounded-md border border-stone-200">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={state.completion.completionProofDataUrl}
                    alt="Evidencia de servicio"
                    className="max-h-56 w-full object-cover"
                  />
                </div>
              )}
              <label className="mt-4 flex cursor-pointer items-start gap-3 text-sm text-stone-700">
                <input
                  type="checkbox"
                  checked={state.completion.clientSupervisionDisclaimerAck}
                  onChange={(e) =>
                    setCompletion({
                      clientSupervisionDisclaimerAck: e.target.checked,
                    })
                  }
                  className="mt-1 h-4 w-4 rounded border-stone-300 bg-white accent-blue-600"
                />
                <span>
                  Cliente entiende que debe supervisar el servicio y reportar
                  eventualidades a oficina para la garantía.
                </span>
              </label>
            </div>
            <div>
              <label className="flex cursor-pointer items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={state.vehicle.unitGoodConditionAck}
                  onChange={(e) =>
                    setVehicle({ unitGoodConditionAck: e.target.checked })
                  }
                  className="h-4 w-4 rounded border-stone-300 bg-white accent-blue-600"
                />
                Unidad operativa y documentación en regla
              </label>
              <div className="mt-4">
                <FieldLabel>Mantenimiento preventivo / notas</FieldLabel>
                <textarea
                  rows={5}
                  className="mt-1 w-full rounded-md border border-stone-300 bg-white px-3 py-2 text-sm"
                  placeholder="Aceite, balatas, verificación, tenencia..."
                  value={state.vehicle.preventiveMaintenanceNotes}
                  onChange={(e) =>
                    setVehicle({
                      preventiveMaintenanceNotes: e.target.value,
                    })
                  }
                />
              </div>
            </div>
          </div>
        </section>

        <section id="checklist" className="scroll-mt-28 space-y-4">
          <div className="border-b border-stone-200 pb-3">
            <h2 className="text-lg font-semibold text-stone-900">
              Checklist secuencial (manual)
            </h2>
            <p className="text-sm text-stone-500">
              Marque cada punto y documente observaciones. Las secciones
              respetan los mismos candados que{" "}
              <a
                href="#campo-supervision"
                className="font-medium text-blue-700 underline decoration-stone-300 underline-offset-2 hover:text-blue-900"
              >
                Supervisión de campo
              </a>
              : no podrá marcar Cubicación sin habilitación, ni etapas
              posteriores sin completar las anteriores.
            </p>
          </div>
          <div className="space-y-8">
            {(Object.keys(sectionLabels) as ChecklistSectionId[]).map(
              (secId) => {
                const steps = state.checklistSteps.filter(
                  (s) => s.sectionId === secId,
                );
                if (steps.length === 0) return null;
                const gate = checklistSectionCandado(secId, state);
                return (
                  <div key={secId}>
                    <h3 className="border-l-4 border-red-600 pl-3 text-sm font-bold uppercase tracking-wide text-blue-800">
                      {sectionLabels[secId]}
                    </h3>
                    {!gate.editable && gate.mensaje && (
                      <div
                        className="mt-2 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-950"
                        role="status"
                      >
                        <span className="font-semibold">Bloqueado — </span>
                        {gate.mensaje}{" "}
                        <a
                          href="#campo-supervision"
                          className="font-medium text-blue-800 underline"
                        >
                          Abrir flujo
                        </a>
                        .
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
              },
            )}
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
