import {
  DARK_SCHEME_QUERY,
  ROOT_ATTRIBUTES,
  SIDEBAR_STATES,
  STORAGE_KEYS,
  THEME_PREFERENCES,
} from "@/constants/preferences";

/**
 * Script que corre en <head> ANTES de pintar la página: lee las preferencias guardadas y fija
 * `data-theme` (claro u oscuro ya resuelto), `data-theme-preference` y `data-sidebar` en
 * <html>. Así no hay parpadeo del tema equivocado ni salto de la barra lateral al hidratar.
 * Todo acceso al almacenamiento va dentro de try/catch: sin él, se usa la preferencia del
 * sistema operativo y la barra lateral expandida.
 */
function applyStoredPreferences(
  keys: { theme: string; sidebar: string },
  attributes: { theme: string; themePreference: string; sidebar: string },
  themes: readonly string[],
  sidebarStates: readonly string[],
  darkQuery: string,
) {
  const root = document.documentElement;
  const read = (key: string) => {
    try {
      return window.localStorage.getItem(key);
    } catch {
      return null;
    }
  };
  const storedTheme = read(keys.theme);
  const preference = storedTheme !== null && themes.includes(storedTheme) ? storedTheme : "system";
  const prefersDark = window.matchMedia(darkQuery).matches;
  const resolved = preference === "system" ? (prefersDark ? "dark" : "light") : preference;
  root.setAttribute(attributes.theme, resolved);
  root.setAttribute(attributes.themePreference, preference);
  const storedSidebar = read(keys.sidebar);
  root.setAttribute(
    attributes.sidebar,
    storedSidebar !== null && sidebarStates.includes(storedSidebar) ? storedSidebar : "expanded",
  );
}

const args = [STORAGE_KEYS, ROOT_ATTRIBUTES, THEME_PREFERENCES, SIDEBAR_STATES, DARK_SCHEME_QUERY]
  .map((value) => JSON.stringify(value))
  .join(",");

export const PREFERENCES_SCRIPT = `(${applyStoredPreferences.toString()})(${args});`;
