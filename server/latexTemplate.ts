export type PartitionCode = "PM" | "CM" | "COMM" | "ENG";

export interface ExtractedPermitItem {
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
  items: ExtractedPermitItem[];
}

export const PARTITION_ORDER: PartitionCode[] = ["PM", "CM", "COMM", "ENG"];

export const PARTITION_TITLES: Record<PartitionCode, string> = {
  PM: "Preventive Maintenance (PM) Activities",
  CM: "Corrective Maintenance (CM) Activities",
  COMM: "Communication (COMM) Activities",
  ENG: "Engineering (ENG) Activities",
};

export const MASTER_LATEX_TEMPLATE = String.raw`\documentclass[11pt,a4paper]{article}
\usepackage[utf8]{inputenc}
\usepackage[T1]{fontenc}
\usepackage{helvet}
\renewcommand{\familydefault}{\sfdefault}
\usepackage{graphicx}
\usepackage[table]{xcolor}
\usepackage{geometry}
\usepackage{fancyhdr}
\usepackage{tabularx}
\usepackage{ltablex}
\usepackage{array}
\usepackage{textcomp}
\usepackage{enumitem}
\usepackage{tikz}

\keepXColumns

% Page Geometry
\geometry{
    a4paper,
    left=18mm,
    right=18mm,
    top=20mm,
    bottom=24mm
}

% Color Palette Matching GASCO Report Template
\definecolor{gascoblue}{RGB}{27, 54, 93}
\definecolor{gascocyan}{RGB}{0, 136, 206}
\definecolor{tableheader}{RGB}{31, 78, 121}
\definecolor{subheader}{RGB}{217, 226, 243}
\definecolor{tablerow}{RGB}{245, 247, 250}
\definecolor{bordergray}{RGB}{200, 200, 200}
\definecolor{darkgraytext}{RGB}{60, 60, 60}

% Header & Footer Configuration
\pagestyle{fancy}
\fancyhf{}
\renewcommand{\headrulewidth}{0pt}
\renewcommand{\footrulewidth}{0.5pt}
\renewcommand{\footrule}{\hbox to\headwidth{\color{bordergray}\leaders\hrule height \footrulewidth\hfill}}

\fancyfoot[L]{%
    \fontsize{8}{10}\selectfont\textbf{\textcolor{gascoblue}{INSTRUMENTATION \& CONTROL DEPARTMENT WEEK ACTIVITIES REPORT}}\\[2pt]
    \textcolor{darkgraytext}{<<REPORT_PERIOD>>}%
}
\fancyfoot[R]{%
    \fontsize{9}{11}\selectfont\textbf{\textcolor{gascoblue}{\thepage}}%
}

% Custom Macro for Activity Photo Header Block
\newcommand{\activityitem}[4]{%
    \vspace{2mm}
    \noindent
    \begin{tabularx}{\textwidth}{@{} l X r @{}}
        \textbf{\fontsize{13}{15}\selectfont \textcolor{gascocyan}{#1}} & 
        \textbf{\fontsize{13}{15}\selectfont \textcolor{gascoblue}{#2}} & 
        \textbf{\fontsize{10}{12}\selectfont \textcolor{darkgraytext}{#3}} \\
    \end{tabularx}
    \vspace{1mm}
    
    \noindent{\fontsize{10}{12.5}\selectfont \textcolor{darkgraytext}{\textbf{#4}}}\par
    \vspace{2mm}
    \noindent{\fontsize{9}{11}\selectfont \textbf{\textcolor{gascocyan}{PHOTOGRAPHS}}}\par
    \vspace{1mm}
    \noindent{\color{gascoblue}\rule{\textwidth}{0.6pt}}\par
    \vspace{3mm}
}

% Custom Macro for Two Side-by-Side Photos (Aspect Ratio Preserved)
\newcommand{\twophotos}[4]{%
    \noindent
    \begin{minipage}[t]{0.485\textwidth}
        \centering
        \fboxsep=0pt
        \fbox{\includegraphics[width=\textwidth, height=6.2cm, keepaspectratio]{#1}}\\[5pt]
        {\fontsize{8.5}{10.5}\selectfont \textbf{\textcolor{darkgraytext}{#2}}}
    \end{minipage}%
    \hfill
    \begin{minipage}[t]{0.485\textwidth}
        \centering
        \fboxsep=0pt
        \fbox{\includegraphics[width=\textwidth, height=6.2cm, keepaspectratio]{#3}}\\[5pt]
        {\fontsize{8.5}{10.5}\selectfont \textbf{\textcolor{darkgraytext}{#4}}}
    \end{minipage}\par
    \vspace{5mm}
}

% Custom Macro for a Single Centered Photo (Aspect Ratio Preserved)
\newcommand{\onephoto}[2]{%
    \noindent
    \begin{center}
        \begin{minipage}[t]{0.62\textwidth}
            \centering
            \fboxsep=0pt
            \fbox{\includegraphics[width=\textwidth, height=6.2cm, keepaspectratio]{#1}}\\[5pt]
            {\fontsize{8.5}{10.5}\selectfont \textbf{\textcolor{darkgraytext}{#2}}}
        \end{minipage}
    \end{center}
    \vspace{4mm}
}

\begin{document}

% ==========================================
% PAGE 1: COVER PAGE
% ==========================================
\thispagestyle{fancy}
\noindent
\vspace{15mm}
\begin{center}
    \includegraphics[width=\textwidth, height=11.5cm, keepaspectratio]{cover.png}
\end{center}

\vspace{30mm}

\noindent
{\fontsize{14}{16}\selectfont \textbf{\textcolor{gascocyan}{GASCO}}}\\[6pt]
{\fontsize{22}{26}\selectfont \textbf{\textcolor{gascoblue}{Instrumentation \& Control Department -\\Week Activities Report}}}\\[10pt]
{\fontsize{11}{13}\selectfont \textbf{\textcolor{darkgraytext}{}}}

\vspace{10mm}

\noindent
\renewcommand{\arraystretch}{1.6}
\begin{tabularx}{\textwidth}{@{} p{0.32\textwidth} p{0.35\textwidth} X @{}}
    \hline
    \textbf{\fontsize{9}{11}\selectfont \textcolor{gascocyan}{SITE}} & 
    \textbf{\fontsize{9}{11}\selectfont \textcolor{gascocyan}{DEPARTMENT}} & 
    \textbf{\fontsize{9}{11}\selectfont \textcolor{gascocyan}{PERIOD}} \\
    \textbf{\fontsize{11}{13}\selectfont \textcolor{gascoblue}{Amerya LPG Plant}} & 
    \textbf{\fontsize{11}{13}\selectfont \textcolor{gascoblue}{Instrumentation \& Control}} & 
    \textbf{\fontsize{11}{13}\selectfont \textcolor{gascoblue}{<<REPORT_PERIOD>>}} \\
    \hline
\end{tabularx}

\newpage

% ==========================================
% PAGE 2: EXECUTIVE HIGHLIGHTS & SUMMARY TABLE
% ==========================================

\vspace{4mm}
\noindent
{\fontsize{15}{18}\selectfont \textbf{\textcolor{gascoblue}{Summary of Site Activities}}}
\vspace{2mm}

\fontsize{9.5}{12}\selectfont
\renewcommand{\arraystretch}{1.4}
\setlength{\tabcolsep}{6pt}

\begin{tabularx}{\textwidth}{|>{\centering\arraybackslash\textbf\bgroup\color{gascoblue}}p{0.05\textwidth}<{\egroup}|>{\raggedright\arraybackslash\textbf\bgroup\color{gascoblue}}p{0.25\textwidth}<{\egroup}|>{\raggedright\arraybackslash}X|>{\centering\arraybackslash}p{0.14\textwidth}|}
    \hline
    \rowcolor{tableheader}
    \textcolor{white}{\textbf{No.}} & 
    \textcolor{white}{\textbf{Equipment}} & 
    \textcolor{white}{\textbf{Activity}} & 
    \textcolor{white}{\textbf{Date}} \\
    \hline
    \endfirsthead

    \hline
    \rowcolor{tableheader}
    \textcolor{white}{\textbf{No.}} & 
    \textcolor{white}{\textbf{Equipment}} & 
    \textcolor{white}{\textbf{Activity}} & 
    \textcolor{white}{\textbf{Date}} \\
    \hline
    \endhead

    <<PERMIT_ITEMS_HERE>>
\end{tabularx}

\normalsize
\newpage

\end{document}`;

/**
 * Escapes unescaped LaTeX special characters (&, %, $, #, _) without double-escaping.
 */
export function escapeLatex(input: string): string {
  const cleaned = input.replace(/\r?\n+/g, " ").trim();
  return cleaned
    .replace(/(?<!\\)([&%$#_])/g, "\\$1")
    .replace(/\u2013/g, "--")
    .replace(/\u2014/g, "---");
}

/**
 * Removes LaTeX backslash escapes so plain-English summaries read cleanly in the UI.
 */
export function unescapeLatexForDisplay(input: string): string {
  return input
    .replace(/\\([&%$#_])/g, "$1")
    .replace(/\s+/g, " ")
    .trim();
}

export function normalizePartitionCode(
  rawCode?: string,
  rawCategory?: string
): PartitionCode {
  const combined = `${rawCode ?? ""} ${rawCategory ?? ""}`.toUpperCase();
  if (combined.includes("ENG") || combined.includes("ENGINEERING")) {
    return "ENG";
  }
  if (combined.includes("COMM") || combined.includes("COMMUNICATION") || combined.includes("TELEPHONE")) {
    return "COMM";
  }
  if (combined.includes("CM") || combined.includes("CORRECTIVE")) {
    return "CM";
  }
  return "PM";
}

/**
 * Converts DD/MM/YYYY (or D/M/YYYY, YYYY-MM-DD) into sortable YYYYMMDD integer.
 * Returns Number.MAX_SAFE_INTEGER when unparseable so missing dates sort last.
 */
export function parseSortableDate(dateStr: string): number {
  const cleaned = dateStr.trim();
  const dmyMatch = cleaned.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
  if (dmyMatch) {
    const day = Number(dmyMatch[1]);
    const month = Number(dmyMatch[2]);
    const year = Number(dmyMatch[3]);
    return year * 10000 + month * 100 + day;
  }
  const ymdMatch = cleaned.match(/^(\d{4})[\/\-](\d{1,2})[\/\-](\d{1,2})$/);
  if (ymdMatch) {
    const year = Number(ymdMatch[1]);
    const month = Number(ymdMatch[2]);
    const day = Number(ymdMatch[3]);
    return year * 10000 + month * 100 + day;
  }
  return Number.MAX_SAFE_INTEGER;
}

/**
 * Groups permits into PM, CM, COMM (if available), ENG (if available),
 * and sorts jobs chronologically by date within each section.
 */
export function organizePermitsIntoPartitions(
  permits: ExtractedPermitItem[]
): {
  partitions: ReportPartition[];
  orderedPermits: ExtractedPermitItem[];
} {
  const buckets = new Map<PartitionCode, ExtractedPermitItem[]>();
  for (const code of PARTITION_ORDER) {
    buckets.set(code, []);
  }

  for (const permit of permits) {
    const code = normalizePartitionCode(permit.categoryCode, permit.category);
    buckets.get(code)!.push({
      ...permit,
      categoryCode: code,
      category: PARTITION_TITLES[code],
    });
  }

  const partitions: ReportPartition[] = [];
  const orderedPermits: ExtractedPermitItem[] = [];
  let sectionNumber = 1;

  for (const code of PARTITION_ORDER) {
    const items = buckets.get(code)!;
    if (items.length === 0) continue;

    const sortedItems = [...items].sort((a, b) => {
      const dateA = parseSortableDate(a.date);
      const dateB = parseSortableDate(b.date);
      if (dateA !== dateB) return dateA - dateB;
      return a.photoIndex - b.photoIndex;
    });

    partitions.push({
      sectionNumber,
      code,
      title: PARTITION_TITLES[code],
      items: sortedItems,
    });
    orderedPermits.push(...sortedItems);
    sectionNumber += 1;
  }

  return { partitions, orderedPermits };
}

export function buildLatexDocument(
  reportPeriod: string,
  permits: ExtractedPermitItem[]
): { latexCode: string; partitions: ReportPartition[]; orderedPermits: ExtractedPermitItem[] } {
  const escapedPeriod = escapeLatex(reportPeriod);
  const { partitions, orderedPermits } = organizePermitsIntoPartitions(permits);

  const blocks: string[] = [];
  let rowCounter = 1;

  partitions.forEach((partition, partIdx) => {
    const headerText = escapeLatex(
      `${partition.sectionNumber}. ${partition.title}`
    );
    const commentPrefix = partIdx > 0 ? "\n" : "";
    blocks.push(
      `${commentPrefix}    % CATEGORY ${partition.sectionNumber}: ${partition.code}\n    \\multicolumn{4}{|l|}{\\cellcolor{subheader}\\textbf{\\textcolor{gascoblue}{${headerText}}}} \\\\\n    \\hline`
    );

    partition.items.forEach((item, itemIdx) => {
      const no = String(rowCounter).padStart(2, "0");
      rowCounter += 1;
      const eq = escapeLatex(item.equipment || "Instrumentation Equipment");
      const act = escapeLatex(item.activityRow || item.summaryBullets.join(" "));
      const dt = escapeLatex(item.date || "N/A");

      const rowColorLine = itemIdx % 2 === 1 ? "    \\rowcolor{tablerow}\n" : "";
      blocks.push(
        `\n${rowColorLine}    ${no} & ${eq} & \n    ${act} & ${dt} \\\\\n    \\hline`
      );
    });
  });

  const permitRowsBlock =
    blocks.length > 0
      ? blocks.join("\n").replace(/^\s+/, "")
      : `01 & General Instrumentation & No permit items extracted. & N/A \\\\\n    \\hline`;

  const latexCode = MASTER_LATEX_TEMPLATE
    .replaceAll("<<REPORT_PERIOD>>", escapedPeriod)
    .replace("<<PERMIT_ITEMS_HERE>>", permitRowsBlock);

  return { latexCode, partitions, orderedPermits };
}
