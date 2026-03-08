import re


def clean_text(text: str) -> str:
    """
    Clean extracted PDF text for downstream sentence analysis.
    """
    if not text:
        return ""

    text = text.replace("\n", " ")
    text = re.sub(r"\s+", " ", text).strip()

    # Remove repeated page markers like "3 / 53"
    text = re.sub(r"\b\d+\s*/\s*\d+\b", " ", text)

    return text


def split_into_sentences(text: str):
    """
    Simple but improved sentence splitter for PDF text.
    """
    if not text:
        return []

    # Split on punctuation followed by whitespace and a likely sentence start
    sentences = re.split(r'(?<=[.!?])\s+(?=[A-Z0-9"])', text)

    cleaned_sentences = []
    for sentence in sentences:
        sentence = sentence.strip()

        # Skip tiny fragments
        if len(sentence) < 25:
            continue

        # Skip table-of-contents like fragments with too many short tokens
        words = sentence.split()
        if len(words) < 4:
            continue

        cleaned_sentences.append(sentence)

    return cleaned_sentences