import { SystemStatusPanel } from "@/features/system-status/components/system-status-panel";

export default function HomePage() {
  return (
    <div className="mx-auto w-full max-w-3xl px-6 py-10">
      <SystemStatusPanel />
    </div>
  );
}
