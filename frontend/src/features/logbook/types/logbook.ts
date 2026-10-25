import type { z } from "zod";

import type { PageParams } from "@/lib/api-schemas";
import type { Fortnight } from "@/lib/api-types";

import type {
  logbookEntryFormSchema,
  logbookEntryResultSchema,
  logbookEntrySchema,
  logbookPageSchema,
  quickLogbookFormSchema,
  quickLogbookResultSchema,
  scheduledClassesSchema,
} from "../schemas/logbook";

export type LogbookEntry = z.infer<typeof logbookEntrySchema>;
export type LogbookEntryResult = z.infer<typeof logbookEntryResultSchema>;
export type LogbookPage = z.infer<typeof logbookPageSchema>;
export type ScheduledClasses = z.infer<typeof scheduledClassesSchema>;
export type QuickLogbookResult = z.infer<typeof quickLogbookResultSchema>;
export type LogbookEntryFormValues = z.input<ReturnType<typeof logbookEntryFormSchema>>;
export type LogbookEntryPayload = z.output<ReturnType<typeof logbookEntryFormSchema>>;
export type LogbookEntryChanges = Partial<LogbookEntryPayload>;
export type QuickLogbookPayload = z.output<ReturnType<typeof quickLogbookFormSchema>>;

/** Filtros del listado: rango de fechas, asignación y quincena (los tres datos juntos). */
export interface LogbookListParams extends PageParams {
  date_from?: string;
  date_to?: string;
  assignment_id?: string;
  year?: number;
  month?: number;
  fortnight?: Fortnight;
}
