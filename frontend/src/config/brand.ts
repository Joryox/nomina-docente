import brandAssets from "./brand-assets.json";
import { env } from "./env";

/**
 * Identidad institucional en un solo lugar. Los logos los declara `brand-assets.json`, que
 * escribe `bash scripts/apply-brand.sh <carpeta> <color>` junto con la escala de color de
 * `src/styles/brand.css` (ver README, «Logos y color institucional»).
 *
 * El nombre y las siglas vienen de la configuración (NEXT_PUBLIC_INSTITUTION_*), no de aquí.
 * Mientras `logo` sea `null`, el componente Logo muestra el logotipo tipográfico.
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
  /** Logo oficial; `null` mientras la institución no entregue los archivos. */
  logo: brandAssets.logo as BrandImage | null,
  /** Versión del logo para modo oscuro (normalmente la monocromática). */
  logoOnDark: brandAssets.logoOnDark as BrandImage | null,
} as const;
