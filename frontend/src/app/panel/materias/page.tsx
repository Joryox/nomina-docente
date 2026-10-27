import type { Metadata } from "next";

import { SCREENS } from "@/constants/screens";
import { SubjectsPage } from "@/features/subjects/components/subjects-page";

export const metadata: Metadata = { title: SCREENS.subjects.title };

export default function SubjectsRoute() {
  return <SubjectsPage />;
}
