from sqlalchemy import select

from app.models.teacher import Teacher
from app.repositories.base import BaseRepository


class TeacherRepository(BaseRepository[Teacher]):
    model = Teacher

    def get_by_user_id(self, user_id: int) -> Teacher | None:
        return self._find_one(Teacher.user_id == user_id)

    def get_by_employee_number(self, employee_number: str) -> Teacher | None:
        return self._find_one(Teacher.employee_number == employee_number)

    def lock(self, teacher_id: int) -> None:
        """Serializa las escrituras de bitácora y la emisión de recibos de un docente.

        ``FOR NO KEY UPDATE`` sobre su fila hasta el fin de la transacción: una sesión que se
        registra mientras se emite el recibo de su quincena espera, y después ve el recibo y
        se rechaza (RN-23); dos emisiones simultáneas del mismo periodo se atienden una tras
        otra y la segunda ve el recibo ya emitido (RN-29). No bloquea las lecturas.
        """
        self._session.execute(
            select(Teacher.id).where(Teacher.id == teacher_id).with_for_update(key_share=True)
        )
