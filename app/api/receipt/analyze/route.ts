import { NextResponse } from "next/server";

export const runtime = "nodejs";

type ReceiptAnalysisResult = {
  date: string;
  storeName: string;
  totalAmount: number;
  taxAmount: number;
  paymentMethod: string;
  items: {
    name: string;
    price: number;
    quantity: number;
  }[];
  suggestedCategory: string;
  confidence: number;
  source: "ai";
};

const receiptSchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    date: { type: "string", description: "YYYY-MM-DD. 不明な場合は空文字。" },
    storeName: { type: "string" },
    totalAmount: { type: "number" },
    taxAmount: { type: "number" },
    paymentMethod: { type: "string" },
    items: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          name: { type: "string" },
          price: { type: "number" },
          quantity: { type: "number" }
        },
        required: ["name", "price", "quantity"]
      }
    },
    suggestedCategory: { type: "string" },
    confidence: { type: "number", minimum: 0, maximum: 1 }
  },
  required: [
    "date",
    "storeName",
    "totalAmount",
    "taxAmount",
    "paymentMethod",
    "items",
    "suggestedCategory",
    "confidence"
  ]
};

export async function POST(request: Request) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ message: "OPENAI_API_KEY is not configured" }, { status: 503 });
  }

  const formData = await request.formData();
  const file = formData.get("receipt");

  if (!(file instanceof File)) {
    return NextResponse.json({ message: "receipt image is required" }, { status: 400 });
  }

  const imageDataUrl = await fileToDataUrl(file);
  const model = process.env.OPENAI_VISION_MODEL || "gpt-4.1-mini";

  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      model,
      input: [
        {
          role: "user",
          content: [
            {
              type: "input_text",
              text: [
                "日本のレシート画像を解析し、必ず指定JSONスキーマだけで返してください。",
                "totalAmountは支払うべき購入合計です。",
                "優先順位は「合計」「税込合計」「お買上計」「お支払金額」です。",
                "「お預り」「預り」「お釣り」「釣銭」「現計」はtotalAmountにしないでください。",
                "税額が読めない場合はtaxAmountを0にしてください。",
                "商品明細が読めない場合はitemsを空配列にしてください。",
                "日付が読めない場合はdateを空文字にしてください。",
                "カテゴリ候補は食費、日用品、医療、ガソリン、外食、娯楽、被服、教育、通信、光熱費、保険、家賃、サブスク、その他のいずれかに寄せてください。"
              ].join("\n")
            },
            {
              type: "input_image",
              image_url: imageDataUrl,
              detail: "high"
            }
          ]
        }
      ],
      text: {
        format: {
          type: "json_schema",
          name: "receipt_analysis",
          schema: receiptSchema,
          strict: true
        }
      }
    })
  });

  if (!response.ok) {
    const message = await response.text();
    return NextResponse.json({ message }, { status: response.status });
  }

  const payload = await response.json();
  const parsed = parseReceiptAnalysis(payload);

  return NextResponse.json({
    ...parsed,
    source: "ai"
  } satisfies ReceiptAnalysisResult);
}

async function fileToDataUrl(file: File): Promise<string> {
  const buffer = Buffer.from(await file.arrayBuffer());
  return `data:${file.type || "image/jpeg"};base64,${buffer.toString("base64")}`;
}

function parseReceiptAnalysis(payload: unknown): Omit<ReceiptAnalysisResult, "source"> {
  const text = extractOutputText(payload);
  const parsed = JSON.parse(text) as Omit<ReceiptAnalysisResult, "source">;

  return {
    date: parsed.date || "",
    storeName: parsed.storeName || "",
    totalAmount: Number(parsed.totalAmount) || 0,
    taxAmount: Number(parsed.taxAmount) || 0,
    paymentMethod: parsed.paymentMethod || "",
    items: Array.isArray(parsed.items)
      ? parsed.items.map((item) => ({
          name: String(item.name || ""),
          price: Number(item.price) || 0,
          quantity: Number(item.quantity) || 1
        }))
      : [],
    suggestedCategory: parsed.suggestedCategory || "",
    confidence: clamp(Number(parsed.confidence) || 0, 0, 1)
  };
}

function extractOutputText(payload: unknown): string {
  if (typeof payload !== "object" || payload === null) {
    throw new Error("Invalid OpenAI response");
  }

  const direct = (payload as { output_text?: unknown }).output_text;
  if (typeof direct === "string") {
    return direct;
  }

  const output = (payload as { output?: unknown }).output;
  if (!Array.isArray(output)) {
    throw new Error("OpenAI response did not include output text");
  }

  for (const item of output) {
    const content = (item as { content?: unknown }).content;
    if (!Array.isArray(content)) {
      continue;
    }

    for (const part of content) {
      const text = (part as { text?: unknown }).text;
      if (typeof text === "string") {
        return text;
      }
    }
  }

  throw new Error("OpenAI response did not include parseable text");
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}
