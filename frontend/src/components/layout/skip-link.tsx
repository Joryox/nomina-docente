import { TEXTS } from "@/constants/texts";

/** Id del contenido principal de cada layout (destino del enlace «Saltar al contenido»). */
export const MAIN_CONTENT_ID = "contenido";

/** Primer elemento enfocable de cada página: salta la navegación y va al contenido. */
export function SkipLink() {
  return (
    <a
      href={`#${MAIN_CONTENT_ID}`}
      className="sr-only rounded-md bg-primary px-4 py-2 text-label text-on-primary focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-(--layer-skip-link)"
    >
      {TEXTS.layout.skipToContent}
    </a>
  );
}
