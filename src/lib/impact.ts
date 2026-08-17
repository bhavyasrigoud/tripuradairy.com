// Live Impact Counter data source.
//
// Fetches a published Google Sheet CSV and sums the "Bottles saved" column,
// then derives environmental impact (plastic + CO2 avoided).
//
// Constants are documented here so they can be tuned without touching UI code.

const SHEET_CSV_URL =
  "https://docs.google.com/spreadsheets/d/e/2PACX-1vTJFNoGXVxWdMjXdyeRZi9E1RVVBh9hXCRBKHOalA9QyWSvNvt4ZVfTEcx5QucWngK7QLry3hwBwN6C/pub?gid=0&single=true&output=csv";

const BASE_BOTTLES = 100;
// ~20 g of single-use plastic per replaced bottle (typical 500 ml PET).
const GRAMS_PLASTIC_PER_BOTTLE = 20;
// ~50 g CO2e avoided per replaced bottle (production + transport offset).
const GRAMS_CO2_PER_BOTTLE = 50;

export type ImpactStats = {
  bottles: number;
  plasticGrams: number;
  co2Grams: number;
  source: "live" | "fallback";
};

function deriveImpact(bottles: number, source: ImpactStats["source"]): ImpactStats {
  return {
    bottles,
    plasticGrams: bottles * GRAMS_PLASTIC_PER_BOTTLE,
    co2Grams: bottles * GRAMS_CO2_PER_BOTTLE,
    source,
  };
}

function fallback(): ImpactStats {
  return deriveImpact(BASE_BOTTLES, "fallback");
}

// Minimal CSV parser that tolerates quoted cells with commas.
function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (inQuotes) {
      if (ch === '"') {
        if (text[i + 1] === '"') {
          cell += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        cell += ch;
      }
    } else if (ch === '"') {
      inQuotes = true;
    } else if (ch === ",") {
      row.push(cell);
      cell = "";
    } else if (ch === "\n" || ch === "\r") {
      if (cell.length > 0 || row.length > 0) {
        row.push(cell);
        rows.push(row);
        row = [];
        cell = "";
      }
      if (ch === "\r" && text[i + 1] === "\n") i++;
    } else {
      cell += ch;
    }
  }
  if (cell.length > 0 || row.length > 0) {
    row.push(cell);
    rows.push(row);
  }
  return rows;
}

function extractFirstInt(value: string): number {
  const match = value.match(/-?\d+/);
  if (!match) return 0;
  const n = parseInt(match[0], 10);
  return Number.isFinite(n) ? n : 0;
}

export async function fetchImpact(): Promise<ImpactStats> {
  try {
    const res = await fetch(SHEET_CSV_URL, { cache: "no-store" });
    if (!res.ok) return fallback();
    const text = await res.text();
    const rows = parseCsv(text).filter((r) => r.some((c) => c.trim() !== ""));
    if (rows.length === 0) return fallback();

    const header = rows[0].map((h) => h.trim().toLowerCase());
    const colIdx = header.findIndex((h) => h === "bottles saved");
    if (colIdx === -1) return fallback();

    let sum = 0;
    for (let i = 1; i < rows.length; i++) {
      const cell = rows[i][colIdx] ?? "";
      sum += extractFirstInt(cell.trim());
    }

    return deriveImpact(BASE_BOTTLES + sum, "live");
  } catch {
    return fallback();
  }
}

export function formatGrams(g: number): string {
  if (g >= 1000) return `${(g / 1000).toFixed(g >= 10000 ? 0 : 1)} kg`;
  return `${g} g`;
}