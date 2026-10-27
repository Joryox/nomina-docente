import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { StatCard } from "@/components/ui/stat-card";
import { TEXTS } from "@/constants/texts";

const texts = TEXTS.dashboard;

/** Forma del inicio mientras llega el resumen. */
export function DashboardSkeleton() {
  return (
    <div className="grid gap-(--section-gap)" aria-busy="true">
      <p className="sr-only">{texts.loading}</p>
      <div className="grid gap-4 md:grid-cols-3">
        <StatCard emphasis label={texts.stats.amount} value={null} description=" " loading />
        <StatCard label={texts.stats.hours} value={null} description=" " loading />
        <StatCard label={texts.stats.pending} value={null} description=" " loading />
      </div>
      <div className="grid gap-(--section-gap) xl:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
        {[texts.today.title, texts.receipts.title].map((title) => (
          <Card key={title}>
            <CardHeader>
              <Skeleton className="h-5 w-36" />
            </CardHeader>
            <CardContent className="grid gap-4">
              {[0, 1, 2].map((row) => (
                <div key={row} className="grid gap-1.5">
                  <Skeleton className="h-4 w-1/2" />
                  <Skeleton className="h-4 w-1/3" />
                </div>
              ))}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
