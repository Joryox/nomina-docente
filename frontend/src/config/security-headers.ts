/**
 * Cabeceras de seguridad de las páginas del frontend (las de la API las pone el backend).
 * La Content-Security-Policy con nonces para las páginas se define en la etapa 10.
 */
export const PAGE_SECURITY_HEADERS = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  {
    key: "Permissions-Policy",
    value: "accelerometer=(), camera=(), geolocation=(), microphone=(), payment=(), usb=()",
  },
  { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
] as const;
