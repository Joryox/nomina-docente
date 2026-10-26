"use client";

import { useSyncExternalStore } from "react";

import {
  DARK_SCHEME_QUERY,
  ROOT_ATTRIBUTES,
  SIDEBAR_STATES,
  STORAGE_KEYS,
  THEME_PREFERENCES,
  type ResolvedTheme,
  type SidebarState,
  type ThemePreference,
} from "@/constants/preferences";
import { safeStorage } from "@/lib/safe-storage";

/*
 * Preferencias de interfaz como estado externo de React: la verdad está en los atributos de
 * <html> (los puso el script de <head>) y en localStorage. useSyncExternalStore usa el valor
 * del servidor al hidratar y el real después, sin advertencias de hidratación.
 */

const CHANGE_EVENT = "nomina-docente:preferencias";

function root() {
  return document.documentElement;
}

function notify() {
  window.dispatchEvent(new Event(CHANGE_EVENT));
}

function isOneOf<T extends string>(options: readonly T[], value: string | null): value is T {
  return value !== null && (options as readonly string[]).includes(value);
}

function systemTheme(): ResolvedTheme {
  return window.matchMedia(DARK_SCHEME_QUERY).matches ? "dark" : "light";
}

function applyTheme(preference: ThemePreference) {
  const resolved = preference === "system" ? systemTheme() : preference;
  root().setAttribute(ROOT_ATTRIBUTES.theme, resolved);
  root().setAttribute(ROOT_ATTRIBUTES.themePreference, preference);
}

function subscribe(onChange: () => void) {
  const media = window.matchMedia(DARK_SCHEME_QUERY);
  const onSystemChange = () => {
    if (getThemePreference() === "system") {
      applyTheme("system");
    }
    onChange();
  };
  // Otra pestaña cambió la preferencia: se aplica también aquí.
  const onStorage = (event: StorageEvent) => {
    if (event.key === STORAGE_KEYS.theme) {
      const value = event.newValue;
      applyTheme(isOneOf(THEME_PREFERENCES, value) ? value : "system");
    }
    if (event.key === STORAGE_KEYS.sidebar && isOneOf(SIDEBAR_STATES, event.newValue)) {
      root().setAttribute(ROOT_ATTRIBUTES.sidebar, event.newValue);
    }
    onChange();
  };
  window.addEventListener(CHANGE_EVENT, onChange);
  window.addEventListener("storage", onStorage);
  media.addEventListener("change", onSystemChange);
  return () => {
    window.removeEventListener(CHANGE_EVENT, onChange);
    window.removeEventListener("storage", onStorage);
    media.removeEventListener("change", onSystemChange);
  };
}

export function getThemePreference(): ThemePreference {
  const value = root().getAttribute(ROOT_ATTRIBUTES.themePreference);
  return isOneOf(THEME_PREFERENCES, value) ? value : "system";
}

function getResolvedTheme(): ResolvedTheme {
  return root().getAttribute(ROOT_ATTRIBUTES.theme) === "dark" ? "dark" : "light";
}

function getSidebarState(): SidebarState {
  const value = root().getAttribute(ROOT_ATTRIBUTES.sidebar);
  return isOneOf(SIDEBAR_STATES, value) ? value : "expanded";
}

export function setThemePreference(preference: ThemePreference) {
  safeStorage.set(STORAGE_KEYS.theme, preference);
  applyTheme(preference);
  notify();
}

export function setSidebarState(state: SidebarState) {
  safeStorage.set(STORAGE_KEYS.sidebar, state);
  root().setAttribute(ROOT_ATTRIBUTES.sidebar, state);
  notify();
}

export function useThemePreference(): ThemePreference {
  return useSyncExternalStore(subscribe, getThemePreference, () => "system");
}

export function useResolvedTheme(): ResolvedTheme {
  return useSyncExternalStore(subscribe, getResolvedTheme, () => "light");
}

export function useSidebarState(): SidebarState {
  return useSyncExternalStore(subscribe, getSidebarState, () => "expanded");
}
