import re

VAGUE_PATTERNS = [
    "committed to",
    "aim to",
    "strive to",
    "seek to",
    "continue to",
    "support",
    "believe",
    "work toward",
    "positive impact",
    "help address",
    "focused on",
    "working to",
    "aspire to",
    "dedicated to",
    "we will continue"
]

MEASURABLE_PATTERNS = [
    r"\b\d+(\.\d+)?\s?%",  # percentages
    r"\b\d{4}\b",  # year
    r"\b\d+(\.\d+)?\s?(million|billion|thousand)\b",
    r"\b\d+(\.\d+)?\s?(gw|mw|kw|kwh|mwh|tons|tonnes|cubic meters|employees|jobs|sites|cities)\b",
]

MEASURABLE_HINT_WORDS = {
    "reduced", "reduction", "increased", "increase", "achieved", "restored",
    "saved", "sourcing", "powered", "trained", "completed", "supported",
    "reached", "lowered", "cut", "decreased", "grew"
}


def classify_claim_type(sentence: str):
    """
    Classify sentence as Measurable, Vague, or Neutral and return reason.
    """
    text = sentence.lower()

    measurable_match_found = False
    measurable_reason = None

    for pattern in MEASURABLE_PATTERNS:
        if re.search(pattern, text):
            measurable_match_found = True
            measurable_reason = "Contains a numeric metric, target, unit, or timeline."
            break

    hint_word_found = any(word in text for word in MEASURABLE_HINT_WORDS)

    if measurable_match_found and hint_word_found:
        return "Measurable", "Contains both numeric evidence and an action/result term."

    if measurable_match_found:
        return "Measurable", measurable_reason

    for phrase in VAGUE_PATTERNS:
        if phrase in text:
            return "Vague", f'Contains aspirational phrase "{phrase}" without clear measurable support.'

    return "Neutral", "Mentions ESG-related content but lacks strong measurable or vague signals."