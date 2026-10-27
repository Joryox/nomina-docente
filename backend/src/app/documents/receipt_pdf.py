"""Recibo de nómina en PDF (RN-27), con el mismo diseño que el detalle en pantalla.

Se genera con fpdf2, que es Python puro: funciona igual en Windows y en Linux sin
bibliotecas del sistema. Las fuentes (Public Sans y Source Serif 4, licencia SIL OFL) viajan
con el código en ``fonts/``, así que el documento se ve igual en cualquier equipo.

El documento solo **presenta** el recibo emitido (``ReceiptDetailResponse``): los importes ya
vienen calculados y congelados; aquí no se calcula nada.
"""

from dataclasses import dataclass
from datetime import datetime
from decimal import Decimal
from pathlib import Path
from zoneinfo import ZoneInfo

from fpdf import FPDF
from fpdf.enums import XPos, YPos
from fpdf.fonts import FontFace

from app.core.constants import (
    RECEIPT_PDF_BRAND_RGB,
    RECEIPT_PDF_FORMAT,
    RECEIPT_PDF_INK_RGB,
    RECEIPT_PDF_LINE_RGB,
    RECEIPT_PDF_MARGIN_MM,
    RECEIPT_PDF_MUTED_RGB,
    RECEIPT_PDF_SUNKEN_RGB,
    TIMEZONE,
)
from app.domain.periods import Period, long_date
from app.schemas.payroll import ReceiptDetailResponse

FONTS_DIR = Path(__file__).parent / "fonts"
SANS = "PublicSans"
SERIF = "SourceSerif"
_FONT_FILES = {
    (SANS, ""): "PublicSans-Regular.ttf",
    (SANS, "B"): "PublicSans-SemiBold.ttf",
    (SERIF, "B"): "SourceSerif4-Semibold.ttf",
}

# Textos del documento (es-MX).
TITLE = "Recibo de Nómina"
LABEL_FOLIO = "Folio"
LABEL_PERIOD = "Periodo"
LABEL_ISSUED = "Fecha de emisión"
LABEL_TEACHER = "Docente"
LABEL_EMPLOYEE = "Número de empleado"
NOT_CAPTURED = "Sin número"
SECTION_CONCEPTS = "Conceptos"
COLUMNS = ("Materia", "Carrera", "Horas", "Tarifa por hora (MXN)", "Importe (MXN)")
LABEL_TOTAL_HOURS = "Total de horas"
LABEL_TOTAL = "Total bruto"
LABEL_WORDS = "Importe con letra"
GROSS_NOTE = (
    "Importe bruto calculado con la bitácora de clases del periodo. No incluye deducciones "
    "(ISR, IMSS u otras)."
)
SIGN_TEACHER = "Nombre y firma del docente"
SIGN_AUTHORIZES = "Nombre y firma de quien autoriza"
FOOTER = "Documento generado por el Sistema de Nómina Docente · Folio {folio} · Página {page}"

# Medidas en milímetros.
_BAND_HEIGHT = 3.0
_SEAL_WIDTH = 24.0
_SEAL_HEIGHT = 12.0
_COLUMN_WIDTHS = (33, 33, 10, 12, 12)
_SIGNATURE_GAP = 16.0
_SIGNATURE_SPACE = 22.0


@dataclass(frozen=True)
class ReceiptFile:
    filename: str
    content: bytes


def format_money(amount: Decimal) -> str:
    """``$1,250.00 MXN`` (CLAUDE.md §7.4)."""
    return f"${amount:,.2f} MXN"


def format_amount(amount: Decimal) -> str:
    """``$1,250.00``: en la tabla la moneda va en el encabezado de la columna."""
    return f"${amount:,.2f}"


def format_hours(hours: Decimal) -> str:
    return f"{hours:.2f} h"


def issued_label(issued_at: datetime) -> str:
    local = issued_at.astimezone(ZoneInfo(TIMEZONE))
    return f"{long_date(local.date())}, {local:%H:%M}"


def receipt_filename(receipt: ReceiptDetailResponse) -> str:
    """``recibo-NOM-202610-Q1-000042-2026-10-q1.pdf``: folio y periodo, sin espacios."""
    period = receipt.period
    return f"recibo-{receipt.folio}-{period.year}-{period.month:02d}-q{period.fortnight}.pdf"


class _ReceiptDocument(FPDF):
    def __init__(self, folio: str) -> None:
        super().__init__(format=RECEIPT_PDF_FORMAT, unit="mm")
        self._folio = folio
        for (family, style), filename in _FONT_FILES.items():
            self.add_font(family, style, str(FONTS_DIR / filename))
        self.set_margins(RECEIPT_PDF_MARGIN_MM, RECEIPT_PDF_MARGIN_MM)
        self.set_auto_page_break(auto=True, margin=RECEIPT_PDF_MARGIN_MM)
        self.set_text_color(*RECEIPT_PDF_INK_RGB)
        self.set_draw_color(*RECEIPT_PDF_LINE_RGB)

    def header(self) -> None:
        # Franja superior en color primario, como el membrete de un oficio.
        self.set_fill_color(*RECEIPT_PDF_BRAND_RGB)
        self.rect(0, 0, self.w, _BAND_HEIGHT, style="F")

    def footer(self) -> None:
        self.set_y(-RECEIPT_PDF_MARGIN_MM + 6)
        self.set_font(SANS, "", 7.5)
        self.set_text_color(*RECEIPT_PDF_MUTED_RGB)
        self.cell(0, 4, FOOTER.format(folio=self._folio, page=self.page_no()), align="C")
        self.set_text_color(*RECEIPT_PDF_INK_RGB)


def render_receipt_pdf(receipt: ReceiptDetailResponse) -> bytes:
    pdf = _ReceiptDocument(receipt.folio)
    pdf.set_title(f"{TITLE} {receipt.folio}")
    pdf.set_author(receipt.institution.name)
    pdf.set_creation_date(receipt.issued_at)
    pdf.add_page()
    _letterhead(pdf, receipt)
    _details(pdf, receipt)
    _concepts(pdf, receipt)
    _totals(pdf, receipt)
    _signatures(pdf, receipt)
    return bytes(pdf.output())


def _letterhead(pdf: FPDF, receipt: ReceiptDetailResponse) -> None:
    top = pdf.get_y()
    left = pdf.l_margin
    # Logotipo tipográfico (siglas en un marco, como un sello) mientras no hay logo oficial.
    pdf.set_draw_color(*RECEIPT_PDF_BRAND_RGB)
    pdf.set_line_width(0.6)
    pdf.rect(left, top, _SEAL_WIDTH, _SEAL_HEIGHT)
    pdf.set_font(SERIF, "B", 13)
    pdf.set_text_color(*RECEIPT_PDF_BRAND_RGB)
    pdf.set_xy(left, top)
    pdf.cell(_SEAL_WIDTH, _SEAL_HEIGHT, receipt.institution.short_name, align="C")

    text_left = left + _SEAL_WIDTH + 5
    title_width = 62.0
    name_width = pdf.epw - _SEAL_WIDTH - 5 - title_width
    pdf.set_xy(text_left, top)
    pdf.set_font(SERIF, "B", 12)
    pdf.set_text_color(*RECEIPT_PDF_INK_RGB)
    pdf.multi_cell(name_width, 5.2, receipt.institution.name, align="L")
    pdf.set_x(text_left)
    pdf.set_font(SANS, "", 8.5)
    pdf.set_text_color(*RECEIPT_PDF_MUTED_RGB)
    pdf.cell(name_width, 5, "Sistema de Nómina Docente")
    name_bottom = pdf.get_y() + 5

    pdf.set_xy(pdf.w - pdf.r_margin - title_width, top)
    pdf.set_font(SERIF, "B", 17)
    pdf.set_text_color(*RECEIPT_PDF_INK_RGB)
    pdf.cell(title_width, 8, TITLE, align="R", new_x=XPos.LEFT, new_y=YPos.NEXT)
    pdf.set_font(SANS, "", 8)
    pdf.set_text_color(*RECEIPT_PDF_MUTED_RGB)
    pdf.cell(title_width, 4.5, LABEL_FOLIO.upper(), align="R", new_x=XPos.LEFT, new_y=YPos.NEXT)
    pdf.set_font("Courier", "B", 11)
    pdf.set_text_color(*RECEIPT_PDF_INK_RGB)
    pdf.cell(title_width, 5.5, receipt.folio, align="R")

    pdf.set_y(max(name_bottom, top + 20) + 4)
    pdf.set_draw_color(*RECEIPT_PDF_BRAND_RGB)
    pdf.set_line_width(0.5)
    pdf.line(left, pdf.get_y(), pdf.w - pdf.r_margin, pdf.get_y())
    pdf.set_draw_color(*RECEIPT_PDF_LINE_RGB)
    pdf.set_line_width(0.2)
    pdf.ln(6)


def _details(pdf: FPDF, receipt: ReceiptDetailResponse) -> None:
    period = Period(receipt.period.year, receipt.period.month, receipt.period.fortnight)
    rows = (
        (LABEL_PERIOD, f"{period.label()} ({period.range_label()})"),
        (LABEL_ISSUED, issued_label(receipt.issued_at)),
        (LABEL_TEACHER, receipt.teacher.full_name),
        (LABEL_EMPLOYEE, receipt.teacher.employee_number or NOT_CAPTURED),
    )
    label_width = 42.0
    for label, value in rows:
        pdf.set_font(SANS, "", 8.5)
        pdf.set_text_color(*RECEIPT_PDF_MUTED_RGB)
        pdf.cell(label_width, 6, label.upper())
        pdf.set_font(SANS, "B", 10)
        pdf.set_text_color(*RECEIPT_PDF_INK_RGB)
        pdf.multi_cell(0, 6, value, align="L", new_x=XPos.LMARGIN, new_y=YPos.NEXT)
    pdf.ln(6)


def _section_title(pdf: FPDF, text: str) -> None:
    pdf.set_font(SANS, "B", 8.5)
    pdf.set_text_color(*RECEIPT_PDF_MUTED_RGB)
    pdf.cell(0, 6, text.upper(), new_x=XPos.LMARGIN, new_y=YPos.NEXT)
    pdf.set_text_color(*RECEIPT_PDF_INK_RGB)


def _concepts(pdf: FPDF, receipt: ReceiptDetailResponse) -> None:
    _section_title(pdf, SECTION_CONCEPTS)
    pdf.set_font(SANS, "", 9)
    heading = FontFace(
        family=SANS, emphasis="BOLD", color=RECEIPT_PDF_INK_RGB, fill_color=RECEIPT_PDF_SUNKEN_RGB
    )
    with pdf.table(
        col_widths=_COLUMN_WIDTHS,
        text_align=("LEFT", "LEFT", "RIGHT", "RIGHT", "RIGHT"),
        headings_style=heading,
        line_height=5.5,
        padding=(2, 2),
        borders_layout="HORIZONTAL_LINES",
    ) as table:
        table.row(COLUMNS)
        for line in receipt.lines:
            table.row(
                (
                    line.subject_name,
                    line.career_name,
                    format_hours(line.hours),
                    format_amount(line.hourly_rate),
                    format_amount(line.amount),
                )
            )
    pdf.ln(4)


def _totals(pdf: FPDF, receipt: ReceiptDetailResponse) -> None:
    box_width = 84.0
    left = pdf.w - pdf.r_margin - box_width
    for label, value, emphasis in (
        (LABEL_TOTAL_HOURS, format_hours(receipt.total_hours), False),
        (LABEL_TOTAL, format_money(receipt.total_amount), True),
    ):
        pdf.set_x(left)
        pdf.set_font(SANS, "B" if emphasis else "", 10.5 if emphasis else 9.5)
        pdf.cell(box_width / 2, 7, label)
        pdf.cell(box_width / 2, 7, value, align="R", new_x=XPos.LMARGIN, new_y=YPos.NEXT)
    pdf.set_draw_color(*RECEIPT_PDF_BRAND_RGB)
    pdf.line(left, pdf.get_y(), pdf.w - pdf.r_margin, pdf.get_y())
    pdf.set_draw_color(*RECEIPT_PDF_LINE_RGB)
    pdf.ln(5)

    pdf.set_fill_color(*RECEIPT_PDF_SUNKEN_RGB)
    pdf.set_font(SANS, "", 8)
    pdf.set_text_color(*RECEIPT_PDF_MUTED_RGB)
    pdf.cell(0, 6, f"  {LABEL_WORDS.upper()}", fill=True, new_x=XPos.LMARGIN, new_y=YPos.NEXT)
    pdf.set_font(SANS, "B", 10)
    pdf.set_text_color(*RECEIPT_PDF_INK_RGB)
    pdf.multi_cell(
        0, 6, f" {receipt.total_amount_words}", fill=True, new_x=XPos.LMARGIN, new_y=YPos.NEXT
    )
    pdf.ln(3)
    pdf.set_font(SANS, "", 8)
    pdf.set_text_color(*RECEIPT_PDF_MUTED_RGB)
    pdf.multi_cell(0, 4.5, GROSS_NOTE, align="L", new_x=XPos.LMARGIN, new_y=YPos.NEXT)
    pdf.set_text_color(*RECEIPT_PDF_INK_RGB)


def _signatures(pdf: FPDF, receipt: ReceiptDetailResponse) -> None:
    needed = _SIGNATURE_SPACE + 16
    if pdf.get_y() + needed > pdf.h - pdf.b_margin:
        pdf.add_page()
    pdf.set_y(max(pdf.get_y() + _SIGNATURE_SPACE, pdf.h - pdf.b_margin - 30))
    width = (pdf.epw - _SIGNATURE_GAP) / 2
    y = pdf.get_y()
    for index, (name, caption) in enumerate(
        ((receipt.teacher.full_name, SIGN_TEACHER), ("", SIGN_AUTHORIZES))
    ):
        x = pdf.l_margin + index * (width + _SIGNATURE_GAP)
        pdf.set_draw_color(*RECEIPT_PDF_INK_RGB)
        pdf.line(x, y, x + width, y)
        pdf.set_xy(x, y + 1.5)
        pdf.set_font(SANS, "B", 9)
        pdf.cell(width, 5, name, align="C", new_x=XPos.LEFT, new_y=YPos.NEXT)
        pdf.set_font(SANS, "", 8)
        pdf.set_text_color(*RECEIPT_PDF_MUTED_RGB)
        pdf.cell(width, 4.5, caption, align="C")
        pdf.set_text_color(*RECEIPT_PDF_INK_RGB)
