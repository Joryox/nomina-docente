/**
 * Alias legibles de los tipos generados desde el OpenAPI del backend (`api-types.gen.ts`).
 * Los contratos nunca se escriben a mano: si el backend cambia, se regeneran con
 * `npm run api:types` y TypeScript señala lo que hay que ajustar.
 */
import type { components } from "./api-types.gen";

export type ApiSchemas = components["schemas"];
export type ApiErrorCode = ApiSchemas["ErrorCode"];
export type ApiWarningCode = ApiSchemas["WarningCode"];
export type Weekday = ApiSchemas["Weekday"];
export type Fortnight = ApiSchemas["Fortnight"];
export type StatusFilter = ApiSchemas["StatusFilter"];
