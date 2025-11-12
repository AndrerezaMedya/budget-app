import { GoogleGenerativeAI } from "@google/generative-ai";

import { PREDEFINED_CATEGORIES } from "@/config/category-definitions";
import { DEFAULT_RECEIPT_REASONING_MODEL } from "@/config/receipts";
import { env } from "@/config/env";
import { receiptSchema, type ReceiptPayload } from "@/schemas/receipt";

function getGeminiClient() {
  if (!env.GEMINI_API_KEY) {
    throw new Error("GEMINI_API_KEY is not configured");
  }

  return new GoogleGenerativeAI(env.GEMINI_API_KEY, {
    apiEndpoint: env.GEMINI_API_BASE_URL,
  });
}

function buildSystemPrompt(today: Date): string {
  const formatted = today.toISOString().slice(0, 10);
  return `You are a receipt parsing engine for Budgeting App.
- Current date: ${formatted}
- Knowledge cutoff: January 2025. Prefer recent Indonesian retail formats.
- Input:
  • Retail receipt image (high priority source of truth).
  • Optional OCR text extracted from the image (may be noisy, use as hints only).
  • Optional structured fields (currency hint, store list, detected totals).
- Output JSON must EXACTLY match this schema:
{
  "merchant": { "name": string, "address": string | null },
  "purchaseDate": string | null (ISO 8601 with offset),
  "currency": string (ISO 4217),
  "lineItems": [
     {
       "description": string,
       "quantity": number (>=0.01),
       "unitPrice": number,
       "lineTotal": number,
       "category": string | null (Budgeting App slug e.g. "food-drinks" or "food-drinks/groceries")
     }
  ],
  "subtotal": number,
  "tax": number | null,
  "discount": number | null,
  "total": number,
  "paymentMethod": string | null,
  "notes": string | null,
  "confidence": number between 0 and 1,
  "warnings": string[]
}
Rules:
1. Respect arithmetic: sum(lineItems.lineTotal) + tax - discount ≈ total. Fix obvious OCR digit swaps.
2. If receipt totals conflict, prefer the amount labeled "Total" or "Jumlah Bayar" and note it in warnings.
3. Infer categories using the provided CATEGORY_GUIDE. Use exact slug casing. Format as "categorySlug" for parent-only or "categorySlug/subcategorySlug" when a subcategory fits. If unsure, use null.
4. Normalize decimal separators (',' vs '.') to dot notation.
5. Use null, not empty strings, for missing optional fields.
6. Confidence < 0.6 if critical fields are missing or ambiguous.
7. Return warnings array for assumptions, currency guesses, or corrections.
Never include extra fields or comments outside JSON. Invalid schema must not be produced.`;
}

export type ReceiptReasoningInput = {
  image?: {
    base64: string;
    mimeType: string;
  } | null;
  ocrText?: string | null;
  currencyHint?: string | null;
  totalsHint?: {
    subtotal?: number | null;
    tax?: number | null;
    total?: number | null;
  } | null;
  localeHint?: string | null;
};

type ReceiptParsingOptions = {
  model?: string | null;
};

export async function requestReceiptParsing(
  input: ReceiptReasoningInput,
  options?: ReceiptParsingOptions,
): Promise<ReceiptPayload> {
  const client = getGeminiClient();
  const requestedModel = options?.model && options.model.trim().length > 0 ? options.model.trim() : null;
  const resolvedModel = requestedModel ?? env.GEMINI_RECEIPT_MODEL ?? DEFAULT_RECEIPT_REASONING_MODEL;
  const model = client.getGenerativeModel({
    model: resolvedModel,
    generationConfig: {
      responseMimeType: "application/json",
      temperature: 0.2,
    },
    systemInstruction: {
      parts: [{ text: buildSystemPrompt(new Date()) }],
    },
  });

  const hints = {
    localeHint: input.localeHint ?? "id-ID",
    currencyHint: input.currencyHint ?? "IDR",
    totalsHint: input.totalsHint ?? null,
  };

  const categoryGuide = PREDEFINED_CATEGORIES.map((category) => ({
    type: category.type,
    slug: category.slug,
    name: category.name,
    subcategories: (category.subcategories ?? []).map((subcategory) => ({
      slug: subcategory.slug,
      name: subcategory.name,
    })),
  }));

  const parts: Array<{
    text?: string;
    inlineData?: { data: string; mimeType: string };
  }> = [];

  if (input.image?.base64) {
    parts.push({
      inlineData: {
        data: input.image.base64,
        mimeType: input.image.mimeType || "image/jpeg",
      },
    });
  }

  const ocrText = input.ocrText && input.ocrText.trim().length > 0 ? input.ocrText : "(no OCR text provided)";

  parts.push({ text: "OCR_TEXT\n" + ocrText });
  parts.push({ text: "\nHINTS\n" + JSON.stringify(hints, null, 2) });
  parts.push({ text: "\nCATEGORY_GUIDE\n" + JSON.stringify(categoryGuide, null, 2) });

  const response = await model.generateContent({
    contents: [
      {
        role: "user",
        parts,
      },
    ],
  });

  const output = response.response?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!output) {
    throw new Error("Gemini response missing content");
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(output);
  } catch {
    throw new Error("Gemini returned invalid JSON");
  }

  const validation = receiptSchema.safeParse(parsed);
  if (!validation.success) {
    throw validation.error;
  }

  return validation.data;
}
