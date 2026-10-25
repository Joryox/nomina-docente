import { z } from "zod";

/** Contrato de GET /auth/me (espejo de app.schemas.auth.MeResponse en el backend). */
export const meResponseSchema = z.object({
  account: z.object({
    id: z.uuid(),
    email: z.string(),
    roles: z.array(z.string()),
    last_login_at: z.string().nullable(),
    created_at: z.string(),
  }),
  teacher: z
    .object({
      first_names: z.string(),
      paternal_surname: z.string(),
      maternal_surname: z.string().nullable(),
      employee_number: z.string().nullable(),
      full_name: z.string(),
    })
    .nullable(),
});
