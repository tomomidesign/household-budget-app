"use client";

import { Camera, Loader2, RotateCcw, Save } from "lucide-react";
import type { ReactNode } from "react";
import { useMemo, useState } from "react";
import { todayInputValue } from "@/lib/date";
import { analyzeReceiptWithFallback } from "@/lib/receipt-analysis";
import type { AppState, EntryDraft, ReceiptAnalysisResult } from "@/types/budget";

type ReceiptFormProps = {
  state: AppState;
  onAddEntry: (draft: EntryDraft) => Promise<void>;
};

export function ReceiptForm({ state, onAddEntry }: ReceiptFormProps) {
  const expenseCategory = state.categories.find((category) => category.type === "expense");
  const paymentMethod = state.paymentMethods[0];
  const [analysisResult, setAnalysisResult] = useState<ReceiptAnalysisResult | null>(null);
  const [imageDataUrl, setImageDataUrl] = useState<string | undefined>();
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [error, setError] = useState("");
  const [draft, setDraft] = useState<EntryDraft>({
    date: todayInputValue(),
    type: "expense",
    amount: 0,
    categoryId: expenseCategory?.id ?? "",
    storeName: "",
    paymentMethodId: paymentMethod?.id ?? "",
    memo: "",
    costKind: "variable"
  });

  const visibleCategories = useMemo(
    () => state.categories.filter((category) => category.type === draft.type),
    [draft.type, state.categories]
  );

  async function handleFile(file?: File) {
    if (!file) {
      return;
    }

    setError("");
    setIsAnalyzing(true);

    try {
      const nextImageDataUrl = await fileToDataUrl(file);
      setImageDataUrl(nextImageDataUrl);
      const result = await analyzeReceiptWithFallback(file);
      setAnalysisResult(result);
      const matchedCategory = findCategoryId(state, result.suggestedCategory, draft.type);
      const matchedPayment = findPaymentMethodId(state, result.paymentMethod);
      setDraft((current) => ({
        ...current,
        date: result.date || current.date,
        amount: result.totalAmount,
        storeName: result.storeName,
        categoryId: matchedCategory || current.categoryId,
        paymentMethodId: matchedPayment || current.paymentMethodId,
        receiptImageDataUrl: nextImageDataUrl
      }));
    } catch {
      setError("AI画像解析に失敗しました。内容を手入力してください。");
      setAnalysisResult({
        date: draft.date,
        storeName: "",
        totalAmount: 0,
        taxAmount: 0,
        paymentMethod: "",
        items: [],
        suggestedCategory: "",
        confidence: 0,
        source: "manual"
      });
    } finally {
      setIsAnalyzing(false);
    }
  }

  async function handleSubmit() {
    await onAddEntry({ ...draft, receiptImageDataUrl: imageDataUrl });
    setAnalysisResult(null);
    setImageDataUrl(undefined);
    setDraft({
      date: todayInputValue(),
      type: "expense",
      amount: 0,
      categoryId: expenseCategory?.id ?? "",
      storeName: "",
      paymentMethodId: paymentMethod?.id ?? "",
      memo: "",
      costKind: "variable"
    });
  }

  return (
    <section className="space-y-4">
      <label className="flex min-h-36 cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed border-line bg-white p-6 text-center shadow-material">
        {isAnalyzing ? (
          <Loader2 className="animate-spin text-primary" size={34} />
        ) : (
          <Camera className="text-primary" size={34} />
        )}
        <span className="mt-3 text-base font-bold">レシートを撮影</span>
        <span className="mt-1 text-sm text-muted">PCでは画像アップロードとして使えます</span>
        <input
          className="sr-only"
          type="file"
          accept="image/*"
          capture="environment"
          onChange={(event) => void handleFile(event.target.files?.[0])}
        />
      </label>

      {error ? <p className="rounded-lg bg-red-50 p-3 text-sm text-danger">{error}</p> : null}

      {(analysisResult || imageDataUrl) && (
        <div className="rounded-lg border border-blue-100 bg-blue-50 p-3 text-sm text-primary">
          AI解析結果を確認して、必要なら修正してください。確認後に登録されます。
        </div>
      )}

      <div className="grid gap-3 rounded-lg bg-white p-4 shadow-material">
        {analysisResult ? <AnalysisPreview result={analysisResult} /> : null}
        <Field label="日付">
          <input
            type="date"
            value={draft.date}
            onChange={(event) => setDraft({ ...draft, date: event.target.value })}
            className="input"
          />
        </Field>
        <Field label="種別">
          <select
            value={draft.type}
            onChange={(event) => {
              const nextType = event.target.value as EntryDraft["type"];
              const nextCategory = state.categories.find((category) => category.type === nextType);
              setDraft({ ...draft, type: nextType, categoryId: nextCategory?.id ?? "" });
            }}
            className="input"
          >
            <option value="expense">支出</option>
            <option value="income">収入</option>
          </select>
        </Field>
        <Field label="金額">
          <input
            type="number"
            min="0"
            value={draft.amount || ""}
            onChange={(event) => setDraft({ ...draft, amount: Number(event.target.value) })}
            className="input"
          />
        </Field>
        <Field label="カテゴリ">
          <select
            value={draft.categoryId}
            onChange={(event) => setDraft({ ...draft, categoryId: event.target.value })}
            className="input"
          >
            {visibleCategories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </select>
        </Field>
        <Field label="店舗名">
          <input
            value={draft.storeName}
            onChange={(event) => setDraft({ ...draft, storeName: event.target.value })}
            className="input"
            placeholder="店舗名"
          />
        </Field>
        <Field label="支払方法">
          <select
            value={draft.paymentMethodId}
            onChange={(event) => setDraft({ ...draft, paymentMethodId: event.target.value })}
            className="input"
          >
            {state.paymentMethods.map((method) => (
              <option key={method.id} value={method.id}>
                {method.name}
              </option>
            ))}
          </select>
        </Field>
        <Field label="費用区分">
          <select
            value={draft.costKind}
            onChange={(event) =>
              setDraft({ ...draft, costKind: event.target.value as EntryDraft["costKind"] })
            }
            className="input"
          >
            <option value="variable">変動費</option>
            <option value="fixed">固定費</option>
          </select>
        </Field>
        <Field label="メモ">
          <textarea
            value={draft.memo}
            onChange={(event) => setDraft({ ...draft, memo: event.target.value })}
            className="input min-h-20"
            placeholder="メモ"
          />
        </Field>
        <button
          type="button"
          onClick={() => void handleSubmit()}
          disabled={!draft.date || !draft.categoryId || !draft.paymentMethodId || draft.amount <= 0}
          className="btn-primary"
        >
          <Save size={20} />
          登録する
        </button>
        <button
          type="button"
          onClick={() => {
            setAnalysisResult(null);
            setError("");
          }}
          className="btn-secondary"
        >
          <RotateCcw size={18} />
          手入力に戻す
        </button>
      </div>
    </section>
  );
}

function AnalysisPreview({ result }: { result: ReceiptAnalysisResult }) {
  return (
    <section className="rounded-lg border border-line bg-surface p-3 text-sm">
      <div className="flex items-center justify-between gap-3">
        <h2 className="font-bold text-ink">解析JSON</h2>
        <span className="rounded-full bg-white px-2 py-1 text-xs text-muted">
          {result.source === "ai"
            ? "AI Vision"
            : result.source === "tesseract"
              ? "Tesseract fallback"
              : "手入力"}
        </span>
      </div>
      <pre className="mt-3 max-h-64 overflow-auto whitespace-pre-wrap rounded-lg bg-white p-3 text-xs text-ink">
        {JSON.stringify(
          {
            date: result.date,
            storeName: result.storeName,
            totalAmount: result.totalAmount,
            taxAmount: result.taxAmount,
            paymentMethod: result.paymentMethod,
            items: result.items,
            suggestedCategory: result.suggestedCategory,
            confidence: result.confidence
          },
          null,
          2
        )}
      </pre>
    </section>
  );
}

function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error("画像を読み込めませんでした"));
    reader.readAsDataURL(file);
  });
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="grid gap-1 text-sm font-medium text-muted">
      {label}
      {children}
    </label>
  );
}

function findCategoryId(state: AppState, categoryName: string, type: EntryDraft["type"]): string {
  const normalized = categoryName.trim();
  if (!normalized) {
    return "";
  }

  return (
    state.categories.find(
      (category) => category.type === type && category.name === normalized
    )?.id ?? ""
  );
}

function findPaymentMethodId(state: AppState, paymentMethodName: string): string {
  const normalized = paymentMethodName.trim();
  if (!normalized) {
    return "";
  }

  return (
    state.paymentMethods.find((method) => method.name === normalized)?.id ??
    state.paymentMethods.find(
      (method) => normalized.includes(method.name) || method.name.includes(normalized)
    )?.id ??
    ""
  );
}
