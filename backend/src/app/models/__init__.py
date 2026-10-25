"""Modelos ORM. Cada modelo nuevo se importa aquí para que Alembic lo detecte."""

from app.db.base import Base
from app.models.assignment import Assignment
from app.models.career import Career
from app.models.career_type import CareerType
from app.models.hourly_rate import HourlyRate
from app.models.logbook_entry import LogbookEntry
from app.models.payroll_receipt import PayrollReceipt
from app.models.payroll_receipt_line import PayrollReceiptLine
from app.models.role import Role
from app.models.schedule import Schedule
from app.models.subject import Subject
from app.models.teacher import Teacher
from app.models.user import User
from app.models.user_role import UserRole

__all__ = [
    "Assignment",
    "Base",
    "Career",
    "CareerType",
    "HourlyRate",
    "LogbookEntry",
    "PayrollReceipt",
    "PayrollReceiptLine",
    "Role",
    "Schedule",
    "Subject",
    "Teacher",
    "User",
    "UserRole",
]
