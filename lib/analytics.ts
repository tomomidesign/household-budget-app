import { toMonthKey } from "@/lib/date";
import type { AppState, BudgetEntry } from "@/types/budget";

export function entriesForMonth(entries: BudgetEntry[], targetMonth: string): BudgetEntry[] {
  return entries.filter((entry) => toMonthKey(entry.date) === targetMonth);
}

export function sumEntries(entries: BudgetEntry[], predicate: (entry: BudgetEntry) => boolean): number {
  return entries.filter(predicate).reduce((total, entry) => total + entry.amount, 0);
}

export function monthlySummary(entries: BudgetEntry[], targetMonth: string) {
  const currentEntries = entriesForMonth(entries, targetMonth);
  const income = sumEntries(currentEntries, (entry) => entry.type === "income");
  const expense = sumEntries(currentEntries, (entry) => entry.type === "expense");
  const fixed = sumEntries(
    currentEntries,
    (entry) => entry.type === "expense" && entry.costKind === "fixed"
  );
  const variable = sumEntries(
    currentEntries,
    (entry) => entry.type === "expense" && entry.costKind === "variable"
  );

  return {
    income,
    expense,
    balance: income - expense,
    fixed,
    variable,
    savings: Math.max(income - expense, 0)
  };
}

export function recentEntries(entries: BudgetEntry[]): BudgetEntry[] {
  return [...entries]
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .slice(0, 5);
}

export function categoryExpenseData(state: AppState, targetMonth: string) {
  const monthEntries = entriesForMonth(state.entries, targetMonth).filter(
    (entry) => entry.type === "expense"
  );

  return state.categories
    .filter((category) => category.type === "expense")
    .map((category) => ({
      name: category.name,
      value: sumEntries(monthEntries, (entry) => entry.categoryId === category.id)
    }))
    .filter((item) => item.value > 0);
}

export function paymentMethodData(state: AppState, targetMonth: string) {
  const monthEntries = entriesForMonth(state.entries, targetMonth);

  return state.paymentMethods
    .map((method) => ({
      name: method.name,
      value: sumEntries(monthEntries, (entry) => entry.paymentMethodId === method.id)
    }))
    .filter((item) => item.value > 0);
}

export function monthlyTrend(entries: BudgetEntry[]) {
  const months = Array.from(new Set(entries.map((entry) => toMonthKey(entry.date)))).sort();

  return months.map((month) => {
    const monthEntries = entriesForMonth(entries, month);
    return {
      month,
      income: sumEntries(monthEntries, (entry) => entry.type === "income"),
      expense: sumEntries(monthEntries, (entry) => entry.type === "expense")
    };
  });
}
