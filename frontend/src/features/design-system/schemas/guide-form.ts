import { z } from "zod";

import { VALIDATION_MESSAGES } from "@/constants/error-messages";
import { FIELD_LIMITS } from "@/constants/validation";

/** Formulario de demostración de la guía: mismas reglas de mensajes que los reales. */
export const guideFormSchema = z
  .object({
    subject: z
      .string({ error: VALIDATION_MESSAGES.selectOption })
      .min(1, VALIDATION_MESSAGES.selectOption),
    career: z
      .string({ error: VALIDATION_MESSAGES.selectOption })
      .min(1, VALIDATION_MESSAGES.selectOption),
    rate: z
      .string({ error: VALIDATION_MESSAGES.selectOption })
      .min(1, VALIDATION_MESSAGES.selectOption),
    date: z.string({ error: VALIDATION_MESSAGES.date }).min(1, VALIDATION_MESSAGES.date),
    start_time: z
      .string({ error: VALIDATION_MESSAGES.clockTime })
      .min(1, VALIDATION_MESSAGES.clockTime),
    end_time: z
      .string({ error: VALIDATION_MESSAGES.clockTime })
      .min(1, VALIDATION_MESSAGES.clockTime),
    fortnight: z.enum(["1", "2"]),
    notes: z
      .string()
      .max(FIELD_LIMITS.logbookNotes, VALIDATION_MESSAGES.maxLength(FIELD_LIMITS.logbookNotes)),
    confirm: z.literal(true, { error: VALIDATION_MESSAGES.required }),
  })
  .refine((value) => value.end_time > value.start_time, {
    path: ["end_time"],
    message: VALIDATION_MESSAGES.endAfterStart,
  });

export interface GuideFormValues {
  subject: string | null;
  career: string | null;
  rate: string | null;
  date: string | null;
  start_time: string | null;
  end_time: string | null;
  fortnight: "1" | "2";
  notes: string;
  confirm: boolean;
}
