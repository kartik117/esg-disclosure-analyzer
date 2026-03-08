import streamlit as st
from pathlib import Path
import pandas as pd
import plotly.express as px

from src.pdf_parser import extract_text_from_pdf
from src.preprocessing import clean_text, split_into_sentences
from src.esg_classifier import classify_esg_category
from src.claim_scoring import classify_claim_type
from src.metrics_extractor import extract_top_metrics
from src.summarizer import (
    generate_quick_summary,
    generate_qa_response,
    generate_esg_assistant_summary,
)
from src.utils import build_summary_dataframe
from src.retrieval import load_embedding_model, build_faiss_index, retrieve_top_k


@st.cache_resource
def get_retrieval_model():
    return load_embedding_model()


st.set_page_config(
    page_title="ESG Disclosure Analyzer",
    layout="wide"
)

st.markdown("""
<style>
.block-container {
    padding-top: 1.2rem;
    padding-bottom: 1rem;
    max-width: 98%;
}
div[data-testid="stMetric"] {
    background-color: #f8f9fb;
    border: 1px solid #e6e8ef;
    padding: 14px;
    border-radius: 12px;
}
section[data-testid="stSidebar"] {
    background-color: #fafafa;
}
</style>
""", unsafe_allow_html=True)

# -----------------------------
# Session state initialization
# -----------------------------
if "analysis_done" not in st.session_state:
    st.session_state.analysis_done = False

if "pages" not in st.session_state:
    st.session_state.pages = []

if "df" not in st.session_state:
    st.session_state.df = pd.DataFrame()

if "metrics" not in st.session_state:
    st.session_state.metrics = {}

if "selected_report_name" not in st.session_state:
    st.session_state.selected_report_name = None


st.title("ESG Disclosure Analyzer")
st.caption("A dashboard for reviewing ESG disclosures, measurable claims, and evidence-backed insights.")

st.info(
    "Upload a sustainability report or select a sample file to generate ESG metrics, "
    "interactive charts, and AI-assisted Q&A."
)

control_col1, control_col2, control_col3 = st.columns([2.2, 2.2, 1])

with control_col1:
    uploaded_file = st.file_uploader(
        "Upload ESG Report (PDF)",
        type=["pdf"]
    )

with control_col2:
    data_folder = Path("data/sustainability_reports")
    sample_reports = []
    if data_folder.exists():
        sample_reports = [f.name for f in data_folder.glob("*.pdf")]

    selected_sample = st.selectbox(
        "Or choose a sample report",
        ["None"] + sample_reports
    )

with control_col3:
    st.write("")
    st.write("")
    analyze = st.button("Analyze Report", use_container_width=True)
    reset = st.button("Reset Analysis", use_container_width=True)


if reset:
    st.session_state.analysis_done = False
    st.session_state.pages = []
    st.session_state.df = pd.DataFrame()
    st.session_state.metrics = {}
    st.session_state.selected_report_name = None
    st.rerun()


def run_analysis(file_path):
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

    df = pd.DataFrame(records)

    if df.empty:
        return pages, df, {
            "total_esg_sentences": 0,
            "total_sentences_in_doc": max(all_sentences_in_doc, 1),
            "measurable_count": 0,
            "vague_count": 0,
            "measurability_score": 0.0,
            "vagueness_risk": 0.0,
            "disclosure_quality_score": 0.0,
            "esg_coverage": 0.0
        }

    total_esg_sentences = len(df)
    measurable_count = (df["claim_type"] == "Measurable").sum()
    vague_count = (df["claim_type"] == "Vague").sum()
    total_sentences_in_doc = max(all_sentences_in_doc, 1)

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

    return pages, df, metrics


if analyze:
    if uploaded_file is None and selected_sample == "None":
        st.warning("Please upload or select a report.")
    else:
        try:
            if uploaded_file:
                temp_path = "temp_uploaded_report.pdf"
                with open(temp_path, "wb") as f:
                    f.write(uploaded_file.read())
                file_path = temp_path
                report_name = uploaded_file.name
            else:
                file_path = str(data_folder / selected_sample)
                report_name = selected_sample

            with st.spinner("Extracting and analyzing report..."):
                pages, df, metrics = run_analysis(file_path)

            st.session_state.pages = pages
            st.session_state.df = df
            st.session_state.metrics = metrics
            st.session_state.analysis_done = True
            st.session_state.selected_report_name = report_name

            st.success(f"Analysis complete for: {report_name}")

        except Exception as e:
            st.error(f"Analysis failed: {e}")
            st.stop()


if st.session_state.analysis_done:
    pages = st.session_state.pages
    df = st.session_state.df
    metrics = st.session_state.metrics

    st.subheader(f"Analyzed Report: {st.session_state.selected_report_name}")

    if df.empty:
        st.warning("No ESG-related sentences detected.")
        st.stop()

    main_col, side_col = st.columns([3, 1.25], gap="large")

    # =========================
    # LEFT: MAIN DASHBOARD
    # =========================
    with main_col:
        st.markdown("## Dashboard")

        metric_row = st.columns(5)
        metric_row[0].metric("ESG Sentences", metrics["total_esg_sentences"])
        metric_row[1].metric("ESG Coverage", f'{metrics["esg_coverage"]}%')
        metric_row[2].metric("Measurability", f'{metrics["measurability_score"]}%')
        metric_row[3].metric("Vagueness Risk", f'{metrics["vagueness_risk"]}%')
        metric_row[4].metric("Quality Score", f'{metrics["disclosure_quality_score"]}/100')

        st.markdown("### Why This Score?")
        st.write(
            f"""
This report received a **Disclosure Quality Score of {metrics['disclosure_quality_score']}/100**.

- **Measurable claims:** {metrics['measurable_count']}
- **Vague claims:** {metrics['vague_count']}
- **ESG coverage:** {metrics['esg_coverage']}%

The score is higher when the report contains more concrete claims with numbers, targets, and timelines, and lower when it relies more on broad aspirational language.
"""
        )

        st.markdown("### Quick Summary")
        summary_points = generate_quick_summary(df)
        for point in summary_points:
            st.write(f"- {point}")

        with st.expander("Preview Extracted Text", expanded=False):
            preview_shown = 0
            for page in pages:
                page_text = page["text"].strip()
                if len(page_text) > 150:
                    with st.expander(f"Page {page['page']}"):
                        st.write(page_text[:1200])
                    preview_shown += 1
                if preview_shown == 3:
                    break

        chart_col1, chart_col2 = st.columns(2)

        with chart_col1:
            st.markdown("### ESG Category Breakdown")
            category_counts = df["category"].value_counts().reset_index()
            category_counts.columns = ["category", "count"]

            fig_category = px.pie(
                category_counts,
                names="category",
                values="count",
                hole=0.45,
                title="ESG Category Distribution"
            )
            fig_category.update_layout(height=430)
            st.plotly_chart(fig_category, use_container_width=True)

        with chart_col2:
            st.markdown("### Claim Quality Breakdown")
            claim_counts = df["claim_type"].value_counts().reset_index()
            claim_counts.columns = ["claim_type", "count"]

            fig_claim = px.bar(
                claim_counts,
                x="claim_type",
                y="count",
                title="Claim Type Counts"
            )
            fig_claim.update_layout(height=430)
            st.plotly_chart(fig_claim, use_container_width=True)

        chart_col3, chart_col4 = st.columns(2)

        with chart_col3:
            st.markdown("### Claim Quality by ESG Category")
            category_claim_counts = (
                df.groupby(["category", "claim_type"])
                .size()
                .reset_index(name="count")
            )

            fig_stacked = px.bar(
                category_claim_counts,
                x="category",
                y="count",
                color="claim_type",
                barmode="stack",
                title="Category vs Claim Quality"
            )
            fig_stacked.update_layout(height=430)
            st.plotly_chart(fig_stacked, use_container_width=True)

        with chart_col4:
            st.markdown("### Page-Level ESG Density")
            page_counts = df.groupby("page").size().reset_index(name="count")

            fig_page = px.line(
                page_counts,
                x="page",
                y="count",
                markers=True,
                title="ESG Mentions by Page"
            )
            fig_page.update_layout(height=430)
            st.plotly_chart(fig_page, use_container_width=True)

        st.markdown("### Top Extracted Metrics")
        top_metrics = extract_top_metrics(df)

        if top_metrics:
            for metric_sentence in top_metrics:
                st.info(metric_sentence)
        else:
            st.write("No strong measurable metrics detected.")

        st.markdown("### Review ESG Claims")

        filter_col1, filter_col2 = st.columns(2)
        with filter_col1:
            selected_category_filter = st.selectbox(
                "Filter by ESG Category",
                ["All"] + sorted(df["category"].unique().tolist()),
                key="category_filter"
            )

        with filter_col2:
            selected_claim_filter = st.selectbox(
                "Filter by Claim Type",
                ["All"] + sorted(df["claim_type"].unique().tolist()),
                key="claim_filter"
            )

        filtered_df = df.copy()

        if selected_category_filter != "All":
            filtered_df = filtered_df[filtered_df["category"] == selected_category_filter]

        if selected_claim_filter != "All":
            filtered_df = filtered_df[filtered_df["claim_type"] == selected_claim_filter]

        display_df = filtered_df[[
            "page", "category", "claim_type", "matched_keywords", "reason", "sentence"
        ]].copy()

        st.dataframe(display_df, use_container_width=True, height=420)

        st.markdown("### Export Results")

        full_export_df = df.copy()
        vague_export_df = df[df["claim_type"] == "Vague"].copy()

        summary_export_df = build_summary_dataframe(
            total_esg_sentences=metrics["total_esg_sentences"],
            total_sentences_in_doc=metrics["total_sentences_in_doc"],
            esg_coverage=metrics["esg_coverage"],
            measurable_count=metrics["measurable_count"],
            vague_count=metrics["vague_count"],
            measurability_score=metrics["measurability_score"],
            vagueness_risk=metrics["vagueness_risk"],
            disclosure_quality_score=metrics["disclosure_quality_score"]
        )

        export_col1, export_col2, export_col3 = st.columns(3)

        with export_col1:
            st.download_button(
                label="All ESG Claims CSV",
                data=full_export_df.to_csv(index=False).encode("utf-8"),
                file_name="all_esg_claims.csv",
                mime="text/csv"
            )

        with export_col2:
            st.download_button(
                label="Vague Claims CSV",
                data=vague_export_df.to_csv(index=False).encode("utf-8"),
                file_name="vague_esg_claims.csv",
                mime="text/csv"
            )

        with export_col3:
            st.download_button(
                label="Summary Metrics CSV",
                data=summary_export_df.to_csv(index=False).encode("utf-8"),
                file_name="esg_summary_metrics.csv",
                mime="text/csv"
            )

    # =========================
    # RIGHT: AI ASSISTANT
    # =========================
    with side_col:
        st.markdown("## AI ESG Assistant")

        assistant_summary = generate_esg_assistant_summary(df, metrics)
        st.markdown("### ESG Summary")
        st.write(assistant_summary)

        st.markdown("### Ask About This Document")

        suggested_questions = [
            "Summarize the ESG disclosures",
            "What are the main environmental goals?",
            "What are the main social initiatives?",
            "What governance disclosures are mentioned?",
            "Why did this report get this score?",
            "Find vague claims in this report."
        ]

        selected_question = st.selectbox(
            "Suggested questions",
            ["None"] + suggested_questions,
            key="qa_select"
        )

        user_question = st.text_area(
            "Your question",
            key="qa_input",
            height=100,
            placeholder="Ask about the ESG disclosures..."
        )

        final_question = user_question.strip() if user_question.strip() else (
            selected_question if selected_question != "None" else ""
        )

        if final_question:
            retrieval_sentences = df["sentence"].tolist()

            if len(retrieval_sentences) == 0:
                st.warning("No analyzed sentences available for retrieval.")
            else:
                try:
                    with st.spinner("Retrieving relevant evidence..."):
                        model = get_retrieval_model()
                        index, _ = build_faiss_index(retrieval_sentences, model)

                        top_results = retrieve_top_k(
                            query=final_question,
                            sentences=retrieval_sentences,
                            model=model,
                            index=index,
                            k=5
                        )

                        answer = generate_qa_response(final_question, top_results)

                    st.markdown("### Answer")
                    st.write(answer)

                    st.markdown("### Evidence")
                    for i, result_sentence in enumerate(top_results[:5], start=1):
                        matching_rows = df[df["sentence"] == result_sentence]
                        if not matching_rows.empty:
                            row = matching_rows.iloc[0]
                            st.markdown(
                                f"""
**{i}. Page {row['page']} | {row['category']} | {row['claim_type']}**

{row['sentence']}

_{row['reason']}_
"""
                            )
                        else:
                            st.write(f"**{i}.** {result_sentence}")

                except Exception as e:
                    st.error(f"Question answering failed: {e}")