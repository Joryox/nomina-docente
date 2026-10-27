import type { z } from "zod";

import type { ApiSchemas } from "@/lib/api-types";

import type { meResponseSchema } from "../schemas/account";
import type { passwordPolicySchema, passwordRuleSchema } from "../schemas/password-policy";

export type Me = z.infer<typeof meResponseSchema>;
export type PasswordPolicy = z.infer<typeof passwordPolicySchema>;
export type PasswordRule = z.infer<typeof passwordRuleSchema>;

/** Cuerpo de POST /auth/register: los opcionales vacíos viajan como `null`. */
export interface RegisterPayload {
  email: string;
  password: string;
  first_names: string;
  paternal_surname: string;
  maternal_surname: string | null;
  employee_number: string | null;
}

/** Cuerpo de PATCH /auth/me: los opcionales vacíos viajan como `null`. */
export type ProfilePayload = Required<ApiSchemas["UpdateProfileRequest"]>;

export type ChangePasswordPayload = ApiSchemas["ChangePasswordRequest"];
