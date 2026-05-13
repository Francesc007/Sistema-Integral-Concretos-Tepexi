import type { ChecklistStep } from "./types";

/** Secuencia lógica según manual (obligaciones supervisor). */
export function createInitialChecklist(): ChecklistStep[] {
  return [
    {
      id: "s01",
      order: 1,
      sectionId: "programacion",
      title:
        "Priorizar servicios del día siguiente y rutas para entregar levantamientos a tiempo.",
      done: false,
      observations: "",
    },
    {
      id: "s02",
      order: 2,
      sectionId: "programacion",
      title:
        "Contactar al cliente (llamada/mensaje): cimbrado completo antes de cubicar.",
      done: false,
      observations: "",
    },
    {
      id: "s03",
      order: 3,
      sectionId: "programacion",
      title:
        "Revisar ruta con GPS, calles y referencias; si es compleja, croquis impreso a operadores.",
      done: false,
      observations: "",
    },
    {
      id: "s04",
      order: 4,
      sectionId: "acceso_riesgos",
      title:
        "Inspeccionar acceso previo a suministro: altos de entrada, anchos y maniobras libres.",
      done: false,
      observations: "",
    },
    {
      id: "s05",
      order: 5,
      sectionId: "acceso_riesgos",
      title:
        "Identificar riesgos en vaciado: cables bajos, accesos angostos, barrancas, pendientes con camión cargado.",
      done: false,
      observations: "",
    },
    {
      id: "s06",
      order: 6,
      sectionId: "acceso_riesgos",
      title:
        "Permisos para circular en zona centro: responsabilidad del cliente — verificar/compartir estado.",
      hint: "Documentar si aplica y si el cliente gestiona permisos.",
      done: false,
      observations: "",
    },
    {
      id: "s07",
      order: 7,
      sectionId: "acceso_riesgos",
      title:
        "Un solo acceso sin vuelta: reportar a planta cómo se ingresa al punto de vaciado.",
      done: false,
      observations: "",
    },
    {
      id: "s08",
      order: 8,
      sectionId: "elemento_precubicacion",
      title:
        "Revisar elemento a colar y enviar observaciones; notificar hallazgos.",
      done: false,
      observations: "",
    },
    {
      id: "s09",
      order: 9,
      sectionId: "elemento_precubicacion",
      title:
        "Pre-cubicación: margen de error por volumen, tipo de losa, irregularidades de cimbra, tiempo de ajuste.",
      done: false,
      observations: "",
    },
    {
      id: "s10",
      order: 10,
      sectionId: "cubicacion",
      title:
        "Cubicar con dueño/responsable: coordinar mediciones y acordar volumen final.",
      done: false,
      observations: "",
    },
    {
      id: "s11",
      order: 11,
      sectionId: "cubicacion",
      title:
        "Dejar asentado: cliente/residente responsable del espesor del concreto (evitar faltantes/sobrantes).",
      done: false,
      observations: "",
    },
    {
      id: "s12",
      order: 12,
      sectionId: "cubicacion",
      title:
        "Comunicar irregularidades (cimbra alta, variaciones); ajustar volumen según firme/elemento.",
      done: false,
      observations: "",
    },
    {
      id: "s13",
      order: 13,
      sectionId: "bombeo_suministro",
      title:
        "Elegir bomba adecuada (pluma vs estacionaria) según elemento; evaluar desmontajes de tubería.",
      done: false,
      observations: "",
    },
    {
      id: "s14",
      order: 14,
      sectionId: "bombeo_suministro",
      title:
        "Medir distancia de la bomba al elemento (tramo de tubería / pluma).",
      done: false,
      observations: "",
    },
    {
      id: "s15",
      order: 15,
      sectionId: "bombeo_suministro",
      title:
        "Definir mejor zona de suministro; evitar obstáculos (escombro, madera, grava, arena, varilla).",
      done: false,
      observations: "",
    },
    {
      id: "s16",
      order: 16,
      sectionId: "bombeo_suministro",
      title:
        "Hacer responsable al cliente del área de maniobras para el vaciado.",
      done: false,
      observations: "",
    },
    {
      id: "s17",
      order: 17,
      sectionId: "bombeo_suministro",
      title:
        "Si la barda no es favorable, evaluar alternativas (colindancias, otros accesos).",
      done: false,
      observations: "",
    },
    {
      id: "s18",
      order: 18,
      sectionId: "coordinacion",
      title:
        "Coordinar limpieza de área, número de unidades, hora de inicio y duración estimada del colado.",
      done: false,
      observations: "",
    },
    {
      id: "s19",
      order: 19,
      sectionId: "coordinacion",
      title:
        "Coordinar puntualidad de personal de colado; dueño responsable de no retrasar.",
      done: false,
      observations: "",
    },
    {
      id: "s20",
      order: 20,
      sectionId: "cierre_admin",
      title:
        "Servicio bombeado: informar al cliente 1 carretilla de arena + 1 bulto de cemento para lechada (purga).",
      done: false,
      observations: "",
    },
    {
      id: "s21",
      order: 21,
      sectionId: "cierre_admin",
      title:
        "Definir dónde colocar sobrante de tolva (estacionaria ~2 carretillas; pluma ~4 carretillas).",
      done: false,
      observations: "",
    },
    {
      id: "s22",
      order: 22,
      sectionId: "cierre_admin",
      title:
        "Maestro de obra: foto como prueba de servicio terminado (garantía tiempos/volumen).",
      done: false,
      observations: "",
    },
    {
      id: "s23",
      order: 23,
      sectionId: "cierre_admin",
      title:
        "Cliente supervisa cumplimiento en tiempo y forma; reportar eventualidades a oficina.",
      done: false,
      observations: "",
    },
    {
      id: "s24",
      order: 24,
      sectionId: "cierre_admin",
      title:
        "Unidad asignada en buen estado; mantenimiento preventivo (aceite, balatas, verificación, tenencia).",
      done: false,
      observations: "",
    },
    {
      id: "s25",
      order: 25,
      sectionId: "cierre_admin",
      title:
        "Reporte diario de recorridos: zona, volumen, elemento y eventos (nota final del manual).",
      done: false,
      observations: "",
    },
  ];
}
