import { AuthLayout } from "@/components/layout/auth-layout";

export default function AccessLayout({ children }: LayoutProps<"/">) {
  return <AuthLayout>{children}</AuthLayout>;
}
