/**
 * Claves de TanStack Query de todo el sistema, en un solo lugar. Cada recurso tiene una
 * raíz (`all`) para invalidarlo completo; las demás claves cuelgan de ella.
 */
export const queryKeys = {
  auth: {
    all: ["auth"] as const,
    me: ["auth", "me"] as const,
    passwordPolicy: ["auth", "password-policy"] as const,
  },
  catalogs: {
    all: ["catalogs"] as const,
    careers: ["catalogs", "careers"] as const,
    hourlyRates: ["catalogs", "hourly-rates"] as const,
    businessRules: ["catalogs", "business-rules"] as const,
  },
  subjects: {
    all: ["subjects"] as const,
    list: (params: object) => ["subjects", "list", params] as const,
    detail: (id: string) => ["subjects", "detail", id] as const,
  },
  assignments: {
    all: ["assignments"] as const,
    list: (params: object) => ["assignments", "list", params] as const,
    detail: (id: string) => ["assignments", "detail", id] as const,
  },
  schedules: {
    all: ["schedules"] as const,
    weekly: ["schedules", "weekly"] as const,
    byAssignment: (assignmentId: string) => ["schedules", "assignment", assignmentId] as const,
  },
  logbook: {
    all: ["logbook"] as const,
    list: (params: object) => ["logbook", "list", params] as const,
    detail: (id: string) => ["logbook", "detail", id] as const,
    scheduled: (date: string) => ["logbook", "scheduled", date] as const,
  },
  payroll: {
    all: ["payroll"] as const,
    periods: (year: number) => ["payroll", "periods", year] as const,
    preview: (period: object) => ["payroll", "preview", period] as const,
    receipts: (params: object) => ["payroll", "receipts", params] as const,
    receipt: (id: string) => ["payroll", "receipt", id] as const,
  },
  dashboard: {
    all: ["dashboard"] as const,
    summary: ["dashboard", "summary"] as const,
  },
} as const;
