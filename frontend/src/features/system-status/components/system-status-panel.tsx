"use client";

import { RefreshCw } from "lucide-react";

import { Alert } from "@/components/ui/alert";
import { Badge, type BadgeTone } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { TEXTS } from "@/constants/texts";
import { toUserMessage } from "@/lib/api-error";
import { formatTime } from "@/lib/formatters";

import { useHealth } from "../hooks/use-health";

const texts = TEXTS.systemStatus;

function StatusRow({ label, value, tone }: { label: string; value: string; tone?: BadgeTone }) {
  return (
    <div className="flex items-center justify-between gap-4 py-3">
      <dt className="text-body text-fg-muted">{label}</dt>
      <dd className="text-body font-medium text-fg">
        {tone ? <Badge tone={tone}>{value}</Badge> : value}
      </dd>
    </div>
  );
}

export function SystemStatusPanel() {
  const { data, error, isPending, isFetching, refetch, dataUpdatedAt, errorUpdatedAt } =
    useHealth();
  const checkedAt = Math.max(dataUpdatedAt, errorUpdatedAt);

  return (
    <Card aria-labelledby="system-status-title">
      <CardHeader>
        <div>
          <h1 id="system-status-title" className="font-serif text-title text-fg">
            {texts.title}
          </h1>
          <CardDescription>{texts.description}</CardDescription>
        </div>
      </CardHeader>

      <CardContent className="py-0" aria-live="polite" aria-busy={isFetching}>
        {isPending ? (
          <div className="grid gap-4 py-4">
            <Skeleton className="h-5 w-full" />
            <Skeleton className="h-5 w-full" />
            <p className="sr-only">{texts.checking}</p>
          </div>
        ) : error ? (
          <div className="grid gap-3 py-4">
            <dl>
              <StatusRow label={texts.labels.api} value={texts.status.unreachable} tone="danger" />
            </dl>
            <Alert tone="danger" announce>
              {toUserMessage(error)}
            </Alert>
          </div>
        ) : (
          <dl className="divide-y divide-line">
            <StatusRow
              label={texts.labels.api}
              value={data.status === "ok" ? texts.status.ok : texts.status.degraded}
              tone={data.status === "ok" ? "success" : "warning"}
            />
            <StatusRow
              label={texts.labels.database}
              value={data.database === "ok" ? texts.status.ok : texts.status.unavailable}
              tone={data.database === "ok" ? "success" : "danger"}
            />
            <StatusRow label={texts.labels.version} value={data.version} />
            <StatusRow
              label={texts.labels.environment}
              value={texts.environments[data.environment]}
            />
          </dl>
        )}
      </CardContent>

      <CardFooter className="justify-between">
        <p className="text-small text-fg-muted figures">
          {checkedAt > 0 ? `${texts.lastChecked}: ${formatTime(new Date(checkedAt))}` : null}
        </p>
        <Button variant="outline" size="sm" onClick={() => void refetch()} loading={isFetching}>
          <RefreshCw aria-hidden="true" />
          {texts.refresh}
        </Button>
      </CardFooter>
    </Card>
  );
}
