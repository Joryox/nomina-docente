import type { Metadata } from "next";

import { TEXTS } from "@/constants/texts";
import { PanelOverview } from "@/features/auth/components/panel-overview";

export const metadata: Metadata = { title: TEXTS.auth.panel.title };

export default function PanelPage() {
  return <PanelOverview />;
}
