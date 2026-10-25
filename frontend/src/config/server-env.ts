import { z } from "zod";

import { parseEnv } from "./parse-env";

const serverEnvSchema = z.object({
  API_PROXY_TARGET: z
    .url({ protocol: /^https?$/, error: "debe ser una URL http(s) válida" })
    .refine((value) => !value.endsWith("/"), "no debe terminar con /"),
});

/** Variables solo de servidor (nunca llegan al navegador). Las usa next.config.ts. */
export function getServerEnv() {
  const parsed = parseEnv(
    serverEnvSchema,
    { API_PROXY_TARGET: process.env.API_PROXY_TARGET },
    "frontend/.env.local",
  );
  return { apiProxyTarget: parsed.API_PROXY_TARGET } as const;
}
