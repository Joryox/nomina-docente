import type { ReactNode } from "react";

import { PageTransition } from "@/components/ui/motion";

/** Se vuelve a montar en cada navegación: anima la entrada de cada página. */
export default function Template({ children }: { children: ReactNode }) {
  return <PageTransition>{children}</PageTransition>;
}
