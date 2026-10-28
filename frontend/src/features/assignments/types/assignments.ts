import type { z } from "zod";

import type { PageParams } from "@/lib/api-schemas";
import type { StatusFilter } from "@/lib/api-types";

import type {
  assignmentFormSchema,
  assignmentPageSchema,
  assignmentSchema,
} from "../schemas/assignments";

export type Assignment = z.infer<typeof assignmentSchema>;
export type AssignmentPage = z.infer<typeof assignmentPageSchema>;
export type AssignmentFormValues = z.input<typeof assignmentFormSchema>;
export type AssignmentPayload = z.output<typeof assignmentFormSchema>;
/** Tarifa y grupo se cambian siempre; la materia o la carrera, solo sin bitácora. */
export type AssignmentChanges = Partial<AssignmentPayload>;

export interface AssignmentListParams extends PageParams {
  status?: StatusFilter;
  subject_id?: string;
  career_code?: string;
}
