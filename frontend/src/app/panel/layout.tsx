import { SessionExpiryHandler } from "@/features/auth/components/session-expiry-handler";

export default function PanelLayout({ children }: LayoutProps<"/panel">) {
  return (
    <>
      <SessionExpiryHandler />
      {children}
    </>
  );
}
