import type { Metadata } from "next";

import { SCREENS } from "@/constants/screens";
import { LogbookPage } from "@/features/logbook/components/logbook-page";

export const metadata: Metadata = { title: SCREENS.logbook.title };

export default function LogbookRoute() {
  return <LogbookPage />;
}
