# Frontend — Aplicación web del Sistema de Nómina Docente

Aplicación construida con **Next.js 16 (App Router, Turbopack)**, **TypeScript estricto**, **Tailwind CSS 4** y **shadcn/ui**, organizada por funcionalidades.

## Estructura

| Ruta                     | Propósito                                                                                                                                                                                                                                                                           |
| ------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `src/app/`               | Solo rutas y layouts de Next.js                                                                                                                                                                                                                                                     |
| `src/features/`          | Funcionalidades (`auth`, `catalogs`, `subjects`, `assignments`, `schedules`, `logbook`, `payroll`, `dashboard`, y `design-system` —la guía viva—), cada una con `components/`, `hooks/`, `api/`, `schemas/` y `types/`                                                              |
| `src/components/ui/`     | Componentes base sobre Radix (Button, Field, Select, Combobox, DatePicker, TimeInput, DataTable, diálogos, avisos…), adaptados a los tokens                                                                                                                                         |
| `src/components/domain/` | Componentes del dominio: `Money`, `Hours`, `PeriodLabel`, `Folio`, `StatusBadge`                                                                                                                                                                                                    |
| `src/components/layout/` | `AppShell`, `AuthLayout`, `SiteHeader`, `PageHeader`, `Logo`, selector de tema y _providers_ globales (TanStack Query, tooltips, notificaciones)                                                                                                                                    |
| `src/lib/`               | Cliente HTTP (`api-client.ts`), tipos generados del OpenAPI (`api-types.gen.ts`, no se edita), schemas compartidos (`api-schemas.ts`), claves de consulta e invalidación (`query-keys.ts`, `query-invalidation.ts`), errores de la API (`api-error.ts`), formateadores y utilidades |
| `src/config/`            | Variables de entorno validadas con Zod (`env.ts` públicas, `server-env.ts` solo servidor), marca (`brand.ts`) y tipografías (`fonts.ts`)                                                                                                                                            |
| `src/constants/`         | Textos, mensajes de error, rutas, navegación, preferencias, constantes HTTP y de localización                                                                                                                                                                                       |
| `src/styles/`            | Color de marca (`brand.css`), tokens de diseño (`tokens.css`), su mapeo a Tailwind (`globals.css`), catálogo de tokens y pruebas de contraste y de valores literales                                                                                                                |
| `public/brand/`          | Logos oficiales de la institución                                                                                                                                                                                                                                                   |

## Comunicación con el backend

El navegador solo habla con Next.js. `next.config.ts` reenvía `NEXT_PUBLIC_API_BASE_PATH/*` (`/api/v1/*`) a `API_PROXY_TARGET` mediante `rewrites`. Así la cookie de sesión `httpOnly` es de primera parte y el encabezado CSRF viaja sin CORS. Los componentes nunca usan `fetch` directamente (una regla de ESLint lo impide): todo pasa por `apiClient`, que valida cada respuesta con Zod y convierte los errores al formato único de la API.

**Contratos generados.** Los tipos de la API se generan desde el OpenAPI del backend (`npm run api:types`) y nunca se escriben a mano. Cada schema de Zod se declara con `satisfies z.ZodType<…>` contra el tipo generado, y los textos de los códigos de error y de advertencia (`src/constants/`) son `Record` sobre los códigos generados: si el backend cambia, `npm run typecheck` señala qué ajustar. `npm run api:check` falla si los tipos versionados están desactualizados.

**Dinero y horas** llegan como cadenas decimales (`"1250.00"`) y `src/lib/formatters.ts` los formatea sin convertirlos a número (`$1,250.00 MXN`, `12.50 h`).

## Sistema de diseño

Reglas, tokens y guía de uso de cada componente: [`docs/sistema-de-diseno.md`](../docs/sistema-de-diseno.md). La **guía viva** está en <http://localhost:3000/sistema-diseno> (solo en desarrollo, con `DESIGN_GUIDE_ENABLED=true`; en un build de producción responde 404).

- Los componentes solo usan tokens semánticos (`bg-surface`, `text-fg-muted`, `text-label`…). Las escalas por defecto de Tailwind no existen.
- `npm test` falla si un par de texto y fondo no cumple WCAG AA en algún modo, o si aparecen colores literales o medidas arbitrarias fuera de los tokens.

## Configuración

`scripts/setup.sh` crea `.env.local` a partir de `.env.example`. Si falta una variable o no es válida, `next dev` y `next build` fallan con un mensaje que la nombra.

## Comandos

Todos se ejecutan dentro de `frontend/`. La versión de Node está en `.nvmrc`.

| Comando             | Qué hace                                                     |
| ------------------- | ------------------------------------------------------------ |
| `npm ci`            | Instala dependencias exactas del `package-lock.json`         |
| `npm run dev`       | Servidor de desarrollo                                       |
| `npm run build`     | Build de producción                                          |
| `npm run lint`      | ESLint (sin advertencias permitidas)                         |
| `npm run typecheck` | Genera tipos de rutas y ejecuta `tsc --noEmit`               |
| `npm run format`    | Prettier (`format:check` para solo verificar)                |
| `npm test`          | Vitest: contraste, valores literales y lógica pura           |
| `npm run check`     | Lint + tipos + formato + pruebas                             |
| `npm run api:types` | Regenera `src/lib/api-types.gen.ts` desde el backend         |
| `npm run api:check` | Verifica que los tipos generados estén al día                |
| `npm run test:e2e`  | Playwright de punta a punta (con `scripts/dev.sh` en marcha) |

## Pruebas de punta a punta

`e2e/` contiene las pruebas de Playwright de los flujos de acceso, inicio y perfil, en escritorio y a 390 px de ancho: registro con validación en vivo, inicio de sesión con bloqueo, regreso a la página solicitada, guía de configuración completa, registro de una clase en un clic, perfil, cambio de contraseña, cierre de todas las sesiones, 404 y ausencia de desbordamiento horizontal.

1. Levanta el sistema: `bash scripts/dev.sh`.
2. En otra terminal: `cd frontend && npm run test:e2e`.

Usan el Microsoft Edge instalado (`E2E_BROWSER_CHANNEL=chrome` para Google Chrome), así que no descargan navegadores. Cada corrida registra cuentas nuevas con correos `@e2e.example.com` en la base de desarrollo.
