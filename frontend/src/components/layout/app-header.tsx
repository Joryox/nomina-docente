import Link from "next/link";

import { env } from "@/config/env";
import { APP_ROUTES } from "@/constants/routes";

export function AppHeader() {
  return (
    <header className="border-b bg-card">
      <div className="mx-auto flex max-w-5xl items-center gap-4 px-6 py-4">
        <Link
          href={APP_ROUTES.home}
          className="flex flex-col rounded-sm focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
        >
          <span className="text-xs font-semibold tracking-wider text-primary uppercase">
            {env.institutionShortName}
          </span>
          <span className="text-base font-semibold text-foreground">{env.appName}</span>
        </Link>
        <span className="ml-auto hidden text-sm text-muted-foreground md:block">
          {env.institutionName}
        </span>
      </div>
    </header>
  );
}
