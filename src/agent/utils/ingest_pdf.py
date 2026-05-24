import base64
import os
from io import BytesIO

import pymupdf

from ...core import logger
from ..state import PDFPageData

MAX_PDF_SIZE = 10 * 1024 * 1024  # 10 MB
_PDF_MAGIC = b"%PDF"


def ingest_pdf(pdf_path_or_base64: str) -> list[PDFPageData]:
    """
    Reads PDF from a file path or base64 data URI, extracts text page by page.

    Accepts:
      - A local file path ending in ".pdf"
      - A data URI: "data:application/pdf;base64,<data>"
    """

    try:
        if pdf_path_or_base64.endswith(".pdf"):
            file_size = os.path.getsize(pdf_path_or_base64)
            if file_size > MAX_PDF_SIZE:
                raise ValueError(
                    f"PDF exceeds the {MAX_PDF_SIZE // (1024 * 1024)} MB size limit"
                )
            reader = pymupdf.open(pdf_path_or_base64)
            return _extract_pages(reader)

        elif pdf_path_or_base64.startswith("data:application/pdf;base64,"):
            raw_b64 = pdf_path_or_base64.split(",", 1)[1]
            pdf_bytes = base64.b64decode(raw_b64)

            if len(pdf_bytes) > MAX_PDF_SIZE:
                raise ValueError(
                    f"PDF exceeds the {MAX_PDF_SIZE // (1024 * 1024)} MB size limit"
                )
            if not pdf_bytes.startswith(_PDF_MAGIC):
                raise ValueError("Invalid PDF: file does not begin with PDF magic bytes")

            reader = pymupdf.open(stream=BytesIO(pdf_bytes), filetype="pdf")
            return _extract_pages(reader)

        else:
            raise ValueError(
                "Input must be a PDF file path (.pdf) or a base64 data URI "
                "(data:application/pdf;base64,...)"
            )

    except Exception:
        logger.exception("Failed to ingest PDF content")
        raise


def _extract_pages(reader: pymupdf.Document) -> list[PDFPageData]:
    pages_data: list[PDFPageData] = []
    try:
        for i in range(reader.page_count):
            page = reader.load_page(i)
            raw_text = page.get_text("text")
            if isinstance(raw_text, str) and raw_text.strip():
                pages_data.append({"page_number": i + 1, "content": raw_text})
    finally:
        reader.close()
    return pages_data
