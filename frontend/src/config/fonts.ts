import localFont from "next/font/local";

/*
 * Tipografías autohospedadas: los archivos vienen de los paquetes @fontsource-variable
 * (licencia SIL Open Font License) y next/font los publica desde el propio servidor. El build
 * no descarga nada de internet y el navegador no consulta servicios de terceros.
 *
 * - Public Sans (interfaz): sans neutra diseñada para servicios públicos; cifras tabulares,
 *   todos los signos del español y ejes de peso continuos.
 * - Source Serif 4 (títulos): serif de tamaño óptico con el tono de un documento oficial.
 *   Solo para display y títulos de página; nunca en texto corrido ni en tablas.
 *
 * Las variables CSS que crean (--font-public-sans y --font-source-serif) las consume
 * styles/tokens.css. Solo se carga el subconjunto latino (incluye á, ñ, ¿, ¡, ª y –).
 */

export const uiFont = localFont({
  src: "../../node_modules/@fontsource-variable/public-sans/files/public-sans-latin-wght-normal.woff2",
  variable: "--font-public-sans",
  weight: "100 900",
  style: "normal",
  display: "swap",
  adjustFontFallback: "Arial",
});

export const displayFont = localFont({
  src: "../../node_modules/@fontsource-variable/source-serif-4/files/source-serif-4-latin-opsz-normal.woff2",
  variable: "--font-source-serif",
  weight: "200 900",
  style: "normal",
  display: "swap",
  adjustFontFallback: "Times New Roman",
});
