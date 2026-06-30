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
    confidence: { type: "number" }
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
  try {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      console.error("[receipt/analyze] OPENAI_API_KEY is not configured", {
        statusCode: 503,
        responseBody: "OPENAI_API_KEY is not configured"
      });
      return NextResponse.json({ message: "OPENAI_API_KEY is not configured" }, { status: 503 });
    }

    const formData = await request.formData();
    const file = formData.get("receipt");

    if (!(file instanceof File)) {
      console.error("[receipt/analyze] receipt image is required", {
        statusCode: 400,
        responseBody: "receipt image is required"
      });
      return NextResponse.json({ message: "receipt image is required" }, { status: 400 });
    }

    const imageDataUrl = await fileToDataUrl(file);
    const model = process.env.OPENAI_VISION_MODEL || "gpt-4.1-mini";

    console.info("[receipt/analyze] calling OpenAI Responses API", {
      model,
      fileType: file.type,
      fileSize: file.size,
      apiKeyConfigured: Boolean(apiKey)
    });

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

    const responseBody = await response.text();

    if (!response.ok) {
      console.error("[receipt/analyze] OpenAI Responses API failed", {
        statusCode: response.status,
        responseBody,
        model
      });
      return NextResponse.json(
        {
          message: "OpenAI Responses API failed",
          statusCode: response.status,
          responseBody
        },
        { status: response.status }
      );
    }

    let payload: unknown;
    try {
      payload = JSON.parse(responseBody);
    } catch (error) {
      console.error("[receipt/analyze] OpenAI returned non-JSON response", {
        statusCode: response.status,
        responseBody,
        error: error instanceof Error ? error.message : String(error)
      });
      return NextResponse.json(
        {
          message: "OpenAI returned non-JSON response",
          statusCode: response.status,
          responseBody
        },
        { status: 502 }
      );
    }

    const parsed = parseReceiptAnalysis(payload);

    console.info("[receipt/analyze] OpenAI receipt analysis succeeded", {
      model,
      confidence: parsed.confidence,
      totalAmount: parsed.totalAmount,
      storeName: parsed.storeName
    });

    return NextResponse.json({
      ...parsed,
      source: "ai"
    } satisfies ReceiptAnalysisResult);
  } catch (error) {
    console.error("[receipt/analyze] unexpected error", {
      statusCode: 500,
      responseBody: error instanceof Error ? error.stack || error.message : String(error)
    });
    return NextResponse.json(
      {
        message: "Unexpected receipt analysis error",
        statusCode: 500,
        responseBody: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    );
  }
}

async function fileToDataUrl(file: File): Promise<string> {
  const buffer = Buffer.from(await file.arrayBuffer());
  return `data:${file.type || "image/jpeg"};base64,${buffer.toString("base64")}`;
}

function parseReceiptAnalysis(payload: unknown): Omit<ReceiptAnalysisResult, "source"> {
  const text = extractOutputText(payload);
  let parsed: Omit<ReceiptAnalysisResult, "source">;

  try {
    parsed = JSON.parse(text) as Omit<ReceiptAnalysisResult, "source">;
  } catch (error) {
    console.error("[receipt/analyze] failed to parse OpenAI output_text as JSON", {
      statusCode: 502,
      responseBody: text,
      error: error instanceof Error ? error.message : String(error)
    });
    throw error;
  }

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
