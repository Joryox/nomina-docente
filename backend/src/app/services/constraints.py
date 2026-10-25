"""Traducción de las restricciones de la base a errores de dominio.

Los servicios validan antes de escribir para dar un mensaje con detalle; la base es la
última línea de defensa (por ejemplo, ante dos peticiones simultáneas que pasan la
validación previa). Si la base rechaza la escritura, el docente recibe el mismo código de
error que habría recibido del servicio, nunca un 500.
"""

from collections.abc import Mapping

from app.core.codes import ErrorCode
from app.core.exceptions import domain_error
from app.repositories.errors import ConstraintViolationError

CONSTRAINT_ERRORS: Mapping[str, ErrorCode] = {
    "uq_subjects_teacher_id_name_normalized": ErrorCode.SUBJECT_ALREADY_EXISTS,
    "fk_assignments_subject_id_teacher_id_subjects": ErrorCode.SUBJECT_HAS_ACTIVE_ASSIGNMENTS,
    "uq_assignments_active_teacher_subject_career": ErrorCode.ASSIGNMENT_ALREADY_EXISTS,
    "fk_logbook_entries_assignment_id_teacher_id_assignments": ErrorCode.ASSIGNMENT_HAS_LOGBOOK,
    "fk_payroll_receipt_lines_assignment_id_teacher_id_assignments": (
        ErrorCode.ASSIGNMENT_HAS_LOGBOOK
    ),
    "ex_schedules_no_overlap": ErrorCode.SCHEDULE_OVERLAP,
    "ex_logbook_entries_no_overlap": ErrorCode.SESSION_OVERLAP,
    "trg_logbook_entries_period_locked": ErrorCode.PERIOD_LOCKED,
    "uq_payroll_receipts_teacher_id_year_month_fortnight": ErrorCode.RECEIPT_ALREADY_ISSUED,
}


def translate_constraint(error: ConstraintViolationError) -> Exception:
    """Error de dominio de la restricción, o el error original si no es una regla conocida
    (entonces es un defecto del sistema y debe verse como 500 en el registro)."""
    code = CONSTRAINT_ERRORS.get(error.constraint or "")
    return error if code is None else domain_error(code)
