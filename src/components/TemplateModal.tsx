import { useEffect, useState } from "react";
import { X } from "lucide-react";

interface TemplateModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function TemplateModal({ isOpen, onClose }: TemplateModalProps) {
  const [template, setTemplate] = useState<string>("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!isOpen || template) return;
    setLoading(true);
    fetch("/api/template")
      .then((res) => res.json())
      .then((data: { template?: string }) => {
        if (data.template) setTemplate(data.template);
      })
      .catch(() => {
        setTemplate("Unable to load template preview.");
      })
      .finally(() => setLoading(false));
  }, [isOpen, template]);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="template-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4"
      onClick={onClose}
    >
      <div
        className="flex max-h-[85vh] w-full max-w-4xl flex-col rounded-xl border border-slate-200 bg-white shadow-xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between gap-4 border-b border-slate-200 px-6 py-4">
          <div>
            <h2
              id="template-modal-title"
              className="text-base font-semibold text-[#1B365D]"
            >
              Master GASCO LaTeX Template
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Packages, macros, and special character escaping (&amp;, %, $, #, _)
              are preserved on every generation.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close template specification"
            className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 hover:text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0088CE]"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="flex-1 overflow-auto bg-[#0F172A] p-5 font-mono text-xs leading-6 text-slate-200">
          {loading ? (
            <p className="text-slate-400">Loading master template...</p>
          ) : (
            <pre className="whitespace-pre-wrap break-words">{template}</pre>
          )}
        </div>
      </div>
    </div>
  );
}
