# Logos institucionales

En esta carpeta van los **logos oficiales del TESH** que se usan en la interfaz y en el recibo de nómina. Mientras no estén, el componente `Logo` y el recibo en PDF muestran un logotipo tipográfico (las siglas en un marco) y la paleta usa un azul marino institucional.

## Archivos esperados

| Archivo               | Uso                                                       |
| --------------------- | --------------------------------------------------------- |
| `logo.svg`            | Logo principal (encabezado de la aplicación y del recibo) |
| `logo-monochrome.svg` | Versión de una sola tinta (fondos oscuros, impresión)     |
| `isotype.svg`         | Símbolo sin texto (espacios reducidos)                    |
| `favicon.svg`         | Ícono de la pestaña del navegador                         |

## Lineamientos

- Usar los archivos oficiales proporcionados por la institución, sin redibujar ni alterar proporciones o colores.
- Preferir SVG. Si solo hay PNG, entregar al menos 512 px de ancho con fondo transparente.
- Nombres en minúsculas y con guiones, como en la tabla.
- Los componentes hacen referencia a estos archivos mediante `BRAND_ASSETS` de `src/config/brand.ts`, nunca con rutas escritas a mano.

## Cómo activarlos

Un solo paso, desde la raíz del repositorio:

```bash
bash scripts/apply-brand.sh <carpeta-con-los-archivos> "<color-hex>"
```

Copia los archivos aquí y al recibo en PDF, declara los logos, genera la escala de color y verifica el contraste. Detalle en [`docs/sistema-de-diseno.md`](../../../docs/sistema-de-diseno.md#10-cómo-reemplazar-la-marca).
