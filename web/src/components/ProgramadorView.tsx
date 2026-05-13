"use client";

import type { ServicioActivoProgramador } from "@/lib/domain/types";

function badgeSemClass(level: ServicioActivoProgramador["semaforoRiesgo"]) {
  switch (level) {
    case "rojo":
      return "border-red-600 bg-red-50 text-red-900";
    case "amarillo":
      return "border-amber-500 bg-amber-50 text-amber-950";
    default:
      return "border-emerald-600 bg-emerald-50 text-emerald-950";
  }
}

function etiquetaSem(level: ServicioActivoProgramador["semaforoRiesgo"]) {
  switch (level) {
    case "rojo":
      return "Rojo — crítico";
    case "amarillo":
      return "Amarillo — atención";
    default:
      return "Verde — OK";
  }
}

function estadoOperativo(row: ServicioActivoProgramador): string {
  if (row.semaforoRiesgo === "rojo") return "No despachar sin coordinación";
  if (row.alertaEspesor) return "Espesor en conflicto — validar volumen";
  if (!row.habilitacionOk) return "Retraso / habilitación incompleta";
  if (!row.cubicacionOk) return "Cubicación pendiente";
  if (row.semaforoRiesgo === "amarillo") return "Precaución en campo";
  return "Ventana de colado viable";
}

function bordeFila(row: ServicioActivoProgramador): string {
  if (row.semaforoRiesgo === "rojo") return "border-l-4 border-l-red-600";
  if (row.semaforoRiesgo === "amarillo") return "border-l-4 border-l-amber-500";
  if (!row.habilitacionOk || row.alertaEspesor)
    return "border-l-4 border-l-amber-600";
  return "border-l-4 border-l-emerald-600";
}

export function ProgramadorView({
  servicios,
  obraSesionActualId,
}: {
  servicios: ServicioActivoProgramador[];
  obraSesionActualId: string;
}) {
  const ordenados = [...servicios].sort((a, b) =>
    b.actualizadoEn.localeCompare(a.actualizadoEn),
  );

  return (
    <div className="space-y-6">
      <section className="rounded-lg border border-blue-900/15 bg-blue-50/80 p-5">
        <h2 className="text-lg font-semibold text-stone-900">
          Servicios activos (programador)
        </h2>
        <p className="mt-2 text-sm text-stone-700">
          Demo local: cuando el supervisor marca avances en el checklist o
          cumple habilitación, la fila se crea o actualiza aquí — mismo{" "}
          <span className="font-mono text-xs text-stone-600">localStorage</span>
          , simulando el pull automático del tablero.
        </p>
      </section>

      {ordenados.length === 0 ? (
        <section className="rounded-lg border border-dashed border-stone-300 bg-stone-50 p-10 text-center text-sm text-stone-600">
          No hay servicios en bandeja. Abra la vista{" "}
          <strong>Supervisor</strong>, marque al menos un ítem del checklist o
          complete habilitación — la fila aparecerá sola en esta tabla.
        </section>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-stone-200 shadow-sm">
          <table className="min-w-[920px] w-full border-collapse text-left text-sm">
            <thead className="bg-stone-100 text-xs font-semibold uppercase tracking-wide text-stone-600">
              <tr>
                <th className="px-4 py-3">Referencia</th>
                <th className="px-4 py-3">Fecha</th>
                <th className="px-4 py-3">Checklist</th>
                <th className="px-4 py-3">m³</th>
                <th className="px-4 py-3">Tiempo est. colado</th>
                <th className="px-4 py-3">Riesgo</th>
                <th className="px-4 py-3">Estado operativo</th>
                <th className="px-4 py-3">Última sync</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-200 bg-white">
              {ordenados.map((row) => {
                const esSesionActual =
                  obraSesionActualId && row.obraSesionId === obraSesionActualId;
                return (
                  <tr
                    key={row.obraSesionId}
                    className={`${bordeFila(row)} ${esSesionActual ? "bg-blue-50/40" : ""}`}
                  >
                    <td className="px-4 py-3">
                      <div className="font-medium text-stone-900">
                        {row.referenciaObra}
                      </div>
                      {esSesionActual && (
                        <span className="mt-1 inline-block rounded bg-blue-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-blue-900">
                          Sesión actual (supervisor)
                        </span>
                      )}
                      <p className="mt-2 max-w-md text-xs text-stone-500">
                        {row.resumenParaProgramador}
                      </p>
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 font-mono text-xs text-stone-700">
                      {row.fechaServicio}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 font-mono text-xs">
                      {row.checklistCompletados}/{row.checklistTotal}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 font-mono text-xs">
                      {row.volumenM3 !== null ? row.volumenM3.toFixed(3) : "—"}
                    </td>
                    <td className="px-4 py-3">
                      {row.tiempoColadoEstimadoMin !== null ? (
                        <span className="font-mono text-sm font-semibold text-blue-900">
                          {row.tiempoColadoEstimadoMin} min
                        </span>
                      ) : (
                        <span className="text-xs text-stone-500">
                          {row.tiempoColadoNota ??
                            "Complete datos en el Calculador de Rendimiento Operativo"}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex rounded-full border px-2.5 py-1 text-[11px] font-semibold ${badgeSemClass(row.semaforoRiesgo)}`}
                      >
                        {etiquetaSem(row.semaforoRiesgo)}
                      </span>
                    </td>
                    <td className="max-w-[220px] px-4 py-3 text-xs text-stone-800">
                      {estadoOperativo(row)}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-xs text-stone-500">
                      {new Date(row.actualizadoEn).toLocaleString("es-MX", {
                        dateStyle: "short",
                        timeStyle: "short",
                      })}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
