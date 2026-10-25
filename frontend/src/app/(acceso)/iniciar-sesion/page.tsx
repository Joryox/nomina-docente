import type { Metadata } from "next";
import { Suspense } from "react";

import { APP_ROUTES } from "@/constants/routes";
import { TEXTS } from "@/constants/texts";
import { AuthCard } from "@/features/auth/components/auth-card";
import { LoginForm } from "@/features/auth/components/login-form";

const texts = TEXTS.auth.login;

export const metadata: Metadata = { title: texts.title };

export default function LoginPage() {
  return (
    <AuthCard
      title={texts.title}
      description={texts.description}
      footerText={texts.noAccount}
      footerLinkLabel={texts.goToRegister}
      footerHref={APP_ROUTES.register}
    >
      {/* useSearchParams (página de regreso) necesita un límite de Suspense. */}
      <Suspense>
        <LoginForm />
      </Suspense>
    </AuthCard>
  );
}
