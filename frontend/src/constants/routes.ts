/** Rutas de la API relativas a NEXT_PUBLIC_API_BASE_PATH. */
export const API_ROUTES = {
  auth: {
    csrf: "/auth/csrf",
    passwordPolicy: "/auth/password-policy",
    register: "/auth/register",
    login: "/auth/login",
    refresh: "/auth/refresh",
    logout: "/auth/logout",
    logoutAll: "/auth/logout-all",
    me: "/auth/me",
    changePassword: "/auth/change-password",
  },
  catalogs: {
    careers: "/catalogs/careers",
    hourlyRates: "/catalogs/hourly-rates",
    businessRules: "/catalogs/business-rules",
  },
  subjects: {
    collection: "/subjects",
    item: (id: string) => `/subjects/${id}`,
    reactivate: (id: string) => `/subjects/${id}/reactivate`,
  },
  assignments: {
    collection: "/assignments",
    item: (id: string) => `/assignments/${id}`,
    deactivate: (id: string) => `/assignments/${id}/deactivate`,
    reactivate: (id: string) => `/assignments/${id}/reactivate`,
    schedules: (id: string) => `/assignments/${id}/schedules`,
  },
  schedules: {
    weekly: "/schedules/weekly",
    item: (id: string) => `/schedules/${id}`,
  },
  logbook: {
    collection: "/logbook",
    item: (id: string) => `/logbook/${id}`,
    scheduled: "/logbook/scheduled",
    quick: "/logbook/quick",
  },
  payroll: {
    periods: "/payroll/periods",
    preview: "/payroll/preview",
    receipts: "/payroll/receipts",
    receipt: (id: string) => `/payroll/receipts/${id}`,
    receiptPdf: (id: string) => `/payroll/receipts/${id}/pdf`,
  },
  dashboard: {
    summary: "/dashboard/summary",
  },
} as const;

/** Rutas de las páginas de la aplicación (en español). */
export const APP_ROUTES = {
  home: "/",
  login: "/iniciar-sesion",
  register: "/registro",
  panel: "/panel",
  subjects: "/panel/materias",
  assignments: "/panel/clases",
  schedule: "/panel/horario",
  logbook: "/panel/bitacora",
  receipts: "/panel/recibos",
  receipt: (id: string) => `/panel/recibos/${id}`,
  profile: "/panel/perfil",
} as const;

/** Ancla de la sección «Cambiar contraseña» dentro de Mi perfil. */
export const PROFILE_PASSWORD_SECTION_ID = "contrasena";

/** Páginas que requieren sesión: el proxy redirige a iniciar sesión si no la hay. */
export const PROTECTED_ROUTE_PREFIXES: readonly string[] = [APP_ROUTES.panel];

/** Páginas solo para visitantes: con sesión, el proxy redirige al panel. */
export const GUEST_ONLY_ROUTES: readonly string[] = [APP_ROUTES.login, APP_ROUTES.register];

/** Parámetro con la página a la que se vuelve después de iniciar sesión. */
export const NEXT_PATH_PARAM = "siguiente";

/** Parámetro con la quincena de la vista previa de Recibos ("2026-10-1"). */
export const PERIOD_PARAM = "quincena";
