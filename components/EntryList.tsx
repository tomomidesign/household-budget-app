"use client";

import { Pencil, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";
import { yen } from "@/lib/date";
import type { AppState, BudgetEntry } from "@/types/budget";

type EntryListProps = {
  state: AppState;
  onDelete: (id: string) => void;
  onUpdate: (entry: BudgetEntry) => void;
};

export function EntryList({ state, onDelete, onUpdate }: EntryListProps) {
  const [month, setMonth] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [storeName, setStoreName] = useState("");
  const [paymentMethodId, setPaymentMethodId] = useState("");
  const [amount, setAmount] = useState("");
  const [sortKey, setSortKey] = useState<"date" | "amount" | "storeName">("date");

  const entries = useMemo(() => {
    return [...state.entries]
      .filter((entry) => !month || entry.date.startsWith(month))
      .filter((entry) => !categoryId || entry.categoryId === categoryId)
      .filter((entry) => !paymentMethodId || entry.paymentMethodId === paymentMethodId)
      .filter((entry) => !storeName || entry.storeName.includes(storeName))
      .filter((entry) => !amount || entry.amount === Number(amount))
      .sort((a, b) => compareEntry(a, b, sortKey));
  }, [amount, categoryId, month, paymentMethodId, sortKey, state.entries, storeName]);

  return (
    <section className="space-y-4">
      <div className="grid gap-3 rounded-lg bg-white p-4 shadow-material">
        <input type="month" value={month} onChange={(event) => setMonth(event.target.value)} className="input" />
        <select value={categoryId} onChange={(event) => setCategoryId(event.target.value)} className="input">
          <option value="">カテゴリすべて</option>
          {state.categories.map((category) => (
            <option key={category.id} value={category.id}>
              {category.name}
            </option>
          ))}
        </select>
        <input value={storeName} onChange={(event) => setStoreName(event.target.value)} className="input" placeholder="店舗名で検索" />
        <input type="number" value={amount} onChange={(event) => setAmount(event.target.value)} className="input" placeholder="金額で検索" />
        <select value={paymentMethodId} onChange={(event) => setPaymentMethodId(event.target.value)} className="input">
          <option value="">支払方法すべて</option>
          {state.paymentMethods.map((method) => (
            <option key={method.id} value={method.id}>
              {method.name}
            </option>
          ))}
        </select>
        <select value={sortKey} onChange={(event) => setSortKey(event.target.value as typeof sortKey)} className="input">
          <option value="date">日付順</option>
          <option value="amount">金額順</option>
          <option value="storeName">店舗順</option>
        </select>
      </div>

      <div className="space-y-3">
        {entries.map((entry) => {
          const category = state.categories.find((item) => item.id === entry.categoryId);
          const payment = state.paymentMethods.find((item) => item.id === entry.paymentMethodId);
          return (
            <article key={entry.id} className="rounded-lg bg-white p-4 shadow-material">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm text-muted">{entry.date}</p>
                  <h3 className="mt-1 text-lg font-bold">{entry.storeName || "店舗未入力"}</h3>
                  <p className="mt-1 text-sm text-muted">
                    {category?.name} / {payment?.name}
                  </p>
                </div>
                <div className="flex gap-2">
                  <button type="button" onClick={() => editEntry(entry, onUpdate)} className="icon-btn" aria-label="編集" title="編集">
                    <Pencil size={18} />
                  </button>
                  <button type="button" onClick={() => onDelete(entry.id)} className="icon-btn" aria-label="削除" title="削除">
                    <Trash2 size={19} />
                  </button>
                </div>
              </div>
              <p className={`mt-3 text-xl font-bold ${entry.type === "income" ? "text-success" : "text-danger"}`}>
                {entry.type === "income" ? "+" : "-"}
                {yen(entry.amount)}
              </p>
              {entry.receiptUploadState === "failed" ? (
                <p className="mt-2 rounded-lg bg-red-50 p-2 text-sm text-danger">Drive保存に失敗しました。再登録時に再試行されます。</p>
              ) : null}
            </article>
          );
        })}
      </div>
    </section>
  );
}

function compareEntry(a: BudgetEntry, b: BudgetEntry, sortKey: "date" | "amount" | "storeName") {
  if (sortKey === "amount") {
    return b.amount - a.amount;
  }
  return String(b[sortKey]).localeCompare(String(a[sortKey]), "ja");
}

function editEntry(entry: BudgetEntry, onUpdate: (entry: BudgetEntry) => void) {
  const date = window.prompt("日付", entry.date);
  if (date === null) {
    return;
  }
  const storeName = window.prompt("店舗名", entry.storeName);
  if (storeName === null) {
    return;
  }
  const amount = window.prompt("金額", String(entry.amount));
  if (amount === null) {
    return;
  }

  onUpdate({
    ...entry,
    date,
    storeName,
    amount: Number(amount) || entry.amount,
    updatedAt: new Date().toISOString()
  });
}
