import type { PermitPhoto } from "../types/report";

const ACCEPTED_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

export function inferMimeType(
  file: File
): "image/jpeg" | "image/png" | "image/webp" | null {
  if (ACCEPTED_TYPES.has(file.type)) {
    return file.type as "image/jpeg" | "image/png" | "image/webp";
  }
  const lower = file.name.toLowerCase();
  if (lower.endsWith(".jpg") || lower.endsWith(".jpeg")) return "image/jpeg";
  if (lower.endsWith(".png")) return "image/png";
  if (lower.endsWith(".webp")) return "image/webp";
  return null;
}

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") {
        resolve(reader.result);
      } else {
        reject(new Error(`Unable to read ${file.name}`));
      }
    };
    reader.onerror = () => reject(new Error(`Failed to read ${file.name}`));
    reader.readAsDataURL(file);
  });
}

/**
 * Downscales extremely large camera photos (> 2200px) so multi-photo requests
 * stay fast while keeping handwritten and printed permit text sharp.
 */
async function prepareImageBase64(
  dataUrl: string,
  mimeType: "image/jpeg" | "image/png" | "image/webp"
): Promise<string> {
  const MAX_DIMENSION = 2200;

  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const { naturalWidth, naturalHeight } = img;
      if (
        naturalWidth <= MAX_DIMENSION &&
        naturalHeight <= MAX_DIMENSION
      ) {
        const commaIdx = dataUrl.indexOf(",");
        resolve(commaIdx >= 0 ? dataUrl.slice(commaIdx + 1) : dataUrl);
        return;
      }

      const scale = Math.min(
        MAX_DIMENSION / naturalWidth,
        MAX_DIMENSION / naturalHeight
      );
      const targetW = Math.round(naturalWidth * scale);
      const targetH = Math.round(naturalHeight * scale);

      const canvas = document.createElement("canvas");
      canvas.width = targetW;
      canvas.height = targetH;
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        const commaIdx = dataUrl.indexOf(",");
        resolve(commaIdx >= 0 ? dataUrl.slice(commaIdx + 1) : dataUrl);
        return;
      }
      ctx.drawImage(img, 0, 0, targetW, targetH);
      const outputMime = mimeType === "image/png" ? "image/png" : "image/jpeg";
      const resizedUrl = canvas.toDataURL(outputMime, 0.9);
      const commaIdx = resizedUrl.indexOf(",");
      resolve(commaIdx >= 0 ? resizedUrl.slice(commaIdx + 1) : resizedUrl);
    };
    img.onerror = () => {
      const commaIdx = dataUrl.indexOf(",");
      resolve(commaIdx >= 0 ? dataUrl.slice(commaIdx + 1) : dataUrl);
    };
    img.src = dataUrl;
  });
}

export async function processPermitFiles(files: File[]): Promise<{
  accepted: PermitPhoto[];
  rejectedNames: string[];
}> {
  const accepted: PermitPhoto[] = [];
  const rejectedNames: string[] = [];

  for (const file of files) {
    const mimeType = inferMimeType(file);
    if (!mimeType) {
      rejectedNames.push(file.name);
      continue;
    }

    const previewUrl = URL.createObjectURL(file);
    const rawDataUrl = await readFileAsDataUrl(file);
    const base64Data = await prepareImageBase64(rawDataUrl, mimeType);

    accepted.push({
      id: `${file.name}-${file.size}-${crypto.randomUUID()}`,
      file,
      name: file.name,
      size: file.size,
      mimeType,
      previewUrl,
      base64Data,
    });
  }

  return { accepted, rejectedNames };
}
