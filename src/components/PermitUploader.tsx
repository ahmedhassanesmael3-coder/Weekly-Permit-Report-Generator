import React, { useRef, useState } from "react";
import { ImagePlus, Maximize2, Trash2, Upload } from "lucide-react";
import type { PermitPhoto } from "../types/report";
import { formatBytes } from "../utils/imageProcessing";

interface PermitUploaderProps {
  photos: PermitPhoto[];
  disabled?: boolean;
  onAddFiles: (files: File[]) => void;
  onRemovePhoto: (id: string) => void;
  onClearAll: () => void;
  onInspectPhoto: (photo: PermitPhoto) => void;
  uploadWarning?: string | null;
}

export function PermitUploader({
  photos,
  disabled = false,
  onAddFiles,
  onRemovePhoto,
  onClearAll,
  onInspectPhoto,
  uploadWarning,
}: PermitUploaderProps) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  const totalBytes = photos.reduce((sum, p) => sum + p.size, 0);

  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!disabled) setIsDragging(true);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!disabled && !isDragging) setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.currentTarget.contains(e.relatedTarget as Node)) return;
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    if (disabled) return;
    const dropped = Array.from(e.dataTransfer.files);
    if (dropped.length > 0) {
      onAddFiles(dropped);
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = Array.from(e.target.files ?? []);
    if (selected.length > 0) {
      onAddFiles(selected);
    }
    e.target.value = "";
  };

  return (
    <div className="space-y-3">
      <div className="flex items-baseline justify-between gap-4">
        <label className="text-sm font-semibold text-slate-900">
          Permit Photos
        </label>
        {photos.length > 0 ? (
          <div className="flex items-center gap-3 text-xs text-slate-500 tabular-nums">
            <span>
              {photos.length} {photos.length === 1 ? "photo" : "photos"}
            </span>
            <span aria-hidden="true">·</span>
            <span>{formatBytes(totalBytes)}</span>
            <span aria-hidden="true">·</span>
            <button
              type="button"
              onClick={onClearAll}
              disabled={disabled}
              className="font-medium text-slate-600 hover:text-red-600 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0088CE] rounded disabled:opacity-50 whitespace-nowrap shrink-0"
            >
              Remove all
            </button>
          </div>
        ) : (
          <span className="text-xs text-slate-500">JPG, PNG, WEBP</span>
        )}
      </div>

      <div
        role="button"
        tabIndex={disabled ? -1 : 0}
        aria-label="Upload permit photos by dragging and dropping or clicking to browse"
        onDragEnter={handleDragEnter}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => !disabled && inputRef.current?.click()}
        onKeyDown={(e) => {
          if (!disabled && (e.key === "Enter" || e.key === " ")) {
            e.preventDefault();
            inputRef.current?.click();
          }
        }}
        className={`relative rounded-lg border-2 border-dashed p-5 text-center transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0088CE] ${
          disabled
            ? "border-slate-200 bg-slate-50 opacity-60 cursor-not-allowed"
            : isDragging
              ? "border-[#0088CE] bg-[#0088CE]/5"
              : "border-slate-300 bg-slate-50/60 hover:border-[#0088CE] hover:bg-slate-50"
        }`}
      >
        <input
          ref={inputRef}
          type="file"
          multiple
          accept=".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp"
          onChange={handleFileInputChange}
          disabled={disabled}
          className="sr-only"
        />

        <div className="flex flex-col items-center gap-2">
          <div
            className={`flex h-10 w-10 items-center justify-center rounded-lg border transition-colors ${
              isDragging
                ? "border-[#0088CE] bg-white text-[#0088CE]"
                : "border-slate-200 bg-white text-[#1B365D]"
            }`}
          >
            {photos.length > 0 ? (
              <ImagePlus className="h-5 w-5" />
            ) : (
              <Upload className="h-5 w-5" />
            )}
          </div>
          <div className="space-y-0.5">
            <p className="text-sm font-medium text-slate-800">
              {isDragging
                ? "Drop permit photos here"
                : "Drag and drop permit photos, or click to browse"}
            </p>
            <p className="text-xs text-slate-500">
              Select multiple JPG, PNG, or WEBP work permit images
            </p>
          </div>
        </div>
      </div>

      {uploadWarning && (
        <p
          role="alert"
          className="text-xs font-medium text-amber-700 bg-amber-50 border border-amber-200 rounded-md px-3 py-2"
        >
          {uploadWarning}
        </p>
      )}

      {photos.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 pt-1">
          {photos.map((photo, idx) => (
            <div
              key={photo.id}
              className="group relative rounded-lg border border-slate-200 bg-white overflow-hidden"
            >
              <div className="relative aspect-[4/3] bg-slate-100 overflow-hidden">
                <img
                  src={photo.previewUrl}
                  alt={`Permit photo ${idx + 1}: ${photo.name}`}
                  className="h-full w-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-slate-950/50 via-transparent to-transparent sm:opacity-0 sm:group-hover:opacity-100 transition-opacity" />

                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onInspectPhoto(photo);
                  }}
                  aria-label={`Inspect ${photo.name}`}
                  title="View full photo"
                  className="absolute bottom-2 left-2 flex h-9 w-9 sm:h-8 sm:w-8 items-center justify-center rounded-md bg-white/95 text-slate-800 shadow-sm opacity-100 sm:opacity-0 sm:group-hover:opacity-100 focus:opacity-100 transition-opacity hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0088CE]"
                >
                  <Maximize2 className="h-3.5 w-3.5" />
                </button>

                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onRemovePhoto(photo.id);
                  }}
                  disabled={disabled}
                  aria-label={`Remove ${photo.name}`}
                  title="Remove photo"
                  className="absolute top-2 right-2 flex h-9 w-9 sm:h-8 sm:w-8 items-center justify-center rounded-md bg-white/95 text-slate-700 shadow-sm hover:bg-red-600 hover:text-white transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0088CE] disabled:opacity-50"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>

              <div className="px-2.5 py-2 border-t border-slate-100">
                <div className="flex items-center justify-between gap-2 text-xs text-slate-500 tabular-nums">
                  <span className="font-mono font-medium text-[#1B365D]">
                    {String(idx + 1).padStart(2, "0")}
                  </span>
                  <span className="truncate text-slate-700 font-medium flex-1">
                    {photo.name}
                  </span>
                </div>
                <div className="mt-0.5 text-[11px] text-slate-400 tabular-nums">
                  {formatBytes(photo.size)}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
