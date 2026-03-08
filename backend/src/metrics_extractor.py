import re


METRIC_PATTERNS = [
    r"\b\d+(\.\d+)?\s?%",
    r"\b\d+(\.\d+)?\s?(million|billion|thousand)\b",
    r"\b\d+(\.\d+)?\s?(gw|mw|kw|kwh|mwh|tons|tonnes|cubic meters|employees|jobs|sites|cities)\b",
]


def extract_top_metrics(df, max_metrics=6):
    """
    Extract strong measurable claims with numeric signals.
    """
    if df.empty:
        return []

    measurable_df = df[df["claim_type"] == "Measurable"].copy()

    strong_metrics = []

    for _, row in measurable_df.iterrows():
        sentence = row["sentence"]
        sentence_lower = sentence.lower()

        for pattern in METRIC_PATTERNS:
            if re.search(pattern, sentence_lower):
                strong_metrics.append(sentence)
                break

    # Deduplicate
    seen = set()
    unique_metrics = []
    for sentence in strong_metrics:
        if sentence not in seen:
            unique_metrics.append(sentence)
            seen.add(sentence)

    # Prefer shorter, cleaner metric statements first
    unique_metrics = sorted(unique_metrics, key=len)

    return unique_metrics[:max_metrics]