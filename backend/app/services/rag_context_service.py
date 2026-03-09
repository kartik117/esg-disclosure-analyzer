from __future__ import annotations

from dataclasses import dataclass
from typing import Any

from app.config import get_settings
from src.retrieval import load_embedding_model, build_faiss_index, retrieve_top_k


@dataclass(frozen=True)
class RetrievedEvidence:
    page: int
    category: str
    claim_type: str
    sentence: str
    reason: str
    matched_keywords: str


def build_rag_context(
    question: str,
    claims: list[dict[str, Any]],
    *,
    report_name: str | None = None,
    metrics: dict[str, Any] | None = None,
    top_k: int | None = None,
) -> dict[str, Any]:
    if not question.strip():
        raise ValueError("Question is required to build RAG context.")

    if not claims:
        raise ValueError("Claims are required to build RAG context.")

    retrieval_sentences = [claim["sentence"] for claim in claims]
    model = load_embedding_model()
    index, _ = build_faiss_index(retrieval_sentences, model)

    effective_top_k = top_k or get_settings().rag_top_k
    top_results = retrieve_top_k(
        query=question,
        sentences=retrieval_sentences,
        model=model,
        index=index,
        k=effective_top_k,
    )

    evidence = _map_sentences_to_claims(top_results, claims)
    metrics_snapshot = _build_metrics_snapshot(metrics)

    return {
        "question": question,
        "report_name": report_name,
        "metrics": metrics_snapshot,
        "evidence": evidence,
        "system_prompt": _build_system_prompt(),
        "user_prompt": _build_user_prompt(
            question=question,
            report_name=report_name,
            metrics=metrics_snapshot,
            evidence=evidence,
        ),
    }


def _map_sentences_to_claims(
    sentences: list[str],
    claims: list[dict[str, Any]],
) -> list[dict[str, Any]]:
    evidence: list[dict[str, Any]] = []

    for sentence in sentences:
        for claim in claims:
            if claim["sentence"] == sentence:
                evidence.append(
                    RetrievedEvidence(
                        page=claim["page"],
                        category=claim["category"],
                        claim_type=claim["claim_type"],
                        sentence=claim["sentence"],
                        reason=claim["reason"],
                        matched_keywords=claim["matched_keywords"],
                    ).__dict__
                )
                break

    return evidence


def _build_metrics_snapshot(metrics: dict[str, Any] | None) -> dict[str, Any] | None:
    if not metrics:
        return None

    keys = [
        "total_esg_sentences",
        "measurable_count",
        "vague_count",
        "measurability_score",
        "vagueness_risk",
        "disclosure_quality_score",
        "esg_coverage",
    ]

    return {key: metrics[key] for key in keys if key in metrics}


def _build_user_prompt(
    *,
    question: str,
    report_name: str | None,
    metrics: dict[str, Any] | None,
    evidence: list[dict[str, Any]],
) -> str:
    question_type = _infer_question_type(question)
    lines = [
        "Task",
        "Answer the user's ESG analysis question using only the retrieved report evidence and metrics below.",
        "",
        "Question Type",
        question_type,
        "",
        "User Question",
        question,
    ]

    if report_name:
        lines.extend(["", "Report", report_name])

    if metrics:
        lines.extend(["", "Key Metrics"])
        for key, value in metrics.items():
            label = key.replace("_", " ").title()
            lines.append(f"- {label}: {value}")

    lines.extend(
        [
            "",
            "Answering Guidance",
            "- Give a direct answer first in a clear opening paragraph.",
            "- Then add a fuller explanation section that synthesizes the strongest evidence in detail.",
            "- Include as many evidence-backed bullet points as needed to answer well.",
            "- Use the retrieved evidence to support the answer.",
            "- If the evidence is limited, unclear, or incomplete, say that explicitly in a short final note.",
            "- Do not claim facts that are not present in the evidence.",
            "- Mention page numbers when helpful.",
            "- Prefer a complete, full-length answer over a compressed summary.",
            "- Do not shorten the answer unless the evidence itself is genuinely limited.",
        ]
    )

    lines.extend(["", "Retrieved Evidence"])
    for index, item in enumerate(evidence, start=1):
        lines.append(
            f"{index}. Page {item['page']} | Category: {item['category']} | "
            f"Claim Type: {item['claim_type']}"
        )
        lines.append(f"   Sentence: {item['sentence']}")
        lines.append(f"   Assessment: {item['reason']}")
        if item.get("matched_keywords"):
            lines.append(f"   Keywords: {item['matched_keywords']}")

    return "\n".join(lines)


def _build_system_prompt() -> str:
    return (
        "You are an ESG disclosure analysis assistant. "
        "Your job is to answer questions about a report using only the supplied "
        "retrieved evidence and metrics.\n\n"
        "Answer style requirements:\n"
        "- Be natural, clear, and helpful.\n"
        "- Provide a full-length answer, not a short summary.\n"
        "- Start with a direct answer, then expand with fuller analytical explanation.\n"
        "- When helpful, organize the response into an opening paragraph followed by detailed bullet points.\n"
        "- Ground every important claim in the provided evidence.\n"
        "- Prefer specific facts, metrics, and page references when available.\n"
        "- If evidence is weak, partial, or conflicting, say so clearly.\n"
        "- Do not invent details, goals, scores, or conclusions.\n\n"
        "For common ESG questions:\n"
        "- For strategy questions, summarize the main themes and priorities shown in evidence.\n"
        "- For score questions, explain which measurable vs vague patterns likely influenced the score.\n"
        "- For vague-claim questions, point out language that lacks quantification, targets, or timelines.\n"
        "- For environmental-goal questions, focus on stated environmental targets, actions, or outcomes.\n"
        "- For weak-disclosure questions, identify missing specificity, limited metrics, or broad claims.\n"
        "- For rewrite questions, rewrite the vague claims into more measurable language while staying close to the original intent.\n"
        "- If the evidence does not support a confident answer, explicitly state that the report evidence is insufficient.\n\n"
        "Aim for a substantive answer that is usually multi-paragraph and detailed when the evidence supports it."
    )


def _infer_question_type(question: str) -> str:
    query = question.lower()

    if "score" in query:
        return "Explain score drivers"
    if "vague" in query or "weak" in query:
        return "Identify weak or vague disclosure"
    if "environment" in query or "emission" in query or "climate" in query:
        return "Environmental goals or strategy"
    if "strategy" in query or "summarize" in query or "overview" in query:
        return "Summarize ESG strategy"
    return "General ESG question"
