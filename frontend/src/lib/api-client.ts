import type { z } from "zod";

import { env } from "@/config/env";
import { CLIENT_ERROR_CODES } from "@/constants/error-messages";
import { CSRF_HEADER, CSRF_PROTECTED_METHODS, type HttpMethod } from "@/constants/http";

import { ApiError } from "./api-error";

interface RequestOptions {
  body?: unknown;
  signal?: AbortSignal;
}

function readCookie(name: string): string | undefined {
  if (typeof document === "undefined") {
    return undefined;
  }
  const prefix = `${name}=`;
  const match = document.cookie.split("; ").find((cookie) => cookie.startsWith(prefix));
  return match ? decodeURIComponent(match.slice(prefix.length)) : undefined;
}

function buildHeaders(method: HttpMethod, hasBody: boolean): Headers {
  const headers = new Headers({ Accept: "application/json" });
  if (hasBody) {
    headers.set("Content-Type", "application/json");
  }
  if (CSRF_PROTECTED_METHODS.has(method)) {
    const csrfToken = readCookie(env.csrfCookieName);
    if (csrfToken) {
      headers.set(CSRF_HEADER, csrfToken);
    }
  }
  return headers;
}

async function readJson(response: Response): Promise<unknown> {
  const contentType = response.headers.get("Content-Type") ?? "";
  if (response.status === 204 || !contentType.includes("application/json")) {
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
  { body, signal }: RequestOptions = {},
): Promise<z.infer<TSchema>> {
  let response: Response;
  try {
    response = await fetch(`${env.apiBasePath}${path}`, {
      method,
      headers: buildHeaders(method, body !== undefined),
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
 * datos que llegan a los componentes siempre tienen la forma esperada.
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
