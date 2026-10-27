import type { Metadata } from "next";

import { TEXTS } from "@/constants/texts";
import { DashboardHome } from "@/features/dashboard/components/dashboard-home";

export const metadata: Metadata = { title: TEXTS.dashboard.title };

export default function PanelPage() {
  return <DashboardHome />;
}
