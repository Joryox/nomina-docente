import {
  BookOpen,
  CalendarDays,
  ClipboardList,
  FileText,
  House,
  KeyRound,
  Layers,
  UserRound,
  type LucideIcon,
} from "lucide-react";

import { APP_ROUTES } from "./routes";

/**
 * Navegación del panel. `ready: false` marca las secciones cuya pantalla llega en una etapa
 * posterior: se muestran deshabilitadas con «Próximamente» para que la estructura sea la
 * definitiva desde ahora. Al construir la pantalla, se cambia a `ready: true` y nada más.
 */
export interface NavigationItem {
  id: string;
  label: string;
  href: string;
  icon: LucideIcon;
  ready: boolean;
  /** Etapa de la hoja de ruta en que se habilita (solo si `ready` es `false`). */
  stage?: number;
}

export interface NavigationGroup {
  id: string;
  /** Sin título, el grupo va al inicio sin encabezado. */
  label?: string;
  items: readonly NavigationItem[];
}

export const NAVIGATION: readonly NavigationGroup[] = [
  {
    id: "inicio",
    items: [{ id: "panel", label: "Inicio", href: APP_ROUTES.panel, icon: House, ready: true }],
  },
  {
    id: "docencia",
    label: "Docencia",
    items: [
      {
        id: "asignaciones",
        label: "Asignaciones",
        href: APP_ROUTES.assignments,
        icon: Layers,
        ready: false,
        stage: 7,
      },
      {
        id: "materias",
        label: "Materias",
        href: APP_ROUTES.subjects,
        icon: BookOpen,
        ready: false,
        stage: 7,
      },
      {
        id: "horario",
        label: "Horario semanal",
        href: APP_ROUTES.schedule,
        icon: CalendarDays,
        ready: false,
        stage: 7,
      },
    ],
  },
  {
    id: "registro",
    label: "Registro",
    items: [
      {
        id: "bitacora",
        label: "Bitácora",
        href: APP_ROUTES.logbook,
        icon: ClipboardList,
        ready: false,
        stage: 7,
      },
    ],
  },
  {
    id: "nomina",
    label: "Nómina",
    items: [
      {
        id: "recibos",
        label: "Recibos de nómina",
        href: APP_ROUTES.receipts,
        icon: FileText,
        ready: false,
        stage: 8,
      },
    ],
  },
];

/** Opciones del menú de la cuenta (además de la apariencia y de cerrar sesión). */
export const ACCOUNT_MENU: readonly NavigationItem[] = [
  {
    id: "perfil",
    label: "Mi perfil",
    href: APP_ROUTES.profile,
    icon: UserRound,
    ready: false,
    stage: 6,
  },
  {
    id: "contrasena",
    label: "Cambiar contraseña",
    href: APP_ROUTES.changePassword,
    icon: KeyRound,
    ready: false,
    stage: 6,
  },
];

const ALL_ITEMS = NAVIGATION.flatMap((group) => group.items);

/** Elemento de navegación activo: el de ruta más larga que contiene a la actual. */
export function activeNavigationItem(pathname: string): NavigationItem | undefined {
  return ALL_ITEMS.filter(
    (item) => pathname === item.href || pathname.startsWith(`${item.href}/`),
  ).sort((first, second) => second.href.length - first.href.length)[0];
}
