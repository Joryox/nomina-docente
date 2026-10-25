import type { Metadata } from "next";

import { APP_ROUTES } from "@/constants/routes";
import { TEXTS } from "@/constants/texts";
import { AuthCard } from "@/features/auth/components/auth-card";
import { RegisterForm } from "@/features/auth/components/register-form";

const texts = TEXTS.auth.register;

export const metadata: Metadata = { title: texts.title };

export default function RegisterPage() {
  return (
    <AuthCard
      title={texts.title}
      description={texts.description}
      footerText={texts.hasAccount}
      footerLinkLabel={texts.goToLogin}
      footerHref={APP_ROUTES.login}
    >
      <RegisterForm />
    </AuthCard>
  );
}
