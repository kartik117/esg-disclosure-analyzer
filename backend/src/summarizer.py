def generate_quick_summary(df):
    """
    Generate 3 short business-style insights from the dataframe.
    """
    if df.empty:
        return ["No ESG-related content detected."]

    summary_points = []

    category_counts = df["category"].value_counts().to_dict()
    claim_counts = df["claim_type"].value_counts().to_dict()

    top_category = max(category_counts, key=category_counts.get)
    summary_points.append(f"{top_category} topics dominate the report.")

    measurable_count = claim_counts.get("Measurable", 0)
    vague_count = claim_counts.get("Vague", 0)

    if measurable_count >= vague_count:
        summary_points.append("Many claims are supported by measurable metrics, targets, or timelines.")
    else:
        summary_points.append("A notable share of claims use broad or aspirational language.")

    if vague_count > 0:
        summary_points.append("Some ESG statements may need stronger evidence or clearer quantification.")
    else:
        summary_points.append("Most ESG-related statements appear to include concrete supporting detail.")

    return summary_points[:3]


def generate_qa_response(query, evidence_sentences):
    """
    Create a simple plain-English answer from retrieved evidence.
    """
    if not evidence_sentences:
        return "I could not find strong supporting evidence for that question in the document."

    query_lower = query.lower()

    if "environment" in query_lower:
        intro = "Here are the main environmental points I found in the document:"
    elif "social" in query_lower:
        intro = "Here are the main social-related points I found in the document:"
    elif "governance" in query_lower:
        intro = "Here are the main governance-related points I found in the document:"
    elif "score" in query_lower:
        intro = "The score appears to be driven by the following supporting statements:"
    elif "vague" in query_lower:
        intro = "These statements appear relevant to vague or aspirational ESG language:"
    else:
        intro = "Here are the most relevant statements I found for your question:"

    bullet_points = evidence_sentences[:3]

    answer = intro + "\n\n"
    for sentence in bullet_points:
        answer += f"- {sentence}\n"

    return answer.strip()


def generate_esg_assistant_summary(df, metrics):
    """
    Generate a concise ESG summary for the assistant panel.
    """
    if df.empty:
        return "No ESG-related content was detected in the document."

    category_counts = df["category"].value_counts().to_dict()
    top_category = max(category_counts, key=category_counts.get)

    measurable_count = metrics.get("measurable_count", 0)
    vague_count = metrics.get("vague_count", 0)
    score = metrics.get("disclosure_quality_score", 0)

    summary = f"""
This report appears to be most focused on **{top_category}** topics.

The overall **Disclosure Quality Score is {score}/100**.

It contains **{measurable_count} measurable ESG claims** and **{vague_count} vague ESG claims**.

In general, the report is stronger when it uses concrete numbers, targets, and timelines, and weaker where it relies on broad aspirational language without supporting evidence.
"""
    return summary.strip()