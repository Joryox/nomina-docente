from fastapi import APIRouter

from app.api.v1.dependencies import CatalogServiceDep, CurrentTeacher, Pagination
from app.api.v1.openapi import business_responses
from app.schemas.catalogs import BusinessRulesResponse, CareerPage, HourlyRatePage

router = APIRouter(prefix="/catalogs", tags=["catálogos"])


@router.get(
    "/careers",
    summary="Listar carreras activas",
    description="Carreras del catálogo institucional para el selector, ordenadas por nombre. "
    "Las inactivas no aparecen (RN-07). Se identifican por su clave (`code`).",
    responses=business_responses(),
)
def list_careers(_: CurrentTeacher, service: CatalogServiceDep, page: Pagination) -> CareerPage:
    return service.list_careers(page)


@router.get(
    "/hourly-rates",
    summary="Listar tarifas vigentes",
    description="Tarifas por hora del catálogo para el selector, de menor a mayor (RN-10, "
    "RN-11). El importe viaja como cadena decimal y es la llave con la que se elige.",
    responses=business_responses(),
)
def list_hourly_rates(
    _: CurrentTeacher, service: CatalogServiceDep, page: Pagination
) -> HourlyRatePage:
    return service.list_rates(page)


@router.get(
    "/business-rules",
    summary="Consultar reglas configurables",
    description="Límites que aplica el servidor (duración de clases, antigüedad de la "
    "bitácora, regla de emisión) y la fecha de hoy en la zona de la institución, para que el "
    "frontend valide antes de enviar sin duplicar valores.",
    responses=business_responses(),
)
def get_business_rules(_: CurrentTeacher, service: CatalogServiceDep) -> BusinessRulesResponse:
    return service.business_rules()
