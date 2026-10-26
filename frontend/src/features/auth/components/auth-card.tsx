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

/** Contenido de las páginas de acceso dentro del AuthLayout: título, formulario y enlace. */
export function AuthCard({
  title,
  description,
  footerText,
  footerLinkLabel,
  footerHref,
  children,
}: AuthCardProps) {
  return (
    <section aria-labelledby="auth-title" className="grid gap-6">
      <div className="grid gap-1.5">
        <h1 id="auth-title" className="font-serif text-title text-fg">
          {title}
        </h1>
        <p className="text-body text-fg-muted">{description}</p>
      </div>
      <div className="rounded-lg border border-line bg-surface px-5 py-5 sm:px-6">{children}</div>
      <p className="text-body text-fg-muted">
        {footerText}{" "}
        <Link
          href={footerHref}
          className="rounded-xs font-medium text-primary-ink underline decoration-1 underline-offset-4 hover:decoration-2"
        >
          {footerLinkLabel}
        </Link>
      </p>
    </section>
  );
}
