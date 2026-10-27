import type { Metadata } from "next";

import { TEXTS } from "@/constants/texts";
import { ProfilePage } from "@/features/auth/components/profile-page";

export const metadata: Metadata = { title: TEXTS.profile.title };

export default function ProfileRoute() {
  return <ProfilePage />;
}
