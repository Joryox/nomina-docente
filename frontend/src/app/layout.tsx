import type { Metadata, Viewport } from "next";

import { AppProviders } from "@/components/layout/app-providers";
import { SkipLink } from "@/components/layout/skip-link";
import { BRAND } from "@/config/brand";
import { displayFont, uiFont } from "@/config/fonts";
import { LOCALE } from "@/constants/locale";
import { TEXTS } from "@/constants/texts";
import { PREFERENCES_SCRIPT } from "@/lib/theme/preferences-script";
import { cn } from "@/lib/utils";
import "@/styles/globals.css";

export const metadata: Metadata = {
  title: {
    default: `${BRAND.appName} · ${BRAND.institutionShortName}`,
    template: `%s · ${BRAND.appName} · ${BRAND.institutionShortName}`,
  },
  description: TEXTS.metadata.description,
};

export const viewport: Viewport = {
  colorScheme: "light dark",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    // El script de preferencias cambia data-theme antes de hidratar: la diferencia es esperada.
    <html
      lang={LOCALE}
      suppressHydrationWarning
      className={cn(uiFont.variable, displayFont.variable)}
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: PREFERENCES_SCRIPT }} />
      </head>
      <body className="min-h-dvh">
        <SkipLink />
        <AppProviders>{children}</AppProviders>
      </body>
    </html>
  );
}
