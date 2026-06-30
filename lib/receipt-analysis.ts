"use client";

import { runReceiptOcr } from "@/lib/ocr";
import type { ReceiptAnalysisResult } from "@/types/budget";

export async function analyzeReceiptImage(file: File): Promise<ReceiptAnalysisResult> {
  const formData = new FormData();
  formData.append("receipt", file);

  const response = await fetch("/api/receipt/analyze", {
    method: "POST",
    body: formData
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(
      `AI画像解析に失敗しました: status=${response.status}, body=${body.slice(0, 2000)}`
    );
  }

  return (await response.json()) as ReceiptAnalysisResult;
}

export async function analyzeReceiptWithFallback(file: File): Promise<ReceiptAnalysisResult> {
  try {
    return await analyzeReceiptImage(file);
  } catch (error) {
    console.error("[receipt-analysis] falling back to Tesseract", {
      error: error instanceof Error ? error.message : String(error)
    });
    const fallback = await runReceiptOcr(file);
    return {
      date: fallback.date,
      storeName: fallback.storeName,
      totalAmount: fallback.amount,
      taxAmount: 0,
      paymentMethod: "",
      items: [],
      suggestedCategory: "",
      confidence: 0,
      source: "tesseract",
      fallbackReason: error instanceof Error ? error.message : String(error)
    };
  }
}
