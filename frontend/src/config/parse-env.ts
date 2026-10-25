import type { z } from "zod";

/**
 * Valida variables de entorno y falla con un mensaje que nombra cada variable con problema.
 */
export function parseEnv<TSchema extends z.ZodType>(
  schema: TSchema,
  values: Record<string, string | undefined>,
  source: string,
): z.infer<TSchema> {
  const result = schema.safeParse(values);
  if (result.success) {
    return result.data;
  }
  const problems = result.error.issues.map((issue) => {
    const variable = issue.path.join(".") || "(desconocida)";
    const reason = values[variable] === undefined ? "falta la variable" : issue.message;
    return `  - ${variable}: ${reason}`;
  });
  throw new Error(
    [`Configuración inválida. Revisa ${source} (usa .env.example como guía):`, ...problems].join(
      "\n",
    ),
  );
}
