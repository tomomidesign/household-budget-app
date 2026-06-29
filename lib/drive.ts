import { fileSafeName } from "@/lib/date";

export type DriveUploadInput = {
  date: string;
  storeName: string;
  amount: number;
  imageDataUrl: string;
};

export type DriveUploadResult = {
  fileId: string;
  url: string;
};

export function buildReceiptFileName(input: Pick<DriveUploadInput, "date" | "storeName" | "amount">) {
  return `${input.date}_${fileSafeName(input.storeName)}_${input.amount}円.jpg`;
}

export function buildReceiptFolderName(date: string): string {
  return date.slice(0, 7);
}

export async function uploadReceiptToDrive(
  input: DriveUploadInput
): Promise<DriveUploadResult> {
  const response = await fetch("/api/drive/upload", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input)
  });

  if (!response.ok) {
    throw new Error("Google Drive保存に失敗しました");
  }

  return (await response.json()) as DriveUploadResult;
}
