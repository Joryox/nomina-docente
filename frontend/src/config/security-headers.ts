/**
 * Cabeceras de seguridad de las páginas del frontend (las de la API las pone el backend).
 *
 * Content-Security-Policy: solo se cargan recursos del mismo origen; no hay objetos, marcos
 * ni formularios hacia otros sitios. Los scripts en línea se permiten porque las páginas se
 * prerenderizan como HTML estático (Next.js inserta en línea los datos del renderizado y el
 * script del tema evita el parpadeo antes de pintar); un nonce por petición obligaría a
 * renderizar cada página en el servidor. Riesgo y mitigaciones en docs/seguridad.md.
 */

const IS_PRODUCTION = process.env.NODE_ENV === "production";
/** Dos años, con subdominios: solo tiene efecto servido por HTTPS. */
const HSTS_MAX_AGE_SECONDS = 63_072_000;

function contentSecurityPolicy(production: boolean): string {
  const directives: Record<string, string[]> = {
    "default-src": ["'self'"],
    // En desarrollo, el recargado en caliente necesita eval y websockets.
    "script-src": ["'self'", "'unsafe-inline'", ...(production ? [] : ["'unsafe-eval'"])],
    // Radix y Framer Motion posicionan y animan con estilos en línea.
    "style-src": ["'self'", "'unsafe-inline'"],
    "img-src": ["'self'", "data:", "blob:"],
    "font-src": ["'self'"],
    "connect-src": ["'self'", ...(production ? [] : ["ws:"])],
    "worker-src": ["'self'", "blob:"],
    "object-src": ["'none'"],
    "base-uri": ["'self'"],
    "form-action": ["'self'"],
    "frame-ancestors": ["'none'"],
  };
  // Sin upgrade-insecure-requests: rompería un servidor local por HTTP; en producción, HSTS
  // obliga a HTTPS (los navegadores solo lo aplican cuando la página llegó por HTTPS).
  return Object.entries(directives)
    .map(([name, values]) => `${name} ${values.join(" ")}`)
    .join("; ");
}

export const PAGE_SECURITY_HEADERS = [
  { key: "Content-Security-Policy", value: contentSecurityPolicy(IS_PRODUCTION) },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  {
    key: "Permissions-Policy",
    value: "accelerometer=(), camera=(), geolocation=(), microphone=(), payment=(), usb=()",
  },
  { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
  ...(IS_PRODUCTION
    ? [
        {
          key: "Strict-Transport-Security",
          value: `max-age=${HSTS_MAX_AGE_SECONDS}; includeSubDomains`,
        },
      ]
    : []),
];
