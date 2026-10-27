import { Suspense } from "react";

import { AuthenticatedShell } from "@/features/auth/components/authenticated-shell";

export default function PanelLayout({ children }: LayoutProps<"/panel">) {
  return (
    // El panel lee la ruta actual (migas, menú); en rutas dinámicas como un recibo, Next.js
    // exige un límite de Suspense alrededor de quien la lee.
    <Suspense>
      <AuthenticatedShell>{children}</AuthenticatedShell>
    </Suspense>
  );
}
