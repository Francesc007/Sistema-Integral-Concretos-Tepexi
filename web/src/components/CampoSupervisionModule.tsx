"use client";

import { RiskSemaphore } from "@/components/RiskSemaphore";
import {
  CAMPO_ETAPA_LABELS,
  CAMPO_ETAPAS_ORDEN,
  computeRiskSemaphore,
  evaluarEtapa,
} from "@/lib/domain/campoWorkflow";
import type {
  CompletionAndReporting,
  RiskFlags,
  RouteAndSchedule,
  SiteInspection,
  SupervisorAppState,
  VehicleLog,
} from "@/lib/domain/types";

interface CampoSupervisionModuleProps {
  state: SupervisorAppState;
  acknowledgeProgramacionAlert: (id: string) => void;
  setRoute: (patch: Partial<RouteAndSchedule>) => void;
  setSite: (patch: Partial<SiteInspection>) => void;
  setRisks: (patch: Partial<RiskFlags>) => void;
  setCompletion: (patch: Partial<CompletionAndReporting>) => void;
  setVehicle: (patch: Partial<VehicleLog>) => void;
}

function LockIcon({ abierto }: { abierto: boolean }) {
  return (
    <span
      className={`inline-flex h-8 w-8 shrink-0 items-center justify-center rounded border font-mono text-[10px] font-bold leading-none ${abierto ? "border-blue-600 bg-blue-50 text-blue-900" : "border-red-600 bg-red-50 text-red-800"}`}
      aria-hidden
    >
      {abierto ? "OK" : "LK"}
    </span>
  );
}

export function CampoSupervisionModule({
  state,
  acknowledgeProgramacionAlert,
  setRoute,
  setSite,
  setRisks,
  setCompletion,
  setVehicle,
}: CampoSupervisionModuleProps) {
  const nivel = computeRiskSemaphore(state.risks);
  const alertasActivas = state.programacionAlerts.filter((a) => !a.leida);

  return (
    <section
      id="campo-supervision"
      className="scroll-mt-24 overflow-hidden rounded-xl border border-stone-200 bg-stone-100 text-stone-900 shadow-sm"
    >
      <div className="border-b border-amber-200/70 bg-amber-50 px-4 py-3 sm:px-6">
        <p className="text-[11px] font-bold uppercase tracking-[0.28em] text-amber-800">
          Zona industrial · Supervisión de campo
        </p>
        <h2 className="mt-1 text-lg font-semibold tracking-tight text-stone-900 sm:text-xl">
          Flujo con candados — no avanza si falta revisión
        </h2>
        <p className="mt-1 max-w-3xl text-sm text-stone-600">
          Cubicación permanece bloqueada hasta confirmar{" "}
          <strong className="text-amber-900">cimbra lista</strong> y{" "}
          <strong className="text-amber-900">acceso libre</strong>. El cierre
          queda prohibido con semáforo ROJO.
        </p>
      </div>

      <div className="grid gap-6 p-4 sm:p-6 lg:grid-cols-[minmax(0,1fr)_280px]">
        <div className="space-y-5">
          <div className="rounded-lg border border-stone-200 bg-white p-4 shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-stone-500">
                Dashboard programación (alertas locales)
              </p>
              <span className="rounded bg-stone-200 px-2 py-0.5 font-mono text-[10px] text-stone-700">
                MVP · mismo navegador
              </span>
            </div>
            {alertasActivas.length === 0 ? (
              <p className="mt-3 text-sm text-stone-600">
                Sin alertas pendientes para programación.
              </p>
            ) : (
              <ul className="mt-3 space-y-2">
                {alertasActivas.map((a) => (
                  <li
                    key={a.id}
                    className="flex flex-wrap items-start justify-between gap-2 rounded-md border border-red-200 bg-red-50 px-3 py-2"
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-red-900">
                        {a.titulo}
                      </p>
                      <p className="mt-0.5 text-xs text-red-800">{a.detalle}</p>
                      <p className="mt-1 font-mono text-[10px] text-stone-500">
                        {new Date(a.creadoEn).toLocaleString("es-MX")}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => acknowledgeProgramacionAlert(a.id)}
                      className="shrink-0 rounded border border-stone-300 bg-white px-2 py-1 text-[11px] font-medium text-stone-800 hover:border-amber-400 hover:bg-amber-50"
                    >
                      Marcar vista
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="rounded-lg border border-stone-200 bg-white p-4 shadow-sm">
            <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-amber-800">
              Detección en obra (semáforo)
            </p>
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              <label className="flex cursor-pointer items-center gap-2 text-sm text-stone-700">
                <input
                  type="checkbox"
                  checked={state.risks.lowPowerLines}
                  onChange={(e) =>
                    setRisks({ lowPowerLines: e.target.checked })
                  }
                  className="h-4 w-4 rounded border-stone-300 bg-white accent-amber-600"
                />
                Líneas / cables bajos → ROJO
              </label>
              <label className="flex cursor-pointer items-center gap-2 text-sm text-stone-700">
                <input
                  type="checkbox"
                  checked={state.risks.steepSlopeLoadedTruck}
                  onChange={(e) =>
                    setRisks({ steepSlopeLoadedTruck: e.target.checked })
                  }
                  className="h-4 w-4 rounded border-stone-300 bg-white accent-amber-600"
                />
                Pendiente fuerte con camión cargado → ROJO
              </label>
              <label className="flex cursor-pointer items-center gap-2 text-sm text-stone-700">
                <input
                  type="checkbox"
                  checked={state.risks.veryNarrowAccess}
                  onChange={(e) =>
                    setRisks({ veryNarrowAccess: e.target.checked })
                  }
                  className="h-4 w-4 rounded border-stone-300 bg-white accent-amber-600"
                />
                Acceso muy angosto → AMARILLO
              </label>
              <label className="flex cursor-pointer items-center gap-2 text-sm text-stone-700">
                <input
                  type="checkbox"
                  checked={state.risks.ravineHillside}
                  onChange={(e) =>
                    setRisks({ ravineHillside: e.target.checked })
                  }
                  className="h-4 w-4 rounded border-stone-300 bg-white accent-amber-600"
                />
                Barranca / talud → AMARILLO
              </label>
            </div>
          </div>

          <div className="space-y-4">
            <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-stone-500">
              Secuencia obligatoria
            </p>
            {CAMPO_ETAPAS_ORDEN.map((id) => {
              const meta = CAMPO_ETAPA_LABELS[id];
              const ev = evaluarEtapa(id, state);
              return (
                <div
                  key={id}
                  className={`rounded-lg border border-stone-200 bg-white px-4 py-4 shadow-sm ${ev.desbloqueado ? "border-l-4 border-l-blue-600" : "border-l-4 border-l-red-600"}`}
                >
                  <div className="flex gap-3">
                    <LockIcon abierto={ev.desbloqueado} />
                    <div className="min-w-0 flex-1">
                      <h3 className="font-semibold text-stone-900">{meta.titulo}</h3>
                      <p className="mt-0.5 text-sm text-stone-600">
                        {meta.descripcion}
                      </p>
                      {ev.candadoPorEtapa && (
                        <p className="mt-2 text-xs font-medium text-red-700">
                          Candado por etapa anterior:{" "}
                          <span className="uppercase text-stone-900">
                            {ev.candadoPorEtapa}
                          </span>
                        </p>
                      )}
                      {!ev.desbloqueado && ev.faltantes.length > 0 && (
                        <ul className="mt-3 list-inside list-disc space-y-1 text-xs text-stone-600">
                          {ev.faltantes.map((f, i) => (
                            <li key={i}>{f}</li>
                          ))}
                        </ul>
                      )}
                      {id === "habilitacion" && (
                        <div className="mt-4 space-y-2 border-t border-stone-200 pt-4">
                          <label className="flex cursor-pointer items-start gap-2 text-sm text-stone-700">
                            <input
                              type="checkbox"
                              checked={state.route.clientContactForFormwork}
                              onChange={(e) =>
                                setRoute({
                                  clientContactForFormwork: e.target.checked,
                                })
                              }
                              className="mt-1 h-4 w-4 accent-blue-600"
                            />
                            Contacto cliente por cimbrado
                          </label>
                          <label className="flex cursor-pointer items-start gap-2 text-sm text-stone-700">
                            <input
                              type="checkbox"
                              checked={state.route.formworkComplete}
                              onChange={(e) =>
                                setRoute({ formworkComplete: e.target.checked })
                              }
                              className="mt-1 h-4 w-4 accent-blue-600"
                            />
                            Cimbra lista para cubicar
                          </label>
                          <label className="flex cursor-pointer items-start gap-2 text-sm text-stone-700">
                            <input
                              type="checkbox"
                              checked={state.site.accessClearConfirmed}
                              onChange={(e) =>
                                setSite({
                                  accessClearConfirmed: e.target.checked,
                                })
                              }
                              className="mt-1 h-4 w-4 accent-blue-600"
                            />
                            Acceso libre — alturas/anchos/maniobra verificados
                          </label>
                          <a
                            href="#obra-programacion"
                            className="inline-block pt-1 text-xs font-medium text-blue-700 hover:text-blue-900 hover:underline"
                          >
                            Ir a Programación y obra →
                          </a>
                        </div>
                      )}
                      {id === "cubicacion" && !ev.desbloqueado && (
                        <a
                          href="#cerebro"
                          className="mt-3 inline-block text-xs font-medium text-blue-700 hover:text-blue-900 hover:underline"
                        >
                            Ir a cubicación (Calculador de Rendimiento Operativo) →
                        </a>
                      )}
                      {id === "bombeo" &&
                        evaluarEtapa("cubicacion", state).desbloqueado && (
                          <a
                            href="#elemento-bombeo"
                            className="mt-3 inline-block text-xs font-medium text-blue-700 hover:text-blue-900 hover:underline"
                          >
                            Ir a bombeo y suministro →
                          </a>
                        )}
                      {id === "coordinacion" &&
                        evaluarEtapa("bombeo", state).desbloqueado && (
                          <a
                            href="#obra-coordinacion"
                            className="mt-3 inline-block text-xs font-medium text-blue-700 hover:text-blue-900 hover:underline"
                          >
                            Ir a coordinación →
                          </a>
                        )}
                      {id === "cierre" &&
                        evaluarEtapa("coordinacion", state).desbloqueado && (
                          <div className="mt-4 space-y-3 border-t border-stone-200 pt-4">
                            <p className="text-xs text-stone-500">
                              Evidencia fotográfica: cargue archivo en la sección
                              &quot;Cierre&quot; más abajo.
                            </p>
                            <label className="flex cursor-pointer items-start gap-2 text-sm text-stone-700">
                              <input
                                type="checkbox"
                                checked={
                                  state.completion.clientSupervisionDisclaimerAck
                                }
                                onChange={(e) =>
                                  setCompletion({
                                    clientSupervisionDisclaimerAck:
                                      e.target.checked,
                                  })
                                }
                                className="mt-1 h-4 w-4 accent-blue-600"
                              />
                              Cliente informado — garantía / supervisión
                            </label>
                            <label className="flex cursor-pointer items-start gap-2 text-sm text-stone-700">
                              <input
                                type="checkbox"
                                checked={state.vehicle.unitGoodConditionAck}
                                onChange={(e) =>
                                  setVehicle({
                                    unitGoodConditionAck: e.target.checked,
                                  })
                                }
                                className="mt-1 h-4 w-4 accent-blue-600"
                              />
                              Unidad / documentación vehicular OK
                            </label>
                            <a
                              href="#obra-cierre"
                              className="inline-block text-xs font-medium text-blue-700 hover:text-blue-900 hover:underline"
                            >
                              Ir a evidencia y unidad →
                            </a>
                          </div>
                        )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <aside className="space-y-4 lg:sticky lg:top-28 lg:self-start">
          <RiskSemaphore nivel={nivel} />
          <div className="rounded-lg border border-dashed border-stone-300 bg-stone-50 p-3 text-[11px] leading-relaxed text-stone-600">
            Leyenda:{" "}
            <span className="font-semibold text-emerald-700">Verde</span> sin focos críticos;{" "}
            <span className="font-semibold text-amber-700">Amarillo</span> precaución;{" "}
            <span className="font-semibold text-red-700">Rojo</span> cables bajos o pendiente
            fuerte — alerta en bandeja de programación y bloqueo de cierre.
          </div>
        </aside>
      </div>
    </section>
  );
}
