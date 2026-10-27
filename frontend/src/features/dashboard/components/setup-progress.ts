import type { SetupProgress } from "../types/dashboard";

/**
 * El docente necesita la guía mientras no tenga materias, asignaciones u horarios y aún no
 * registre clases. Quien ya tiene bitácora ve el panel aunque haya desactivado todo.
 */
export function needsSetup(setup: SetupProgress): boolean {
  return (
    setup.session_count === 0 &&
    (setup.subject_count === 0 || setup.active_assignment_count === 0 || setup.schedule_count === 0)
  );
}
