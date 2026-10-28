"""Horarios semanales de las asignaciones (RN-16 a RN-18, RN-42).

Antes de guardar, el servicio busca empalmes con **todas** las clases del docente (de
cualquier asignación) y responde con el día y la clase con la que choca. La restricción de
exclusión de la base garantiza lo mismo ante peticiones simultáneas.

Una captura de varios días (``create_many``) valida todos los horarios antes de escribir y
los guarda en una sola transacción: si uno no es válido, no se guarda ninguno.
"""

import uuid
from itertools import combinations

from app.core.codes import ErrorCode
from app.core.constants import CLOCK_TIME_FORMAT, WEEKDAY_NAMES, Weekday
from app.core.exceptions import domain_error
from app.domain.money import minutes_to_hours
from app.domain.time_ranges import DurationProblem, TimeRange, duration_problem
from app.models.assignment import Assignment
from app.models.schedule import Schedule
from app.models.teacher import Teacher
from app.repositories.assignment import AssignmentRepository
from app.repositories.errors import ConstraintViolationError
from app.repositories.schedule import ScheduleRepository
from app.repositories.unit_of_work import UnitOfWork
from app.schemas.schedules import (
    ScheduleBatchCreate,
    ScheduleCreate,
    ScheduleResponse,
    ScheduleUpdate,
    WeeklyClass,
    WeeklyDay,
    WeeklyScheduleResponse,
)
from app.services.constraints import translate_constraint
from app.services.policy import BusinessPolicy
from app.services.presenters import (
    assignment_summary,
    class_details,
    describe_class,
    schedule_range,
    schedule_response,
)

DayRange = tuple[Weekday, TimeRange]


def ensure_valid_duration(time_range: TimeRange, policy: BusinessPolicy) -> None:
    """RN-17 y duración configurada de una clase; la usan horarios y bitácora."""
    problem = duration_problem(
        time_range, policy.class_min_duration_minutes, policy.class_max_duration_minutes
    )
    if problem is DurationProblem.END_NOT_AFTER_START:
        raise domain_error(
            ErrorCode.TIME_RANGE_INVALID,
            "La hora de salida debe ser posterior a la hora de entrada. Una clase no puede "
            "cruzar la medianoche.",
        )
    if problem is DurationProblem.TOO_SHORT:
        raise domain_error(
            ErrorCode.CLASS_TOO_SHORT,
            f"La clase dura {time_range.minutes} minutos; el mínimo es "
            f"{policy.class_min_duration_minutes}. Revisa la hora de entrada y de salida.",
            details={"min_minutes": policy.class_min_duration_minutes},
        )
    if problem is DurationProblem.TOO_LONG:
        raise domain_error(
            ErrorCode.CLASS_TOO_LONG,
            f"La clase dura {time_range.minutes} minutos; el máximo es "
            f"{policy.class_max_duration_minutes}. Revisa la hora de entrada y de salida.",
            details={"max_minutes": policy.class_max_duration_minutes},
        )


class ScheduleService:
    def __init__(
        self,
        assignments: AssignmentRepository,
        schedules: ScheduleRepository,
        unit_of_work: UnitOfWork,
        policy: BusinessPolicy,
    ) -> None:
        self._assignments = assignments
        self._schedules = schedules
        self._unit_of_work = unit_of_work
        self._policy = policy

    def list_for_assignment(
        self, teacher: Teacher, assignment_id: uuid.UUID
    ) -> list[ScheduleResponse]:
        assignment = self._require_assignment(teacher, assignment_id)
        return [schedule_response(schedule, assignment) for schedule in assignment.schedules]

    def create(
        self, teacher: Teacher, assignment_id: uuid.UUID, data: ScheduleCreate
    ) -> ScheduleResponse:
        assignment = self._require_assignment(teacher, assignment_id)
        if not assignment.is_active:
            raise domain_error(ErrorCode.ASSIGNMENT_INACTIVE)
        time_range = TimeRange(data.start_time, data.end_time)
        self._validate(teacher, data.weekday, time_range)
        schedule = Schedule(
            assignment_id=assignment.id,
            teacher_id=teacher.id,
            weekday=data.weekday,
            start_time=data.start_time,
            end_time=data.end_time,
        )
        try:
            with self._unit_of_work.transaction():
                self._schedules.add(schedule)
        except ConstraintViolationError as error:
            raise translate_constraint(error) from None
        return schedule_response(schedule, assignment)

    def create_many(
        self, teacher: Teacher, assignment_id: uuid.UUID, data: ScheduleBatchCreate
    ) -> list[ScheduleResponse]:
        """RN-42: todos los días y rangos de la captura, o ninguno."""
        assignment = self._require_assignment(teacher, assignment_id)
        if not assignment.is_active:
            raise domain_error(ErrorCode.ASSIGNMENT_INACTIVE)
        for item in data.ranges:
            ensure_valid_duration(TimeRange(item.start_time, item.end_time), self._policy)
        requested = sorted(
            (
                (Weekday(day), TimeRange(item.start_time, item.end_time))
                for item in data.ranges
                for day in item.weekdays
            ),
            key=lambda pair: (pair[0], pair[1].start),
        )
        self._ensure_ranges_apart(requested)
        for weekday, time_range in requested:
            self._ensure_no_overlap(teacher, weekday, time_range, all_or_nothing=True)
        schedules = [
            Schedule(
                assignment_id=assignment.id,
                teacher_id=teacher.id,
                weekday=weekday,
                start_time=time_range.start,
                end_time=time_range.end,
            )
            for weekday, time_range in requested
        ]
        try:
            with self._unit_of_work.transaction():
                for schedule in schedules:
                    self._schedules.add(schedule)
        except ConstraintViolationError as error:
            raise translate_constraint(error) from None
        return [schedule_response(schedule, assignment) for schedule in schedules]

    def update(
        self, teacher: Teacher, schedule_id: uuid.UUID, data: ScheduleUpdate
    ) -> ScheduleResponse:
        schedule = self._require_schedule(teacher, schedule_id)
        weekday = Weekday(data.weekday or schedule.weekday)
        time_range = TimeRange(
            data.start_time or schedule.start_time, data.end_time or schedule.end_time
        )
        self._validate(teacher, weekday, time_range, exclude=schedule)
        try:
            with self._unit_of_work.transaction():
                schedule.weekday = weekday
                schedule.start_time = time_range.start
                schedule.end_time = time_range.end
                self._schedules.flush()
        except ConstraintViolationError as error:
            raise translate_constraint(error) from None
        return schedule_response(schedule, schedule.assignment)

    def delete(self, teacher: Teacher, schedule_id: uuid.UUID) -> None:
        schedule = self._require_schedule(teacher, schedule_id)
        with self._unit_of_work.transaction():
            self._schedules.delete(schedule)

    def weekly(self, teacher: Teacher) -> WeeklyScheduleResponse:
        """Horario de la semana agrupado por día, listo para una vista semanal."""
        by_day: dict[int, list[WeeklyClass]] = {day: [] for day in Weekday}
        for schedule in self._schedules.list_active(teacher.id):
            by_day[schedule.weekday].append(
                WeeklyClass(
                    schedule_id=schedule.public_id,
                    assignment=assignment_summary(schedule.assignment),
                    start_time=schedule.start_time,
                    end_time=schedule.end_time,
                    duration_minutes=schedule_range(schedule).minutes,
                )
            )
        days = [
            WeeklyDay(
                weekday=Weekday(day),
                classes=classes,
                total_minutes=sum(item.duration_minutes for item in classes),
            )
            for day, classes in by_day.items()
        ]
        total = sum(day.total_minutes for day in days)
        return WeeklyScheduleResponse(
            days=days, total_minutes=total, total_hours=minutes_to_hours(total)
        )

    def _validate(
        self,
        teacher: Teacher,
        weekday: Weekday,
        time_range: TimeRange,
        *,
        exclude: Schedule | None = None,
    ) -> None:
        ensure_valid_duration(time_range, self._policy)
        self._ensure_no_overlap(teacher, weekday, time_range, exclude=exclude)

    @staticmethod
    def _ensure_ranges_apart(requested: list[DayRange]) -> None:
        """Dos rangos de la misma captura no pueden cruzarse el mismo día."""
        for (day, first), (other_day, second) in combinations(requested, 2):
            if day == other_day and first.overlaps(second):
                raise domain_error(
                    ErrorCode.SCHEDULE_RANGES_OVERLAP,
                    f"El {WEEKDAY_NAMES[day]}, {first.label()} y {second.label()} se empalman. "
                    "Cambia las horas o quita ese día de uno de los rangos.",
                    details={
                        "weekday": day,
                        "ranges": [
                            {
                                "start_time": item.start.strftime(CLOCK_TIME_FORMAT),
                                "end_time": item.end.strftime(CLOCK_TIME_FORMAT),
                            }
                            for item in (first, second)
                        ],
                    },
                )

    def _ensure_no_overlap(
        self,
        teacher: Teacher,
        weekday: Weekday,
        time_range: TimeRange,
        *,
        exclude: Schedule | None = None,
        all_or_nothing: bool = False,
    ) -> None:
        conflicts = self._schedules.find_overlapping(
            teacher.id,
            weekday,
            time_range.start,
            time_range.end,
            exclude_id=exclude.id if exclude else None,
        )
        if conflicts:
            first = conflicts[0]
            day = WEEKDAY_NAMES[weekday]
            outcome = " No se guardó ningún horario." if all_or_nothing else ""
            raise domain_error(
                ErrorCode.SCHEDULE_OVERLAP,
                f"El {day}, {time_range.label()} se empalma con "
                f"{describe_class(first.assignment)}, de {schedule_range(first).label()}."
                f"{outcome} Elige otra hora de entrada o de salida para ese día.",
                details={
                    "weekday": weekday,
                    "start_time": time_range.start.strftime(CLOCK_TIME_FORMAT),
                    "end_time": time_range.end.strftime(CLOCK_TIME_FORMAT),
                    "all_or_nothing": all_or_nothing,
                    "conflicts": [
                        {
                            "schedule_id": str(conflict.public_id),
                            **class_details(conflict.assignment),
                            "weekday": conflict.weekday,
                            "start_time": conflict.start_time.strftime(CLOCK_TIME_FORMAT),
                            "end_time": conflict.end_time.strftime(CLOCK_TIME_FORMAT),
                        }
                        for conflict in conflicts
                    ],
                },
            )

    def _require_assignment(self, teacher: Teacher, assignment_id: uuid.UUID) -> Assignment:
        assignment = self._assignments.get_for_teacher(teacher.id, assignment_id)
        if assignment is None:
            raise domain_error(ErrorCode.ASSIGNMENT_NOT_FOUND)
        return assignment

    def _require_schedule(self, teacher: Teacher, schedule_id: uuid.UUID) -> Schedule:
        schedule = self._schedules.get_for_teacher(teacher.id, schedule_id)
        if schedule is None:
            raise domain_error(ErrorCode.SCHEDULE_NOT_FOUND)
        return schedule
