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

import { APP_ROUTES, PROFILE_PASSWORD_SECTION_ID } from "./routes";

/**
 * Navegación del panel. Solo contiene secciones que ya existen: una pantalla nueva se agrega
 * aquí al construirse y aparece sola en la barra lateral, en las migas y, si corresponde, en
 * los enlaces del inicio (`isAvailableRoute`).
 */
export interface NavigationItem {
  id: string;
  label: string;
  href: string;
  icon: LucideIcon;
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
    items: [{ id: "panel", label: "Inicio", href: APP_ROUTES.panel, icon: House }],
  },
  {
    id: "docencia",
    label: "Docencia",
    items: [
      { id: "materias", label: "Mis materias", href: APP_ROUTES.subjects, icon: BookOpen },
      { id: "clases", label: "Mis clases", href: APP_ROUTES.assignments, icon: Layers },
      { id: "horario", label: "Horario", href: APP_ROUTES.schedule, icon: CalendarDays },
    ],
  },
  {
    id: "registro",
    label: "Registro",
    items: [{ id: "bitacora", label: "Bitácora", href: APP_ROUTES.logbook, icon: ClipboardList }],
  },
  {
    id: "nomina",
    label: "Nómina",
    items: [{ id: "recibos", label: "Recibos", href: APP_ROUTES.receipts, icon: FileText }],
  },
  {
    id: "cuenta",
    label: "Cuenta",
    items: [{ id: "perfil", label: "Mi perfil", href: APP_ROUTES.profile, icon: UserRound }],
  },
];

/** Opciones del menú de la cuenta (además de la apariencia y de cerrar sesión). */
export const ACCOUNT_MENU: readonly NavigationItem[] = [
  { id: "perfil", label: "Mi perfil", href: APP_ROUTES.profile, icon: UserRound },
  {
    id: "contrasena",
    label: "Cambiar contraseña",
    href: `${APP_ROUTES.profile}#${PROFILE_PASSWORD_SECTION_ID}`,
    icon: KeyRound,
  },
];

const ALL_ITEMS = NAVIGATION.flatMap((group) => group.items);

/** Elemento de navegación activo: el de ruta más larga que contiene a la actual. */
export function activeNavigationItem(pathname: string): NavigationItem | undefined {
  return ALL_ITEMS.filter(
    (item) => pathname === item.href || pathname.startsWith(`${item.href}/`),
  ).sort((first, second) => second.href.length - first.href.length)[0];
}

/** `true` si la ruta ya tiene pantalla: nunca se enlaza a una página que no existe. */
export function isAvailableRoute(href: string): boolean {
  return ALL_ITEMS.some((item) => item.href === href);
}
