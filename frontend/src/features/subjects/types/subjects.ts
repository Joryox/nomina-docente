import type { z } from "zod";

import type { PageParams } from "@/lib/api-schemas";
import type { StatusFilter } from "@/lib/api-types";

import type {
  subjectFormSchema,
  subjectPageSchema,
  subjectRemovalSchema,
  subjectSchema,
} from "../schemas/subjects";

export type Subject = z.infer<typeof subjectSchema>;
export type SubjectPage = z.infer<typeof subjectPageSchema>;
export type SubjectRemoval = z.infer<typeof subjectRemovalSchema>;
export type SubjectFormValues = z.input<typeof subjectFormSchema>;
export type SubjectPayload = z.output<typeof subjectFormSchema>;
/** Cuerpo de PATCH: solo los campos que cambian; `code: null` borra la clave. */
export type SubjectChanges = Partial<SubjectPayload>;

export interface SubjectListParams extends PageParams {
  search?: string;
  status?: StatusFilter;
}
