/** Textos de la interfaz (es-MX). */
export const TEXTS = {
  metadata: {
    description: "Registro de asignaciones, horarios y bitácora docente, y recibo de nómina.",
  },
  layout: {
    skipToContent: "Saltar al contenido",
  },
  systemStatus: {
    title: "Estado del sistema",
    description:
      "Página temporal de la etapa 1. Comprueba que la aplicación web, la API y la base de datos están conectadas.",
    checking: "Verificando…",
    refresh: "Volver a verificar",
    lastChecked: "Última verificación",
    labels: {
      api: "API",
      database: "Base de datos",
      version: "Versión de la API",
      environment: "Entorno",
    },
    status: {
      ok: "En servicio",
      degraded: "Con fallas",
      unavailable: "Sin conexión",
      unreachable: "Sin respuesta",
    },
    environments: {
      development: "Desarrollo",
      test: "Pruebas",
      production: "Producción",
    },
  },
} as const;
