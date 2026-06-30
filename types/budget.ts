export type EntryType = "income" | "expense";
export type CostKind = "fixed" | "variable";

export type Category = {
  id: string;
  name: string;
  type: EntryType;
  isDefault?: boolean;
};

export type PaymentMethod = {
  id: string;
  name: string;
  isDefault?: boolean;
};

export type ReceiptUploadState = "none" | "pending" | "uploaded" | "failed";

export type BudgetEntry = {
  id: string;
  date: string;
  type: EntryType;
  amount: number;
  categoryId: string;
  storeName: string;
  paymentMethodId: string;
  memo: string;
  costKind: CostKind;
  receiptImageDataUrl?: string;
  driveFileId?: string;
  driveUrl?: string;
  receiptUploadState: ReceiptUploadState;
  createdAt: string;
  updatedAt: string;
};

export type FixedCost = {
  id: string;
  name: string;
  amount: number;
  categoryId: string;
  paymentMethodId: string;
  dayOfMonth: number;
  enabled: boolean;
  lastGeneratedMonth?: string;
};

export type OcrResult = {
  date: string;
  storeName: string;
  amount: number;
  rawText: string;
};

export type ReceiptAnalysisItem = {
  name: string;
  price: number;
  quantity: number;
};

export type ReceiptAnalysisResult = {
  date: string;
  storeName: string;
  totalAmount: number;
  taxAmount: number;
  paymentMethod: string;
  items: ReceiptAnalysisItem[];
  suggestedCategory: string;
  confidence: number;
  source: "ai" | "tesseract" | "manual";
};

export type AppState = {
  entries: BudgetEntry[];
  categories: Category[];
  paymentMethods: PaymentMethod[];
  fixedCosts: FixedCost[];
};

export type EntryDraft = Omit<
  BudgetEntry,
  "id" | "createdAt" | "updatedAt" | "receiptUploadState" | "driveFileId" | "driveUrl"
>;
