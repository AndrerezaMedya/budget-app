export const DEFAULT_RECEIPT_REASONING_MODEL = "gemini-2.5-flash-lite";
export const SECONDARY_RECEIPT_REASONING_MODEL = "gemini-2.5-pro";

export const RECEIPT_REASONING_MODEL_OPTIONS = [
  {
    value: DEFAULT_RECEIPT_REASONING_MODEL,
    label: {
      id: "Gemini 2.5 Flash",
      en: "Gemini 2.5 Flash",
    },
    description: {
      id: "Paling cepat diproses; cocok untuk struk sederhana. Akurasi sedikit di bawah Pro.",
      en: "Fastest processing; great for simpler receipts. Slightly less accurate than Pro.",
    },
  },
  {
    value: SECONDARY_RECEIPT_REASONING_MODEL,
    label: {
      id: "Gemini 2.5 Pro",
      en: "Gemini 2.5 Pro",
    },
    description: {
      id: "Lebih teliti membaca struk rumit, tetapi waktunya sedikit lebih lama.",
      en: "More accurate on complex receipts, but takes a bit longer to finish.",
    },
  },
] as const;

export type ReceiptReasoningModelValue = (typeof RECEIPT_REASONING_MODEL_OPTIONS)[number]["value"];

export function resolveReasoningModelChoice(value: string | null | undefined): ReceiptReasoningModelValue {
  const match = RECEIPT_REASONING_MODEL_OPTIONS.find((option) => option.value === value);
  return match ? (match.value as ReceiptReasoningModelValue) : DEFAULT_RECEIPT_REASONING_MODEL;
}
