import { useMemo, useState } from "react";
import {
  AlertCircle,
  BookOpen,
  Check,
  Code2,
  Copy,
  Download,
  FileText,
  ImageDown,
  ListChecks,
  Loader2,
} from "lucide-react";
import type { GeneratedReport, OutputTab, ReportPartition } from "../types/report";
import { downloadReportAsPdf } from "../utils/pdfExport";

interface OutputPanelProps {
  activeTab: OutputTab;
  onTabChange: (tab: OutputTab) => void;
  isGenerating: boolean;
  error: string | null;
  report: GeneratedReport | null;
}

const COVER_IMAGE_PATH = "/assets/aistudio/Cover_6d14fc85.png";

function buildSafeFilename(reportPeriod: string): string {
  const slug = reportPeriod
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
  return slug ? `weekly_permit_report_${slug}.tex` : "weekly_permit_report.tex";
}

function getEffectivePartitions(report: GeneratedReport): ReportPartition[] {
  if (Array.isArray(report.partitions) && report.partitions.length > 0) {
    return report.partitions;
  }
  return [
    {
      sectionNumber: 1,
      code: "PM",
      title: "Preventive Maintenance (PM) Activities",
      items: report.permits,
    },
  ];
}

export function OutputPanel({
  activeTab,
  onTabChange,
  isGenerating,
  error,
  report,
}: OutputPanelProps) {
  const [copied, setCopied] = useState(false);
  const [isExportingPdf, setIsExportingPdf] = useState(false);

  const latexLines = useMemo(() => {
    if (!report?.latexCode) return [];
    return report.latexCode.split("\n");
  }, [report?.latexCode]);

  const partitions = useMemo(() => {
    if (!report) return [];
    return getEffectivePartitions(report);
  }, [report]);

  const handleCopyCode = async () => {
    if (!report?.latexCode) return;
    try {
      await navigator.clipboard.writeText(report.latexCode);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      const textarea = document.createElement("textarea");
      textarea.value = report.latexCode;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand("copy");
      document.body.removeChild(textarea);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleDownloadTex = () => {
    if (!report?.latexCode) return;
    const blob = new Blob([report.latexCode], {
      type: "application/x-tex;charset=utf-8",
    });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = buildSafeFilename(report.reportPeriod);
    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);
    URL.revokeObjectURL(url);
  };

  const handleDownloadPdf = async () => {
    if (!report || isExportingPdf) return;
    setIsExportingPdf(true);
    try {
      await downloadReportAsPdf(report);
    } finally {
      setIsExportingPdf(false);
    }
  };

  // Precompute continuous 01..NN numbering across all partitions
  const numberedPartitions = useMemo(() => {
    let counter = 1;
    return partitions.map((part) => ({
      ...part,
      numberedItems: part.items.map((item) => {
        const rowNo = String(counter).padStart(2, "0");
        counter += 1;
        return { ...item, rowNo };
      }),
    }));
  }, [partitions]);

  return (
    <section
      id="output-panel"
      className="flex flex-col min-w-0 rounded-xl border border-slate-200 bg-white overflow-hidden min-h-[420px] lg:min-h-[640px]"
    >
      {/* Output Panel Header & Segmented Tab Switcher */}
      <div className="flex flex-col sm:flex-row sm:flex-wrap sm:items-center sm:justify-between gap-3 sm:gap-4 border-b border-slate-200 px-3 sm:px-5 py-3 sm:py-3.5 bg-white min-w-0">
        <div
          role="tablist"
          aria-label="Report Output Views"
          className="flex w-full sm:w-auto max-w-full items-center gap-1 overflow-x-auto touch-pan-x overscroll-x-contain rounded-lg bg-slate-100 p-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        >
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === "summary"}
            onClick={() => onTabChange("summary")}
            className={`inline-flex items-center justify-center gap-1.5 sm:gap-2 rounded-md px-3 sm:px-3.5 py-2 text-xs sm:text-sm font-medium transition-colors whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0088CE] ${
              activeTab === "summary"
                ? "bg-white text-[#1B365D] shadow-sm"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <ListChecks className="h-3.5 w-3.5 sm:h-4 sm:w-4 shrink-0" />
            <span>Extracted Summary</span>
          </button>

          <button
            type="button"
            role="tab"
            aria-selected={activeTab === "preview"}
            onClick={() => onTabChange("preview")}
            className={`inline-flex items-center justify-center gap-1.5 sm:gap-2 rounded-md px-3 sm:px-3.5 py-2 text-xs sm:text-sm font-medium transition-colors whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0088CE] ${
              activeTab === "preview"
                ? "bg-white text-[#1B365D] shadow-sm"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <BookOpen className="h-3.5 w-3.5 sm:h-4 sm:w-4 shrink-0" />
            <span>2-Page Preview</span>
          </button>

          <button
            type="button"
            role="tab"
            aria-selected={activeTab === "latex"}
            onClick={() => onTabChange("latex")}
            className={`inline-flex items-center justify-center gap-1.5 sm:gap-2 rounded-md px-3 sm:px-3.5 py-2 text-xs sm:text-sm font-medium transition-colors whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0088CE] ${
              activeTab === "latex"
                ? "bg-white text-[#1B365D] shadow-sm"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <Code2 className="h-3.5 w-3.5 sm:h-4 sm:w-4 shrink-0" />
            <span>LaTeX Code</span>
          </button>
        </div>

        {report && !isGenerating && (
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-slate-500 tabular-nums">
            <span className="font-mono">{report.reportPeriod}</span>
            <span aria-hidden="true">·</span>
            <span>
              {report.permits.length}{" "}
              {report.permits.length === 1 ? "job" : "jobs"}
            </span>
            <span aria-hidden="true">·</span>
            <span>
              {partitions.map((p) => p.code).join(" / ")}
            </span>
          </div>
        )}
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {error && (
          <div className="p-6">
            <div
              role="alert"
              className="flex items-start gap-3 rounded-lg border border-red-200 bg-red-50 px-4 py-3.5 text-sm text-red-900"
            >
              <AlertCircle className="h-5 w-5 text-red-600 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <p className="font-semibold">Unable to generate report</p>
                <p className="text-red-800">{error}</p>
              </div>
            </div>
          </div>
        )}

        {isGenerating && (
          <div className="p-6 space-y-5" aria-live="polite">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div className="space-y-1.5">
                <div className="h-4 w-48 rounded bg-slate-200 animate-pulse" />
                <div className="h-3 w-72 rounded bg-slate-100 animate-pulse" />
              </div>
              <span className="text-xs font-medium text-[#0088CE]">
                Classifying PM / CM / COMM / ENG &amp; sorting by date...
              </span>
            </div>

            {[1, 2, 3].map((row) => (
              <div
                key={row}
                className="rounded-lg border border-slate-100 p-4 space-y-3"
              >
                <div className="flex items-center gap-3">
                  <div className="h-3.5 w-8 rounded bg-slate-200 animate-pulse" />
                  <div className="h-3.5 w-40 rounded bg-slate-200 animate-pulse" />
                  <div className="h-3.5 w-24 rounded bg-slate-100 animate-pulse" />
                </div>
                <div className="h-4 w-56 rounded bg-slate-200 animate-pulse" />
                <div className="space-y-2 pt-1">
                  <div className="h-3 w-full rounded bg-slate-100 animate-pulse" />
                  <div className="h-3 w-5/6 rounded bg-slate-100 animate-pulse" />
                </div>
              </div>
            ))}
          </div>
        )}

        {!isGenerating && !error && !report && (
          <div className="flex-1 flex flex-col items-center justify-center p-6 sm:p-10 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-slate-200 bg-slate-50 text-[#1B365D] mb-4">
              <FileText className="h-6 w-6" />
            </div>
            <h2 className="text-base font-semibold text-slate-900">
              No weekly report generated yet
            </h2>
            <p className="mt-1.5 max-w-md text-sm text-slate-500 leading-relaxed">
              Upload one or more permit photos and enter the Report Period to
              build the 2-page GASCO report with PM, CM, COMM (if available),
              and ENG (if available) sections sorted by date.
            </p>
            <div className="mt-8 grid grid-cols-1 sm:grid-cols-3 gap-4 max-w-xl w-full text-left border-t border-slate-100 pt-6">
              <div className="space-y-1">
                <div className="text-xs font-mono font-medium text-[#0088CE]">
                  01. Classify
                </div>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Automatically partitions jobs into PM, CM, COMM, and ENG when
                  present.
                </p>
              </div>
              <div className="space-y-1">
                <div className="text-xs font-mono font-medium text-[#0088CE]">
                  02. Sort by Date
                </div>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Orders activities chronologically within every section and
                  numbers 01..N.
                </p>
              </div>
              <div className="space-y-1">
                <div className="text-xs font-mono font-medium text-[#0088CE]">
                  03. Export
                </div>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Preview the 2-page cover + table layout and download the .tex
                  and cover.png files.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Tab 1: Extracted Summary */}
        {!isGenerating && report && activeTab === "summary" && (
          <div className="p-4 sm:p-6 space-y-6 sm:space-y-8">
            {numberedPartitions.map((partition) => (
              <div key={partition.code} className="space-y-3">
                <div className="flex flex-wrap items-baseline justify-between gap-2 border-b border-slate-200 pb-2">
                  <h3 className="text-sm font-semibold text-[#1B365D]">
                    {partition.sectionNumber}. {partition.title}
                  </h3>
                  <span className="text-xs text-slate-500 tabular-nums">
                    {partition.numberedItems.length}{" "}
                    {partition.numberedItems.length === 1 ? "job" : "jobs"} ·
                    sorted by date
                  </span>
                </div>

                <div className="space-y-3">
                  {partition.numberedItems.map((permit) => (
                    <article
                      key={`${permit.rowNo}-${permit.photoIndex}`}
                      className="rounded-lg border border-slate-200 bg-white p-3.5 sm:p-4 space-y-2.5"
                    >
                      <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 text-xs text-slate-500 tabular-nums">
                        <span className="font-mono font-semibold text-[#1B365D]">
                          {permit.rowNo}
                        </span>
                        <span aria-hidden="true">·</span>
                        <span className="font-mono font-medium text-slate-700">
                          {permit.date}
                        </span>
                        <span aria-hidden="true">·</span>
                        <span>Permit {permit.permitNumber}</span>
                        {permit.photoName && (
                          <>
                            <span aria-hidden="true">·</span>
                            <span className="text-slate-400 truncate max-w-[180px] sm:max-w-[220px]">
                              {permit.photoName}
                            </span>
                          </>
                        )}
                      </div>

                      <h4 className="text-sm font-semibold text-[#1B365D]">
                        {permit.equipment}
                      </h4>

                      <ul className="space-y-1 text-sm text-slate-700 leading-relaxed list-disc pl-5">
                        {permit.summaryBullets.map((bullet, bIdx) => (
                          <li key={bIdx}>{bullet}</li>
                        ))}
                      </ul>
                    </article>
                  ))}
                </div>
              </div>
            ))}

            {/* Partitioned Summary Table Preview */}
            <div className="space-y-3 pt-2 border-t border-slate-200">
              <div className="flex items-baseline justify-between gap-4">
                <h3 className="text-sm font-semibold text-slate-900">
                  Summary of Site Activities Table
                </h3>
                <span className="text-xs text-slate-500 tabular-nums">
                  {report.permits.length}{" "}
                  {report.permits.length === 1 ? "row" : "rows"}
                </span>
              </div>

              <div className="overflow-x-auto rounded-lg border border-slate-200">
                <table className="w-full min-w-[540px] text-left border-collapse text-sm">
                  <thead>
                    <tr className="bg-[#1F4E79] text-white text-xs font-semibold">
                      <th className="py-2.5 px-3 w-12 text-center">No.</th>
                      <th className="py-2.5 px-3 w-48">Equipment</th>
                      <th className="py-2.5 px-3">Activity</th>
                      <th className="py-2.5 px-3 w-28 text-center">Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {numberedPartitions.map((partition) => (
                      <FragmentGroup
                        key={partition.code}
                        partition={partition}
                      />
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* Tab 2: 2-Page Report Preview */}
        {!isGenerating && report && activeTab === "preview" && (
          <div className="flex-1 flex flex-col min-w-0">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 bg-slate-50 px-4 sm:px-5 py-3">
              <div className="flex items-center gap-2 text-xs text-slate-600 tabular-nums">
                <span className="font-medium text-slate-800">
                  A4 Report Preview
                </span>
                <span aria-hidden="true">·</span>
                <span>Page 1 Cover &amp; Page 2 Summary</span>
              </div>

              <button
                type="button"
                onClick={handleDownloadPdf}
                disabled={isExportingPdf}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-lg bg-[#1B365D] px-3.5 py-2 text-xs font-semibold text-white hover:bg-[#14294A] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0088CE] disabled:opacity-60 whitespace-nowrap shrink-0"
              >
                {isExportingPdf ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    <span>Preparing PDF...</span>
                  </>
                ) : (
                  <>
                    <Download className="h-3.5 w-3.5" />
                    <span>Download PDF</span>
                  </>
                )}
              </button>
            </div>

            <div className="flex-1 bg-slate-100 p-3 sm:p-6 space-y-5 sm:space-y-8 overflow-auto max-h-[620px] sm:max-h-[780px]">
              {/* PAGE 1: COVER PAGE */}
              <div className="mx-auto max-w-[740px] bg-white border border-slate-300 shadow-sm p-4 sm:p-10 flex flex-col justify-between min-h-[480px] sm:min-h-[960px]">
                <div className="pt-2 sm:pt-4">
                  <div className="flex justify-center">
                    <img
                      src={COVER_IMAGE_PATH}
                      alt="GASCO Instrumentation & Control cover illustration"
                      className="w-full max-h-[190px] sm:max-h-[340px] object-contain"
                    />
                  </div>

                  <div className="mt-8 sm:mt-16 space-y-1.5">
                    <p className="text-sm sm:text-lg font-bold text-[#0088CE]">
                      GASCO
                    </p>
                    <h2 className="text-lg sm:text-2xl font-bold leading-snug text-[#1B365D]">
                      Instrumentation &amp; Control Department -
                      <br className="hidden sm:inline" />{" "}
                      Week Activities Report
                    </h2>
                  </div>

                  <div className="mt-6 sm:mt-10 border-y border-slate-400 py-3 sm:py-3.5 grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
                    <div>
                      <div className="text-[10px] sm:text-[11px] font-bold text-[#0088CE] tracking-wide">
                        SITE
                      </div>
                      <div className="mt-0.5 sm:mt-1 text-xs sm:text-sm font-bold text-[#1B365D]">
                        Amerya LPG Plant
                      </div>
                    </div>
                    <div>
                      <div className="text-[10px] sm:text-[11px] font-bold text-[#0088CE] tracking-wide">
                        DEPARTMENT
                      </div>
                      <div className="mt-0.5 sm:mt-1 text-xs sm:text-sm font-bold text-[#1B365D]">
                        Instrumentation &amp; Control
                      </div>
                    </div>
                    <div>
                      <div className="text-[10px] sm:text-[11px] font-bold text-[#0088CE] tracking-wide">
                        PERIOD
                      </div>
                      <div className="mt-0.5 sm:mt-1 text-xs sm:text-sm font-bold text-[#1B365D] tabular-nums">
                        {report.reportPeriod}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="pt-4 sm:pt-6 mt-6 border-t border-slate-300 flex items-end justify-between gap-3 text-[9px] sm:text-[10px]">
                  <div className="min-w-0">
                    <div className="font-bold text-[#1B365D] leading-snug">
                      INSTRUMENTATION &amp; CONTROL DEPARTMENT WEEK ACTIVITIES REPORT
                    </div>
                    <div className="text-slate-600 mt-0.5 tabular-nums">
                      {report.reportPeriod}
                    </div>
                  </div>
                  <div className="font-bold text-[#1B365D] text-xs tabular-nums shrink-0">
                    1
                  </div>
                </div>
              </div>

              {/* PAGE 2: SUMMARY OF SITE ACTIVITIES */}
              <div className="mx-auto max-w-[740px] bg-white border border-slate-300 shadow-sm p-4 sm:p-10 flex flex-col justify-between min-h-[480px] sm:min-h-[960px]">
                <div>
                  <h2 className="text-base sm:text-lg font-bold text-[#1B365D] mb-3">
                    Summary of Site Activities
                  </h2>

                  <div className="overflow-x-auto">
                    <table className="w-full min-w-[500px] border-collapse text-xs border border-slate-400">
                      <thead>
                        <tr className="bg-[#1F4E79] text-white">
                          <th className="border border-slate-400 py-2 px-2 w-10 text-center font-bold">
                            No.
                          </th>
                          <th className="border border-slate-400 py-2 px-2.5 w-36 sm:w-40 text-left font-bold">
                            Equipment
                          </th>
                          <th className="border border-slate-400 py-2 px-2.5 text-left font-bold">
                            Activity
                          </th>
                          <th className="border border-slate-400 py-2 px-2 w-24 text-center font-bold">
                            Date
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {numberedPartitions.map((partition) => (
                          <FragmentGroup
                            key={`preview-${partition.code}`}
                            partition={partition}
                            bordered
                          />
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                <div className="pt-4 sm:pt-6 mt-8 border-t border-slate-300 flex items-end justify-between gap-3 text-[9px] sm:text-[10px]">
                  <div className="min-w-0">
                    <div className="font-bold text-[#1B365D] leading-snug">
                      INSTRUMENTATION &amp; CONTROL DEPARTMENT WEEK ACTIVITIES REPORT
                    </div>
                    <div className="text-slate-600 mt-0.5 tabular-nums">
                      {report.reportPeriod}
                    </div>
                  </div>
                  <div className="font-bold text-[#1B365D] text-xs tabular-nums shrink-0">
                    2
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Tab 3: LaTeX Code */}
        {!isGenerating && report && activeTab === "latex" && (
          <div className="flex-1 flex flex-col min-w-0">
            <div className="flex flex-col sm:flex-row sm:flex-wrap sm:items-center sm:justify-between gap-3 border-b border-slate-200 bg-slate-50 px-4 sm:px-5 py-3">
              <div className="flex items-center gap-2.5 text-xs text-slate-600 tabular-nums min-w-0">
                <span className="font-mono font-medium text-slate-800 truncate">
                  {buildSafeFilename(report.reportPeriod)}
                </span>
                <span aria-hidden="true">·</span>
                <span className="shrink-0">{latexLines.length} lines</span>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <a
                  href={COVER_IMAGE_PATH}
                  download="cover.png"
                  className="flex-1 sm:flex-none inline-flex items-center justify-center gap-2 rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0088CE] whitespace-nowrap shrink-0"
                >
                  <ImageDown className="h-3.5 w-3.5 text-slate-600" />
                  <span>Download cover.png</span>
                </a>

                <button
                  type="button"
                  onClick={handleCopyCode}
                  className="flex-1 sm:flex-none inline-flex items-center justify-center gap-2 rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-xs font-semibold text-slate-800 hover:bg-slate-50 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0088CE] whitespace-nowrap shrink-0"
                >
                  {copied ? (
                    <>
                      <Check className="h-3.5 w-3.5 text-emerald-600" />
                      <span>Copied</span>
                    </>
                  ) : (
                    <>
                      <Copy className="h-3.5 w-3.5 text-slate-600" />
                      <span>Copy Code</span>
                    </>
                  )}
                </button>

                <button
                  type="button"
                  onClick={handleDownloadTex}
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-lg bg-[#1B365D] px-3.5 py-2 text-xs font-semibold text-white hover:bg-[#14294A] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0088CE] whitespace-nowrap shrink-0"
                >
                  <Download className="h-3.5 w-3.5" />
                  <span>Download .tex File</span>
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-auto bg-[#0F172A] text-slate-100 p-3 sm:p-4 font-mono text-xs leading-6 max-h-[460px] sm:max-h-[680px]">
              <table className="w-full border-collapse">
                <tbody>
                  {latexLines.map((line, i) => (
                    <tr key={i} className="hover:bg-slate-800/50">
                      <td className="select-none pr-4 text-right text-slate-500 tabular-nums w-10 align-top">
                        {i + 1}
                      </td>
                      <td className="whitespace-pre text-slate-100 align-top">
                        {line || " "}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}

interface NumberedPartition extends ReportPartition {
  numberedItems: Array<ReportPartition["items"][number] & { rowNo: string }>;
}

function FragmentGroup({
  partition,
  bordered = false,
}: {
  partition: NumberedPartition;
  bordered?: boolean;
}) {
  const cellBorder = bordered ? "border border-slate-400" : "border-b border-slate-200";

  return (
    <>
      <tr className="bg-[#D9E2F3]">
        <td
          colSpan={4}
          className={`${cellBorder} py-1.5 px-2.5 font-bold text-[#1B365D]`}
        >
          {partition.sectionNumber}. {partition.title}
        </td>
      </tr>
      {partition.numberedItems.map((permit, idx) => (
        <tr
          key={`${partition.code}-${permit.rowNo}`}
          className={idx % 2 === 1 ? "bg-[#F5F7FA]" : "bg-white"}
        >
          <td
            className={`${cellBorder} py-2 px-2 text-center font-bold text-[#1B365D] tabular-nums align-top`}
          >
            {permit.rowNo}
          </td>
          <td
            className={`${cellBorder} py-2 px-2.5 font-bold text-[#1B365D] align-top`}
          >
            {permit.equipment}
          </td>
          <td className={`${cellBorder} py-2 px-2.5 text-slate-800 align-top`}>
            {permit.activityRow}
          </td>
          <td
            className={`${cellBorder} py-2 px-2 text-center font-mono text-slate-700 tabular-nums align-top whitespace-nowrap`}
          >
            {permit.date}
          </td>
        </tr>
      ))}
    </>
  );
}
