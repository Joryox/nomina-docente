"""Columnas comunes a varias tablas, declaradas una sola vez.

``sort_order`` mantiene un orden de columnas predecible en la base: identificadores al
principio y marcas de tiempo al final.
"""

import uuid
from datetime import datetime

from sqlalchemy import BigInteger, DateTime, FetchedValue, Identity, Uuid, func
from sqlalchemy.orm import Mapped, mapped_column

_FIRST = -10
_LAST = 10


class IdentityPkMixin:
    """Llave primaria ``bigint`` generada siempre por la base (no se puede escribir a mano)."""

    id: Mapped[int] = mapped_column(
        BigInteger, Identity(always=True), primary_key=True, sort_order=_FIRST
    )


class PublicIdMixin:
    """Identificador opaco que la API expone en lugar del ``id`` secuencial."""

    public_id: Mapped[uuid.UUID] = mapped_column(
        Uuid, server_default=func.gen_random_uuid(), unique=True, sort_order=_FIRST + 1
    )


class CreatedAtMixin:
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), sort_order=_LAST
    )


class TimestampMixin(CreatedAtMixin):
    """``updated_at`` lo mantiene el trigger ``trg_<tabla>_set_updated_at`` de la base, así
    que también se actualiza con SQL escrito a mano o con cargas masivas."""

    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        server_onupdate=FetchedValue(),
        sort_order=_LAST + 1,
    )
