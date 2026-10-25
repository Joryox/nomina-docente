/** Rutas de la API relativas a NEXT_PUBLIC_API_BASE_PATH. */
export const API_ROUTES = {
  health: "/health",
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
} as const;

/** Rutas de las páginas de la aplicación (en español). */
export const APP_ROUTES = {
  home: "/",
  login: "/iniciar-sesion",
  register: "/registro",
  panel: "/panel",
} as const;

/** Páginas que requieren sesión: el proxy redirige a iniciar sesión si no la hay. */
export const PROTECTED_ROUTE_PREFIXES: readonly string[] = [APP_ROUTES.panel];

/** Páginas solo para visitantes: con sesión, el proxy redirige al panel. */
export const GUEST_ONLY_ROUTES: readonly string[] = [APP_ROUTES.login, APP_ROUTES.register];

/** Parámetro con la página a la que se vuelve después de iniciar sesión. */
export const NEXT_PATH_PARAM = "siguiente";
