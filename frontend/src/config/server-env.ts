import { z } from "zod";

import { parseEnv } from "./parse-env";

const serverEnvSchema = z.object({
  API_PROXY_TARGET: z
    .url({ protocol: /^https?$/, error: "debe ser una URL http(s) válida" })
    .refine((value) => !value.endsWith("/"), "no debe terminar con /"),
  SESSION_HINT_COOKIE_NAME: z.string().trim().min(1, "no puede estar vacía"),
});

/** Variables solo de servidor (nunca llegan al navegador). Las usan next.config.ts y el proxy. */
export function getServerEnv() {
  const parsed = parseEnv(
    serverEnvSchema,
    {
      API_PROXY_TARGET: process.env.API_PROXY_TARGET,
      SESSION_HINT_COOKIE_NAME: process.env.SESSION_HINT_COOKIE_NAME,
    },
    "frontend/.env.local",
  );
  return {
    apiProxyTarget: parsed.API_PROXY_TARGET,
    sessionHintCookieName: parsed.SESSION_HINT_COOKIE_NAME,
  } as const;
}
