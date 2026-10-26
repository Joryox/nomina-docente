import { env } from "./env";

/**
 * Identidad institucional en un solo lugar. Cambiar de marca es:
 *
 * 1. Copiar los archivos oficiales a `public/brand/` con los nombres de `BRAND_ASSETS`.
 * 2. Declararlos aquí en `logo` (y su versión para fondo oscuro en `logoOnDark`).
 * 3. Reemplazar la escala de color de `src/styles/brand.css` y correr `npm test`.
 *
 * El nombre y las siglas vienen de la configuración (NEXT_PUBLIC_INSTITUTION_*), no de aquí.
 * Mientras `logo` sea `null`, el componente Logo muestra el logotipo tipográfico provisional.
 */

export interface BrandImage {
  src: string;
  width: number;
  height: number;
}

/** Rutas públicas esperadas (ver public/brand/README.md). */
export const BRAND_ASSETS = {
  logo: "/brand/logo.svg",
  logoMonochrome: "/brand/logo-monochrome.svg",
  isotype: "/brand/isotype.svg",
  favicon: "/brand/favicon.svg",
} as const;

export const BRAND = {
  institutionName: env.institutionName,
  institutionShortName: env.institutionShortName,
  appName: env.appName,
  /** Logo oficial; `null` hasta que la institución entregue los archivos (etapa 11). */
  logo: null as BrandImage | null,
  /** Versión del logo para modo oscuro (normalmente la monocromática). */
  logoOnDark: null as BrandImage | null,
} as const;
