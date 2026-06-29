"use client";

import { Download, Plus, Upload } from "lucide-react";
import type { ReactNode } from "react";
import { useState } from "react";
import { exportEntriesCsv, parseImportedEntries } from "@/lib/csv";
import { createFixedCost } from "@/lib/storage";
import type { AppState, Category, EntryType, FixedCost, PaymentMethod } from "@/types/budget";

type SettingsViewProps = {
  state: AppState;
  onChange: (state: AppState) => void;
};

export function SettingsView({ state, onChange }: SettingsViewProps) {
  const [categoryName, setCategoryName] = useState("");
  const [categoryType, setCategoryType] = useState<EntryType>("expense");
  const [paymentName, setPaymentName] = useState("");
  const [fixedName, setFixedName] = useState("");
  const [fixedAmount, setFixedAmount] = useState("");

  function addCategory() {
    if (!categoryName.trim()) {
      return;
    }
    const category: Category = {
      id: `category-${crypto.randomUUID()}`,
      name: categoryName.trim(),
      type: categoryType
    };
    onChange({ ...state, categories: [...state.categories, category] });
    setCategoryName("");
  }

  function addPaymentMethod() {
    if (!paymentName.trim()) {
      return;
    }
    const method: PaymentMethod = {
      id: `payment-${crypto.randomUUID()}`,
      name: paymentName.trim()
    };
    onChange({ ...state, paymentMethods: [...state.paymentMethods, method] });
    setPaymentName("");
  }

  function addFixedCost() {
    const firstExpenseCategory = state.categories.find((category) => category.type === "expense");
    const firstPayment = state.paymentMethods[0];
    if (!fixedName.trim() || !firstExpenseCategory || !firstPayment) {
      return;
    }
    const fixedCost = createFixedCost({
      name: fixedName.trim(),
      amount: Number(fixedAmount) || 0,
      categoryId: firstExpenseCategory.id,
      paymentMethodId: firstPayment.id,
      dayOfMonth: 1,
      enabled: true
    });
    onChange({ ...state, fixedCosts: [...state.fixedCosts, fixedCost] });
    setFixedName("");
    setFixedAmount("");
  }

  function removeCategory(id: string) {
    onChange({ ...state, categories: state.categories.filter((category) => category.id !== id) });
  }

  function removePaymentMethod(id: string) {
    onChange({
      ...state,
      paymentMethods: state.paymentMethods.filter((method) => method.id !== id)
    });
  }

  function renameCategory(id: string) {
    const category = state.categories.find((item) => item.id === id);
    if (!category) {
      return;
    }
    const name = window.prompt("カテゴリ名", category.name);
    if (!name?.trim()) {
      return;
    }
    onChange({
      ...state,
      categories: state.categories.map((item) =>
        item.id === id ? { ...item, name: name.trim() } : item
      )
    });
  }

  function renamePaymentMethod(id: string) {
    const method = state.paymentMethods.find((item) => item.id === id);
    if (!method) {
      return;
    }
    const name = window.prompt("支払方法名", method.name);
    if (!name?.trim()) {
      return;
    }
    onChange({
      ...state,
      paymentMethods: state.paymentMethods.map((item) =>
        item.id === id ? { ...item, name: name.trim() } : item
      )
    });
  }

  function toggleFixedCost(id: string) {
    onChange({
      ...state,
      fixedCosts: state.fixedCosts.map((cost) =>
        cost.id === id ? { ...cost, enabled: !cost.enabled } : cost
      )
    });
  }

  function downloadCsv() {
    const blob = new Blob([exportEntriesCsv(state)], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "家計簿.csv";
    anchor.click();
    URL.revokeObjectURL(url);
  }

  async function importCsv(file?: File) {
    if (!file) {
      return;
    }
    const text = await file.text();
    const imported = parseImportedEntries(text, state);
    onChange({ ...state, entries: [...imported, ...state.entries] });
  }

  return (
    <section className="space-y-4">
      <Panel title="カテゴリ">
        <div className="grid grid-cols-[1fr_120px_auto] gap-2">
          <input value={categoryName} onChange={(event) => setCategoryName(event.target.value)} className="input" placeholder="カテゴリ名" />
          <select value={categoryType} onChange={(event) => setCategoryType(event.target.value as EntryType)} className="input">
            <option value="expense">支出</option>
            <option value="income">収入</option>
          </select>
          <button type="button" onClick={addCategory} className="icon-btn" aria-label="追加" title="追加">
            <Plus size={20} />
          </button>
        </div>
        <EditableList items={state.categories} getLabel={(item) => `${item.name} / ${item.type === "income" ? "収入" : "支出"}`} onEdit={renameCategory} onRemove={removeCategory} />
      </Panel>

      <Panel title="支払方法">
        <div className="grid grid-cols-[1fr_auto] gap-2">
          <input value={paymentName} onChange={(event) => setPaymentName(event.target.value)} className="input" placeholder="支払方法名" />
          <button type="button" onClick={addPaymentMethod} className="icon-btn" aria-label="追加" title="追加">
            <Plus size={20} />
          </button>
        </div>
        <EditableList items={state.paymentMethods} getLabel={(item) => item.name} onEdit={renamePaymentMethod} onRemove={removePaymentMethod} />
      </Panel>

      <Panel title="固定費">
        <div className="grid grid-cols-[1fr_120px_auto] gap-2">
          <input value={fixedName} onChange={(event) => setFixedName(event.target.value)} className="input" placeholder="家賃など" />
          <input type="number" value={fixedAmount} onChange={(event) => setFixedAmount(event.target.value)} className="input" placeholder="金額" />
          <button type="button" onClick={addFixedCost} className="icon-btn" aria-label="追加" title="追加">
            <Plus size={20} />
          </button>
        </div>
        <div className="mt-3 space-y-2">
          {state.fixedCosts.map((cost: FixedCost) => (
            <label key={cost.id} className="flex items-center justify-between rounded-lg bg-surface p-3 text-sm">
              <span>{cost.name} / {cost.amount.toLocaleString()}円</span>
              <input type="checkbox" checked={cost.enabled} onChange={() => toggleFixedCost(cost.id)} />
            </label>
          ))}
        </div>
      </Panel>

      <Panel title="CSV">
        <div className="grid grid-cols-2 gap-3">
          <button type="button" onClick={downloadCsv} className="btn-secondary">
            <Download size={18} />
            エクスポート
          </button>
          <label className="btn-secondary cursor-pointer">
            <Upload size={18} />
            インポート
            <input className="sr-only" type="file" accept=".csv,text/csv" onChange={(event) => void importCsv(event.target.files?.[0])} />
          </label>
        </div>
      </Panel>
    </section>
  );
}

function Panel({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="rounded-lg bg-white p-4 shadow-material">
      <h2 className="mb-3 text-lg font-bold">{title}</h2>
      {children}
    </section>
  );
}

function EditableList<T extends { id: string; isDefault?: boolean }>({
  items,
  getLabel,
  onEdit,
  onRemove
}: {
  items: T[];
  getLabel: (item: T) => string;
  onEdit: (id: string) => void;
  onRemove: (id: string) => void;
}) {
  return (
    <div className="mt-3 space-y-2">
      {items.map((item) => (
        <div key={item.id} className="flex items-center justify-between rounded-lg bg-surface p-3 text-sm">
          <span>{getLabel(item)}</span>
          <div className="flex gap-3">
            <button type="button" onClick={() => onEdit(item.id)} className="font-bold text-primary">
              編集
            </button>
            <button type="button" onClick={() => onRemove(item.id)} className="text-danger disabled:text-muted" disabled={item.isDefault}>
              削除
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
