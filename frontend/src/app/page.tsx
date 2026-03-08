"use client";

import { useMemo, useState } from "react";
import ESGCategoryChart from "../../components/ESGCategoryChart";
import ClaimQualityByCategoryChart from "../../components/ClaimQualityByCategoryChart";
import PageDensityChart from "../../components/PageDensityChart";
import CoverageDonutChart from "../../components/CoverageDonutChart";

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
    <main className="min-h-screen bg-slate-50 p-6">
      <div className="mx-auto max-w-7xl">
        <header className="mb-8">
          <h1 className="text-4xl font-bold tracking-tight text-slate-900">
            ESG Disclosure Analyzer
          </h1>
          <p className="mt-2 text-slate-600">
            Analyze sustainability reports, identify measurable ESG claims, and
            ask AI questions about disclosures.
          </p>
        </header>

        {error && (
          <div className="mb-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        <div className="grid grid-cols-12 gap-6">
          {/* Left panel */}
          <div className="col-span-8 space-y-6">
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="mb-4 text-lg font-semibold text-slate-900">
                Upload ESG Report
              </h2>

              <input
                type="file"
                accept=".pdf"
                className="w-full rounded-lg border border-slate-300 p-2"
                onChange={(e) => {
                  const file = e.target.files?.[0] || null;
                  setSelectedFile(file);
                }}
              />

              <div className="mt-4 flex gap-3">
                <button
                  onClick={handleAnalyze}
                  disabled={analyzeLoading}
                  className="rounded-lg bg-blue-600 px-4 py-2 text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {analyzeLoading ? "Analyzing..." : "Analyze Report"}
                </button>

                <button
                  onClick={handleReset}
                  className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-slate-700 hover:bg-slate-50"
                >
                  Reset
                </button>
              </div>

              {selectedFile && (
                <p className="mt-3 text-sm text-slate-500">
                  Selected file:{" "}
                  <span className="font-medium text-slate-700">
                    {selectedFile.name}
                  </span>
                </p>
              )}
            </div>

            <div className="grid grid-cols-4 gap-4">
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

            <div className="grid grid-cols-2 gap-6">
              <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                <h2 className="mb-4 text-lg font-semibold text-slate-900">
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

              <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                <h2 className="mb-4 text-lg font-semibold text-slate-900">
                  Claim Type Breakdown
                </h2>
                {analysis ? (
                  <ESGCategoryChart data={claimTypeChartData} />
                ) : (
                  <p className="text-sm text-slate-500">No chart data yet.</p>
                )}
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                <h2 className="mb-4 text-lg font-semibold text-slate-900">
                  Claim Quality by ESG Category
                </h2>
                {analysis ? (
                  <ClaimQualityByCategoryChart data={stackedCategoryData} />
                ) : (
                  <p className="text-sm text-slate-500">No chart data yet.</p>
                )}
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                <h2 className="mb-4 text-lg font-semibold text-slate-900">
                  Page-Level ESG Density
                </h2>
                {analysis ? (
                  <PageDensityChart data={analysis?.chart_data?.page_density ?? []} />
                ) : (
                  <p className="text-sm text-slate-500">No chart data yet.</p>
                )}
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="mb-4 text-lg font-semibold text-slate-900">
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

            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="mb-4 text-lg font-semibold text-slate-900">
                Top ESG Keywords
              </h2>

              <div className="flex flex-wrap gap-2">
                {analysis?.claims.slice(0, 20).map((c, i) => (
                  <span
                    key={i}
                    className="rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-xs text-blue-700"
                  >
                    {c.matched_keywords}
                  </span>
                ))}
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="mb-4 text-lg font-semibold text-slate-900">
                Claims Table
              </h2>

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
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="mb-4 text-lg font-semibold text-slate-900">
                Page Preview
              </h2>

              {!analysis ? (
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
              )}
            </div>
          </div>

          {/* Right AI panel */}
          <div className="col-span-4">
            <div className="sticky top-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="mb-4 text-lg font-semibold text-slate-900">
                AI ESG Assistant
              </h2>

              <div className="mb-4 rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm text-slate-600">
                {analysis
                  ? `Analyzed report: ${analysis.report_name}`
                  : "Analyze a report first, then ask questions about its ESG disclosures."}
              </div>

              <div className="mb-3 space-y-2">
                <button
                  onClick={() =>
                    setQuestion("What are the main environmental goals?")
                  }
                  className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-left text-sm text-slate-700 hover:bg-slate-50"
                >
                  What are the main environmental goals?
                </button>
                <button
                  onClick={() =>
                    setQuestion("Why did this report get this score?")
                  }
                  className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-left text-sm text-slate-700 hover:bg-slate-50"
                >
                  Why did this report get this score?
                </button>
                <button
                  onClick={() => setQuestion("Find vague claims in this report.")}
                  className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-left text-sm text-slate-700 hover:bg-slate-50"
                >
                  Find vague claims in this report.
                </button>
              </div>

              <textarea
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                rows={4}
                placeholder="Ask about this report..."
                className="mb-3 w-full rounded-lg border border-slate-300 p-3 text-sm outline-none focus:border-blue-500"
              />

              <button
                onClick={handleAsk}
                disabled={askLoading}
                className="mb-4 w-full rounded-lg bg-slate-900 px-4 py-2 text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {askLoading ? "Thinking..." : "Ask"}
              </button>

              <div className="max-h-[520px] overflow-auto space-y-4">
                {!askResponse ? (
                  <div className="rounded-lg border border-dashed border-slate-300 p-4 text-sm text-slate-500">
                    Ask a question to get an answer with supporting ESG
                    evidence.
                  </div>
                ) : (
                  <>
                    <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
                      <p className="mb-2 text-sm font-semibold text-slate-900">
                        Answer
                      </p>
                      <p className="whitespace-pre-line text-sm text-slate-700">
                        {askResponse.answer}
                      </p>
                    </div>

                    <div>
                      <p className="mb-2 text-sm font-semibold text-slate-900">
                        Evidence
                      </p>
                      <div className="space-y-3">
                        {askResponse.evidence.map((item, index) => (
                          <div
                            key={`${item.page}-${index}`}
                            className="rounded-lg border border-slate-200 p-3"
                          >
                            <p className="mb-1 text-xs font-medium uppercase tracking-wide text-slate-500">
                              Page {item.page} · {item.category} ·{" "}
                              {item.claim_type}
                            </p>
                            <p className="text-sm text-slate-700">
                              {item.sentence}
                            </p>
                            <p className="mt-2 text-xs text-slate-500">
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
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <p className="text-sm text-slate-500">{title}</p>
      <p className="mt-2 text-2xl font-semibold text-slate-900">{value}</p>
    </div>
  );
}