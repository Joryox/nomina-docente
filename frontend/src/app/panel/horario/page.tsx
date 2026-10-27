import type { Metadata } from "next";

import { SCREENS } from "@/constants/screens";
import { WeeklySchedulePage } from "@/features/schedules/components/weekly-schedule-page";

export const metadata: Metadata = { title: SCREENS.schedule.title };

export default function ScheduleRoute() {
  return <WeeklySchedulePage />;
}
