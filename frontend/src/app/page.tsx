"use client";

import { useMemo, useRef, useState } from "react";
import ESGCategoryChart from "../../components/ESGCategoryChart";
import ClaimQualityByCategoryChart from "../../components/ClaimQualityByCategoryChart";
import PageDensityChart from "../../components/PageDensityChart";
import CoverageDonutChart from "../../components/CoverageDonutChart";
import TabPanel from "../../components/TabPanel";

type Metrics = {
  total_esg_sentences: number;
  total_sentences_in_doc?: number;
  measurable_count: number;
  vague_count: number;
  measurability_score: number;
  vagueness_risk: number;
  disclosure_quality_score: number;
  esg_coverage?: number;
};

type Claim = {
  page: number;
  sentence: string;
  category: string;
  claim_type: string;
  reason: string;
  matched_keywords: string;
};

type PagePreview = {
  page: number;
  text: string;
};

type ChartData = {
  category_breakdown: { category: string; count: number }[];
  claim_type_breakdown: { claim_type: string; count: number }[];
  claim_quality_by_category: {
    category: string;
    claim_type: string;
    count: number;
  }[];
  page_density: { page: number; count: number }[];
  coverage_breakdown: { name: string; value: number }[];
};

type AnalyzeResponse = {
  report_name: string;
  metrics: Metrics;
  claims: Claim[];
  chart_data: ChartData;
  page_preview: PagePreview[];
};

type AskEvidence = Claim;

type AskResponse = {
  report_name: string;
  question: string;
  answer: string;
  evidence: AskEvidence[];
};

const API_BASE =
  process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8000";

export default function HomePage() {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [analyzeLoading, setAnalyzeLoading] = useState(false);
  const [askLoading, setAskLoading] = useState(false);

  const [analysis, setAnalysis] = useState<AnalyzeResponse | null>(null);
  const [question, setQuestion] = useState("");
  const [askResponse, setAskResponse] = useState<AskResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  const categoryCounts = useMemo(() => {
    if (!analysis) return {};
    return analysis.claims.reduce<Record<string, number>>((acc, claim) => {
      acc[claim.category] = (acc[claim.category] || 0) + 1;
      return acc;
    }, {});
  }, [analysis]);

  const claimTypeCounts = useMemo(() => {
    if (!analysis) return {};
    return analysis.claims.reduce<Record<string, number>>((acc, claim) => {
      acc[claim.claim_type] = (acc[claim.claim_type] || 0) + 1;
      return acc;
    }, {});
  }, [analysis]);

  const filteredClaims = selectedCategory
    ? analysis?.claims?.filter((claim) => claim.category === selectedCategory)
    : analysis?.claims;

  const categoryChartData = Object.entries(categoryCounts).map(
    ([category, count]) => ({
      category,
      count,
    })
  );

  const claimTypeChartData = Object.entries(claimTypeCounts).map(
    ([category, count]) => ({
      category,
      count,
    })
  );

  const stackedCategoryData = useMemo(() => {
  if (!analysis?.chart_data?.claim_quality_by_category) return [];

  const grouped: Record<
    string,
    {
      category: string;
      Measurable: number;
      Neutral: number;
      Vague: number;
    }
  > = {};

  analysis.chart_data.claim_quality_by_category.forEach((item) => {
    if (!grouped[item.category]) {
      grouped[item.category] = {
        category: item.category,
        Measurable: 0,
        Neutral: 0,
        Vague: 0,
      };
    }

    grouped[item.category][
      item.claim_type as "Measurable" | "Neutral" | "Vague"
    ] = item.count;
  });

  return Object.values(grouped);
}, [analysis]);

  const lowerContentTabs = [
    {
      label: "Claims Table",
      content: (
        <>
          {selectedCategory && (
            <div className="mb-3 text-sm text-slate-600">
              Showing {filteredClaims?.length} claims for:{" "}
              <span className="font-semibold">{selectedCategory}</span>
              <button
                className="ml-3 text-blue-600 hover:underline"
                onClick={() => setSelectedCategory(null)}
              >
                Clear
              </button>
            </div>
          )}

          {!analysis ? (
            <p className="text-sm text-slate-500">
              Analyze a report to see ESG claims.
            </p>
          ) : (
            <div className="max-h-[420px] overflow-auto rounded-lg border border-slate-200">
              <table className="min-w-full text-sm">
                <thead className="sticky top-0 bg-slate-100 text-left text-slate-700">
                  <tr>
                    <th className="px-3 py-2">Page</th>
                    <th className="px-3 py-2">Category</th>
                    <th className="px-3 py-2">Claim Type</th>
                    <th className="px-3 py-2">Sentence</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredClaims?.slice(0, 100).map((claim, index) => (
                    <tr
                      key={`${claim.page}-${index}`}
                      className="border-t border-slate-200 align-top"
                    >
                      <td className="px-3 py-2">{claim.page}</td>
                      <td className="px-3 py-2">{claim.category}</td>
                      <td className="px-3 py-2">{claim.claim_type}</td>
                      <td className="px-3 py-2 text-slate-700">
                        {claim.sentence}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      ),
    },
    {
      label: "Top ESG Keywords",
      content: !analysis ? (
        <p className="text-sm text-slate-500">
          Analyze a report to see top ESG keywords.
        </p>
      ) : (
        <div className="flex flex-wrap gap-2">
          {analysis.claims.slice(0, 20).map((c, i) => (
            <span
              key={i}
              className="rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-xs text-blue-700"
            >
              {c.matched_keywords}
            </span>
          ))}
        </div>
      ),
    },
    {
      label: "Page Preview",
      content: !analysis ? (
        <p className="text-sm text-slate-500">
          Analyze a report to preview extracted pages.
        </p>
      ) : (
        <div className="space-y-4">
          {analysis.page_preview.map((page) => (
            <div
              key={page.page}
              className="rounded-lg border border-slate-200 p-4"
            >
              <p className="mb-2 text-sm font-medium text-slate-800">
                Page {page.page}
              </p>
              <p className="text-sm text-slate-600">
                {page.text.slice(0, 500)}...
              </p>
            </div>
          ))}
        </div>
      ),
    },
  ];

  async function handleAnalyze() {
    if (!selectedFile) {
      setError("Please choose a PDF file first.");
      return;
    }

    setError(null);
    setAskResponse(null);
    setSelectedCategory(null);
    setAnalyzeLoading(true);

    try {
      const formData = new FormData();
      formData.append("file", selectedFile);

      const response = await fetch(`${API_BASE}/analyze`, {
        method: "POST",
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.detail || "Analysis failed.");
      }

      setAnalysis(data);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Analysis failed.";
      setError(message);
    } finally {
      setAnalyzeLoading(false);
    }
  }

  async function handleAsk() {
    if (!question.trim()) {
      setError("Please enter a question.");
      return;
    }

    if (!analysis) {
      setError("Please analyze a report before asking questions.");
      return;
    }

    setError(null);
    setAskLoading(true);

    try {
      const response = await fetch(`${API_BASE}/ask`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          question: question.trim(),
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.detail || "Question answering failed.");
      }

      setAskResponse(data);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Question answering failed.";
      setError(message);
    } finally {
      setAskLoading(false);
    }
  }

  function handleReset() {
    setSelectedFile(null);
    setAnalysis(null);
    setAskResponse(null);
    setQuestion("");
    setError(null);
    setSelectedCategory(null);
  }

  return (
    <main className="min-h-screen">
      <div className="mx-auto max-w-[1500px]">
        <header
          id="dashboard-section"
          className="dashboard-card section-tile mb-5 scroll-mt-20 rounded-3xl p-4 lg:p-5"
        >
          <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
            <div className="min-w-0">
              <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-500">
                Dashboard
              </p>
              <div className="mt-1.5 flex flex-col gap-2.5">
                <h1 className="text-[1.7rem] font-semibold tracking-tight text-slate-950 lg:text-[1.78rem]">
                  ESG Disclosure Analyzer
                </h1>
                <div className="flex flex-wrap gap-2.5">
                  <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white/95 px-3 py-2 text-xs shadow-sm">
                    <span className="text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-400">
                      Report
                    </span>
                    <span className="max-w-[280px] truncate font-medium text-slate-700">
                      {analysis
                        ? analysis.report_name
                        : selectedFile?.name || "No analyzed report"}
                    </span>
                  </div>
                  <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white/95 px-3 py-2 text-xs shadow-sm">
                    <span className="text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-400">
                      Claims
                    </span>
                    <span className="font-medium text-slate-700">
                      {analysis
                        ? `${analysis.claims.length} extracted`
                        : "Ready for analysis"}
                    </span>
                  </div>
                  {(analysis?.metrics.disclosure_quality_score !== undefined ||
                    analysis?.metrics.esg_coverage !== undefined) && (
                    <div className="inline-flex items-center gap-2 rounded-full border border-blue-200 bg-blue-50/90 px-3 py-2 text-xs shadow-sm">
                      <span className="text-[10px] font-semibold uppercase tracking-[0.2em] text-blue-500">
                        Snapshot
                      </span>
                      <span className="font-medium text-blue-800">
                        {analysis?.metrics.disclosure_quality_score !== undefined
                          ? `Quality ${analysis.metrics.disclosure_quality_score}/100`
                          : ""}
                        {analysis?.metrics.disclosure_quality_score !== undefined &&
                        analysis?.metrics.esg_coverage !== undefined
                          ? " · "
                          : ""}
                        {analysis?.metrics.esg_coverage !== undefined
                          ? `Coverage ${analysis.metrics.esg_coverage}%`
                          : ""}
                      </span>
                    </div>
                  )}
                </div>
              </div>
              <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
                Analyze sustainability reports, identify measurable ESG claims, and
                ask AI questions about disclosures.
              </p>
            </div>

            <div className="flex flex-col gap-2.5 xl:min-w-[400px] xl:max-w-[450px] xl:items-end">
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0] || null;
                  setSelectedFile(file);
                }}
              />
              <div className="flex w-full flex-col gap-2.5 sm:flex-row sm:items-center sm:justify-end">
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
                >
                  {selectedFile ? "Replace PDF" : "Upload PDF"}
                </button>
                <button
                  onClick={handleAnalyze}
                  disabled={analyzeLoading}
                  className="rounded-xl bg-slate-950 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {analyzeLoading ? "Analyzing..." : "Analyze Report"}
                </button>
                <button
                  onClick={handleReset}
                  className="rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
                >
                  Reset
                </button>
              </div>
              <div className="w-full rounded-2xl border border-slate-200 bg-slate-50/80 px-3 py-2 text-sm text-slate-600 xl:max-w-[450px]">
                {selectedFile ? (
                  <span>
                    Selected file:{" "}
                    <span className="font-medium text-slate-800">
                      {selectedFile.name}
                    </span>
                  </span>
                ) : (
                  "Upload a PDF to run analysis."
                )}
              </div>
            </div>
          </div>
        </header>

        {error && (
          <div className="mb-4 rounded-2xl border border-red-200 bg-red-50/90 px-4 py-2.5 text-sm text-red-700 shadow-sm">
            {error}
          </div>
        )}

        <div className="grid grid-cols-1 gap-4 xl:grid-cols-12 xl:items-start">
          <div className="space-y-4 xl:col-span-8">
            <section className="dashboard-card section-tile space-y-3.5 rounded-3xl p-4 lg:p-5">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">
                    KPI Section
                  </p>
                  <h2 className="mt-1 text-base font-semibold text-slate-950">
                    Core Metrics
                  </h2>
                </div>
                <div className="rounded-full border border-slate-200 bg-white/80 px-3 py-1 text-xs font-medium text-slate-500 shadow-sm">
                  4 headline metrics
                </div>
              </div>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
                <ScoreCard
                  title="ESG Sentences"
                  value={
                    analysis ? String(analysis.metrics.total_esg_sentences) : "--"
                  }
                />
                <ScoreCard
                  title="Measurability Score"
                  value={
                    analysis
                      ? `${analysis.metrics.measurability_score}%`
                      : "--"
                  }
                />
                <ScoreCard
                  title="Vagueness Risk"
                  value={
                    analysis ? `${analysis.metrics.vagueness_risk}%` : "--"
                  }
                />
                <ScoreCard
                  title="Disclosure Quality"
                  value={
                    analysis
                      ? `${analysis.metrics.disclosure_quality_score}/100`
                      : "--"
                  }
                />
              </div>
            </section>

            <section className="dashboard-card section-tile space-y-3.5 rounded-3xl p-4 lg:p-5">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">
                    Chart Section
                  </p>
                  <h2 className="mt-1 text-base font-semibold text-slate-950">
                    Disclosure Overview
                  </h2>
                </div>
                <div className="rounded-full border border-slate-200 bg-white/80 px-3 py-1 text-xs font-medium text-slate-500 shadow-sm">
                  5 visual summaries
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 lg:grid-cols-6">
                <div className="dashboard-card chart-tile rounded-3xl p-4 lg:col-span-3">
                  <h2 className="mb-3 text-base font-semibold text-slate-950">
                    ESG Category Breakdown
                  </h2>
                  {analysis ? (
                    <ESGCategoryChart
                      data={categoryChartData}
                      onBarClick={(category) => setSelectedCategory(category)}
                    />
                  ) : (
                    <p className="text-sm text-slate-500">No chart data yet.</p>
                  )}
                </div>

                <div className="dashboard-card chart-tile rounded-3xl p-4 lg:col-span-3">
                  <h2 className="mb-3 text-base font-semibold text-slate-950">
                    Claim Type Breakdown
                  </h2>
                  {analysis ? (
                    <ESGCategoryChart data={claimTypeChartData} />
                  ) : (
                    <p className="text-sm text-slate-500">No chart data yet.</p>
                  )}
                </div>

                <div className="dashboard-card chart-tile rounded-3xl p-4 lg:col-span-4">
                  <h2 className="mb-3 text-base font-semibold text-slate-950">
                    Claim Quality by ESG Category
                  </h2>
                  {analysis ? (
                    <ClaimQualityByCategoryChart data={stackedCategoryData} />
                  ) : (
                    <p className="text-sm text-slate-500">No chart data yet.</p>
                  )}
                </div>

                <div className="dashboard-card chart-tile rounded-3xl p-4 lg:col-span-2">
                  <h2 className="mb-3 text-base font-semibold text-slate-950">
                    ESG Coverage
                  </h2>
                  {analysis ? (
                    <CoverageDonutChart
                      data={analysis?.chart_data?.coverage_breakdown ?? []}
                    />
                  ) : (
                    <p className="text-sm text-slate-500">No chart data yet.</p>
                  )}
                </div>

                <div className="dashboard-card chart-tile rounded-3xl p-4 lg:col-span-6">
                  <h2 className="mb-3 text-base font-semibold text-slate-950">
                    Page-Level ESG Density
                  </h2>
                  {analysis ? (
                    <PageDensityChart data={analysis?.chart_data?.page_density ?? []} />
                  ) : (
                    <p className="text-sm text-slate-500">No chart data yet.</p>
                  )}
                </div>
              </div>
            </section>

            <div
              id="claims-section"
              className="dashboard-card section-tile scroll-mt-20 rounded-3xl p-4 lg:p-5"
            >
              <div id="pages-section" className="scroll-mt-20" />
              <h2 className="mb-3 text-base font-semibold text-slate-950">
                Report Details
              </h2>
              <TabPanel tabs={lowerContentTabs} />
            </div>
          </div>

          <div id="assistant-section" className="scroll-mt-20 xl:col-span-4">
            <div className="dashboard-card assistant-tile sticky top-4 rounded-[28px] p-4">
              <div className="mb-3 flex items-start justify-between gap-3 border-b border-slate-200/80 pb-3.5">
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-slate-500">
                    Assistant
                  </p>
                  <h2 className="mt-1 text-lg font-semibold tracking-tight text-slate-950">
                    AI ESG Assistant
                  </h2>
                  <p className="mt-1 text-sm text-slate-500">
                    Ask focused questions and review evidence-backed answers.
                  </p>
                </div>
                <div className="rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-[11px] font-medium text-emerald-700">
                  Live context
                </div>
              </div>

              <div className="mb-3 rounded-3xl border border-slate-200 bg-[linear-gradient(180deg,rgba(255,255,255,0.95),rgba(248,250,252,0.92))] p-3.5 shadow-sm">
                <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-slate-500">
                  Active report
                </p>
                <p className="mt-2 text-sm font-medium text-slate-800">
                  {analysis ? analysis.report_name : "No report analyzed yet"}
                </p>
                <p className="mt-1 text-sm text-slate-500">
                  {analysis
                    ? "Questions use the current ESG analysis and extracted evidence."
                    : "Analyze a report first, then ask questions about its ESG disclosures."}
                </p>
              </div>

              <div className="mb-3">
                <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.22em] text-slate-500">
                  Suggested prompts
                </p>
                <div className="grid grid-cols-1 gap-2">
                  <button
                    onClick={() =>
                      setQuestion("What are the main environmental goals?")
                    }
                    className="w-full rounded-2xl border border-slate-200 bg-white px-3 py-2.5 text-left text-sm font-medium text-slate-700 shadow-sm transition hover:-translate-y-0.5 hover:border-slate-300 hover:bg-slate-50"
                  >
                    What are the main environmental goals?
                  </button>
                  <button
                    onClick={() =>
                      setQuestion("Why did this report get this score?")
                    }
                    className="w-full rounded-2xl border border-slate-200 bg-white px-3 py-2.5 text-left text-sm font-medium text-slate-700 shadow-sm transition hover:-translate-y-0.5 hover:border-slate-300 hover:bg-slate-50"
                  >
                    Why did this report get this score?
                  </button>
                  <button
                    onClick={() => setQuestion("Find vague claims in this report.")}
                    className="w-full rounded-2xl border border-slate-200 bg-white px-3 py-2.5 text-left text-sm font-medium text-slate-700 shadow-sm transition hover:-translate-y-0.5 hover:border-slate-300 hover:bg-slate-50"
                  >
                    Find vague claims in this report.
                  </button>
                </div>
              </div>

              <div className="mb-3 rounded-3xl border border-slate-200 bg-white p-3 shadow-sm">
                <textarea
                  value={question}
                  onChange={(e) => setQuestion(e.target.value)}
                  rows={4}
                  placeholder="Ask about this report..."
                  className="mb-3 w-full resize-none rounded-2xl border border-slate-200 bg-slate-50/60 p-3 text-sm outline-none transition focus:border-blue-500"
                />

                <div className="flex items-center justify-between gap-3">
                  <p className="text-xs text-slate-500">
                    Answers include supporting report evidence.
                  </p>
                  <button
                    onClick={handleAsk}
                    disabled={askLoading}
                    className="rounded-2xl bg-slate-950 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {askLoading ? "Thinking..." : "Ask"}
                  </button>
                </div>
              </div>

              <div className="max-h-[500px] overflow-auto space-y-3.5">
                {!askResponse ? (
                  <div className="rounded-3xl border border-dashed border-slate-300 bg-white/60 p-5 text-sm text-slate-500">
                    <p className="font-medium text-slate-700">No response yet</p>
                    <p className="mt-1">
                      Ask a question to get an answer with supporting ESG
                      evidence.
                    </p>
                  </div>
                ) : (
                  <>
                    <div className="rounded-3xl border border-slate-200 bg-[linear-gradient(180deg,rgba(248,250,252,0.95),rgba(255,255,255,0.92))] p-4 shadow-sm">
                      <div className="mb-3 flex items-center justify-between gap-3">
                        <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-slate-500">
                          Response
                        </p>
                        <div className="rounded-full border border-slate-200 bg-white px-2.5 py-1 text-[11px] font-medium text-slate-500">
                          AI summary
                        </div>
                      </div>
                      <p className="mb-2 text-sm font-semibold text-slate-900">
                        Answer
                      </p>
                      <p className="whitespace-pre-line text-sm leading-6 text-slate-700">
                        {askResponse.answer}
                      </p>
                    </div>

                    <div>
                      <div className="mb-3 flex items-center justify-between gap-3">
                        <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-slate-500">
                          Supporting context
                        </p>
                        <div className="rounded-full border border-slate-200 bg-white px-2.5 py-1 text-[11px] font-medium text-slate-500">
                          {askResponse.evidence.length} evidence items
                        </div>
                      </div>
                      <p className="mb-2 text-sm font-semibold text-slate-900">
                        Evidence
                      </p>
                      <div className="space-y-3">
                        {askResponse.evidence.map((item, index) => (
                          <div
                            key={`${item.page}-${index}`}
                            className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm"
                          >
                            <p className="hidden">
                              Page {item.page} · {item.category} ·{" "}
                              {item.claim_type}
                            </p>
                            <div className="mb-3 flex flex-wrap gap-2">
                              <span className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                                Page {item.page}
                              </span>
                              <span className="rounded-full border border-blue-200 bg-blue-50 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-blue-700">
                                {item.category}
                              </span>
                              <span className="rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-amber-700">
                                {item.claim_type}
                              </span>
                            </div>
                            <p className="text-sm leading-6 text-slate-700">
                              {item.sentence}
                            </p>
                            <p className="mt-3 rounded-2xl bg-slate-50 px-3 py-2 text-xs leading-5 text-slate-500">
                              {item.reason}
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}

function ScoreCard({
  title,
  value,
}: {
  title: string;
  value: string;
}) {
  return (
    <div className="dashboard-card rounded-3xl px-4 py-4 sm:px-5 sm:py-5">
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-3">
          <p className="text-[10px] font-medium uppercase tracking-[0.24em] text-slate-400">
            {title}
          </p>
          <p className="text-3xl font-semibold tracking-[-0.04em] text-slate-950 sm:text-[2.1rem]">
            {value}
          </p>
        </div>
        <div className="mt-0.5 h-2.5 w-2.5 rounded-full bg-slate-300/80" />
      </div>
      <div className="mt-5 h-px w-full bg-slate-200/80" />
    </div>
  );
}
