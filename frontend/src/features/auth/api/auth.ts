import { API_ROUTES } from "@/constants/routes";
import { apiClient } from "@/lib/api-client";
import { noContentSchema } from "@/lib/api-schemas";

import { meResponseSchema } from "../schemas/account";
import type { LoginPayload } from "../schemas/forms";
import { passwordPolicySchema } from "../schemas/password-policy";
import type {
  ChangePasswordPayload,
  Me,
  PasswordPolicy,
  ProfilePayload,
  RegisterPayload,
} from "../types/auth";

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

export async function logoutAll(): Promise<void> {
  await apiClient.post(API_ROUTES.auth.logoutAll, noContentSchema);
}

export function updateProfile(body: ProfilePayload): Promise<Me> {
  return apiClient.patch(API_ROUTES.auth.me, meResponseSchema, { body });
}

export async function changePassword(body: ChangePasswordPayload): Promise<void> {
  await apiClient.post(API_ROUTES.auth.changePassword, noContentSchema, { body });
}
