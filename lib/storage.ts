"use client";

import { defaultCategories, defaultPaymentMethods } from "@/lib/defaults";
import { monthKey } from "@/lib/date";
import type { AppState, BudgetEntry, EntryDraft, FixedCost } from "@/types/budget";

const STORAGE_KEY = "household-budget-app-state-v1";

const initialState: AppState = {
  entries: [],
  categories: defaultCategories,
  paymentMethods: defaultPaymentMethods,
  fixedCosts: []
};

function uuid(): string {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export function loadState(): AppState {
  if (typeof window === "undefined") {
    return initialState;
  }

  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (!raw) {
    return initialState;
  }

  try {
    const parsed = JSON.parse(raw) as Partial<AppState>;
    return {
      entries: parsed.entries ?? [],
      categories: parsed.categories?.length ? parsed.categories : defaultCategories,
      paymentMethods: parsed.paymentMethods?.length
        ? parsed.paymentMethods
        : defaultPaymentMethods,
      fixedCosts: parsed.fixedCosts ?? []
    };
  } catch {
    return initialState;
  }
}

export function saveState(state: AppState): void {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

export function createEntry(draft: EntryDraft): BudgetEntry {
  const now = new Date().toISOString();
  return {
    ...draft,
    id: uuid(),
    receiptUploadState: draft.receiptImageDataUrl ? "pending" : "none",
    createdAt: now,
    updatedAt: now
  };
}

export function createFixedCost(input: Omit<FixedCost, "id">): FixedCost {
  return { ...input, id: uuid() };
}

export function generateFixedCostEntries(state: AppState, baseDate = new Date()): AppState {
  const currentMonth = monthKey(baseDate);
  const generated: BudgetEntry[] = [];
  const updatedFixedCosts = state.fixedCosts.map((cost) => {
    if (!cost.enabled || cost.lastGeneratedMonth === currentMonth) {
      return cost;
    }

    const date = `${currentMonth}-${String(Math.min(cost.dayOfMonth, 28)).padStart(2, "0")}`;
    generated.push(
      createEntry({
        date,
        type: "expense",
        amount: cost.amount,
        categoryId: cost.categoryId,
        storeName: cost.name,
        paymentMethodId: cost.paymentMethodId,
        memo: "固定費として自動登録",
        costKind: "fixed"
      })
    );

    return { ...cost, lastGeneratedMonth: currentMonth };
  });

  if (!generated.length) {
    return state;
  }

  return {
    ...state,
    fixedCosts: updatedFixedCosts,
    entries: [...generated, ...state.entries]
  };
}
