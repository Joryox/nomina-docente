/** Preferencias de interfaz que se recuerdan en el navegador (no son datos del docente). */
export const STORAGE_KEYS = {
  theme: "nomina-docente:tema",
  sidebar: "nomina-docente:barra-lateral",
} as const;

export const THEME_PREFERENCES = ["system", "light", "dark"] as const;
export type ThemePreference = (typeof THEME_PREFERENCES)[number];
export type ResolvedTheme = Exclude<ThemePreference, "system">;

export const SIDEBAR_STATES = ["expanded", "collapsed"] as const;
export type SidebarState = (typeof SIDEBAR_STATES)[number];

/** Atributos de <html> que leen los estilos (styles/globals.css y styles/tokens.css). */
export const ROOT_ATTRIBUTES = {
  theme: "data-theme",
  themePreference: "data-theme-preference",
  sidebar: "data-sidebar",
} as const;

export const DARK_SCHEME_QUERY = "(prefers-color-scheme: dark)";
