"use server";

import { randomUUID } from "node:crypto";

import { revalidatePath } from "next/cache";

import { createSupabaseRouteHandlerClient } from "@/lib/supabase/server";
import type { Database } from "@/types/supabase";

import type { ActionState } from "@/actions/types";

const SUPPORTED_TYPES: Array<Database["public"]["Enums"]["transaction_type"]> = [
  "income",
  "expense",
  "transfer",
];

const ACCOUNT_CURRENCY = "IDR";

function parseAmount(value: FormDataEntryValue | null): number | null {
  if (typeof value !== "string") return null;
  const numeric = Number.parseFloat(value.trim());
  if (Number.isNaN(numeric) || numeric <= 0) {
    return null;
  }
  return Math.round(numeric * 100);
}

function parseDate(value: FormDataEntryValue | null): string | null {
  if (typeof value !== "string" || value.trim() === "") return null;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return null;
  }
  return parsed.toISOString();
}

export async function createTransactionAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const supabase = await createSupabaseRouteHandlerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { status: "error", message: "You must be signed in." };
  }

  const type = formData.get("type") as Database["public"]["Enums"]["transaction_type"] | null;
  const amountMinor = parseAmount(formData.get("amount"));
  const occurredAt = parseDate(formData.get("occurredAt"));
  const description = (formData.get("description") as string | null)?.trim() ?? null;

  if (!type || !SUPPORTED_TYPES.includes(type)) {
    return { status: "error", message: "Select a valid transaction type." };
  }

  if (amountMinor === null) {
    return { status: "error", message: "Enter a positive amount." };
  }

  if (!occurredAt) {
    return { status: "error", message: "Provide a valid date." };
  }

  if (type === "transfer") {
    const fromAccountId = formData.get("fromAccountId") as string | null;
    const toAccountId = formData.get("toAccountId") as string | null;

    if (!fromAccountId || !toAccountId) {
      return { status: "error", message: "Choose both source and destination accounts." };
    }

    if (fromAccountId === toAccountId) {
      return { status: "error", message: "Accounts must be different for transfers." };
    }

  const transferGroupId = randomUUID();
    const rows: Database["public"]["Tables"]["transactions"]["Insert"][] = [
      {
        user_id: user.id,
        account_id: fromAccountId,
        type,
        transfer_direction: "out",
        transfer_group_id: transferGroupId,
        amount_minor: amountMinor,
        currency: ACCOUNT_CURRENCY,
        occurred_at: occurredAt,
        booked_at: occurredAt,
        description,
      },
      {
        user_id: user.id,
        account_id: toAccountId,
        type,
        transfer_direction: "in",
        transfer_group_id: transferGroupId,
        amount_minor: amountMinor,
        currency: ACCOUNT_CURRENCY,
        occurred_at: occurredAt,
        booked_at: occurredAt,
        description,
      },
    ];

    const { error } = await supabase.from("transactions").insert(rows);

    if (error) {
      return { status: "error", message: error.message };
    }

    revalidatePath("/app/transactions");
    revalidatePath("/app/overview");
    revalidatePath("/app/accounts");

    return { status: "success", message: "Transfer recorded." };
  }

  const accountId = formData.get("accountId") as string | null;
  if (!accountId) {
    return { status: "error", message: "Select an account." };
  }

  const categoryId = (formData.get("categoryId") as string | null) ?? null;

  const { error } = await supabase.from("transactions").insert({
    user_id: user.id,
    account_id: accountId,
    category_id: categoryId || null,
    type,
    amount_minor: amountMinor,
    currency: ACCOUNT_CURRENCY,
    occurred_at: occurredAt,
    booked_at: occurredAt,
    description,
  });

  if (error) {
    return { status: "error", message: error.message };
  }

  revalidatePath("/app/transactions");
  revalidatePath("/app/overview");
  revalidatePath("/app/budgets");

  return { status: "success", message: "Transaction added." };
}
