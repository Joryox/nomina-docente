"use client";

import { Button } from "@/components/ui/button";
import { TEXTS } from "@/constants/texts";
import { toUserMessage } from "@/lib/api-error";
import { cn } from "@/lib/utils";
import { formatTime } from "@/lib/formatters";

import { useHealth } from "../hooks/use-health";

type Tone = "success" | "warning" | "destructive" | "muted";

const TONE_CLASSES: Record<Tone, string> = {
  success: "bg-success",
  warning: "bg-warning",
  destructive: "bg-destructive",
  muted: "bg-muted-foreground",
};

const texts = TEXTS.systemStatus;

function StatusRow({ label, value, tone }: { label: string; value: string; tone?: Tone }) {
  return (
    <div className="flex items-center justify-between gap-4 py-3">
      <dt className="text-sm text-muted-foreground">{label}</dt>
      <dd className="flex items-center gap-2 text-sm font-medium text-foreground">
        {tone ? (
          <span aria-hidden="true" className={cn("size-2 rounded-full", TONE_CLASSES[tone])} />
        ) : null}
        {value}
      </dd>
    </div>
  );
}

export function SystemStatusPanel() {
  const { data, error, isPending, isFetching, refetch, dataUpdatedAt, errorUpdatedAt } =
    useHealth();
  const checkedAt = Math.max(dataUpdatedAt, errorUpdatedAt);

  return (
    <section aria-labelledby="system-status-title" className="rounded-lg border bg-card">
      <div className="border-b px-6 py-5">
        <h1 id="system-status-title" className="text-xl font-semibold text-foreground">
          {texts.title}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">{texts.description}</p>
      </div>

      <div className="px-6" aria-live="polite" aria-busy={isFetching}>
        {isPending ? (
          <p className="py-6 text-sm text-muted-foreground">{texts.checking}</p>
        ) : error ? (
          <dl className="divide-y">
            <StatusRow
              label={texts.labels.api}
              value={texts.status.unreachable}
              tone="destructive"
            />
            <p role="alert" className="py-4 text-sm text-destructive">
              {toUserMessage(error)}
            </p>
          </dl>
        ) : (
          <dl className="divide-y">
            <StatusRow
              label={texts.labels.api}
              value={data.status === "ok" ? texts.status.ok : texts.status.degraded}
              tone={data.status === "ok" ? "success" : "warning"}
            />
            <StatusRow
              label={texts.labels.database}
              value={data.database === "ok" ? texts.status.ok : texts.status.unavailable}
              tone={data.database === "ok" ? "success" : "destructive"}
            />
            <StatusRow label={texts.labels.version} value={data.version} />
            <StatusRow
              label={texts.labels.environment}
              value={texts.environments[data.environment]}
            />
          </dl>
        )}
      </div>

      <div className="flex items-center justify-between gap-4 border-t px-6 py-4">
        <p className="text-xs text-muted-foreground">
          {checkedAt > 0 ? `${texts.lastChecked}: ${formatTime(new Date(checkedAt))}` : null}
        </p>
        <Button variant="outline" onClick={() => void refetch()} disabled={isFetching}>
          {isFetching ? texts.checking : texts.refresh}
        </Button>
      </div>
    </section>
  );
}
