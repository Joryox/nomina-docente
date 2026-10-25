import type { z } from "zod";

import { env } from "@/config/env";
import { CLIENT_ERROR_CODES } from "@/constants/error-messages";
import {
  CSRF_HEADER,
  CSRF_PROTECTED_METHODS,
  HTTP_STATUS,
  type HttpMethod,
} from "@/constants/http";
import { API_ROUTES } from "@/constants/routes";

import { ApiError } from "./api-error";

interface RequestOptions {
  body?: unknown;
  signal?: AbortSignal;
  /**
   * No intenta renovar la sesión ante un 401. Lo usan las rutas de autenticación: un 401 en
   * el inicio de sesión significa credenciales incorrectas, no una sesión vencida.
   */
  skipSessionRefresh?: boolean;
}

type SessionExpiredHandler = () => void;

let sessionExpiredHandler: SessionExpiredHandler | null = null;
let refreshInFlight: Promise<boolean> | null = null;

/**
 * Registra qué hacer cuando la sesión ya no se puede renovar (por ejemplo, redirigir a
 * iniciar sesión). Devuelve la función para quitar el registro.
 */
export function onSessionExpired(handler: SessionExpiredHandler): () => void {
  sessionExpiredHandler = handler;
  return () => {
    if (sessionExpiredHandler === handler) {
      sessionExpiredHandler = null;
    }
  };
}

function readCookie(name: string): string | undefined {
  if (typeof document === "undefined") {
    return undefined;
  }
  const prefix = `${name}=`;
  const match = document.cookie.split("; ").find((cookie) => cookie.startsWith(prefix));
  return match ? decodeURIComponent(match.slice(prefix.length)) : undefined;
}

/** El backend deja el token CSRF en una cookie legible; si aún no existe, se pide. */
async function getCsrfToken(signal?: AbortSignal): Promise<string | undefined> {
  const current = readCookie(env.csrfCookieName);
  if (current) {
    return current;
  }
  await fetch(`${env.apiBasePath}${API_ROUTES.auth.csrf}`, {
    credentials: "same-origin",
    cache: "no-store",
    signal,
  });
  return readCookie(env.csrfCookieName);
}

async function buildHeaders(
  method: HttpMethod,
  hasBody: boolean,
  signal?: AbortSignal,
): Promise<Headers> {
  const headers = new Headers({ Accept: "application/json" });
  if (hasBody) {
    headers.set("Content-Type", "application/json");
  }
  if (CSRF_PROTECTED_METHODS.has(method)) {
    const csrfToken = await getCsrfToken(signal);
    if (csrfToken) {
      headers.set(CSRF_HEADER, csrfToken);
    }
  }
  return headers;
}

async function send(
  method: HttpMethod,
  path: string,
  body: unknown,
  signal?: AbortSignal,
): Promise<Response> {
  try {
    return await fetch(`${env.apiBasePath}${path}`, {
      method,
      headers: await buildHeaders(method, body !== undefined, signal),
      body: body === undefined ? undefined : JSON.stringify(body),
      credentials: "same-origin",
      cache: "no-store",
      signal,
    });
  } catch (error) {
    if (signal?.aborted) {
      throw error;
    }
    throw new ApiError(CLIENT_ERROR_CODES.network, 0);
  }
}

/**
 * Renueva la sesión una sola vez aunque varias peticiones reciban 401 al mismo tiempo:
 * todas esperan la misma promesa. Un 409 significa que otra pestaña acaba de renovarla y
 * las cookies nuevas ya están en el navegador, así que también cuenta como éxito.
 */
function refreshSession(): Promise<boolean> {
  refreshInFlight ??= send("POST", API_ROUTES.auth.refresh, undefined)
    .then((response) => response.ok || response.status === HTTP_STATUS.conflict)
    .catch(() => false)
    .finally(() => {
      refreshInFlight = null;
    });
  return refreshInFlight;
}

async function readJson(response: Response): Promise<unknown> {
  const contentType = response.headers.get("Content-Type") ?? "";
  if (response.status === HTTP_STATUS.noContent || !contentType.includes("application/json")) {
    return undefined;
  }
  try {
    return (await response.json()) as unknown;
  } catch {
    return undefined;
  }
}

async function request<TSchema extends z.ZodType>(
  method: HttpMethod,
  path: string,
  schema: TSchema,
  { body, signal, skipSessionRefresh = false }: RequestOptions = {},
): Promise<z.infer<TSchema>> {
  let response = await send(method, path, body, signal);

  if (response.status === HTTP_STATUS.unauthorized && !skipSessionRefresh) {
    if (await refreshSession()) {
      response = await send(method, path, body, signal);
    } else {
      sessionExpiredHandler?.();
    }
  }

  const payload = await readJson(response);
  if (!response.ok) {
    throw ApiError.fromResponse(response.status, payload);
  }

  const parsed = schema.safeParse(payload);
  if (!parsed.success) {
    throw new ApiError(CLIENT_ERROR_CODES.invalidResponse, response.status);
  }
  return parsed.data;
}

/**
 * Cliente HTTP tipado. Toda respuesta se valida con un schema de Zod, de modo que los
 * datos que llegan a los componentes siempre tienen la forma esperada. Agrega el token
 * CSRF a las peticiones que modifican datos y renueva la sesión vencida una sola vez.
 * Se usa desde el navegador: las rutas son relativas y Next.js las reenvía al backend.
 */
export const apiClient = {
  get: <TSchema extends z.ZodType>(path: string, schema: TSchema, options?: RequestOptions) =>
    request("GET", path, schema, options),
  post: <TSchema extends z.ZodType>(path: string, schema: TSchema, options?: RequestOptions) =>
    request("POST", path, schema, options),
  put: <TSchema extends z.ZodType>(path: string, schema: TSchema, options?: RequestOptions) =>
    request("PUT", path, schema, options),
  patch: <TSchema extends z.ZodType>(path: string, schema: TSchema, options?: RequestOptions) =>
    request("PATCH", path, schema, options),
  delete: <TSchema extends z.ZodType>(path: string, schema: TSchema, options?: RequestOptions) =>
    request("DELETE", path, schema, options),
};
