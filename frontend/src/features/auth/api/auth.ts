import { API_ROUTES } from "@/constants/routes";
import { apiClient } from "@/lib/api-client";

import { meResponseSchema, noContentSchema } from "../schemas/account";
import type { LoginPayload } from "../schemas/forms";
import { passwordPolicySchema } from "../schemas/password-policy";
import type { Me, PasswordPolicy, RegisterPayload } from "../types/auth";

// Las rutas de autenticación no intentan renovar la sesión ante un 401: ahí el 401 significa
// credenciales incorrectas o que ya no hay sesión.
const noRefresh = { skipSessionRefresh: true } as const;

export function getMe(signal?: AbortSignal): Promise<Me> {
  return apiClient.get(API_ROUTES.auth.me, meResponseSchema, { signal });
}

export function getPasswordPolicy(signal?: AbortSignal): Promise<PasswordPolicy> {
  return apiClient.get(API_ROUTES.auth.passwordPolicy, passwordPolicySchema, { signal });
}

export function login(body: LoginPayload): Promise<Me> {
  return apiClient.post(API_ROUTES.auth.login, meResponseSchema, { body, ...noRefresh });
}

export function register(body: RegisterPayload): Promise<Me> {
  return apiClient.post(API_ROUTES.auth.register, meResponseSchema, { body, ...noRefresh });
}

export async function logout(): Promise<void> {
  await apiClient.post(API_ROUTES.auth.logout, noContentSchema, noRefresh);
}
