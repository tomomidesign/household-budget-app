"use client";

import { useEffect, useMemo, useState } from "react";
import { AnalyticsView } from "@/components/AnalyticsView";
import { BottomNav, type TabKey } from "@/components/BottomNav";
import { EntryList } from "@/components/EntryList";
import { ReceiptForm } from "@/components/ReceiptForm";
import { SettingsView } from "@/components/SettingsView";
import { StatCard } from "@/components/StatCard";
import { entriesForMonth, monthlySummary, recentEntries } from "@/lib/analytics";
import { backupStateToSupabase } from "@/lib/backup";
import { monthKey, yen } from "@/lib/date";
import { uploadReceiptToDrive } from "@/lib/drive";
import { createEntry, generateFixedCostEntries, loadState, saveState } from "@/lib/storage";
import type { AppState, BudgetEntry, EntryDraft } from "@/types/budget";

export function BudgetApp() {
  const [activeTab, setActiveTab] = useState<TabKey>("home");
  const [targetMonth, setTargetMonth] = useState(monthKey());
  const [state, setState] = useState<AppState | null>(null);
  const [message, setMessage] = useState("");

  useEffect(() => {
    const loaded = generateFixedCostEntries(loadState());
    setState(loaded);
    saveState(loaded);
  }, []);

  useEffect(() => {
    if (state) {
      saveState(state);
      void backupStateToSupabase(state).catch(() => {
        setMessage("ローカル保存しました。Supabaseバックアップは失敗しました。");
      });
    }
  }, [state]);

  const summary = useMemo(
    () => monthlySummary(state?.entries ?? [], targetMonth),
    [state?.entries, targetMonth]
  );

  if (!state) {
    return <main className="mx-auto max-w-xl p-6">読み込み中...</main>;
  }

  function updateState(nextState: AppState) {
    setState(nextState);
    setMessage("保存しました");
  }

  async function addEntry(draft: EntryDraft) {
    if (!state) {
      return;
    }

    let entry = createEntry(draft);
    setState({ ...state, entries: [entry, ...state.entries] });
    setMessage("登録しました");

    if (
      !draft.receiptImageDataUrl ||
      process.env.NEXT_PUBLIC_ENABLE_DRIVE_UPLOAD !== "true"
    ) {
      return;
    }

    try {
      const drive = await uploadReceiptToDrive({
        date: draft.date,
        storeName: draft.storeName || "店舗未入力",
        amount: draft.amount,
        imageDataUrl: draft.receiptImageDataUrl
      });
      entry = {
        ...entry,
        driveFileId: drive.fileId,
        driveUrl: drive.url,
        receiptUploadState: "uploaded",
        updatedAt: new Date().toISOString()
      };
      setState((current) =>
        current
          ? {
              ...current,
              entries: current.entries.map((item) => (item.id === entry.id ? entry : item))
            }
          : current
      );
      setMessage("登録し、レシート画像をDriveへ保存しました");
    } catch {
      const failedEntry: BudgetEntry = {
        ...entry,
        receiptUploadState: "failed",
        updatedAt: new Date().toISOString()
      };
      setState((current) =>
        current
          ? {
              ...current,
              entries: current.entries.map((item) => (item.id === entry.id ? failedEntry : item))
            }
          : current
      );
      setMessage("家計簿へ登録しました。Drive保存は後で再試行してください。");
    }
  }

  function deleteEntry(id: string) {
    setState((current) =>
      current
        ? { ...current, entries: current.entries.filter((entry) => entry.id !== id) }
        : current
    );
    setMessage("削除しました");
  }

  function updateEntry(entry: BudgetEntry) {
    setState((current) =>
      current
        ? {
            ...current,
            entries: current.entries.map((item) => (item.id === entry.id ? entry : item))
          }
        : current
    );
    setMessage("更新しました");
  }

  const title = {
    home: "ダッシュボード",
    entry: "家計簿登録",
    list: "一覧",
    analytics: "集計",
    settings: "設定"
  }[activeTab];

  return (
    <main className="mx-auto min-h-screen max-w-xl px-4 pb-24 pt-5">
      <header className="sticky top-0 z-10 -mx-4 bg-surface/95 px-4 pb-3 pt-2 backdrop-blur">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-sm font-medium text-muted">家計簿レシート管理</p>
            <h1 className="text-2xl font-bold tracking-normal">{title}</h1>
          </div>
          <input
            type="month"
            value={targetMonth}
            onChange={(event) => setTargetMonth(event.target.value)}
            className="w-36 rounded-lg border border-line bg-white px-3 py-2 text-sm"
            aria-label="対象月"
          />
        </div>
        {message ? <p className="mt-3 rounded-lg bg-blue-50 px-3 py-2 text-sm text-primary">{message}</p> : null}
      </header>

      <div className="mt-4">
        {activeTab === "home" ? (
          <Dashboard state={state} targetMonth={targetMonth} summary={summary} />
        ) : null}
        {activeTab === "entry" ? <ReceiptForm state={state} onAddEntry={addEntry} /> : null}
        {activeTab === "list" ? (
          <EntryList state={state} onDelete={deleteEntry} onUpdate={updateEntry} />
        ) : null}
        {activeTab === "analytics" ? <AnalyticsView state={state} /> : null}
        {activeTab === "settings" ? <SettingsView state={state} onChange={updateState} /> : null}
      </div>

      <BottomNav active={activeTab} onChange={setActiveTab} />
    </main>
  );
}

function Dashboard({
  state,
  targetMonth,
  summary
}: {
  state: AppState;
  targetMonth: string;
  summary: ReturnType<typeof monthlySummary>;
}) {
  const recent = recentEntries(state.entries);
  const currentEntries = entriesForMonth(state.entries, targetMonth);

  return (
    <section className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <StatCard label="今月の収入" value={summary.income} tone="income" />
        <StatCard label="今月の支出" value={summary.expense} tone="expense" />
        <StatCard label="今月の残高" value={summary.balance} tone="balance" />
        <StatCard label="今月の固定費" value={summary.fixed} />
        <StatCard label="今月の変動費" value={summary.variable} />
        <StatCard label="今月の貯金額" value={summary.savings} tone="income" />
      </div>

      <section className="rounded-lg bg-white p-4 shadow-material">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold">最近登録した5件</h2>
          <span className="text-sm text-muted">{currentEntries.length}件</span>
        </div>
        <div className="mt-3 divide-y divide-line">
          {recent.length ? (
            recent.map((entry) => {
              const category = state.categories.find((item) => item.id === entry.categoryId);
              return (
                <div key={entry.id} className="flex items-center justify-between gap-3 py-3">
                  <div>
                    <p className="font-bold">{entry.storeName || category?.name || "未入力"}</p>
                    <p className="text-sm text-muted">{entry.date}</p>
                  </div>
                  <p className={entry.type === "income" ? "font-bold text-success" : "font-bold text-danger"}>
                    {entry.type === "income" ? "+" : "-"}
                    {yen(entry.amount)}
                  </p>
                </div>
              );
            })
          ) : (
            <p className="py-6 text-center text-sm text-muted">まだ登録がありません</p>
          )}
        </div>
      </section>
    </section>
  );
}
