"use client";

import Link from "next/link";
import { useEffect } from "react";

import { StatusScreen } from "@/components/layout/status-screen";
import { Button } from "@/components/ui/button";
import { APP_ROUTES } from "@/constants/routes";
import { TEXTS } from "@/constants/texts";

const texts = TEXTS.errorPages.unexpected;

/** Error inesperado al mostrar una página: permite reintentar sin perder la sesión. */
export default function ErrorPage({ error, reset }: { error: Error; reset: () => void }) {
  useEffect(() => {
    console.error(error);
    document.title = texts.title;
  }, [error]);

  return (
    <StatusScreen
      code={texts.code}
      title={texts.heading}
      description={texts.body}
      actions={
        <>
          <Button onClick={reset}>{texts.retry}</Button>
          <Button variant="outline" asChild>
            <Link href={APP_ROUTES.home}>{texts.home}</Link>
          </Button>
        </>
      }
    />
  );
}
