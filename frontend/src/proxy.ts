import { NextResponse, type NextRequest } from "next/server";

import { getServerEnv } from "@/config/server-env";
import {
  APP_ROUTES,
  GUEST_ONLY_ROUTES,
  NEXT_PATH_PARAM,
  PROTECTED_ROUTE_PREFIXES,
} from "@/constants/routes";

function matchesPrefix(pathname: string, prefixes: readonly string[]): boolean {
  return prefixes.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));
}

/**
 * Comprobación optimista antes de mostrar una página (Next.js 16: `proxy`, antes `middleware`).
 * Solo mira si existe la cookie indicadora de sesión para redirigir; no es una credencial ni
 * una autorización: la API valida la sesión en cada petición y, si ya no sirve, el cliente
 * lleva a iniciar sesión.
 */
export function proxy(request: NextRequest) {
  const { sessionHintCookieName } = getServerEnv();
  const hasSession = request.cookies.has(sessionHintCookieName);
  const { pathname, search } = request.nextUrl;

  if (!hasSession && matchesPrefix(pathname, PROTECTED_ROUTE_PREFIXES)) {
    const loginUrl = new URL(APP_ROUTES.login, request.url);
    loginUrl.searchParams.set(NEXT_PATH_PARAM, `${pathname}${search}`);
    return NextResponse.redirect(loginUrl);
  }
  if (hasSession && GUEST_ONLY_ROUTES.includes(pathname)) {
    return NextResponse.redirect(new URL(APP_ROUTES.panel, request.url));
  }
  return NextResponse.next();
}

// Next.js exige valores literales en `matcher` (los analiza al compilar); deben coincidir con
// PROTECTED_ROUTE_PREFIXES y GUEST_ONLY_ROUTES de constants/routes.ts.
export const config = {
  matcher: ["/panel/:path*", "/iniciar-sesion", "/registro"],
};
