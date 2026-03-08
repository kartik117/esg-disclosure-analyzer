import pandas as pd


def build_summary_dataframe(
    total_esg_sentences,
    total_sentences_in_doc,
    esg_coverage,
    measurable_count,
    vague_count,
    measurability_score,
    vagueness_risk,
    disclosure_quality_score
):
    summary = {
        "total_esg_sentences": [total_esg_sentences],
        "total_sentences_in_document": [total_sentences_in_doc],
        "esg_coverage_percent": [esg_coverage],
        "measurable_claim_count": [measurable_count],
        "vague_claim_count": [vague_count],
        "measurability_score_percent": [measurability_score],
        "vagueness_risk_percent": [vagueness_risk],
        "disclosure_quality_score": [disclosure_quality_score],
    }

    return pd.DataFrame(summary)