import type { Category, PaymentMethod } from "@/types/budget";

export const defaultExpenseCategories: Category[] = [
  "食費",
  "日用品",
  "医療",
  "ガソリン",
  "外食",
  "娯楽",
  "被服",
  "教育",
  "通信",
  "光熱費",
  "保険",
  "家賃",
  "サブスク",
  "その他"
].map((name) => ({
  id: `expense-${name}`,
  name,
  type: "expense",
  isDefault: true
}));

export const defaultIncomeCategories: Category[] = ["給与", "事業", "副業", "配当", "その他"].map(
  (name) => ({
    id: `income-${name}`,
    name,
    type: "income",
    isDefault: true
  })
);

export const defaultCategories: Category[] = [
  ...defaultExpenseCategories,
  ...defaultIncomeCategories
];

export const defaultPaymentMethods: PaymentMethod[] = [
  "現金",
  "福岡銀行",
  "イオンカード",
  "PayPay",
  "その他"
].map((name) => ({
  id: `payment-${name}`,
  name,
  isDefault: true
}));
