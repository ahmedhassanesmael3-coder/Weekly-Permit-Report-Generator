import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import type { RowInput } from "jspdf-autotable";
import type { GeneratedReport, ReportPartition } from "../types/report";

const COVER_IMAGE_URL = "/assets/aistudio/Cover_6d14fc85.png";

const COLORS = {
  gascoBlue: [27, 54, 93] as [number, number, number],
  gascoCyan: [0, 136, 206] as [number, number, number],
  tableHeader: [31, 78, 121] as [number, number, number],
  subheader: [217, 226, 243] as [number, number, number],
  tableRowAlt: [245, 247, 250] as [number, number, number],
  borderGray: [200, 200, 200] as [number, number, number],
  darkGrayText: [60, 60, 60] as [number, number, number],
  tableBorder: [148, 163, 184] as [number, number, number],
};

function buildSafePdfFilename(reportPeriod: string): string {
  const slug = reportPeriod
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
  return slug ? `weekly_permit_report_${slug}.pdf` : "weekly_permit_report.pdf";
}

function loadCoverImageAsDataUrl(
  url: string
): Promise<{ dataUrl: string; width: number; height: number } | null> {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      try {
        const canvas = document.createElement("canvas");
        canvas.width = img.naturalWidth;
        canvas.height = img.naturalHeight;
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          resolve(null);
          return;
        }
        ctx.drawImage(img, 0, 0);
        resolve({
          dataUrl: canvas.toDataURL("image/png"),
          width: img.naturalWidth,
          height: img.naturalHeight,
        });
      } catch {
        resolve(null);
      }
    };
    img.onerror = () => resolve(null);
    img.src = url;
  });
}

function drawFooter(doc: jsPDF, pageNumber: number, reportPeriod: string): void {
  const leftMargin = 18;
  const rightEdge = 210 - 18;
  const ruleY = 274;

  doc.setDrawColor(...COLORS.borderGray);
  doc.setLineWidth(0.25);
  doc.line(leftMargin, ruleY, rightEdge, ruleY);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.setTextColor(...COLORS.gascoBlue);
  doc.text(
    "INSTRUMENTATION & CONTROL DEPARTMENT WEEK ACTIVITIES REPORT",
    leftMargin,
    ruleY + 4.5
  );

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(...COLORS.darkGrayText);
  doc.text(reportPeriod, leftMargin, ruleY + 8.5);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(...COLORS.gascoBlue);
  doc.text(String(pageNumber), rightEdge, ruleY + 4.5, { align: "right" });
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

export async function downloadReportAsPdf(
  report: GeneratedReport
): Promise<void> {
  const doc = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4",
  });

  const leftMargin = 18;
  const contentWidth = 210 - leftMargin * 2; // 174mm

  // ==========================================
  // PAGE 1: COVER PAGE
  // ==========================================
  const cover = await loadCoverImageAsDataUrl(COVER_IMAGE_URL);
  if (cover) {
    const maxW = contentWidth;
    const maxH = 112;
    const scale = Math.min(maxW / cover.width, maxH / cover.height);
    const drawW = cover.width * scale;
    const drawH = cover.height * scale;
    const drawX = leftMargin + (contentWidth - drawW) / 2;
    const drawY = 34;
    doc.addImage(cover.dataUrl, "PNG", drawX, drawY, drawW, drawH);
  }

  const titleStartY = 174;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.setTextColor(...COLORS.gascoCyan);
  doc.text("GASCO", leftMargin, titleStartY);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(22);
  doc.setTextColor(...COLORS.gascoBlue);
  doc.text("Instrumentation & Control Department -", leftMargin, titleStartY + 9);
  doc.text("Week Activities Report", leftMargin, titleStartY + 18);

  const metaTopY = 208;
  doc.setDrawColor(80, 80, 80);
  doc.setLineWidth(0.3);
  doc.line(leftMargin, metaTopY, leftMargin + contentWidth, metaTopY);

  const col1X = leftMargin;
  const col2X = leftMargin + 56;
  const col3X = leftMargin + 117;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(...COLORS.gascoCyan);
  doc.text("SITE", col1X, metaTopY + 6.5);
  doc.text("DEPARTMENT", col2X, metaTopY + 6.5);
  doc.text("PERIOD", col3X, metaTopY + 6.5);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(...COLORS.gascoBlue);
  doc.text("Amerya LPG Plant", col1X, metaTopY + 14);
  doc.text("Instrumentation & Control", col2X, metaTopY + 14);
  doc.text(report.reportPeriod, col3X, metaTopY + 14);

  doc.setDrawColor(80, 80, 80);
  doc.setLineWidth(0.3);
  doc.line(leftMargin, metaTopY + 19, leftMargin + contentWidth, metaTopY + 19);

  drawFooter(doc, 1, report.reportPeriod);

  // ==========================================
  // PAGE 2+: SUMMARY OF SITE ACTIVITIES
  // ==========================================
  doc.addPage();

  doc.setFont("helvetica", "bold");
  doc.setFontSize(15);
  doc.setTextColor(...COLORS.gascoBlue);
  doc.text("Summary of Site Activities", leftMargin, 26);

  const partitions = getEffectivePartitions(report);
  const bodyRows: RowInput[] = [];
  let rowCounter = 1;

  partitions.forEach((partition) => {
    bodyRows.push([
      {
        content: `${partition.sectionNumber}. ${partition.title}`,
        colSpan: 4,
        styles: {
          fillColor: COLORS.subheader,
          textColor: COLORS.gascoBlue,
          fontStyle: "bold",
          halign: "left",
        },
      },
    ]);

    partition.items.forEach((item, idx) => {
      const rowNo = String(rowCounter).padStart(2, "0");
      rowCounter += 1;
      const fillColor: [number, number, number] =
        idx % 2 === 1 ? COLORS.tableRowAlt : [255, 255, 255];

      bodyRows.push([
        {
          content: rowNo,
          styles: {
            fillColor,
            textColor: COLORS.gascoBlue,
            fontStyle: "bold",
            halign: "center",
          },
        },
        {
          content: item.equipment,
          styles: {
            fillColor,
            textColor: COLORS.gascoBlue,
            fontStyle: "bold",
            halign: "left",
          },
        },
        {
          content: item.activityRow,
          styles: {
            fillColor,
            textColor: [30, 41, 59],
            fontStyle: "normal",
            halign: "left",
          },
        },
        {
          content: item.date,
          styles: {
            fillColor,
            textColor: [30, 41, 59],
            fontStyle: "normal",
            halign: "center",
          },
        },
      ]);
    });
  });

  autoTable(doc, {
    startY: 31,
    margin: { left: leftMargin, right: leftMargin, top: 20, bottom: 28 },
    head: [["No.", "Equipment", "Activity", "Date"]],
    body: bodyRows,
    theme: "grid",
    styles: {
      font: "helvetica",
      fontSize: 9,
      cellPadding: { top: 2.2, right: 2.4, bottom: 2.2, left: 2.4 },
      lineColor: COLORS.tableBorder,
      lineWidth: 0.2,
      valign: "top",
    },
    headStyles: {
      fillColor: COLORS.tableHeader,
      textColor: [255, 255, 255],
      fontStyle: "bold",
      fontSize: 9.5,
      halign: "left",
    },
    columnStyles: {
      0: { cellWidth: 11, halign: "center" },
      1: { cellWidth: 43, halign: "left" },
      2: { cellWidth: 95, halign: "left" },
      3: { cellWidth: 25, halign: "center" },
    },
    didParseCell: (data) => {
      if (
        data.section === "head" &&
        (data.column.index === 0 || data.column.index === 3)
      ) {
        data.cell.styles.halign = "center";
      }
    },
    didDrawPage: (data) => {
      drawFooter(doc, data.pageNumber, report.reportPeriod);
    },
  });

  doc.save(buildSafePdfFilename(report.reportPeriod));
}
