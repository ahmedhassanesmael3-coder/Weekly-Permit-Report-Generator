import "dotenv/config";
import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import { GoogleGenAI, Type } from "@google/genai";
import {
  buildLatexDocument,
  MASTER_LATEX_TEMPLATE,
  normalizePartitionCode,
  PARTITION_TITLES,
  unescapeLatexForDisplay,
} from "./server/latexTemplate.ts";
import type {
  ExtractedPermitItem,
  PartitionCode,
} from "./server/latexTemplate.ts";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

interface UploadedPermitImage {
  name: string;
  mimeType: string;
  data: string;
}

interface GenerateReportBody {
  reportPeriod?: string;
  additionalNotes?: string;
  images?: UploadedPermitImage[];
}

interface RawGeminiPermit {
  photoIndex: number;
  permitNumber: string;
  categoryCode: string;
  equipment: string;
  activityRow: string;
  date: string;
  summaryBullets: string[];
}

interface GeminiExtractedResponse {
  reportPeriod: string;
  permits: RawGeminiPermit[];
}

const ALLOWED_MIME_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
]);

function getGeminiClient(): GoogleGenAI {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error(
      "GEMINI_API_KEY is not configured. Please add it in Settings > Secrets."
    );
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        "User-Agent": "aistudio-build",
      },
    },
  });
}

function formatGeminiError(err: unknown): { status: number; message: string } {
  const msg = err instanceof Error ? err.message : String(err);
  const lower = msg.toLowerCase();

  if (lower.includes("api_key_invalid") || lower.includes("permission_denied") || lower.includes("403")) {
    return {
      status: 403,
      message:
        "Gemini API authentication failed. Please verify your GEMINI_API_KEY in Settings > Secrets.",
    };
  }
  if (lower.includes("resource_exhausted") || lower.includes("429") || lower.includes("quota")) {
    return {
      status: 429,
      message:
        "Gemini API rate limit or quota exceeded. Please wait a moment and try again.",
    };
  }
  if (lower.includes("not_found") || lower.includes("404")) {
    return {
      status: 502,
      message: "Requested Gemini model could not be reached. Please try again.",
    };
  }
  if (lower.includes("gemini_api_key is not configured")) {
    return {
      status: 500,
      message: msg,
    };
  }
  return {
    status: 500,
    message: msg || "Failed to analyze permit images with Gemini.",
  };
}

async function startServer() {
  const app = express();
  app.use(express.json({ limit: "60mb" }));

  app.get("/api/health", (_req, res) => {
    res.json({ ok: true });
  });

  app.get("/api/template", (_req, res) => {
    res.json({ template: MASTER_LATEX_TEMPLATE });
  });

  app.post("/api/generate-report", async (req, res) => {
    try {
      const body = req.body as GenerateReportBody;
      const reportPeriod = (body.reportPeriod ?? "").trim();
      const additionalNotes = (body.additionalNotes ?? "").trim();
      const images = Array.isArray(body.images) ? body.images : [];

      if (!reportPeriod) {
        res.status(400).json({ error: "Please enter a Report Period." });
        return;
      }

      if (images.length === 0) {
        res
          .status(400)
          .json({ error: "Please upload at least one permit image." });
        return;
      }

      if (images.length > 30) {
        res.status(400).json({
          error: "Maximum 30 permit images per report batch.",
        });
        return;
      }

      for (let i = 0; i < images.length; i++) {
        const img = images[i];
        if (!img || !img.data || !ALLOWED_MIME_TYPES.has(img.mimeType)) {
          res.status(400).json({
            error: `Image ${i + 1} (${img?.name ?? "unknown"}) must be a valid JPG, PNG, or WEBP image.`,
          });
          return;
        }
      }

      const ai = getGeminiClient();

      const parts: Array<
        { text: string } | { inlineData: { mimeType: string; data: string } }
      > = [
        {
          text: [
            `Analyze all ${images.length} uploaded work permit image(s) for the GASCO Instrumentation & Control Department (Amerya LPG Plant) two-page Week Activities Report.`,
            `Report Period: ${reportPeriod}`,
            additionalNotes
              ? `Additional Context / Notes from Engineer: ${additionalNotes}`
              : "Additional Context / Notes from Engineer: None provided.",
            "",
            "Instructions:",
            "1. Read each permit image carefully, including printed fields, equipment tag numbers, handwritten job descriptions, dates, and permit numbers.",
            "2. For each permit, summarize the work done in simple, direct, to-the-point English.",
            "3. Style `equipment` and `activityRow` in the exact crisp style of GASCO weekly reports:",
            "   - `equipment` examples: 'Temperature Transmitters', '100TT471A/B', 'PCV7101 & PCV8102A', 'Fan 10-A-102 A1', 'Z15L174, Z10L156 SGD', 'Lab Telephone Line'.",
            "   - `activityRow` examples: 'Maintenance and calibration.', 'External maintenance for valves.', 'Maintained, removed and reinstalled the vibration sensor.', 'Fixed a gas leak.', 'Checked the laboratory telephone cable paths.'",
            "4. Classify each permit strictly into one of these 4 `categoryCode` values:",
            "   - 'PM' for Preventive Maintenance (routine calibration, PM checks, periodic valve/sensor/transmitter maintenance).",
            "   - 'CM' for Corrective Maintenance (fault clearing, leak repairs, damaged cable/sensor replacements, troubleshooting).",
            "   - 'COMM' for Communication (telephone lines, intercoms, radio, network/telecom cabling).",
            "   - 'ENG' for Engineering (engineering modifications, design changes, new installations, loop/system engineering upgrades).",
            "5. Format `date` strictly as DD/MM/YYYY when readable on the permit (or 'N/A' if not visible).",
            "6. Provide 2-4 plain-English bullet points in `summaryBullets` (no LaTeX escaping in `summaryBullets`).",
            "7. Escape any special LaTeX characters (&, %, $, #, _) in `equipment` and `activityRow` (\\&, \\%, \\$, \\#, \\_).",
            "8. Return strictly valid JSON matching the schema.",
          ].join("\n"),
        },
      ];

      images.forEach((img, index) => {
        const cleanBase64 = img.data.includes(",")
          ? img.data.split(",")[1]
          : img.data;
        parts.push({
          text: `Permit Image ${index + 1} (filename: ${img.name}):`,
        });
        parts.push({
          inlineData: {
            mimeType: img.mimeType,
            data: cleanBase64,
          },
        });
      });

      const response = await ai.models.generateContent({
        model: "gemini-4-hydrogen",
        contents: { parts },
        config: {
          systemInstruction:
            "You are an Instrumentation & Control engineering documentation specialist at GASCO Amerya LPG Plant. You extract accurate, concise, direct work summaries from plant work permit photographs, classify them strictly into PM, CM, COMM, or ENG, and format entries in crisp GASCO report phrasing without inventing facts not visible in the permits or provided in the engineer's notes.",
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              reportPeriod: {
                type: Type.STRING,
                description: "The report period provided by the user.",
              },
              permits: {
                type: Type.ARRAY,
                description:
                  "One structured summary object for each job/permit extracted from the uploaded permit images.",
                items: {
                  type: Type.OBJECT,
                  properties: {
                    photoIndex: {
                      type: Type.INTEGER,
                      description:
                        "1-based index matching the Permit Image number.",
                    },
                    permitNumber: {
                      type: Type.STRING,
                      description:
                        "Permit number/ID shown on the form, or 'N/A' if unreadable.",
                    },
                    categoryCode: {
                      type: Type.STRING,
                      description:
                        "Strictly one of: 'PM', 'CM', 'COMM', or 'ENG'.",
                    },
                    equipment: {
                      type: Type.STRING,
                      description:
                        "Concise equipment/tag title for the Equipment column, with special LaTeX chars (&, %, $, #, _) escaped.",
                    },
                    activityRow: {
                      type: Type.STRING,
                      description:
                        "Simple, direct one-sentence summary of the work performed for the Activity cell, with special LaTeX chars (&, %, $, #, _) escaped.",
                    },
                    date: {
                      type: Type.STRING,
                      description:
                        "Permit date in DD/MM/YYYY format, or 'N/A' if not visible.",
                    },
                    summaryBullets: {
                      type: Type.ARRAY,
                      items: { type: Type.STRING },
                      description:
                        "2 to 4 simple, direct, plain-English bullet points describing what was done on this permit.",
                    },
                  },
                  required: [
                    "photoIndex",
                    "permitNumber",
                    "categoryCode",
                    "equipment",
                    "activityRow",
                    "date",
                    "summaryBullets",
                  ],
                },
              },
            },
            required: ["reportPeriod", "permits"],
          },
        },
      });

      const rawText = (response.text ?? "").trim();
      if (!rawText) {
        throw new Error("Gemini returned an empty response. Please try again.");
      }

      const parsed = JSON.parse(rawText) as GeminiExtractedResponse;
      const rawPermits = Array.isArray(parsed.permits) ? parsed.permits : [];

      const normalizedPermits: ExtractedPermitItem[] = rawPermits.map(
        (item, idx) => {
          const matchedIndex =
            typeof item.photoIndex === "number" &&
            item.photoIndex >= 1 &&
            item.photoIndex <= images.length
              ? item.photoIndex
              : Math.min(idx + 1, images.length);
          const sourceImg = images[matchedIndex - 1];
          const code: PartitionCode = normalizePartitionCode(
            item.categoryCode,
            ""
          );

          return {
            photoIndex: matchedIndex,
            photoName: sourceImg?.name ?? `permit_${matchedIndex}.jpg`,
            permitNumber: unescapeLatexForDisplay(item.permitNumber || "N/A"),
            categoryCode: code,
            category: PARTITION_TITLES[code],
            equipment: unescapeLatexForDisplay(
              item.equipment || "Instrumentation Equipment"
            ),
            activityRow: unescapeLatexForDisplay(
              item.activityRow ||
                (item.summaryBullets ?? []).join(" ") ||
                "Maintenance activity performed."
            ),
            date: unescapeLatexForDisplay(item.date || "N/A"),
            summaryBullets: (item.summaryBullets ?? [])
              .map((b) => unescapeLatexForDisplay(b))
              .filter(Boolean),
          };
        }
      );

      const { latexCode, partitions, orderedPermits } = buildLatexDocument(
        reportPeriod,
        normalizedPermits
      );

      res.json({
        reportPeriod,
        permits: orderedPermits,
        partitions,
        latexCode,
      });
    } catch (error) {
      console.error("Report generation error:", error);
      const { status, message } = formatGeminiError(error);
      res.status(status).json({ error: message });
    }
  });

  if (process.env.NODE_ENV !== "production") {
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distDir = path.join(__dirname, "dist");
    app.use(express.static(distDir));
    app.get("/{*path}", (_req, res) => {
      res.sendFile(path.join(distDir, "index.html"));
    });
  }

  const port = Number(process.env.PORT) || 3000;
  app.listen(port, "0.0.0.0", () => {
    console.log(`Server listening on http://0.0.0.0:${port}`);
  });
}

startServer().catch((err) => {
  console.error("Failed to start server:", err);
  process.exit(1);
});
