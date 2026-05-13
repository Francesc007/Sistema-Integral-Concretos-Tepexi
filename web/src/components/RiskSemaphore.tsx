"use client";

import type { SemaphoreLevel } from "@/lib/domain/campoWorkflow";

const COPY: Record<
  SemaphoreLevel,
  { label: string; sub: string; barClass: string; glow: string }
> = {
  verde: {
    label: "CONDICIÓN ACEPTABLE",
    sub: "Sin riesgos críticos marcados.",
    barClass: "bg-emerald-500",
    glow: "shadow-[0_0_24px_rgba(34,197,94,0.45)]",
  },
  amarillo: {
    label: "PRECAUCIÓN",
    sub: "Acceso angosto o relieve — revisar con planta.",
    barClass: "bg-yellow-400",
    glow: "shadow-[0_0_22px_rgba(250,204,21,0.45)]",
  },
  rojo: {
    label: "RIESGO CRÍTICO",
    sub: "Notificación enviada al dashboard de programación.",
    barClass: "bg-red-600",
    glow: "shadow-[0_0_26px_rgba(220,38,38,0.55)]",
  },
};

export function RiskSemaphore({
  nivel,
  compact,
}: {
  nivel: SemaphoreLevel;
  compact?: boolean;
}) {
  const c = COPY[nivel];

  const circleClasses = (slot: SemaphoreLevel) => {
    const cfg = COPY[slot];
    const active = nivel === slot;
    return active
      ? `h-4 w-4 rounded-full border border-stone-400/90 ${cfg.barClass} ${cfg.glow} scale-110`
      : "h-4 w-4 rounded-full border border-stone-300 bg-stone-200 opacity-40";
  };

  return (
    <div
      className={`rounded-lg border border-stone-200 bg-white shadow-sm ${compact ? "p-3" : "p-4"}`}
      role="status"
      aria-live="polite"
      aria-label={`Semáforo de riesgo: ${nivel}`}
    >
      <div className="flex items-start gap-4">
        <div className="flex flex-col gap-2 pt-1">
          <div className={circleClasses("verde")} aria-hidden />
          <div className={circleClasses("amarillo")} aria-hidden />
          <div className={circleClasses("rojo")} aria-hidden />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-amber-800">
            Semáforo de riesgo
          </p>
          <p
            className={`mt-1 font-mono text-sm font-bold uppercase tracking-wide ${nivel === "rojo" ? "text-red-700" : nivel === "amarillo" ? "text-amber-800" : "text-emerald-700"}`}
          >
            {c.label}
          </p>
          {!compact && (
            <p className="mt-1 text-xs leading-relaxed text-stone-600">{c.sub}</p>
          )}
        </div>
      </div>
      {!compact && nivel === "rojo" && (
        <p className="mt-3 border-t border-stone-200 pt-3 text-[11px] text-red-800">
          Cables bajos o pendientes fuertes activan este estado y bloquean el cierre
          formal hasta coordinación con programación.
        </p>
      )}
    </div>
  );
}
