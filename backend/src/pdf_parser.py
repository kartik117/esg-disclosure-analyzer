import pdfplumber


def extract_text_from_pdf(file_path):
    """
    Extract text page-by-page from a PDF.
    Returns:
        [{"page": 1, "text": "..."}]
    """
    pages = []

    try:
        with pdfplumber.open(file_path) as pdf:
            for i, page in enumerate(pdf.pages):
                text = page.extract_text()
                if text and text.strip():
                    pages.append({
                        "page": i + 1,
                        "text": text
                    })
    except Exception as e:
        raise RuntimeError(f"Unable to read PDF: {e}")

    return pages