import { AuthenticatedShell } from "@/features/auth/components/authenticated-shell";

export default function PanelLayout({ children }: LayoutProps<"/panel">) {
  return <AuthenticatedShell>{children}</AuthenticatedShell>;
}
