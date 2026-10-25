from app.models.teacher import Teacher
from app.repositories.base import BaseRepository


class TeacherRepository(BaseRepository[Teacher]):
    model = Teacher

    def get_by_user_id(self, user_id: int) -> Teacher | None:
        return self._find_one(Teacher.user_id == user_id)

    def get_by_employee_number(self, employee_number: str) -> Teacher | None:
        return self._find_one(Teacher.employee_number == employee_number)
