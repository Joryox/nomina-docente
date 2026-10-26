import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { SiteHeader } from "@/components/layout/site-header";
import { MAIN_CONTENT_ID } from "@/components/layout/skip-link";
import { getServerEnv } from "@/config/server-env";
import { DESIGN_GUIDE } from "@/constants/design-guide";
import { DesignGuide } from "@/features/design-system/components/design-guide";

export const metadata: Metadata = {
  title: DESIGN_GUIDE.title,
  robots: { index: false, follow: false },
};

/** Guía viva del sistema de diseño. Solo en desarrollo (DESIGN_GUIDE_ENABLED); si no, 404. */
export default function DesignSystemPage() {
  if (!getServerEnv().designGuideEnabled) {
    notFound();
  }
  return (
    <>
      <SiteHeader />
      <main
        id={MAIN_CONTENT_ID}
        tabIndex={-1}
        className="mx-auto w-full max-w-content px-(--page-gutter) py-(--page-block) outline-none"
      >
        <DesignGuide />
      </main>
    </>
  );
}
