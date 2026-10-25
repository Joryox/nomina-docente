# Frontend — Aplicación web del Sistema de Nómina Docente

Aplicación construida con **Next.js 16 (App Router, Turbopack)**, **TypeScript estricto**, **Tailwind CSS 4** y **shadcn/ui**, organizada por funcionalidades.

## Estructura

| Ruta                     | Propósito                                                                                                                                                                     |
| ------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `src/app/`               | Solo rutas y layouts de Next.js                                                                                                                                               |
| `src/features/`          | Funcionalidades (`auth`, `assignments`, `schedules`, `logbook`, `payroll` y la temporal `system-status`), cada una con `components/`, `hooks/`, `api/`, `schemas/` y `types/` |
| `src/components/ui/`     | Componentes base de shadcn/ui                                                                                                                                                 |
| `src/components/layout/` | Encabezado y _providers_ globales (TanStack Query)                                                                                                                            |
| `src/lib/`               | Cliente HTTP (`api-client.ts`), errores de la API (`api-error.ts`), formateadores y utilidades                                                                                |
| `src/config/`            | Variables de entorno validadas con Zod (`env.ts` públicas, `server-env.ts` solo servidor)                                                                                     |
| `src/constants/`         | Textos, mensajes de error, rutas, constantes HTTP y de localización                                                                                                           |
| `src/styles/`            | Tokens de diseño (`tokens.css`) y su mapeo a Tailwind (`globals.css`)                                                                                                         |
| `public/brand/`          | Logos oficiales de la institución                                                                                                                                             |

## Comunicación con el backend

El navegador solo habla con Next.js. `next.config.ts` reenvía `NEXT_PUBLIC_API_BASE_PATH/*` (`/api/v1/*`) a `API_PROXY_TARGET` mediante `rewrites`. Así la cookie de sesión `httpOnly` es de primera parte y el encabezado CSRF viaja sin CORS. Los componentes nunca usan `fetch` directamente (una regla de ESLint lo impide): todo pasa por `apiClient`, que valida cada respuesta con Zod y convierte los errores al formato único de la API.

## Configuración

`scripts/setup.sh` crea `.env.local` a partir de `.env.example`. Si falta una variable o no es válida, `next dev` y `next build` fallan con un mensaje que la nombra.

## Comandos

Todos se ejecutan dentro de `frontend/`. La versión de Node está en `.nvmrc`.

| Comando             | Qué hace                                             |
| ------------------- | ---------------------------------------------------- |
| `npm ci`            | Instala dependencias exactas del `package-lock.json` |
| `npm run dev`       | Servidor de desarrollo                               |
| `npm run build`     | Build de producción                                  |
| `npm run lint`      | ESLint (sin advertencias permitidas)                 |
| `npm run typecheck` | Genera tipos de rutas y ejecuta `tsc --noEmit`       |
| `npm run format`    | Prettier (`format:check` para solo verificar)        |
| `npm run check`     | Lint + tipos + formato                               |
