# Logos institucionales

En esta carpeta van los **logos oficiales del TESH** que se usan en la interfaz y en el recibo de nómina. Se incorporan en la etapa 11; la paleta de colores definitiva se deriva de ellos (etapa 5).

## Archivos esperados

| Archivo | Uso |
| --- | --- |
| `logo.svg` | Logo principal (encabezado de la aplicación y del recibo) |
| `logo-monochrome.svg` | Versión de una sola tinta (fondos oscuros, impresión) |
| `isotype.svg` | Símbolo sin texto (espacios reducidos) |
| `favicon.svg` | Ícono de la pestaña del navegador |

## Lineamientos

- Usar los archivos oficiales proporcionados por la institución, sin redibujar ni alterar proporciones o colores.
- Preferir SVG. Si solo hay PNG, entregar al menos 512 px de ancho con fondo transparente.
- Nombres en minúsculas y con guiones, como en la tabla.
- Los componentes hacen referencia a estos archivos mediante las rutas centralizadas en `src/constants/`, nunca con rutas escritas a mano.
