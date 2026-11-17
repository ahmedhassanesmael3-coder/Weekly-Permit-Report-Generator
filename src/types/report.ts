export type PartitionCode = "PM" | "CM" | "COMM" | "ENG";

export interface PermitPhoto {
  id: string;
  file: File;
  name: string;
  size: number;
  mimeType: "image/jpeg" | "image/png" | "image/webp";
  previewUrl: string;
  base64Data: string;
}

export interface ExtractedPermit {
  photoIndex: number;
  photoName?: string;
  permitNumber: string;
  categoryCode: PartitionCode;
  category: string;
  equipment: string;
  activityRow: string;
  date: string;
  summaryBullets: string[];
}

export interface ReportPartition {
  sectionNumber: number;
  code: PartitionCode;
  title: string;
  items: ExtractedPermit[];
}

export interface GeneratedReport {
  reportPeriod: string;
  permits: ExtractedPermit[];
  partitions: ReportPartition[];
  latexCode: string;
}

export type OutputTab = "summary" | "preview" | "latex";
