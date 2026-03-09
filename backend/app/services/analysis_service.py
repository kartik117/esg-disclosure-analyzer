from src.pdf_parser import extract_text_from_pdf
from src.preprocessing import clean_text, split_into_sentences
from src.esg_classifier import classify_esg_category
from src.claim_scoring import classify_claim_type
from src.summarizer import generate_qa_response
from app.services.llm_service import (
    LLMConfigurationError,
    LLMProviderError,
    LLMResponseError,
    get_llm_service,
)
from app.services.rag_context_service import build_rag_context

# In-memory store for latest analyzed claims
LATEST_ANALYSIS = {
    "report_name": None,
    "claims": [],
    "metrics": None,
}


def analyze_document(file_path: str, report_name: str = None):
    pages = extract_text_from_pdf(file_path)

    if not pages:
        raise ValueError("No readable text could be extracted from this PDF.")

    records = []
    all_sentences_in_doc = 0

    for page in pages:
        raw_text = page["text"]
        cleaned_text = clean_text(raw_text)
        sentences = split_into_sentences(cleaned_text)

        all_sentences_in_doc += len(sentences)

        for sentence in sentences:
            category, matched_keywords = classify_esg_category(sentence)

            if category:
                claim_type, reason = classify_claim_type(sentence)

                records.append({
                    "page": page["page"],
                    "sentence": sentence,
                    "category": category,
                    "claim_type": claim_type,
                    "reason": reason,
                    "matched_keywords": ", ".join(matched_keywords)
                })

    total_esg_sentences = len(records)
    total_sentences_in_doc = max(all_sentences_in_doc, 1)

    measurable_count = sum(1 for r in records if r["claim_type"] == "Measurable")
    vague_count = sum(1 for r in records if r["claim_type"] == "Vague")

    # Build chart data containers
    category_breakdown = {}
    claim_type_breakdown = {}
    claim_quality_by_category = {}
    page_density = {}

    for record in records:
        category = record["category"]
        claim_type = record["claim_type"]
        page = record["page"]

        category_breakdown[category] = category_breakdown.get(category, 0) + 1
        claim_type_breakdown[claim_type] = claim_type_breakdown.get(claim_type, 0) + 1

        key = (category, claim_type)
        claim_quality_by_category[key] = claim_quality_by_category.get(key, 0) + 1

        page_density[page] = page_density.get(page, 0) + 1

    if total_esg_sentences == 0:
        metrics = {
            "total_esg_sentences": 0,
            "total_sentences_in_doc": total_sentences_in_doc,
            "measurable_count": 0,
            "vague_count": 0,
            "measurability_score": 0.0,
            "vagueness_risk": 0.0,
            "disclosure_quality_score": 0.0,
            "esg_coverage": 0.0
        }

        chart_data = {
            "category_breakdown": [],
            "claim_type_breakdown": [],
            "claim_quality_by_category": [],
            "page_density": [],
            "coverage_breakdown": [
                {"name": "ESG", "value": 0},
                {"name": "Non-ESG", "value": total_sentences_in_doc}
            ]
        }

        LATEST_ANALYSIS["report_name"] = report_name
        LATEST_ANALYSIS["claims"] = []
        LATEST_ANALYSIS["metrics"] = metrics

        return {
            "pages": pages,
            "metrics": metrics,
            "claims": [],
            "chart_data": chart_data
        }

    measurability_score = round((measurable_count / total_esg_sentences) * 100, 1)
    vagueness_risk = round((vague_count / total_esg_sentences) * 100, 1)
    disclosure_quality_score = round(
        (measurability_score * 0.7) + ((100 - vagueness_risk) * 0.3), 1
    )
    esg_coverage = round((total_esg_sentences / total_sentences_in_doc) * 100, 1)

    metrics = {
        "total_esg_sentences": total_esg_sentences,
        "total_sentences_in_doc": total_sentences_in_doc,
        "measurable_count": measurable_count,
        "vague_count": vague_count,
        "measurability_score": measurability_score,
        "vagueness_risk": vagueness_risk,
        "disclosure_quality_score": disclosure_quality_score,
        "esg_coverage": esg_coverage
    }

    chart_data = {
        "category_breakdown": [
            {"category": k, "count": v} for k, v in category_breakdown.items()
        ],
        "claim_type_breakdown": [
            {"claim_type": k, "count": v} for k, v in claim_type_breakdown.items()
        ],
        "claim_quality_by_category": [
            {"category": category, "claim_type": claim_type, "count": count}
            for (category, claim_type), count in claim_quality_by_category.items()
        ],
        "page_density": [
            {"page": page, "count": count}
            for page, count in sorted(page_density.items())
        ],
        "coverage_breakdown": [
            {"name": "ESG", "value": total_esg_sentences},
            {"name": "Non-ESG", "value": max(total_sentences_in_doc - total_esg_sentences, 0)}
        ]
    }

    # Store latest analysis in memory
    LATEST_ANALYSIS["report_name"] = report_name
    LATEST_ANALYSIS["claims"] = records
    LATEST_ANALYSIS["metrics"] = metrics

    return {
        "pages": pages,
        "metrics": metrics,
        "claims": records,
        "chart_data": chart_data
    }


def ask_about_latest_analysis(question: str):
    claims = LATEST_ANALYSIS["claims"]
    metrics = LATEST_ANALYSIS["metrics"]

    if not claims:
        raise ValueError("No analyzed report is available. Please analyze a PDF first.")

    rag_context = build_rag_context(
        question=question,
        claims=claims,
        report_name=LATEST_ANALYSIS["report_name"],
        metrics=metrics,
    )

    answer = None
    used_fallback = False

    try:
        llm_service = get_llm_service()
        answer = llm_service.generate(
            rag_context["user_prompt"],
            system_prompt=rag_context["system_prompt"],
            temperature=0.2,
            max_tokens=None,
        )
    except (LLMConfigurationError, LLMProviderError, LLMResponseError) as exc:
        used_fallback = True
        if isinstance(exc, LLMConfigurationError):
            answer = "LLM not configured. Please set GEMINI_API_KEY."

    if not answer:
        answer = _build_fallback_answer(question, rag_context["evidence"], used_fallback)
        used_fallback = True

    return {
        "report_name": LATEST_ANALYSIS["report_name"],
        "question": question,
        "answer": answer,
        "evidence": rag_context["evidence"],
        "metadata": _build_answer_metadata(
            evidence=rag_context["evidence"],
            used_fallback=used_fallback,
        ),
    }


def _build_fallback_answer(
    question: str,
    evidence: list[dict],
    llm_failed: bool,
) -> str:
    fallback_answer = generate_qa_response(
        question,
        [item["sentence"] for item in evidence],
    )

    if llm_failed:
        return (
            f"{fallback_answer}\n\n"
            "(Fallback response used because the LLM was unavailable.)"
        )

    return fallback_answer


def _build_answer_metadata(
    *,
    evidence: list[dict],
    used_fallback: bool,
) -> dict[str, str | int]:
    evidence_count = len(evidence)
    confidence_note = "Limited evidence retrieved."

    if evidence_count >= 4:
        confidence_note = "Broad evidence coverage across multiple retrieved claims."
    elif evidence_count >= 2:
        confidence_note = "Moderate evidence coverage from the analyzed report."

    return {
        "retrieved_source_count": evidence_count,
        "answer_source": "fallback" if used_fallback else "llm",
        "confidence_note": confidence_note,
    }
