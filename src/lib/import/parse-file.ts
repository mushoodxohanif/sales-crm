import { parse } from "csv-parse/sync";
import * as XLSX from "xlsx";
import { fieldKeyFromLabel } from "@/lib/utils/slug";
import type { ParsedFileData, ParsedRow } from "./types";

export const MAX_IMPORT_ROWS = 5_000;
export const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024;
export const PREVIEW_ROW_COUNT = 5;

const ACCEPTED_EXTENSIONS = new Set(["csv", "xlsx"]);

export function normalizeHeader(header: string): string {
  return header.replace(/\uFEFF/g, "").trim();
}

export function headerToFieldKey(header: string): string {
  const normalized = normalizeHeader(header);
  const key = fieldKeyFromLabel(normalized);
  return key || "column";
}

function ensureUniqueKeys(headers: string[]): string[] {
  const seen = new Map<string, number>();

  return headers.map((header) => {
    const base = headerToFieldKey(header) || "column";
    const count = seen.get(base) ?? 0;
    seen.set(base, count + 1);
    return count === 0 ? base : `${base}_${count + 1}`;
  });
}

function rowsFromMatrix(matrix: string[][]): ParsedFileData {
  if (matrix.length === 0) {
    throw new Error("File is empty.");
  }

  const rawHeaders = matrix[0].map((cell) => normalizeHeader(String(cell ?? "")));

  if (rawHeaders.every((header) => header.length === 0)) {
    throw new Error("File has no column headers.");
  }

  const headers = rawHeaders.map((header, index) => header || `Column ${index + 1}`);
  const _keys = ensureUniqueKeys(headers);

  const rows: ParsedRow[] = [];

  for (let rowIndex = 1; rowIndex < matrix.length; rowIndex++) {
    const row = matrix[rowIndex];
    const hasValue = row.some((cell) => String(cell ?? "").trim().length > 0);

    if (!hasValue) {
      continue;
    }

    const parsedRow: ParsedRow = {};

    for (let colIndex = 0; colIndex < headers.length; colIndex++) {
      parsedRow[headers[colIndex]] = String(row[colIndex] ?? "").trim();
    }

    rows.push(parsedRow);
  }

  if (rows.length === 0) {
    throw new Error("File contains headers but no data rows.");
  }

  if (rows.length > MAX_IMPORT_ROWS) {
    throw new Error(`File exceeds the ${MAX_IMPORT_ROWS.toLocaleString()} row limit.`);
  }

  return {
    headers,
    rows,
    previewRows: rows.slice(0, PREVIEW_ROW_COUNT),
  };
}

export function parseCsvBuffer(buffer: Buffer): ParsedFileData {
  const matrix = parse(buffer, {
    bom: true,
    relax_column_count: true,
    skip_empty_lines: true,
    trim: true,
  }) as string[][];

  return rowsFromMatrix(matrix);
}

export function parseXlsxBuffer(buffer: Buffer): ParsedFileData {
  const workbook = XLSX.read(buffer, { type: "buffer", cellDates: false });
  const sheetName = workbook.SheetNames[0];

  if (!sheetName) {
    throw new Error("Workbook has no sheets.");
  }

  const sheet = workbook.Sheets[sheetName];
  const matrix = XLSX.utils.sheet_to_json(sheet, {
    header: 1,
    raw: false,
    defval: "",
  }) as string[][];

  return rowsFromMatrix(matrix);
}

export function getFileExtension(fileName: string): string | null {
  const parts = fileName.toLowerCase().split(".");
  const extension = parts.at(-1);

  if (!extension || !ACCEPTED_EXTENSIONS.has(extension)) {
    return null;
  }

  return extension;
}

export function parseUploadedFile(fileName: string, buffer: Buffer): ParsedFileData {
  if (buffer.byteLength > MAX_FILE_SIZE_BYTES) {
    throw new Error("File exceeds the 10 MB upload limit.");
  }

  const extension = getFileExtension(fileName);

  if (!extension) {
    throw new Error("Only .csv and .xlsx files are supported.");
  }

  return extension === "csv" ? parseCsvBuffer(buffer) : parseXlsxBuffer(buffer);
}
