"use client";

import { BarChart3, Home, ListFilter, PlusCircle, WalletCards } from "lucide-react";

export type TabKey = "home" | "entry" | "list" | "analytics" | "settings";

const items: { key: TabKey; label: string; Icon: typeof Home }[] = [
  { key: "home", label: "ホーム", Icon: Home },
  { key: "entry", label: "登録", Icon: PlusCircle },
  { key: "list", label: "一覧", Icon: ListFilter },
  { key: "analytics", label: "集計", Icon: BarChart3 },
  { key: "settings", label: "設定", Icon: WalletCards }
];

type BottomNavProps = {
  active: TabKey;
  onChange: (tab: TabKey) => void;
};

export function BottomNav({ active, onChange }: BottomNavProps) {
  return (
    <nav className="fixed inset-x-0 bottom-0 z-20 border-t border-line bg-white/95 backdrop-blur">
      <div className="mx-auto grid max-w-xl grid-cols-5">
        {items.map(({ key, label, Icon }) => (
          <button
            key={key}
            type="button"
            onClick={() => onChange(key)}
            className={`flex h-16 flex-col items-center justify-center gap-1 text-xs font-medium ${
              active === key ? "text-primary" : "text-muted"
            }`}
            aria-label={label}
            title={label}
          >
            <Icon size={22} />
            <span>{label}</span>
          </button>
        ))}
      </div>
    </nav>
  );
}
