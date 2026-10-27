import type { Metadata } from "next";
import Link from "next/link";

import { StatusScreen } from "@/components/layout/status-screen";
import { Button } from "@/components/ui/button";
import { APP_ROUTES } from "@/constants/routes";
import { TEXTS } from "@/constants/texts";

const texts = TEXTS.errorPages.notFound;

export const metadata: Metadata = { title: texts.title };

export default function NotFound() {
  return (
    <StatusScreen
      code={texts.code}
      title={texts.heading}
      description={texts.body}
      actions={
        <Button asChild>
          <Link href={APP_ROUTES.home}>{texts.action}</Link>
        </Button>
      }
    />
  );
}
