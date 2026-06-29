import { NextResponse } from "next/server";
import { Readable } from "node:stream";
import { google } from "googleapis";
import { buildReceiptFileName, buildReceiptFolderName } from "@/lib/drive";

type UploadBody = {
  date: string;
  storeName: string;
  amount: number;
  imageDataUrl: string;
};

export async function POST(request: Request) {
  const body = (await request.json()) as UploadBody;
  const clientEmail = process.env.GOOGLE_DRIVE_CLIENT_EMAIL;
  const privateKey = process.env.GOOGLE_DRIVE_PRIVATE_KEY?.replace(/\\n/g, "\n");
  const rootFolderId = process.env.GOOGLE_DRIVE_ROOT_FOLDER_ID;

  if (!clientEmail || !privateKey || !rootFolderId) {
    return NextResponse.json(
      {
        message:
          "Google Drive APIの環境変数が未設定です。登録データは保存され、画像は再試行できます。"
      },
      { status: 503 }
    );
  }

  const auth = new google.auth.JWT({
    email: clientEmail,
    key: privateKey,
    scopes: ["https://www.googleapis.com/auth/drive.file"]
  });
  const drive = google.drive({ version: "v3", auth });
  const folderName = buildReceiptFolderName(body.date);
  const monthFolderId = await ensureFolder(drive, rootFolderId, folderName);
  const fileName = await uniqueFileName(drive, monthFolderId, buildReceiptFileName(body));
  const upload = parseDataUrl(body.imageDataUrl);

  const created = await drive.files.create({
    requestBody: {
      name: fileName,
      parents: [monthFolderId],
      mimeType: upload.mimeType
    },
    media: {
      mimeType: upload.mimeType,
      body: Readable.from(upload.buffer)
    },
    fields: "id, webViewLink"
  });

  if (!created.data.id) {
    return NextResponse.json({ message: "Drive File IDを取得できませんでした" }, { status: 500 });
  }

  return NextResponse.json({
    fileId: created.data.id,
    url: created.data.webViewLink ?? `https://drive.google.com/file/d/${created.data.id}/view`
  });
}

type DriveClient = ReturnType<typeof google.drive>;

async function ensureFolder(drive: DriveClient, parentId: string, name: string): Promise<string> {
  const escapedName = name.replace(/'/g, "\\'");
  const result = await drive.files.list({
    q: `'${parentId}' in parents and name='${escapedName}' and mimeType='application/vnd.google-apps.folder' and trashed=false`,
    fields: "files(id, name)",
    spaces: "drive"
  });

  const existing = result.data.files?.[0]?.id;
  if (existing) {
    return existing;
  }

  const created = await drive.files.create({
    requestBody: {
      name,
      parents: [parentId],
      mimeType: "application/vnd.google-apps.folder"
    },
    fields: "id"
  });

  if (!created.data.id) {
    throw new Error("月フォルダを作成できませんでした");
  }

  return created.data.id;
}

async function uniqueFileName(drive: DriveClient, parentId: string, fileName: string): Promise<string> {
  const dotIndex = fileName.lastIndexOf(".");
  const base = dotIndex >= 0 ? fileName.slice(0, dotIndex) : fileName;
  const ext = dotIndex >= 0 ? fileName.slice(dotIndex) : "";

  for (let index = 0; index < 100; index += 1) {
    const candidate = index === 0 ? fileName : `${base}_${index + 1}${ext}`;
    const escapedCandidate = candidate.replace(/'/g, "\\'");
    const result = await drive.files.list({
      q: `'${parentId}' in parents and name='${escapedCandidate}' and trashed=false`,
      fields: "files(id)",
      spaces: "drive"
    });
    if (!result.data.files?.length) {
      return candidate;
    }
  }

  return `${base}_${Date.now()}${ext}`;
}

function parseDataUrl(dataUrl: string): { mimeType: string; buffer: Buffer } {
  const match = dataUrl.match(/^data:(.+);base64,(.+)$/);
  if (!match) {
    throw new Error("画像データが不正です");
  }

  return {
    mimeType: match[1],
    buffer: Buffer.from(match[2], "base64")
  };
}
