import { LoaderCircle } from "lucide-react";

import { cn } from "@/lib/utils";

/** Indicador de actividad. Decorativo por defecto: quien lo usa anuncia el estado en texto. */
export function Spinner({ className }: { className?: string }) {
  return <LoaderCircle aria-hidden="true" className={cn("size-4 animate-spin", className)} />;
}
