"use client";

import { toPng } from "html-to-image";
import { jsPDF } from "jspdf";
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
const EXPORT_BACKGROUND_COLOR = "#0b1320";
const MAX_EXPORT_CANVAS_EDGE = 4096;
const MAX_EXPORT_CANVAS_AREA = 12000000;

export default function HomePage() {
  const dashboardRef = useRef<HTMLDivElement | null>(null);
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
            <div className="mb-3 rounded-2xl border border-slate-700 bg-slate-950/70 px-3 py-2 text-sm text-slate-200">
              Showing {filteredClaims?.length} claims for:{" "}
              <span className="font-semibold text-slate-100">{selectedCategory}</span>
              <button
                className="ml-3 text-sky-300 hover:underline"
                onClick={() => setSelectedCategory(null)}
              >
                Clear
              </button>
            </div>
          )}

          {!analysis ? (
            <p className="text-sm text-slate-300">
              Analyze a report to see ESG claims.
            </p>
          ) : (
            <div className="max-h-[420px] overflow-auto rounded-2xl border border-slate-700 bg-slate-950/65 shadow-inner">
              <table className="min-w-full text-sm text-slate-200">
                <thead className="sticky top-0 bg-slate-900 text-left text-slate-100 backdrop-blur">
                  <tr>
                    <th className="px-3 py-3 font-semibold">Page</th>
                    <th className="px-3 py-3 font-semibold">Category</th>
                    <th className="px-3 py-3 font-semibold">Claim Type</th>
                    <th className="px-3 py-3 font-semibold">Sentence</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredClaims?.slice(0, 100).map((claim, index) => (
                    <tr
                      key={`${claim.page}-${index}`}
                      className="border-t border-slate-800 align-top odd:bg-slate-900/20 even:bg-slate-950/30"
                    >
                      <td className="px-3 py-3 text-slate-300">{claim.page}</td>
                      <td className="px-3 py-3 font-medium text-slate-100">{claim.category}</td>
                      <td className="px-3 py-3 text-slate-300">{claim.claim_type}</td>
                      <td className="px-3 py-3 leading-6 text-slate-200">
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
        <p className="text-sm text-slate-300">
          Analyze a report to see top ESG keywords.
        </p>
      ) : (
        <div className="flex flex-wrap gap-2">
          {analysis.claims.slice(0, 20).map((c, i) => (
            <span
              key={i}
              className="rounded-full border border-sky-500/30 bg-sky-500/12 px-3 py-1 text-xs text-sky-200"
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
        <p className="text-sm text-slate-300">
          Analyze a report to preview extracted pages.
        </p>
      ) : (
            <div className="space-y-4">
              {analysis.page_preview.map((page) => (
                <div
                  key={page.page}
                  className="rounded-2xl border border-slate-700 bg-slate-950/55 p-4"
                >
              <p className="mb-2 text-sm font-medium text-slate-100">
                Page {page.page}
              </p>
              <p className="text-sm leading-6 text-slate-200">
                {page.text.slice(0, 500)}...
              </p>
            </div>
          ))}
        </div>
      ),
    },
  ];

  function getDashboardExportSettings() {
    if (!dashboardRef.current) {
      throw new Error("Dashboard export target is not available.");
    }

    const target = dashboardRef.current;
    const width = Math.ceil(Math.max(target.scrollWidth, target.clientWidth));
    const height = Math.ceil(Math.max(target.scrollHeight, target.clientHeight));
    const safeWidth = Math.max(width, 1);
    const safeHeight = Math.max(height, 1);
    const edgeScale = Math.min(
      MAX_EXPORT_CANVAS_EDGE / safeWidth,
      MAX_EXPORT_CANVAS_EDGE / safeHeight
    );
    const areaScale = Math.sqrt(
      MAX_EXPORT_CANVAS_AREA / (safeWidth * safeHeight)
    );
    const exportScale = Math.max(0.75, Math.min(2, edgeScale, areaScale));

    return {
      target,
      width: safeWidth,
      height: safeHeight,
      canvasWidth: Math.max(1, Math.round(safeWidth * exportScale)),
      canvasHeight: Math.max(1, Math.round(safeHeight * exportScale)),
      pixelRatio: exportScale,
    };
  }

  async function captureDashboardExportImage() {
    const settings = getDashboardExportSettings();

    const dataUrl = await toPng(settings.target, {
      cacheBust: true,
      pixelRatio: settings.pixelRatio,
      backgroundColor: EXPORT_BACKGROUND_COLOR,
      width: settings.width,
      height: settings.height,
      canvasWidth: settings.canvasWidth,
      canvasHeight: settings.canvasHeight,
      style: {
        width: `${settings.width}px`,
        height: `${settings.height}px`,
        maxWidth: "none",
      },
    });

    return dataUrl;
  }

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

  function handleExportCsv() {
    if (!analysis) {
      setError("Analyze a report before exporting CSV.");
      return;
    }

    setError(null);

    const escapeCsvValue = (value: string | number | null | undefined) => {
      const stringValue = value == null ? "" : String(value);
      const escaped = stringValue.replace(/"/g, '""');
      return `"${escaped}"`;
    };

    const metricRows = Object.entries(analysis.metrics).map(([key, value]) =>
      [key, value == null ? "" : String(value)].map(escapeCsvValue).join(",")
    );

    const claimRows = analysis.claims.map((claim) =>
      [
        claim.page,
        claim.category,
        claim.claim_type,
        claim.sentence,
        claim.reason,
        claim.matched_keywords,
      ]
        .map(escapeCsvValue)
        .join(",")
    );

    const csvContent = [
      ["Section", "Field", "Value"].map(escapeCsvValue).join(","),
      ["Report", "report_name", analysis.report_name].map(escapeCsvValue).join(","),
      ...(selectedFile
        ? [["Report", "selected_file", selectedFile.name].map(escapeCsvValue).join(",")]
        : []),
      "",
      ["Section", "Metric", "Value"].map(escapeCsvValue).join(","),
      ...metricRows.map((row) => `${escapeCsvValue("Metrics")},${row}`),
      "",
      [
        "page",
        "category",
        "claim_type",
        "sentence",
        "reason",
        "matched_keywords",
      ]
        .map(escapeCsvValue)
        .join(","),
      ...claimRows,
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    const safeName = analysis.report_name.replace(/[^a-z0-9-_]+/gi, "_");

    link.href = url;
    link.download = `${safeName || "esg_analysis"}_analysis.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  async function handleExportSnapshot() {
    try {
      setError(null);
      const dataUrl = await captureDashboardExportImage();

      const link = document.createElement("a");
      const baseName = analysis?.report_name || selectedFile?.name || "esg_dashboard";
      const safeName = baseName.replace(/[^a-z0-9-_]+/gi, "_");

      link.href = dataUrl;
      link.download = `${safeName}_snapshot.png`;
      link.click();
    } catch {
      setError("Snapshot export failed. Try again after the dashboard finishes rendering.");
    }
  }

  async function handleExportPdf() {
    if (!analysis) {
      setError("Analyze a report before exporting PDF.");
      return;
    }

    try {
      setError(null);

      const pdf = new jsPDF({
        orientation: "portrait",
        unit: "pt",
        format: "a4",
      });

      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const margin = 40;
      let cursorY = 52;

      pdf.setFillColor(11, 19, 32);
      pdf.rect(0, 0, pageWidth, pageHeight, "F");

      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(20);
      pdf.setTextColor(236, 245, 255);
      pdf.text("ESG Disclosure Analyzer", margin, cursorY);

      cursorY += 24;
      pdf.setFontSize(11);
      pdf.setFont("helvetica", "normal");
      pdf.setTextColor(148, 163, 184);
      pdf.text(`Report: ${analysis.report_name}`, margin, cursorY);

      cursorY += 28;
      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(13);
      pdf.setTextColor(236, 245, 255);
      pdf.text("KPI Summary", margin, cursorY);

      cursorY += 18;
      pdf.setFont("helvetica", "normal");
      pdf.setFontSize(11);
      pdf.setTextColor(203, 213, 225);

      const metricLines = [
        `ESG Sentences: ${analysis.metrics.total_esg_sentences}`,
        `Measurability Score: ${analysis.metrics.measurability_score}%`,
        `Vagueness Risk: ${analysis.metrics.vagueness_risk}%`,
        `Disclosure Quality: ${analysis.metrics.disclosure_quality_score}/100`,
        ...(analysis.metrics.esg_coverage != null
          ? [`ESG Coverage: ${analysis.metrics.esg_coverage}%`]
          : []),
      ];

      metricLines.forEach((line) => {
        pdf.text(line, margin, cursorY);
        cursorY += 16;
      });

      cursorY += 8;
      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(13);
      pdf.setTextColor(236, 245, 255);
      pdf.text("Claims Summary", margin, cursorY);

      cursorY += 18;
      pdf.setFont("helvetica", "normal");
      pdf.setFontSize(11);
      pdf.setTextColor(203, 213, 225);
      pdf.text(`Total extracted claims: ${analysis.claims.length}`, margin, cursorY);

      if (askResponse?.answer) {
        cursorY += 24;
        pdf.setFont("helvetica", "bold");
        pdf.setFontSize(13);
        pdf.setTextColor(236, 245, 255);
        pdf.text("AI Summary", margin, cursorY);

        cursorY += 18;
        pdf.setFont("helvetica", "normal");
        pdf.setFontSize(10);
        pdf.setTextColor(203, 213, 225);
        const summaryLines = pdf.splitTextToSize(
          askResponse.answer,
          pageWidth - margin * 2
        );
        pdf.text(summaryLines.slice(0, 8), margin, cursorY);
        cursorY += Math.min(summaryLines.length, 8) * 13 + 12;
      } else {
        cursorY += 24;
      }

      if (dashboardRef.current) {
        const snapshot = await captureDashboardExportImage();

        const snapshotDimensions = await new Promise<{
          width: number;
          height: number;
        }>((resolve, reject) => {
          const img = new Image();
          img.onload = () =>
            resolve({
              width: img.naturalWidth,
              height: img.naturalHeight,
            });
          img.onerror = () => reject(new Error("Snapshot size read failed."));
          img.src = snapshot;
        });

        const maxImageWidth = pageWidth - margin * 2;
        const maxImageHeight = pageHeight - cursorY - margin;
        const widthScale =
          snapshotDimensions.width > 0
            ? maxImageWidth / snapshotDimensions.width
            : 1;
        const heightScale =
          snapshotDimensions.height > 0
            ? maxImageHeight / snapshotDimensions.height
            : 1;
        const scale = Math.min(widthScale, heightScale);
        const imageWidth = snapshotDimensions.width * scale;
        const imageHeight = snapshotDimensions.height * scale;

        if (imageHeight > 80 && imageWidth > 80) {
          pdf.setFont("helvetica", "bold");
          pdf.setFontSize(13);
          pdf.setTextColor(236, 245, 255);
          pdf.text("Dashboard Snapshot", margin, cursorY);
          cursorY += 14;
          pdf.addImage(snapshot, "PNG", margin, cursorY, imageWidth, imageHeight);
        }
      }

      const baseName = analysis.report_name || selectedFile?.name || "esg_dashboard";
      const safeName = baseName.replace(/[^a-z0-9-_]+/gi, "_");
      pdf.save(`${safeName}_summary.pdf`);
    } catch {
      setError("PDF export failed. Try again after the dashboard finishes rendering.");
    }
  }

  return (
    <main className="min-h-screen">
        <div ref={dashboardRef} className="mx-auto max-w-[1500px]">
          <header
            id="dashboard-section"
            className="mb-3 grid scroll-mt-20 gap-2.5 xl:grid-cols-12 xl:items-start"
          >
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

          <div className="dashboard-card section-tile w-full rounded-3xl p-3 xl:col-span-6">
            <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-400">
              Dashboard
            </p>
            <h1 className="mt-1 text-[1.55rem] font-semibold tracking-tight text-slate-50 lg:text-[1.72rem]">
              ESG Disclosure Analyzer
            </h1>
            <div className="mt-2.5 inline-flex max-w-full rounded-2xl border border-slate-700/80 bg-slate-950/60 px-3 py-2 text-sm text-slate-300">
              {selectedFile ? (
                <span>
                  Selected file:{" "}
                  <span className="font-medium text-slate-100">
                    {selectedFile.name}
                  </span>
                </span>
              ) : analysis ? (
                <span>
                  Active report:{" "}
                  <span className="font-medium text-slate-100">
                    {analysis.report_name}
                  </span>
                </span>
              ) : (
                "Upload a PDF to run analysis."
              )}
            </div>
            <p className="mt-2.5 max-w-3xl text-sm leading-6 text-slate-300">
              Analyze sustainability reports, identify measurable ESG claims, and
              ask AI questions about disclosures.
            </p>
          </div>

              <div className="dashboard-card flex h-full min-w-0 flex-col rounded-3xl border border-slate-700/80 bg-slate-950/55 p-2.5 shadow-sm xl:col-span-3">
                <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-slate-400">
                  Actions
                </p>
                <p className="mt-1 text-[13px] leading-5 text-slate-300">
                  Manage the current report workflow.
                </p>

                <div className="mt-2.5 flex flex-wrap gap-1.5">
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="rounded-xl border border-slate-700 bg-slate-900/90 px-2.5 py-1.5 text-[12px] font-medium text-slate-100 transition hover:bg-slate-800"
                  >
                    {selectedFile ? "Replace PDF" : "Upload PDF"}
                  </button>
                  <button
                    onClick={handleAnalyze}
                    disabled={analyzeLoading}
                    className="rounded-xl bg-sky-400 px-2.5 py-1.5 text-[12px] font-semibold text-slate-950 transition hover:bg-sky-300 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {analyzeLoading ? "Analyzing..." : "Analyze Report"}
                  </button>
                  <button
                    onClick={handleReset}
                    className="rounded-xl border border-slate-700 bg-slate-900/90 px-2.5 py-1.5 text-[12px] font-medium text-slate-100 transition hover:bg-slate-800"
                  >
                    Reset
                  </button>
                </div>
              </div>

              <div className="dashboard-card flex h-full min-w-0 flex-col rounded-3xl border border-slate-700/80 bg-slate-950/55 p-2.5 shadow-sm xl:col-span-3">
                <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-slate-400">
                  Export
                </p>
                <p className="mt-1 text-[13px] leading-5 text-slate-300">
                  Download the latest dashboard output.
                </p>
                <div className="mt-2.5 flex flex-wrap gap-1.5">
                  <button
                    onClick={handleExportPdf}
                    disabled={!analysis}
                    className="rounded-xl border border-slate-700 bg-slate-900/90 px-2.5 py-1.5 text-[12px] font-medium text-slate-100 transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    Export PDF
                  </button>
                  <button
                    onClick={handleExportCsv}
                    disabled={!analysis}
                    className="rounded-xl border border-slate-700 bg-slate-900/90 px-2.5 py-1.5 text-[12px] font-medium text-slate-100 transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    Export CSV
                  </button>
                  <button
                    onClick={handleExportSnapshot}
                    className="rounded-xl border border-slate-700 bg-slate-900/90 px-2.5 py-1.5 text-[12px] font-medium text-slate-100 transition hover:bg-slate-800"
                  >
                    Export Snapshot
                  </button>
              </div>
            </div>
          </header>

        {error && (
          <div className="mb-4 rounded-2xl border border-red-500/30 bg-red-500/12 px-4 py-2.5 text-sm text-red-200 shadow-sm">
            {error}
          </div>
        )}

        <div className="grid grid-cols-1 gap-3.5 xl:grid-cols-12 xl:items-start">
          <div className="space-y-4 xl:col-span-9">
            <section className="dashboard-card section-tile space-y-3.5 rounded-3xl p-4 lg:p-5">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-400">
                    KPI Section
                  </p>
                  <h2 className="mt-1 text-base font-semibold text-slate-50">
                    Core Metrics
                  </h2>
                </div>
                <div className="rounded-full border border-slate-700 bg-slate-900/70 px-3 py-1 text-xs font-medium text-slate-400 shadow-sm">
                  4 headline metrics
                </div>
              </div>
              <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 xl:grid-cols-4">
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
                  <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-400">
                    Chart Section
                  </p>
                  <h2 className="mt-1 text-base font-semibold text-slate-50">
                    Disclosure Overview
                  </h2>
                </div>
                <div className="rounded-full border border-slate-700 bg-slate-900/70 px-3 py-1 text-xs font-medium text-slate-400 shadow-sm">
                  5 visual summaries
                </div>
              </div>

              <div className="grid grid-cols-1 gap-2.5 lg:grid-cols-6">
                <div className="dashboard-card chart-tile rounded-3xl p-3.5 lg:col-span-3">
                  <h2 className="mb-3 text-base font-semibold text-slate-50">
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

                <div className="dashboard-card chart-tile rounded-3xl p-3.5 lg:col-span-3">
                  <h2 className="mb-3 text-base font-semibold text-slate-50">
                    Claim Type Breakdown
                  </h2>
                  {analysis ? (
                    <ESGCategoryChart data={claimTypeChartData} />
                  ) : (
                    <p className="text-sm text-slate-500">No chart data yet.</p>
                  )}
                </div>

                <div className="dashboard-card chart-tile rounded-3xl p-3.5 lg:col-span-4">
                  <h2 className="mb-3 text-base font-semibold text-slate-50">
                    Claim Quality by ESG Category
                  </h2>
                  {analysis ? (
                    <ClaimQualityByCategoryChart data={stackedCategoryData} />
                  ) : (
                    <p className="text-sm text-slate-500">No chart data yet.</p>
                  )}
                </div>

                <div className="dashboard-card chart-tile rounded-3xl p-3.5 lg:col-span-2">
                  <h2 className="mb-3 text-base font-semibold text-slate-50">
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

                <div className="dashboard-card chart-tile rounded-3xl p-3.5 lg:col-span-6">
                  <h2 className="mb-3 text-base font-semibold text-slate-50">
                    Page-Level ESG Density
                  </h2>
                  {analysis ? (
                    <PageDensityChart
                      data={analysis?.chart_data?.page_density ?? []}
                    />
                  ) : (
                    <p className="text-sm text-slate-500">No chart data yet.</p>
                  )}
                </div>
              </div>
            </section>

          </div>

          <div id="assistant-section" className="scroll-mt-20 xl:col-span-3">
            <div className="dashboard-card assistant-tile sticky top-4 rounded-[28px] p-4">
              <div className="mb-3 flex items-start justify-between gap-3 border-b border-slate-200/80 pb-3.5">
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-cyan-200/70">
                    Assistant
                  </p>
                  <h2 className="mt-1 text-lg font-semibold tracking-tight text-slate-50">
                    AI ESG Assistant
                  </h2>
                  <p className="mt-1 text-sm text-slate-300">
                    Ask focused questions and review evidence-backed answers.
                  </p>
                </div>
                <div className="rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-[11px] font-medium text-emerald-700">
                  Live context
                </div>
              </div>

              <div className="mb-3 rounded-3xl border border-slate-700/80 bg-[linear-gradient(180deg,rgba(15,23,42,0.96),rgba(8,15,28,0.94))] p-3.5 shadow-sm">
                <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-slate-400">
                  Active report
                </p>
                <p className="mt-2 text-sm font-medium text-slate-100">
                  {analysis ? analysis.report_name : "No report analyzed yet"}
                </p>
                <p className="mt-1 text-sm text-slate-300">
                  {analysis
                    ? "Questions use the current ESG analysis and extracted evidence."
                    : "Analyze a report first, then ask questions about its ESG disclosures."}
                </p>
              </div>

              <div className="mb-3">
                <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.22em] text-slate-400">
                  Suggested prompts
                </p>
                <div className="grid grid-cols-1 gap-2">
                  <button
                    onClick={() =>
                      setQuestion("Summarize this company\u2019s ESG strategy.")
                    }
                    className="w-full rounded-2xl border border-slate-700 bg-slate-900/90 px-3 py-2.5 text-left text-sm font-medium text-slate-100 shadow-sm transition hover:-translate-y-1 hover:border-cyan-500/40 hover:bg-slate-800"
                  >
                    Summarize this company&apos;s ESG strategy
                  </button>
                  <button
                    onClick={() =>
                      setQuestion("Why did this report get this score?")
                    }
                    className="w-full rounded-2xl border border-slate-700 bg-slate-900/90 px-3 py-2.5 text-left text-sm font-medium text-slate-100 shadow-sm transition hover:-translate-y-1 hover:border-cyan-500/40 hover:bg-slate-800"
                  >
                    Why did this report get this score?
                  </button>
                  <button
                    onClick={() => setQuestion("Find potential greenwashing language in this report.")}
                    className="w-full rounded-2xl border border-slate-700 bg-slate-900/90 px-3 py-2.5 text-left text-sm font-medium text-slate-100 shadow-sm transition hover:-translate-y-1 hover:border-cyan-500/40 hover:bg-slate-800"
                  >
                    Find potential greenwashing language
                  </button>
                  <button
                    onClick={() => setQuestion("What is missing from this report?")}
                    className="w-full rounded-2xl border border-slate-700 bg-slate-900/90 px-3 py-2.5 text-left text-sm font-medium text-slate-100 shadow-sm transition hover:-translate-y-1 hover:border-cyan-500/40 hover:bg-slate-800"
                  >
                    What is missing from this report?
                  </button>
                  <button
                    onClick={() => setQuestion("Rewrite vague claims into measurable ones.")}
                    className="w-full rounded-2xl border border-slate-700 bg-slate-900/90 px-3 py-2.5 text-left text-sm font-medium text-slate-100 shadow-sm transition hover:-translate-y-1 hover:border-cyan-500/40 hover:bg-slate-800"
                  >
                    Rewrite vague claims into measurable ones
                  </button>
                </div>
              </div>

              <div className="mb-3 rounded-3xl border border-slate-700 bg-slate-950/80 p-3 shadow-sm">
                <textarea
                  value={question}
                  onChange={(e) => setQuestion(e.target.value)}
                  rows={4}
                  placeholder="Ask about this report..."
                  className="mb-3 w-full resize-none rounded-2xl border border-slate-700 bg-slate-900/80 p-3 text-sm text-slate-100 outline-none transition focus:border-cyan-400"
                />

                <div className="flex items-center justify-between gap-3">
                  <p className="text-xs text-slate-400">
                    Answers include supporting report evidence.
                  </p>
                  <button
                    onClick={handleAsk}
                    disabled={askLoading}
                    className="rounded-2xl bg-cyan-400 px-4 py-2.5 text-sm font-semibold text-slate-950 transition hover:bg-cyan-300 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {askLoading ? "Thinking..." : "Ask"}
                  </button>
                </div>
              </div>

              <div className="max-h-[500px] overflow-auto space-y-3.5">
                {!askResponse ? (
                  <div className="rounded-3xl border border-dashed border-slate-700 bg-slate-950/55 p-5 text-sm text-slate-400">
                    <p className="font-medium text-slate-100">No response yet</p>
                    <p className="mt-1">
                      Ask a question to get an answer with supporting ESG
                      evidence.
                    </p>
                  </div>
                ) : (
                  <>
                    <div className="rounded-3xl border border-slate-700 bg-[linear-gradient(180deg,rgba(15,23,42,0.96),rgba(8,15,28,0.94))] p-4 shadow-sm">
                      <div className="mb-3 flex items-center justify-between gap-3">
                        <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-slate-400">
                          Response
                        </p>
                        <div className="rounded-full border border-slate-700 bg-slate-900 px-2.5 py-1 text-[11px] font-medium text-slate-400">
                          AI summary
                        </div>
                      </div>
                      <p className="mb-2 text-sm font-semibold text-slate-100">
                        Answer
                      </p>
                      <p className="whitespace-pre-line text-sm leading-6 text-slate-200">
                        {askResponse.answer}
                      </p>
                    </div>

                    <div>
                      <div className="mb-3 flex items-center justify-between gap-3">
                        <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-slate-400">
                          Supporting context
                        </p>
                        <div className="rounded-full border border-slate-700 bg-slate-900 px-2.5 py-1 text-[11px] font-medium text-slate-400">
                          {askResponse.evidence.length} evidence items
                        </div>
                      </div>
                      <p className="mb-2 text-sm font-semibold text-slate-100">
                        Evidence
                      </p>
                      <div className="space-y-3">
                        {askResponse.evidence.map((item, index) => (
                          <div
                            key={`${item.page}-${index}`}
                            className="rounded-3xl border border-slate-700 bg-slate-950/80 p-4 shadow-sm"
                          >
                            <p className="hidden">
                              Page {item.page} · {item.category} ·{" "}
                              {item.claim_type}
                            </p>
                            <div className="mb-3 flex flex-wrap gap-2">
                              <span className="rounded-full border border-slate-700 bg-slate-900 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400">
                                Page {item.page}
                              </span>
                              <span className="rounded-full border border-blue-200 bg-blue-50 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-blue-700">
                                {item.category}
                              </span>
                              <span className="rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-amber-700">
                                {item.claim_type}
                              </span>
                            </div>
                            <p className="text-sm leading-6 text-slate-200">
                              {item.sentence}
                            </p>
                            <p className="mt-3 rounded-2xl bg-slate-900 px-3 py-2 text-xs leading-5 text-slate-400">
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

        <div
          id="claims-section"
          className="dashboard-card section-tile mt-4 scroll-mt-20 rounded-3xl p-4 lg:p-5"
        >
          <div id="pages-section" className="scroll-mt-20" />
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-base font-semibold text-slate-50">
              Report Details
            </h2>
            <div className="rounded-full border border-slate-700 bg-slate-900/70 px-3 py-1 text-xs font-medium text-slate-400 shadow-sm">
              Wide data view
            </div>
          </div>
          <div className="mt-3">
            <TabPanel tabs={lowerContentTabs} />
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
    <div className="dashboard-card metric-card rounded-3xl px-4 py-3.5 sm:px-4 sm:py-4">
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-3">
          <p className="text-[10px] font-medium uppercase tracking-[0.24em] text-slate-500">
            {title}
          </p>
          <p className="text-[2rem] font-semibold tracking-[-0.04em] text-slate-50 sm:text-[2.05rem]">
            {value}
          </p>
        </div>
        <div className="mt-0.5 h-2.5 w-2.5 rounded-full bg-cyan-400/80 shadow-[0_0_18px_rgba(34,211,238,0.4)]" />
      </div>
      <div className="mt-4 h-px w-full bg-slate-800/90" />
    </div>
  );
}
