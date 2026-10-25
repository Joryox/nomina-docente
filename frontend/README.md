# Frontend — Aplicación web del Sistema de Nómina Docente

Aplicación construida con **Next.js 16 (App Router, Turbopack)**, **TypeScript estricto**, **Tailwind CSS 4** y **shadcn/ui**, organizada por funcionalidades.

## Estructura

| Ruta                     | Propósito                                                                                                                                                                                                                                                                           |
| ------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `src/app/`               | Solo rutas y layouts de Next.js                                                                                                                                                                                                                                                     |
| `src/features/`          | Funcionalidades (`auth`, `catalogs`, `subjects`, `assignments`, `schedules`, `logbook`, `payroll`, `dashboard` y la temporal `system-status`), cada una con `components/`, `hooks/`, `api/`, `schemas/` y `types/`                                                                  |
| `src/components/ui/`     | Componentes base de shadcn/ui                                                                                                                                                                                                                                                       |
| `src/components/layout/` | Encabezado y _providers_ globales (TanStack Query)                                                                                                                                                                                                                                  |
| `src/lib/`               | Cliente HTTP (`api-client.ts`), tipos generados del OpenAPI (`api-types.gen.ts`, no se edita), schemas compartidos (`api-schemas.ts`), claves de consulta e invalidación (`query-keys.ts`, `query-invalidation.ts`), errores de la API (`api-error.ts`), formateadores y utilidades |
| `src/config/`            | Variables de entorno validadas con Zod (`env.ts` públicas, `server-env.ts` solo servidor)                                                                                                                                                                                           |
| `src/constants/`         | Textos, mensajes de error, rutas, constantes HTTP y de localización                                                                                                                                                                                                                 |
| `src/styles/`            | Tokens de diseño (`tokens.css`) y su mapeo a Tailwind (`globals.css`)                                                                                                                                                                                                               |
| `public/brand/`          | Logos oficiales de la institución                                                                                                                                                                                                                                                   |

## Comunicación con el backend

El navegador solo habla con Next.js. `next.config.ts` reenvía `NEXT_PUBLIC_API_BASE_PATH/*` (`/api/v1/*`) a `API_PROXY_TARGET` mediante `rewrites`. Así la cookie de sesión `httpOnly` es de primera parte y el encabezado CSRF viaja sin CORS. Los componentes nunca usan `fetch` directamente (una regla de ESLint lo impide): todo pasa por `apiClient`, que valida cada respuesta con Zod y convierte los errores al formato único de la API.

**Contratos generados.** Los tipos de la API se generan desde el OpenAPI del backend (`npm run api:types`) y nunca se escriben a mano. Cada schema de Zod se declara con `satisfies z.ZodType<…>` contra el tipo generado, y los textos de los códigos de error y de advertencia (`src/constants/`) son `Record` sobre los códigos generados: si el backend cambia, `npm run typecheck` señala qué ajustar. `npm run api:check` falla si los tipos versionados están desactualizados.

**Dinero y horas** llegan como cadenas decimales (`"1250.00"`) y `src/lib/formatters.ts` los formatea sin convertirlos a número (`$1,250.00 MXN`, `12.50 h`).

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
| `npm run api:types` | Regenera `src/lib/api-types.gen.ts` desde el backend |
| `npm run api:check` | Verifica que los tipos generados estén al día        |
