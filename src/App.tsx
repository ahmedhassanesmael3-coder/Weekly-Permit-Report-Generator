import React, { useEffect, useRef, useState } from "react";
import { FileOutput, Loader2, Menu, X } from "lucide-react";
import { OutputPanel } from "./components/OutputPanel";
import { PermitUploader } from "./components/PermitUploader";
import { TemplateModal } from "./components/TemplateModal";
import type {
  GeneratedReport,
  OutputTab,
  PermitPhoto,
} from "./types/report";
import { processPermitFiles } from "./utils/imageProcessing";

function formatDmy(date: Date): string {
  const dd = String(date.getDate()).padStart(2, "0");
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const yyyy = date.getFullYear();
  return `${dd}/${mm}/${yyyy}`;
}

function getSuggestedReportPeriod(): string {
  const now = new Date();
  const sunday = new Date(now);
  sunday.setDate(now.getDate() - now.getDay());
  const wednesday = new Date(sunday);
  wednesday.setDate(sunday.getDate() + 3);
  return `${formatDmy(sunday)}-${formatDmy(wednesday)}`;
}

export default function App() {
  const [photos, setPhotos] = useState<PermitPhoto[]>([]);
  const [reportPeriod, setReportPeriod] = useState<string>(() =>
    getSuggestedReportPeriod()
  );
  const [additionalNotes, setAdditionalNotes] = useState<string>("");
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [uploadWarning, setUploadWarning] = useState<string | null>(null);
  const [report, setReport] = useState<GeneratedReport | null>(null);
  const [activeTab, setActiveTab] = useState<OutputTab>("summary");
  const [isTemplateOpen, setIsTemplateOpen] = useState<boolean>(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState<boolean>(false);
  const [inspectedPhoto, setInspectedPhoto] = useState<PermitPhoto | null>(
    null
  );
  const photosRef = useRef<PermitPhoto[]>([]);
  photosRef.current = photos;

  // Clean up object URLs on unmount
  useEffect(() => {
    return () => {
      photosRef.current.forEach((p) => URL.revokeObjectURL(p.previewUrl));
    };
  }, []);

  useEffect(() => {
    if (!inspectedPhoto) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setInspectedPhoto(null);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [inspectedPhoto]);

  const handleAddFiles = async (files: File[]) => {
    setUploadWarning(null);
    setError(null);
    const { accepted, rejectedNames } = await processPermitFiles(files);
    if (rejectedNames.length > 0) {
      setUploadWarning(
        `Skipped unsupported file(s): ${rejectedNames.join(", ")}. Only JPG, PNG, and WEBP images are accepted.`
      );
    }
    if (accepted.length > 0) {
      setPhotos((prev) => [...prev, ...accepted]);
    }
  };

  const handleRemovePhoto = (id: string) => {
    setPhotos((prev) => {
      const target = prev.find((p) => p.id === id);
      if (target) {
        URL.revokeObjectURL(target.previewUrl);
      }
      return prev.filter((p) => p.id !== id);
    });
  };

  const handleClearAllPhotos = () => {
    photos.forEach((p) => URL.revokeObjectURL(p.previewUrl));
    setPhotos([]);
    setUploadWarning(null);
  };

  const handleResetWorkspace = () => {
    handleClearAllPhotos();
    setReportPeriod(getSuggestedReportPeriod());
    setAdditionalNotes("");
    setReport(null);
    setError(null);
    setActiveTab("summary");
    setIsMobileMenuOpen(false);
  };

  const navigateToOutputTab = (tab: OutputTab) => {
    setActiveTab(tab);
    setIsMobileMenuOpen(false);
    document
      .getElementById("output-panel")
      ?.scrollIntoView({ behavior: "smooth" });
  };

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!reportPeriod.trim()) {
      setError("Please enter a Report Period before generating the report.");
      return;
    }
    if (photos.length === 0) {
      setError("Please upload at least one work permit photo.");
      return;
    }

    setIsGenerating(true);

    try {
      const response = await fetch("/api/generate-report", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          reportPeriod: reportPeriod.trim(),
          additionalNotes: additionalNotes.trim(),
          images: photos.map((p) => ({
            name: p.name,
            mimeType: p.mimeType,
            data: p.base64Data,
          })),
        }),
      });

      const payload = (await response.json()) as Partial<GeneratedReport> & {
        error?: string;
      };

      if (!response.ok) {
        throw new Error(
          payload.error || `Server error (${response.status}). Please try again.`
        );
      }

      if (!payload.latexCode || !Array.isArray(payload.permits)) {
        throw new Error("Received an incomplete report payload from server.");
      }

      setReport({
        reportPeriod: payload.reportPeriod ?? reportPeriod.trim(),
        permits: payload.permits,
        partitions: Array.isArray(payload.partitions) ? payload.partitions : [],
        latexCode: payload.latexCode,
      });
      setActiveTab("summary");
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "An unexpected error occurred while generating the report."
      );
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col overflow-x-clip">
      {/* Top Bar Contract: 3-zone single-row header */}
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex h-14 sm:h-16 max-w-[1440px] items-center justify-between gap-3 sm:gap-8 px-4 sm:px-6">
          <a
            href="#workspace"
            className="font-display text-sm sm:text-lg font-bold tracking-tight text-[#1B365D] min-w-0 truncate focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0088CE] rounded"
          >
            Weekly Permit Report Generator
          </a>

          <nav
            aria-label="Primary"
            className="hidden lg:flex items-center gap-6 text-sm font-medium text-slate-600"
          >
            <a
              href="#workspace"
              className="hover:text-[#1B365D] transition-colors whitespace-nowrap shrink-0"
            >
              Permit Intake
            </a>
            <button
              type="button"
              onClick={() => navigateToOutputTab("summary")}
              className="hover:text-[#1B365D] transition-colors whitespace-nowrap shrink-0"
            >
              Extracted Summary
            </button>
            <button
              type="button"
              onClick={() => navigateToOutputTab("preview")}
              className="hover:text-[#1B365D] transition-colors whitespace-nowrap shrink-0"
            >
              2-Page Preview
            </button>
            <button
              type="button"
              onClick={() => navigateToOutputTab("latex")}
              className="hover:text-[#1B365D] transition-colors whitespace-nowrap shrink-0"
            >
              LaTeX Code
            </button>
            <button
              type="button"
              onClick={() => setIsTemplateOpen(true)}
              className="hover:text-[#1B365D] transition-colors whitespace-nowrap shrink-0"
            >
              Template Spec
            </button>
          </nav>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={handleResetWorkspace}
              disabled={isGenerating}
              className="rounded-lg border border-slate-300 bg-white px-3 sm:px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 hover:text-slate-900 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0088CE] disabled:opacity-50 whitespace-nowrap shrink-0"
            >
              Reset
              <span className="hidden sm:inline"> Workspace</span>
            </button>

            <button
              type="button"
              onClick={() => setIsMobileMenuOpen((v) => !v)}
              aria-expanded={isMobileMenuOpen}
              aria-label="Toggle navigation menu"
              className="inline-flex lg:hidden h-9 w-9 items-center justify-center rounded-lg border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0088CE]"
            >
              {isMobileMenuOpen ? (
                <X className="h-4 w-4" />
              ) : (
                <Menu className="h-4 w-4" />
              )}
            </button>
          </div>
        </div>

        {isMobileMenuOpen && (
          <nav
            aria-label="Mobile Navigation"
            className="lg:hidden border-t border-slate-200 bg-white px-4 py-3 grid grid-cols-2 gap-2 text-sm font-medium text-slate-700"
          >
            <a
              href="#workspace"
              onClick={() => setIsMobileMenuOpen(false)}
              className="rounded-md px-3 py-2.5 hover:bg-slate-50 hover:text-[#1B365D]"
            >
              Permit Intake
            </a>
            <button
              type="button"
              onClick={() => navigateToOutputTab("summary")}
              className="rounded-md px-3 py-2.5 text-left hover:bg-slate-50 hover:text-[#1B365D]"
            >
              Extracted Summary
            </button>
            <button
              type="button"
              onClick={() => navigateToOutputTab("preview")}
              className="rounded-md px-3 py-2.5 text-left hover:bg-slate-50 hover:text-[#1B365D]"
            >
              2-Page Preview
            </button>
            <button
              type="button"
              onClick={() => navigateToOutputTab("latex")}
              className="rounded-md px-3 py-2.5 text-left hover:bg-slate-50 hover:text-[#1B365D]"
            >
              LaTeX Code
            </button>
            <button
              type="button"
              onClick={() => {
                setIsMobileMenuOpen(false);
                setIsTemplateOpen(true);
              }}
              className="col-span-2 rounded-md border border-slate-200 px-3 py-2.5 text-left hover:bg-slate-50 hover:text-[#1B365D]"
            >
              Template Spec
            </button>
          </nav>
        )}
      </header>

      {/* Main Workspace */}
      <main
        id="workspace"
        className="mx-auto w-full max-w-[1440px] flex-1 px-4 sm:px-6 py-5 sm:py-8"
      >
        <div className="mb-5 sm:mb-6 flex flex-wrap items-baseline justify-between gap-4">
          <div className="space-y-1">
            <h1 className="font-display text-xl sm:text-2xl font-bold tracking-tight text-slate-900">
              Instrumentation &amp; Control Activity Report
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 leading-relaxed">
              GASCO Amerya LPG Plant · Two-page report partitioned into PM, CM,
              COMM, and ENG sorted chronologically by date
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 sm:gap-6 items-start">
          {/* Left Column: Upload & Report Controls */}
          <form
            onSubmit={handleGenerate}
            className="lg:col-span-5 min-w-0 rounded-xl border border-slate-200 bg-white p-4 sm:p-6 space-y-5 sm:space-y-6"
          >
            <div className="space-y-2">
              <div className="flex items-baseline justify-between gap-4">
                <label
                  htmlFor="report-period"
                  className="text-sm font-semibold text-slate-900"
                >
                  Report Period
                </label>
                <button
                  type="button"
                  onClick={() => setReportPeriod(getSuggestedReportPeriod())}
                  className="text-xs font-medium text-[#0088CE] hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0088CE] rounded whitespace-nowrap shrink-0"
                >
                  Use current week
                </button>
              </div>
              <input
                id="report-period"
                type="text"
                value={reportPeriod}
                onChange={(e) => setReportPeriod(e.target.value)}
                placeholder="08/11/2026-11/11/2026"
                disabled={isGenerating}
                className="w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2.5 text-sm font-mono text-slate-900 placeholder:text-slate-400 focus:border-[#0088CE] focus:outline-none focus:ring-2 focus:ring-[#0088CE]/20 disabled:bg-slate-50 disabled:text-slate-500"
              />
            </div>

            <PermitUploader
              photos={photos}
              disabled={isGenerating}
              onAddFiles={handleAddFiles}
              onRemovePhoto={handleRemovePhoto}
              onClearAll={handleClearAllPhotos}
              onInspectPhoto={setInspectedPhoto}
              uploadWarning={uploadWarning}
            />

            <div className="space-y-2">
              <label
                htmlFor="additional-notes"
                className="block text-sm font-semibold text-slate-900"
              >
                Additional Notes{" "}
                <span className="font-normal text-slate-500">(Optional)</span>
              </label>
              <textarea
                id="additional-notes"
                rows={3}
                value={additionalNotes}
                onChange={(e) => setAdditionalNotes(e.target.value)}
                placeholder="Clarify PM / CM / COMM / ENG categories, handwritten tags, or permit dates..."
                disabled={isGenerating}
                className="w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-[#0088CE] focus:outline-none focus:ring-2 focus:ring-[#0088CE]/20 disabled:bg-slate-50 disabled:text-slate-500 resize-y"
              />
            </div>

            <button
              type="submit"
              disabled={isGenerating}
              className="w-full inline-flex items-center justify-center gap-2.5 rounded-lg bg-[#1B365D] px-5 py-3 text-sm font-semibold text-white hover:bg-[#14294A] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0088CE] focus-visible:ring-offset-2 disabled:opacity-60 disabled:cursor-not-allowed whitespace-nowrap"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Generating Weekly Report...</span>
                </>
              ) : (
                <>
                  <FileOutput className="h-4 w-4" />
                  <span>Generate Weekly Report</span>
                </>
              )}
            </button>
          </form>

          {/* Right Column: Output Panel */}
          <div className="lg:col-span-7 min-w-0">
            <OutputPanel
              activeTab={activeTab}
              onTabChange={setActiveTab}
              isGenerating={isGenerating}
              error={error}
              report={report}
            />
          </div>
        </div>
      </main>

      {/* Template Specification Modal */}
      <TemplateModal
        isOpen={isTemplateOpen}
        onClose={() => setIsTemplateOpen(false)}
      />

      {/* Photo Inspection Modal */}
      {inspectedPhoto && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={`Preview of ${inspectedPhoto.name}`}
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/75 p-4"
          onClick={() => setInspectedPhoto(null)}
        >
          <div
            className="relative max-h-[90vh] max-w-4xl w-full rounded-xl bg-white border border-slate-200 overflow-hidden shadow-2xl flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-slate-200 px-5 py-3">
              <span className="text-sm font-semibold text-slate-900 truncate">
                {inspectedPhoto.name}
              </span>
              <button
                type="button"
                onClick={() => setInspectedPhoto(null)}
                aria-label="Close photo preview"
                className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 hover:text-slate-900"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="flex-1 overflow-auto bg-slate-900 flex items-center justify-center p-4">
              <img
                src={inspectedPhoto.previewUrl}
                alt={inspectedPhoto.name}
                className="max-h-[75vh] w-auto object-contain"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
