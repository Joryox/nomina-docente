import type { Metadata } from "next";

import { AppHeader } from "@/components/layout/app-header";
import { AppProviders } from "@/components/layout/app-providers";
import { env } from "@/config/env";
import { LOCALE } from "@/constants/locale";
import { TEXTS } from "@/constants/texts";
import "@/styles/globals.css";

export const metadata: Metadata = {
  title: `${env.appName} · ${env.institutionShortName}`,
  description: TEXTS.metadata.description,
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang={LOCALE} className="h-full">
      <body className="flex min-h-full flex-col">
        <a
          href="#contenido"
          className="sr-only rounded-md bg-primary px-4 py-2 text-primary-foreground focus:not-sr-only focus:absolute focus:top-4 focus:left-4"
        >
          {TEXTS.layout.skipToContent}
        </a>
        <AppProviders>
          <AppHeader />
          <main id="contenido" className="flex-1">
            {children}
          </main>
        </AppProviders>
      </body>
    </html>
  );
}
