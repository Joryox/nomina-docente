import type { Metadata } from "next";

import { SCREENS } from "@/constants/screens";
import { AssignmentsPage } from "@/features/assignments/components/assignments-page";

export const metadata: Metadata = { title: SCREENS.assignments.title };

export default function AssignmentsRoute() {
  return <AssignmentsPage />;
}
