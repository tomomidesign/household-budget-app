"use client";

import type { OcrResult } from "@/types/budget";

function normalizeAmount(value: string): number {
  return Number(value.replace(/[^\d]/g, "")) || 0;
}

function parseDate(text: string): string {
  const normalized = text.replace(/[年月.]/g, "/").replace(/日/g, "");
  const match = normalized.match(/(20\d{2})[/-](\d{1,2})[/-](\d{1,2})/);
  if (!match) {
    return new Date().toISOString().slice(0, 10);
  }
  return `${match[1]}-${match[2].padStart(2, "0")}-${match[3].padStart(2, "0")}`;
}

function parseAmount(text: string): number {
  const totalLine = text
    .split(/\r?\n/)
    .find((line) => /合計|総計|お買上|お支払|税込/.test(line) && /\d/.test(line));

  if (totalLine) {
    return normalizeAmount(totalLine);
  }

  const candidates = Array.from(text.matchAll(/[¥￥]?\s?([0-9,]{3,})\s?円?/g))
    .map((match) => normalizeAmount(match[1]))
    .filter(Boolean);

  return candidates.length ? Math.max(...candidates) : 0;
}

function parseStoreName(text: string): string {
  const lines = text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 1 && !/\d{4}[/-]\d/.test(line));

  return lines[0] ?? "";
}

export async function runReceiptOcr(file: File): Promise<OcrResult> {
  const { createWorker } = await import("tesseract.js");
  const worker = await createWorker("jpn+eng");

  try {
    const result = await worker.recognize(file);
    const rawText = result.data.text;
    return {
      date: parseDate(rawText),
      storeName: parseStoreName(rawText),
      amount: parseAmount(rawText),
      rawText
    };
  } finally {
    await worker.terminate();
  }
}
