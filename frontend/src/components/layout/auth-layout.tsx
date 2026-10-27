import { Check } from "lucide-react";
import type { ReactNode } from "react";

import { BRAND } from "@/config/brand";
import { TEXTS } from "@/constants/texts";

import { Logo } from "./logo";
import { MAIN_CONTENT_ID } from "./skip-link";
import { ThemeSwitcher } from "./theme-switcher";

const texts = TEXTS.layout;

/**
 * Marco de iniciar sesión y registro. En escritorio, una franja institucional en color
 * primario —como el membrete de un oficio— con el nombre de la institución en la serif de
 * los títulos; en celular, solo el logotipo arriba del formulario.
 */
export function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="grid min-h-dvh lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
      <aside className="hidden flex-col justify-between gap-10 bg-primary px-10 py-10 text-on-primary lg:flex xl:px-14">
        <Logo variant="mark" tone="inverse" />
        <div className="grid max-w-prose gap-6">
          <div className="grid gap-3 border-l-2 border-on-primary pl-5">
            <p className="font-serif text-display">{BRAND.institutionName}</p>
            <p className="text-subtitle font-normal">{BRAND.appName}</p>
          </div>
          <p className="text-body">{texts.authTagline}</p>
          <ul className="grid gap-2 text-body">
            {texts.authAsideFacts.map((fact) => (
              <li key={fact} className="flex items-start gap-2">
                <Check aria-hidden="true" className="mt-1 size-4 shrink-0" />
                {fact}
              </li>
            ))}
          </ul>
        </div>
        <p className="text-small">{BRAND.institutionShortName}</p>
      </aside>

      <div className="flex min-w-0 flex-col">
        <div className="flex items-center justify-between gap-4 border-t-4 border-t-primary px-(--page-gutter) py-3 lg:justify-end lg:border-t-0">
          <Logo variant="compact" className="lg:hidden" />
          <ThemeSwitcher />
        </div>
        <main
          id={MAIN_CONTENT_ID}
          tabIndex={-1}
          className="flex flex-1 justify-center px-(--page-gutter) py-8 outline-none lg:items-center lg:py-12"
        >
          <div className="grid w-full max-w-auth gap-6">
            <p className="border-l-2 border-primary pl-3 text-body text-fg-muted lg:hidden">
              {texts.authTagline}
            </p>
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
