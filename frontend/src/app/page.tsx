import { SiteHeader } from "@/components/layout/site-header";
import { MAIN_CONTENT_ID } from "@/components/layout/skip-link";
import { SystemStatusPanel } from "@/features/system-status/components/system-status-panel";

export default function HomePage() {
  return (
    <>
      <SiteHeader />
      <main
        id={MAIN_CONTENT_ID}
        tabIndex={-1}
        className="mx-auto w-full max-w-form px-(--page-gutter) py-(--page-block) outline-none"
      >
        <SystemStatusPanel />
      </main>
    </>
  );
}
