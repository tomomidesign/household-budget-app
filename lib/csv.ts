import type { AppState, BudgetEntry } from "@/types/budget";

function escapeCsv(value: string | number | undefined): string {
  const text = String(value ?? "");
  return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

export function exportEntriesCsv(state: AppState): string {
  const rows = [
    [
      "id",
      "date",
      "type",
      "amount",
      "category",
      "storeName",
      "paymentMethod",
      "memo",
      "costKind",
      "driveFileId",
      "driveUrl"
    ],
    ...state.entries.map((entry) => {
      const category = state.categories.find((item) => item.id === entry.categoryId);
      const payment = state.paymentMethods.find((item) => item.id === entry.paymentMethodId);
      return [
        entry.id,
        entry.date,
        entry.type,
        entry.amount,
        category?.name ?? "",
        entry.storeName,
        payment?.name ?? "",
        entry.memo,
        entry.costKind,
        entry.driveFileId,
        entry.driveUrl
      ];
    })
  ];

  return rows.map((row) => row.map(escapeCsv).join(",")).join("\n");
}

export function parseImportedEntries(csv: string, state: AppState): BudgetEntry[] {
  const lines = csv.split(/\r?\n/).filter(Boolean);
  const [, ...rows] = lines;
  const now = new Date().toISOString();

  return rows
    .map(parseCsvLine)
    .filter((cols) => cols.length >= 8)
    .map((cols) => {
      const category = state.categories.find((item) => item.name === cols[4]) ?? state.categories[0];
      const payment =
        state.paymentMethods.find((item) => item.name === cols[6]) ?? state.paymentMethods[0];

      return {
        id: cols[0] || crypto.randomUUID(),
        date: cols[1],
        type: cols[2] === "income" ? "income" : "expense",
        amount: Number(cols[3]) || 0,
        categoryId: category.id,
        storeName: cols[5] ?? "",
        paymentMethodId: payment.id,
        memo: cols[7] ?? "",
        costKind: cols[8] === "fixed" ? "fixed" : "variable",
        driveFileId: cols[9] || undefined,
        driveUrl: cols[10] || undefined,
        receiptUploadState: cols[10] ? "uploaded" : "none",
        createdAt: now,
        updatedAt: now
      };
    });
}

function parseCsvLine(line: string): string[] {
  const columns: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let index = 0; index < line.length; index += 1) {
    const char = line[index];
    const next = line[index + 1];

    if (char === '"' && inQuotes && next === '"') {
      current += '"';
      index += 1;
      continue;
    }

    if (char === '"') {
      inQuotes = !inQuotes;
      continue;
    }

    if (char === "," && !inQuotes) {
      columns.push(current);
      current = "";
      continue;
    }

    current += char;
  }

  columns.push(current);
  return columns;
}
