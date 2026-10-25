import { z } from "zod";

import { parseEnv } from "./parse-env";

const nonEmpty = z.string().trim().min(1, "no puede estar vacía");

const publicEnvSchema = z.object({
  NEXT_PUBLIC_APP_NAME: nonEmpty,
  NEXT_PUBLIC_INSTITUTION_NAME: nonEmpty,
  NEXT_PUBLIC_INSTITUTION_SHORT_NAME: nonEmpty,
  NEXT_PUBLIC_API_BASE_PATH: nonEmpty
    .startsWith("/", "debe empezar con /")
    .refine((value) => !value.endsWith("/"), "no debe terminar con /"),
  NEXT_PUBLIC_CSRF_COOKIE_NAME: nonEmpty,
});

// Next.js solo incrusta en el navegador las variables NEXT_PUBLIC_* escritas de forma
// literal, por eso se listan una por una en lugar de pasar process.env completo.
const parsed = parseEnv(
  publicEnvSchema,
  {
    NEXT_PUBLIC_APP_NAME: process.env.NEXT_PUBLIC_APP_NAME,
    NEXT_PUBLIC_INSTITUTION_NAME: process.env.NEXT_PUBLIC_INSTITUTION_NAME,
    NEXT_PUBLIC_INSTITUTION_SHORT_NAME: process.env.NEXT_PUBLIC_INSTITUTION_SHORT_NAME,
    NEXT_PUBLIC_API_BASE_PATH: process.env.NEXT_PUBLIC_API_BASE_PATH,
    NEXT_PUBLIC_CSRF_COOKIE_NAME: process.env.NEXT_PUBLIC_CSRF_COOKIE_NAME,
  },
  "frontend/.env.local",
);

export const env = {
  appName: parsed.NEXT_PUBLIC_APP_NAME,
  institutionName: parsed.NEXT_PUBLIC_INSTITUTION_NAME,
  institutionShortName: parsed.NEXT_PUBLIC_INSTITUTION_SHORT_NAME,
  apiBasePath: parsed.NEXT_PUBLIC_API_BASE_PATH,
  csrfCookieName: parsed.NEXT_PUBLIC_CSRF_COOKIE_NAME,
} as const;
