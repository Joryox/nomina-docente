import Link from "next/link";
import type { ReactNode } from "react";

interface AuthCardProps {
  title: string;
  description: string;
  footerText: string;
  footerLinkLabel: string;
  footerHref: string;
  children: ReactNode;
}

/** Marco provisional de las páginas de acceso (el diseño final es de las etapas 5 y 6). */
export function AuthCard({
  title,
  description,
  footerText,
  footerLinkLabel,
  footerHref,
  children,
}: AuthCardProps) {
  return (
    <div className="mx-auto w-full max-w-md px-6 py-10">
      <section aria-labelledby="auth-title" className="rounded-lg border bg-card">
        <div className="border-b px-6 py-5">
          <h1 id="auth-title" className="text-xl font-semibold text-foreground">
            {title}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">{description}</p>
        </div>
        <div className="px-6 py-5">{children}</div>
        <p className="border-t px-6 py-4 text-sm text-muted-foreground">
          {footerText}{" "}
          <Link
            href={footerHref}
            className="font-medium text-primary underline-offset-4 hover:underline"
          >
            {footerLinkLabel}
          </Link>
        </p>
      </section>
    </div>
  );
}
