"use client";

import { useMemo } from "react";
import {
  AlertTriangle,
  ArrowRight,
  Box,
  Clock,
  Gauge,
  MapPin,
  Truck,
  Wallet,
} from "lucide-react";
import { estimateServiceMinutes } from "@/lib/domain/calculations";
import {
  textoDetalleRiesgoCritico,
  type SemaphoreLevel,
} from "@/lib/domain/campoWorkflow";
import type { PumpType, RiskFlags } from "@/lib/domain/types";

/** Servicios del día — demo para reunión cliente (mezcla datos locales). */
export interface ServicioHoyTabla {
  id: string;
  obra: string;
  cliente: string;
  estadoLabel: string;
  estadoTone: "riesgo" | "ok" | "curso";
  volumenPedidoM3: number;
  volumenEntregadoM3?: number;
  semaforo: SemaphoreLevel;
  observacion?: string;
}

export interface AlertaRentabilidadRow {
  id: string;
  servicio: string;
  etiqueta: string;
  motivoCampo: string;
  costoEspera: boolean;
}

export interface UnidadTimeline {
  id: string;
  etiqueta: string;
  volumenM3: number;
  pumpType: PumpType;
  pipeLengthM: number;
  hasPipeCuts: boolean;
  hasExcessiveAssembly: boolean;
  inicioMinutosDia: number;
}

export interface OllaTransitoMock {
  id: string;
  unidad: string;
  destino: string;
  etaTexto: string;
  volumenM3: number;
}

export interface CierreValidacionMock {
  id: string;
  obra: string;
  volumenPedidoM3: number;
  volumenRealM3: number;
  firmaDigital: string;
  horaCierre: string;
}

const RETRASO_ESTIMADO_MIN: Record<Exclude<SemaphoreLevel, "verde">, number> = {
  amarillo: 45,
  rojo: 120,
};

function retrasoPorSem(nivel: SemaphoreLevel): number {
  return nivel === "verde" ? 0 : RETRASO_ESTIMADO_MIN[nivel];
}

/** Distribución demo — semáforo industrial: gris planta · azul tránsito · verde obra */
const FLOTA_ESTADO: {
  key: string;
  label: string;
  sub: string;
  unidades: number;
  gradient: string;
}[] = [
  {
    key: "planta",
    label: "En planta",
    sub: "Inactivo",
    unidades: 4,
    gradient: "from-stone-400 via-stone-500 to-stone-600",
  },
  {
    key: "transito",
    label: "En tránsito",
    sub: "Generando valor",
    unidades: 7,
    gradient: "from-blue-500 via-blue-600 to-indigo-700",
  },
  {
    key: "obra",
    label: "En obra",
    sub: "Produciendo",
    unidades: 5,
    gradient: "from-emerald-500 via-teal-600 to-emerald-700",
  },
];

const MOCK_SERVICIOS_HOY: ServicioHoyTabla[] = [
  {
    id: "srv-1",
    obra: "Losa Av. Reforma 124",
    cliente: "Constructora Delta",
    estadoLabel: "Riesgo — retraso en obra",
    estadoTone: "riesgo",
    volumenPedidoM3: 21,
    semaforo: "rojo",
    observacion: "Supervisor reportó albañiles no listos · semáforo crítico.",
  },
  {
    id: "srv-2",
    obra: "Estacionamiento Plaza Centro",
    cliente: "Grupo HabitaSureste",
    estadoLabel: "Finalizado con éxito",
    estadoTone: "ok",
    volumenPedidoM3: 35,
    volumenEntregadoM3: 34.6,
    semaforo: "verde",
    observacion: "Colado conforme · firma cliente recibida.",
  },
  {
    id: "srv-3",
    obra: "Cimentación Fracc. Los Pinos",
    cliente: "ExcavaSureste SA",
    estadoLabel: "En planta / despacho",
    estadoTone: "curso",
    volumenPedidoM3: 14,
    semaforo: "verde",
  },
];

const MOCK_ALERTAS_RENTABILIDAD: AlertaRentabilidadRow[] = [
  {
    id: "ar-1",
    servicio: "Losa Av. Reforma 124",
    etiqueta: "Costo Extra por Tiempo de Espera",
    motivoCampo:
      "Retraso por personal en obra no listo (tiempos no controlables — manual logística).",
    costoEspera: true,
  },
  {
    id: "ar-2",
    servicio: "Estacionamiento Plaza Centro",
    etiqueta: "Sin sobrecosto registrado",
    motivoCampo: "Ventana cumplida · sin tiempo muerto reportado.",
    costoEspera: false,
  },
];

/** MXN estimado por evento de espera (demo). */
const COSTO_ESPERA_UNITARIO_MXN = 7750;

const MOCK_TIMELINE_UNITS: UnidadTimeline[] = [
  {
    id: "u1",
    etiqueta: "Olla T-104 · Estacionaria",
    volumenM3: 7,
    pumpType: "estacionaria",
    pipeLengthM: 30,
    hasPipeCuts: true,
    hasExcessiveAssembly: false,
    inicioMinutosDia: 7 * 60,
  },
  {
    id: "u2",
    etiqueta: "Olla T-111 · Pluma",
    volumenM3: 14,
    pumpType: "pluma",
    pipeLengthM: 0,
    hasPipeCuts: false,
    hasExcessiveAssembly: false,
    inicioMinutosDia: 7 * 60 + 130,
  },
  {
    id: "u3",
    etiqueta: "Olla T-098 · Directo",
    volumenM3: 7,
    pumpType: "directo",
    pipeLengthM: 0,
    hasPipeCuts: false,
    hasExcessiveAssembly: false,
    inicioMinutosDia: 10 * 60 + 45,
  },
];

const MOCK_FLOTA: OllaTransitoMock[] = [
  {
    id: "f1",
    unidad: "T-104",
    destino: "Reforma 124",
    etaTexto: "09:40",
    volumenM3: 7,
  },
  {
    id: "f2",
    unidad: "T-117",
    destino: "Carr. Tepexi km 4",
    etaTexto: "10:15",
    volumenM3: 8,
  },
  {
    id: "f3",
    unidad: "T-088",
    destino: "Planta (regreso lavado)",
    etaTexto: "11:05",
    volumenM3: 7,
  },
];

const MOCK_CIERRES: CierreValidacionMock[] = [
  {
    id: "c1",
    obra: "Estacionamiento Plaza Centro",
    volumenPedidoM3: 35,
    volumenRealM3: 34.6,
    firmaDigital: "Recibido — firma digital cliente (demo)",
    horaCierre: "14:22",
  },
  {
    id: "c2",
    obra: "Bodega Sur (cierre parcial)",
    volumenPedidoM3: 12,
    volumenRealM3: 12.1,
    firmaDigital: "Pendiente carga de imagen · validado telefónico",
    horaCierre: "11:08",
  },
];

const DIA_INICIO_MIN = 6 * 60;
const DIA_FIN_MIN = 18 * 60;
const DIA_RANGO_MIN = DIA_FIN_MIN - DIA_INICIO_MIN;

function minutosAHora(min: number): string {
  const h = Math.floor(min / 60);
  const m = min % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

function textoMotivoSemCampo(level: SemaphoreLevel, risks: RiskFlags): string {
  if (level === "rojo") {
    const t = textoDetalleRiesgoCritico(risks).trim();
    return t || "Riesgo crítico en campo.";
  }
  if (level === "amarillo") {
    const parts: string[] = [];
    if (risks.veryNarrowAccess) parts.push("Acceso muy angosto");
    if (risks.ravineHillside) parts.push("Barranca o talud");
    return (
      parts.join(" · ") ||
      "Precaución operativa — revisar acceso, relieve y coordinación."
    );
  }
  return "";
}

function pumpBarClass(t: PumpType) {
  if (t === "estacionaria")
    return "bg-gradient-to-r from-blue-600 to-blue-700";
  if (t === "pluma")
    return "bg-gradient-to-r from-indigo-700 to-blue-900";
  return "bg-gradient-to-r from-red-600 to-rose-700";
}

function formatoMXN(n: number) {
  return new Intl.NumberFormat("es-MX", {
    style: "currency",
    currency: "MXN",
    maximumFractionDigits: 0,
  }).format(n);
}

/** Gauge semicircular (eficiencia). Arco ≈ 138px para r=44. */
function SemiCircleGauge({
  value,
  threshold = 80,
}: {
  value: number;
  threshold?: number;
}) {
  const pct = Math.min(100, Math.max(0, value));
  const arc = 138;
  const offset = arc * (1 - pct / 100);
  const ok = pct >= threshold;
  return (
    <div className="relative flex flex-col items-center">
      <svg
        viewBox="0 0 120 70"
        className="h-20 w-40"
        aria-hidden
      >
        <path
          d="M 14 56 A 46 46 0 0 1 106 56"
          fill="none"
          stroke="#e7e5e4"
          strokeWidth="12"
          strokeLinecap="round"
        />
        <path
          d="M 14 56 A 46 46 0 0 1 106 56"
          fill="none"
          stroke={ok ? "#059669" : "#ea580c"}
          strokeWidth="12"
          strokeLinecap="round"
          strokeDasharray={arc}
          strokeDashoffset={offset}
          className="transition-all duration-700 ease-out"
        />
      </svg>
      <span
        className={`absolute bottom-1 text-2xl font-black tabular-nums ${ok ? "text-emerald-700" : "text-orange-600"}`}
      >
        {pct}%
      </span>
    </div>
  );
}

/** Colores por fase del motor (armado / colado / lavado / …) */
function gradientForEtapaLine(label: string): string {
  const l = label.toLowerCase();
  if (l.includes("lavado")) return "from-cyan-500 to-teal-700";
  if (l.includes("corte") || l.includes("cortes"))
    return "from-fuchsia-500 via-violet-600 to-purple-900";
  if (
    l.includes("colado") ||
    l.includes("vaciado") ||
    l.includes("tiro directo")
  )
    return "from-blue-600 to-indigo-800";
  if (
    l.includes("armado") ||
    l.includes("tubería") ||
    l.includes("instalación")
  )
    return "from-amber-500 to-orange-700";
  return "from-slate-500 to-slate-800";
}

export function CentroControlProgramacion({
  fechaEtiqueta,
  campoSemafotoNivel,
  riesgosCampo,
  obraUbicacionDireccion = "",
  obraUbicacionGps = "",
}: {
  fechaEtiqueta: string;
  campoSemafotoNivel: SemaphoreLevel;
  riesgosCampo: RiskFlags;
  /** Persistente — Programación supervisor */
  obraUbicacionDireccion?: string;
  obraUbicacionGps?: string;
}) {
  const bannerRiesgo =
    campoSemafotoNivel !== "verde"
      ? {
          motivo: textoMotivoSemCampo(campoSemafotoNivel, riesgosCampo),
          min: retrasoPorSem(campoSemafotoNivel),
        }
      : null;

  const kpis = useMemo(() => {
    const volumenTotalProgramadoM3 = MOCK_SERVICIOS_HOY.reduce(
      (s, r) => s + r.volumenPedidoM3,
      0,
    );
    const conResultado = MOCK_SERVICIOS_HOY.filter(
      (r) => r.estadoTone === "ok" || r.estadoTone === "riesgo",
    );
    const exitosSinRetraso = MOCK_SERVICIOS_HOY.filter(
      (r) => r.estadoTone === "ok",
    ).length;
    const eficienciaEntregaPct = conResultado.length
      ? Math.round((exitosSinRetraso / conResultado.length) * 100)
      : 100;
    const riesgoCriticoObras = MOCK_SERVICIOS_HOY.filter(
      (r) => r.semaforo === "rojo",
    ).length;
    const eventosEspera = MOCK_ALERTAS_RENTABILIDAD.filter((a) => a.costoEspera)
      .length;
    const fugasRentabilidadMxn = eventosEspera * COSTO_ESPERA_UNITARIO_MXN;

    const maxFlota = Math.max(...FLOTA_ESTADO.map((f) => f.unidades), 1);

    const timelineWithEst = MOCK_TIMELINE_UNITS.map((u) => {
      const est = estimateServiceMinutes({
        volumeM3: u.volumenM3,
        pumpType: u.pumpType,
        pipeLengthM: u.pipeLengthM,
        hasPipeCuts: u.hasPipeCuts,
        hasExcessiveAssembly: u.hasExcessiveAssembly,
      });
      const dur = est.applicable ? est.totalMinutes : 0;
      const lines = est.applicable ? est.lines : [];
      return { u, dur, lines };
    });
    const maxDur = Math.max(...timelineWithEst.map((x) => x.dur), 1);

    return {
      volumenTotalProgramadoM3,
      eficienciaEntregaPct,
      riesgoCriticoObras,
      fugasRentabilidadMxn,
      eventosEspera,
      maxFlota,
      timelineWithEst,
      maxDur,
    };
  }, []);

  const totalFlotaUnidades = FLOTA_ESTADO.reduce((s, f) => s + f.unidades, 0);

  return (
    <div className="min-h-full bg-[#F3F4F6] px-3 py-6 sm:px-5">
      <div className="mx-auto max-w-[1400px] space-y-6">
      {/* Cabecera consola */}
      <div className="rounded-2xl border border-slate-200/90 bg-white p-5 shadow-[0_8px_30px_rgb(0,0,0,0.06)] sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.35em] text-slate-500">
              Consola de mando · logística
            </p>
            <h2 className="mt-2 text-2xl font-bold tracking-tight text-slate-900 md:text-3xl">
              Centro de control operativo
            </h2>
            <p className="mt-2 max-w-2xl text-sm text-slate-600">
              Fecha referencia <span className="font-mono font-semibold">{fechaEtiqueta}</span>
            </p>
          </div>
          <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-4 py-2">
            <Clock className="h-5 w-5 text-slate-500" aria-hidden />
            <span className="text-xs font-medium text-slate-600">Actualización en vivo (demo)</span>
          </div>
        </div>
      </div>

      {bannerRiesgo && (
        <div
          role="alert"
          className={`rounded-2xl border-2 px-6 py-5 shadow-lg ${campoSemafotoNivel === "rojo" ? "border-red-500 bg-red-50 shadow-red-200/40" : "border-amber-400 bg-amber-50 shadow-amber-200/40"}`}
        >
          <p className="text-base font-bold text-stone-900">
            ¡Atención! Riesgo en sesión supervisor
          </p>
          <p className="mt-2 text-sm text-stone-800">{bannerRiesgo.motivo}</p>
          <p className="mt-3 text-lg font-semibold text-red-800">
            Retraso estimado: +{bannerRiesgo.min} min
          </p>
        </div>
      )}

      {/* KPIs semáforo industrial */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <div className="group relative overflow-hidden rounded-2xl border border-slate-200/90 bg-white p-5 shadow-[0_10px_40px_-10px_rgba(15,23,42,0.12)] transition hover:shadow-[0_12px_40px_-8px_rgba(37,99,235,0.15)]">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-wide text-slate-500">
                Volumen total programado
              </p>
              <p className="mt-3 text-4xl font-black tabular-nums tracking-tight text-blue-900">
                {kpis.volumenTotalProgramadoM3.toLocaleString("es-MX", {
                  maximumFractionDigits: 1,
                })}
                <span className="ml-1 text-lg font-bold text-slate-400">m³</span>
              </p>
            </div>
            <div className="rounded-xl bg-blue-600/10 p-3 text-blue-700">
              <Box className="h-7 w-7" strokeWidth={2.2} aria-hidden />
            </div>
          </div>
          <p className="mt-3 text-[11px] text-slate-500">Suma pedidos del día</p>
        </div>

        <div className="rounded-2xl border border-slate-200/90 bg-white p-5 shadow-[0_10px_40px_-10px_rgba(15,23,42,0.12)]">
          <div className="flex items-start justify-between gap-2">
            <p className="text-[11px] font-bold uppercase tracking-wide text-slate-500">
              Eficiencia de entrega
            </p>
            <div className="rounded-xl bg-slate-100 p-2.5 text-slate-700">
              <Gauge className="h-6 w-6" strokeWidth={2.2} aria-hidden />
            </div>
          </div>
          <div className="mt-2 flex items-center justify-between gap-2">
            <SemiCircleGauge value={kpis.eficienciaEntregaPct} />
            <div className="min-w-0 flex-1 text-right">
              <p
                className={`text-xs font-bold ${kpis.eficienciaEntregaPct < 80 ? "text-orange-600" : "text-emerald-700"}`}
              >
                {kpis.eficienciaEntregaPct < 80
                  ? "Bajo objetivo 80%"
                  : "Dentro de objetivo"}
              </p>
              <p className="mt-1 text-[10px] leading-snug text-slate-500">
                OK vs. servicios con resultado
              </p>
            </div>
          </div>
        </div>

        <div
          className={`rounded-2xl border p-5 shadow-[0_10px_40px_-10px_rgba(15,23,42,0.12)] ${
            kpis.riesgoCriticoObras > 0
              ? "border-red-300 bg-gradient-to-br from-red-50 to-white ring-1 ring-red-200/80"
              : "border-slate-200/90 bg-white"
          }`}
        >
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-wide text-slate-500">
                Riesgo crítico
              </p>
              <p
                className={`mt-3 text-4xl font-black tabular-nums ${kpis.riesgoCriticoObras > 0 ? "text-red-700" : "text-slate-800"}`}
              >
                {kpis.riesgoCriticoObras}
                <span className="ml-2 text-lg font-bold text-slate-400">obras</span>
              </p>
            </div>
            <div
              className={`rounded-xl p-3 ${kpis.riesgoCriticoObras > 0 ? "bg-red-600/15 text-red-700" : "bg-slate-100 text-slate-600"}`}
            >
              <AlertTriangle className="h-7 w-7" strokeWidth={2.2} aria-hidden />
            </div>
          </div>
          <p className="mt-3 text-[11px] text-slate-500">Semáforo rojo en cartera</p>
        </div>

        <div
          className={`rounded-2xl border bg-white p-5 shadow-[0_10px_40px_-10px_rgba(15,23,42,0.12)] ${
            kpis.fugasRentabilidadMxn > 0
              ? "border-4 border-red-600 shadow-red-900/10"
              : "border-slate-200/90"
          }`}
        >
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-[11px] font-bold uppercase tracking-wide text-slate-500">
                Fugas de rentabilidad
              </p>
              <p className="mt-2 truncate text-2xl font-black tabular-nums leading-tight text-amber-950 sm:text-3xl md:text-4xl">
                {formatoMXN(kpis.fugasRentabilidadMxn)}
              </p>
            </div>
            <div className="shrink-0 rounded-xl bg-amber-500/15 p-3 text-amber-800">
              <Wallet className="h-7 w-7" strokeWidth={2.2} aria-hidden />
            </div>
          </div>
          <p className="mt-3 text-[11px] text-slate-500">
            Costos por espera ({kpis.eventosEspera} evento
            {kpis.eventosEspera !== 1 ? "s" : ""})
          </p>
        </div>
      </div>

      {/* Flota + gráfico barras */}
      <div className="grid gap-6 xl:grid-cols-5">
        <section className="rounded-2xl border border-slate-200/90 bg-white p-5 shadow-[0_10px_40px_-10px_rgba(15,23,42,0.12)] sm:p-6 xl:col-span-3">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div>
              <h3 className="text-base font-bold text-slate-900">
                Estado de la flota
              </h3>
              <p className="mt-1 text-xs text-slate-500">
                Gris = en planta · Azul = tránsito · Verde = obra ·{" "}
                {totalFlotaUnidades} unidades (demo)
              </p>
            </div>
            <div className="rounded-lg bg-slate-100 p-2 text-slate-600">
              <Truck className="h-5 w-5" strokeWidth={2.2} aria-hidden />
            </div>
          </div>
          <div className="mt-40 flex h-52 items-end justify-center gap-6 sm:gap-14">
            {FLOTA_ESTADO.map((f) => {
              const barH = (f.unidades / kpis.maxFlota) * 100 * 0.85 + 15;
              return (
                <div
                  key={f.key}
                  className="flex min-h-0 flex-1 flex-col items-center justify-end gap-3"
                >
                  <span className="shrink-0 text-2xl font-black tabular-nums text-slate-900">
                    {f.unidades}
                  </span>
                  <div className="flex h-44 w-full max-w-[5rem] shrink-0 items-end justify-center rounded-t-2xl bg-slate-100 shadow-inner ring-1 ring-slate-200/80">
                    <div
                      className={`w-full rounded-t-2xl bg-gradient-to-t ${f.gradient} shadow-md transition-all duration-500`}
                      style={{ height: `${barH}%` }}
                    />
                  </div>
                  <p className="text-center text-[11px] font-bold uppercase tracking-wide text-slate-600">
                    {f.label}
                  </p>
                  <p className="text-center text-[10px] font-medium text-slate-400">
                    {f.sub}
                  </p>
                </div>
              );
            })}
          </div>
        </section>

        <section className="rounded-2xl border border-slate-200/90 bg-white p-5 shadow-[0_10px_40px_-10px_rgba(15,23,42,0.12)] sm:p-6 xl:col-span-2">
          <h3 className="text-base font-bold text-slate-900">
            En ruta (detalle)
          </h3>
          <ul className="mt-4 space-y-3">
            {MOCK_FLOTA.map((f) => (
              <li
                key={f.id}
                className="group rounded-xl border border-slate-100 bg-slate-50/90 p-4 shadow-sm transition hover:border-blue-200 hover:bg-white hover:shadow-md"
              >
                <p className="font-mono text-lg font-black text-blue-900">{f.unidad}</p>
                <p className="text-sm text-slate-600">{f.destino}</p>
                <div className="mt-2 flex items-baseline justify-between gap-2">
                  <span className="text-2xl font-black tabular-nums text-slate-900">
                    {f.etaTexto}
                  </span>
                  <span className="text-sm font-semibold text-slate-500">
                    {f.volumenM3} m³
                  </span>
                </div>
              </li>
            ))}
          </ul>
        </section>
      </div>

      {/* Servicios del día — tarjetas compactas */}
      <section>
        <h3 className="mb-3 text-base font-bold text-slate-900">
          Servicios del día
        </h3>
        <div className="grid gap-3 md:grid-cols-3">
          {MOCK_SERVICIOS_HOY.map((row) => (
            <article
              key={row.id}
              className={`group flex flex-col rounded-2xl border p-4 shadow-[0_8px_30px_rgb(0,0,0,0.06)] transition hover:shadow-[0_12px_36px_-8px_rgba(15,23,42,0.15)] ${
                row.estadoTone === "riesgo"
                  ? "border-red-200 bg-red-50/90"
                  : row.estadoTone === "ok"
                    ? "border-emerald-200 bg-emerald-50/80"
                    : "border-slate-200/90 bg-white"
              }`}
            >
              <p className="text-[10px] font-bold uppercase tracking-wide text-slate-500">
                {row.cliente}
              </p>
              {(obraUbicacionDireccion.trim() !== "" ||
                obraUbicacionGps.trim() !== "") && (
                <div className="mt-1.5 flex items-start gap-1.5 border-l-2 border-blue-500/30 pl-2">
                  <MapPin
                    className="mt-0.5 h-3.5 w-3.5 shrink-0 text-blue-600"
                    strokeWidth={2.2}
                    aria-hidden
                  />
                  <div className="min-w-0 text-[10px] leading-snug text-slate-600">
                    {obraUbicacionDireccion.trim() !== "" && (
                      <p className="font-medium text-slate-700">
                        {obraUbicacionDireccion.trim()}
                      </p>
                    )}
                    {obraUbicacionGps.trim() !== "" && (
                      <p className="mt-0.5 font-mono text-[10px] text-slate-600">
                        {obraUbicacionGps.trim()}
                      </p>
                    )}
                  </div>
                </div>
              )}
              <p className="mt-1.5 text-sm font-bold leading-snug text-slate-900">
                {row.obra}
              </p>
              <p className="mt-2 text-3xl font-black tabular-nums text-slate-900">
                {row.volumenPedidoM3}{" "}
                <span className="text-base font-bold text-slate-400">m³</span>
              </p>
              <p className="mt-2 text-xs font-semibold text-slate-800">{row.estadoLabel}</p>
              <span
                className={`mt-2 inline-flex w-fit rounded-full px-2.5 py-0.5 text-[10px] font-bold ${
                  row.semaforo === "rojo"
                    ? "bg-red-200 text-red-950"
                    : row.semaforo === "amarillo"
                      ? "bg-amber-200 text-amber-950"
                      : "bg-emerald-200 text-emerald-950"
                }`}
              >
                Semáforo {row.semaforo}
              </span>
              {row.observacion && (
                <p className="mt-2 text-[11px] leading-relaxed text-slate-600">
                  {row.observacion}
                </p>
              )}
              <button
                type="button"
                className="mt-4 flex items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-white py-2 text-xs font-bold text-slate-700 shadow-sm transition hover:border-blue-500 hover:bg-blue-600 hover:text-white hover:shadow-md focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
              >
                Ver detalles
                <ArrowRight
                  className="h-3.5 w-3.5 transition group-hover:translate-x-0.5"
                  strokeWidth={2.5}
                  aria-hidden
                />
              </button>
            </article>
          ))}
        </div>
      </section>

      {/* Timeline — Gantt por fases del motor */}
      <section className="rounded-2xl border border-slate-200/90 bg-white p-5 shadow-[0_10px_40px_-10px_rgba(15,23,42,0.12)] sm:p-6">
        <h3 className="text-base font-bold text-slate-900">
          Línea de tiempo · unidades programadas
        </h3>
        <p className="mt-1 text-xs text-slate-500">
          Franjas = ventana del día · Barras inferiores = fases del motor (armado, colado, lavado…).
        </p>

        <div className="relative mt-6 h-[5.5rem] overflow-hidden rounded-xl border border-slate-100 bg-gradient-to-b from-slate-50 to-slate-100/90 shadow-inner">
          <div className="absolute inset-x-0 top-0 flex justify-between border-b border-slate-200/80 px-3 py-2 text-[10px] font-bold uppercase tracking-wider text-slate-400">
            <span>06:00</span>
            <span>12:00</span>
            <span>18:00</span>
          </div>
          <div className="absolute inset-x-3 bottom-2.5 top-9">
            {MOCK_TIMELINE_UNITS.map((u) => {
              const est = estimateServiceMinutes({
                volumeM3: u.volumenM3,
                pumpType: u.pumpType,
                pipeLengthM: u.pipeLengthM,
                hasPipeCuts: u.hasPipeCuts,
                hasExcessiveAssembly: u.hasExcessiveAssembly,
              });
              const dur = est.applicable ? est.totalMinutes : 0;
              const leftPct =
                ((u.inicioMinutosDia - DIA_INICIO_MIN) / DIA_RANGO_MIN) * 100;
              const widthPct = Math.min(
                (dur / DIA_RANGO_MIN) * 100,
                100 - leftPct,
              );
              const lines = est.applicable ? est.lines : [];
              return (
                <div
                  key={u.id}
                  className="absolute top-0.5 flex h-10 overflow-hidden rounded-lg shadow-md ring-1 ring-white/40"
                  title={`${u.etiqueta} · ${dur} min`}
                  style={{
                    left: `${Math.max(0, leftPct)}%`,
                    width: `${Math.max(4, widthPct)}%`,
                  }}
                >
                  {lines.length > 0 && dur > 0 ? (
                    lines.map((line, i) => (
                      <div
                        key={`${u.id}-seg-${i}`}
                        title={`${line.label} · ${line.minutes} min`}
                        className={`h-full bg-gradient-to-b ${gradientForEtapaLine(line.label)}`}
                        style={{ width: `${(line.minutes / dur) * 100}%` }}
                      />
                    ))
                  ) : (
                    <div
                      className={`h-full w-full bg-gradient-to-r ${pumpBarClass(u.pumpType)}`}
                    />
                  )}
                  <span className="pointer-events-none absolute inset-0 z-10 flex items-center px-2 text-[10px] font-bold leading-tight text-white drop-shadow-md">
                    <span className="line-clamp-2">{u.etiqueta}</span>
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        <ul className="mt-5 space-y-3">
          {kpis.timelineWithEst.map(({ u, dur, lines }) => {
            const pctVsMax =
              dur > 0 ? Math.round((dur / kpis.maxDur) * 100) : 0;
            return (
              <li
                key={`tl-${u.id}`}
                className="rounded-xl border border-slate-100 bg-slate-50/80 p-4 shadow-sm"
              >
                <div className="flex flex-wrap items-end justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-slate-900">{u.etiqueta}</p>
                    <p className="mt-0.5 font-mono text-[11px] font-medium text-slate-500">
                      Inicio {minutosAHora(u.inicioMinutosDia)}
                    </p>
                  </div>
                  <p className="shrink-0 text-2xl font-black tabular-nums text-blue-900">
                    {dur}
                    <span className="ml-1 text-xs font-bold text-slate-400">min</span>
                  </p>
                </div>
                {/* Gantt proporcional por fase */}
                <div className="mt-3 flex h-4 w-full overflow-hidden rounded-full bg-slate-200/90 shadow-inner ring-1 ring-slate-300/30">
                  {dur > 0 && lines.length > 0 ? (
                    lines.map((line, i) => (
                      <div
                        key={`gantt-${u.id}-${i}`}
                        title={`${line.label} · ${line.minutes} min`}
                        className={`h-full min-w-0 bg-gradient-to-r ${gradientForEtapaLine(line.label)}`}
                        style={{ width: `${(line.minutes / dur) * 100}%` }}
                      />
                    ))
                  ) : (
                    <div
                      className={`h-full w-full bg-gradient-to-r ${pumpBarClass(u.pumpType)}`}
                    />
                  )}
                </div>
                <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-[10px] font-medium text-slate-500">
                  {lines.slice(0, 3).map((line, i) => (
                    <span key={`leg-${u.id}-${i}`} className="truncate max-w-[14rem]">
                      <span
                        className={`mr-1 inline-block h-2 w-2 shrink-0 rounded-sm bg-gradient-to-r ${gradientForEtapaLine(line.label)} align-middle`}
                      />
                      {line.minutes}m — {line.label.split("(")[0].trim()}
                    </span>
                  ))}
                </div>
                <p className="mt-1 text-right text-[10px] font-semibold text-slate-400">
                  {pctVsMax}% duración vs. unidad más larga (demo)
                </p>
              </li>
            );
          })}
        </ul>
      </section>

      {/* Rentabilidad — máxima visibilidad en fugas */}
      <section>
        <h3 className="mb-3 text-base font-bold text-slate-900">
          Alertas de rentabilidad
        </h3>
        <div className="grid gap-3 md:grid-cols-2">
          {MOCK_ALERTAS_RENTABILIDAD.map((a) => (
            <div
              key={a.id}
              className={`relative overflow-hidden rounded-2xl border p-5 shadow-[0_10px_40px_-10px_rgba(15,23,42,0.12)] ${
                a.costoEspera
                  ? "border border-red-200 bg-gradient-to-r from-red-600/20 via-red-50 to-white pl-5 ring-2 ring-red-500/30 md:border-l-[6px] md:border-red-600"
                  : "border border-emerald-200/90 bg-gradient-to-br from-emerald-50/90 to-white"
              }`}
            >
              {a.costoEspera && (
                <div
                  className="absolute left-0 top-0 h-full w-1.5 bg-gradient-to-b from-red-600 to-rose-800"
                  aria-hidden
                />
              )}
              <p className="text-xs font-bold uppercase tracking-wide text-slate-500">
                {a.servicio}
              </p>
              <p
                className={`mt-2 text-lg font-black ${a.costoEspera ? "text-red-800" : "text-emerald-800"}`}
              >
                {a.etiqueta}
              </p>
              {a.costoEspera && (
                <p className="mt-2 font-mono text-xl font-black text-red-700">
                  {formatoMXN(COSTO_ESPERA_UNITARIO_MXN)}{" "}
                  <span className="text-xs font-bold text-red-600/80">
                    estimado / evento
                  </span>
                </p>
              )}
              <p className="mt-2 text-xs leading-relaxed text-slate-600">
                {a.motivoCampo}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* Cierre — tarjetas firma */}
      <section>
        <h3 className="mb-3 text-base font-bold text-slate-900">
          Firma y validación
        </h3>
        <div className="grid gap-3 md:grid-cols-2">
          {MOCK_CIERRES.map((c) => {
            const delta = c.volumenRealM3 - c.volumenPedidoM3;
            return (
              <div
                key={c.id}
                className="rounded-2xl border border-slate-200/90 bg-white p-5 shadow-[0_10px_40px_-10px_rgba(15,23,42,0.12)]"
              >
                <p className="font-bold text-slate-900">{c.obra}</p>
                <div className="mt-4 flex flex-wrap gap-6">
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-wide text-slate-500">
                      Pedido
                    </p>
                    <p className="mt-1 text-2xl font-black tabular-nums text-slate-800">
                      {c.volumenPedidoM3}{" "}
                      <span className="text-sm font-medium text-slate-500">m³</span>
                    </p>
                  </div>
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-wide text-slate-500">
                      Real
                    </p>
                    <p className="mt-1 text-2xl font-black tabular-nums text-slate-800">
                      {c.volumenRealM3}{" "}
                      <span className="text-sm font-medium text-slate-500">m³</span>
                    </p>
                  </div>
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-wide text-slate-500">Δ</p>
                    <p
                      className={`mt-1 text-2xl font-black tabular-nums ${delta <= 0 ? "text-emerald-700" : "text-amber-800"}`}
                    >
                      {delta >= 0 ? "+" : ""}
                      {delta.toFixed(1)}{" "}
                      <span className="text-sm font-medium text-slate-500">m³</span>
                    </p>
                  </div>
                </div>
                <p className="mt-4 rounded-xl bg-slate-50 p-3 text-xs leading-relaxed text-slate-600">
                  <span className="font-bold text-slate-800">Firma: </span>
                  {c.firmaDigital}
                </p>
                <p className="mt-2 font-mono text-sm text-slate-500">{c.horaCierre}</p>
              </div>
            );
          })}
        </div>
      </section>
      </div>
    </div>
  );
}
