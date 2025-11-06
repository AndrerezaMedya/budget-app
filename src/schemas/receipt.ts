import { z } from "zod";

import { getCategoryBySlug, getSubcategory } from "@/config/category-definitions";

const lineItemSchema = z.object({
  description: z.string().min(1, "Line item requires a description"),
  quantity: z.number().nonnegative(),
  unitPrice: z.number().nonnegative(),
  lineTotal: z.number().nonnegative(),
  category: z.string().min(1).optional().nullable(),
});

const receiptCoreSchema = z.object({
  merchant: z.object({
    name: z.string().min(1, "Merchant name is required"),
    address: z.string().min(1).nullable().optional(),
  }),
  purchaseDate: z.string().datetime({ offset: true }).nullable().optional(),
  currency: z.string().length(3, "Currency must be a valid ISO 4217 code"),
  lineItems: z.array(lineItemSchema).min(1, "At least one line item is required"),
  subtotal: z.number().nonnegative(),
  tax: z.number().nonnegative().nullable().optional(),
  discount: z.number().nullable().optional(),
  total: z.number().nonnegative(),
  paymentMethod: z.string().min(1).nullable().optional(),
  notes: z.string().nullable().optional(),
  confidence: z.number().min(0).max(1),
  warnings: z.array(z.string()).optional().default([]),
});

export const receiptSchema = receiptCoreSchema.transform((data) => {
  const subtotal = data.subtotal ?? 0;
  const tax = data.tax ?? 0;
  const warnings = new Set(data.warnings ?? []);

  const normalizedLineItems = data.lineItems.map((item) => {
    if (!item.category) {
      return item;
    }

    const raw = item.category.trim();
    if (!raw) {
      return {
        ...item,
        category: null,
      };
    }

    const [categorySegment, subcategorySegment] = raw
      .split(/[>:/\\]+/)
      .map((segment) => segment.trim().toLowerCase())
      .filter((segment) => segment.length > 0);

    if (!categorySegment) {
      warnings.add("Kategori item kosong dan diabaikan.");
      return {
        ...item,
        category: null,
      };
    }

    const categoryDefinition = getCategoryBySlug(categorySegment);

    if (!categoryDefinition) {
      warnings.add(`Kategori item '${raw}' tidak dikenali. Dikosongkan.`);
      return {
        ...item,
        category: null,
      };
    }

    if (!subcategorySegment) {
      return {
        ...item,
        category: categoryDefinition.slug,
      };
    }

    const subcategoryDefinition = getSubcategory(categoryDefinition.slug, subcategorySegment);

    if (!subcategoryDefinition) {
      warnings.add(`Subkategori '${subcategorySegment}' tidak cocok untuk '${categoryDefinition.slug}'. Dikosongkan.`);
      return {
        ...item,
        category: categoryDefinition.slug,
      };
    }

    return {
      ...item,
      category: `${categoryDefinition.slug}/${subcategoryDefinition.slug}`,
    };
  });

  let discountValue = data.discount ?? 0;
  if (typeof data.discount === "number" && data.discount < 0) {
    discountValue = Math.abs(data.discount);
    warnings.add("Diskon bernilai negatif dikonversi ke nilai absolut.");
  }

  const computedTotal = subtotal + tax - discountValue;
  const itemsTotal = normalizedLineItems.reduce((sum, item) => sum + item.lineTotal, 0);
  const tolerance = Math.max(1, data.total * 0.02);

  if (data.total === 0 && itemsTotal === 0) {
    warnings.add("Total struk terdeteksi nol. Periksa kembali angka pada foto.");
  }

  if (Math.abs(itemsTotal - subtotal) > tolerance) {
    warnings.add("Jumlah item tidak persis sama dengan subtotal. Periksa kembali sebelum menyimpan.");
  }

  if (Math.abs(computedTotal - data.total) > tolerance) {
    warnings.add("Total akhir berbeda dari subtotal + pajak - diskon. Tinjau manual sebelum menambahkan.");
  }

  return {
    ...data,
    lineItems: normalizedLineItems,
    discount: typeof data.discount === "number" ? discountValue : data.discount,
    warnings: Array.from(warnings),
  };
});

export type ReceiptPayload = z.infer<typeof receiptSchema>;
export type ReceiptLineItemPayload = z.infer<typeof lineItemSchema>;
