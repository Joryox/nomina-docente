import { createCn } from "cn/config";

/**
 * Une clases y resuelve conflictos de Tailwind. Las utilidades de la escala tipográfica
 * semántica (globals.css) se declaran como tamaños de letra: sin esto, `text-label` y
 * `text-fg` parecerían dos colores y una borraría a la otra.
 */
export const cn = createCn({
  extend: {
    classGroups: {
      "font-size": [
        {
          text: [
            "display",
            "title",
            "subtitle",
            "body",
            "small",
            "label",
            "overline",
            "figure",
            "control",
            "unit",
          ],
        },
      ],
    },
  },
});
