"use server";

import { randomUUID } from "node:crypto";

import { revalidatePath } from "next/cache";

import { resolvePredefinedCategoryId } from "@/lib/categories/predefined";
import { createSupabaseRouteHandlerClient } from "@/lib/supabase/server";
import { normalizeCurrency, parseAmountToMinor } from "@/lib/currency";
import type { Database } from "@/types/supabase";

import type { ActionState } from "@/actions/types";

const SUPPORTED_TYPES: Array<Database["public"]["Enums"]["transaction_type"]> = [
  "income",
  "expense",
  "transfer",
];

type AccountCurrencyRow = Pick<Database["public"]["Tables"]["accounts"]["Row"], "id" | "currency">;

type ParseDateOptions = {
  timeZone?: string | null;
};

function parseTimeZoneId(value: FormDataEntryValue | null): string | null {
  if (typeof value !== "string") {
    return null;
  }
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function getTimeZoneOffset(timeZone: string, reference: Date): number | null {
  try {
    const formatter = new Intl.DateTimeFormat("en-US", {
      timeZone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hourCycle: "h23",
    });

    const parts = formatter.formatToParts(reference);
    const byType = new Map(parts.map((part) => [part.type, part.value]));

    const year = Number.parseInt(byType.get("year") ?? "", 10);
    const month = Number.parseInt(byType.get("month") ?? "", 10);
    const day = Number.parseInt(byType.get("day") ?? "", 10);
    const hour = Number.parseInt(byType.get("hour") ?? "", 10);
    const minute = Number.parseInt(byType.get("minute") ?? "", 10);
    const second = Number.parseInt(byType.get("second") ?? "", 10);

    if (
      Number.isNaN(year)
      || Number.isNaN(month)
      || Number.isNaN(day)
      || Number.isNaN(hour)
      || Number.isNaN(minute)
      || Number.isNaN(second)
    ) {
      return null;
    }

    const asUtc = Date.UTC(year, month - 1, day, hour, minute, second);
    return Math.round((asUtc - reference.getTime()) / 60_000);
  } catch {
    return null;
  }
}

function parseDate(value: FormDataEntryValue | null, options: ParseDateOptions = {}): string | null {
  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();
  if (trimmed.length === 0) {
    return null;
  }

  const { timeZone } = options;
  const hasZoneSuffix = /[zZ]|[+-]\d{2}:\d{2}$/.test(trimmed);

  if (!hasZoneSuffix && timeZone) {
    const match = trimmed.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2}))?$/);
    if (match) {
      const [, yearStr, monthStr, dayStr, hourStr, minuteStr, secondStr] = match;
      const year = Number.parseInt(yearStr, 10);
      const month = Number.parseInt(monthStr, 10);
      const day = Number.parseInt(dayStr, 10);
      const hour = Number.parseInt(hourStr, 10);
      const minute = Number.parseInt(minuteStr, 10);
      const second = secondStr ? Number.parseInt(secondStr, 10) : 0;

      if (
        !Number.isNaN(year)
        && !Number.isNaN(month)
        && !Number.isNaN(day)
        && !Number.isNaN(hour)
        && !Number.isNaN(minute)
        && !Number.isNaN(second)
      ) {
        const naiveUtc = Date.UTC(year, month - 1, day, hour, minute, second);
        const initialReference = new Date(naiveUtc);
        const offsetMinutes = getTimeZoneOffset(timeZone, initialReference);
        if (typeof offsetMinutes === "number") {
          let adjusted = naiveUtc - offsetMinutes * 60_000;
          const secondaryOffset = getTimeZoneOffset(timeZone, new Date(adjusted));
          if (typeof secondaryOffset === "number" && secondaryOffset !== offsetMinutes) {
            adjusted = naiveUtc - secondaryOffset * 60_000;
          }
          return new Date(adjusted).toISOString();
        }
      }
    }
  }

  const parsed = new Date(trimmed);
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

  const userId = user.id;

  const type = formData.get("type") as Database["public"]["Enums"]["transaction_type"] | null;
  const amountInput = formData.get("amount");
  const timeZone = parseTimeZoneId(formData.get("timeZone"));
  const occurredAt = parseDate(formData.get("occurredAt"), { timeZone });
  const description = (formData.get("description") as string | null)?.trim() ?? null;
  const tagField = (formData.get("tagIds") as string | null)?.trim() ?? "";
  const incomingTagValues = tagField
    ? tagField.split(",").map((value) => value.trim())
    : [];
  const tagIds = Array.from(new Set(incomingTagValues.filter((value) => value.length > 0)));

  if (!type || !SUPPORTED_TYPES.includes(type)) {
    return { status: "error", message: "Select a valid transaction type." };
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

    const { data: accountRows, error: accountError } = await supabase
      .from("accounts")
      .select("id, currency")
      .in("id", [fromAccountId, toAccountId])
      .eq("user_id", userId);

    if (accountError) {
      return { status: "error", message: accountError.message };
    }

    const currencyMap = new Map<string, string>();
    (accountRows as AccountCurrencyRow[] | null)?.forEach((row) => {
      currencyMap.set(row.id, normalizeCurrency(row.currency));
    });

    const fromCurrency = currencyMap.get(fromAccountId);
    const toCurrency = currencyMap.get(toAccountId);

    if (!fromCurrency || !toCurrency) {
      return { status: "error", message: "Unable to resolve account currencies." };
    }

    if (fromCurrency !== toCurrency) {
      return { status: "error", message: "Transfers between different currencies are not supported yet." };
    }

  const amountMinor = parseAmountToMinor(amountInput, fromCurrency);
    if (amountMinor === null) {
      return { status: "error", message: "Enter a positive amount." };
    }

    const adminFeeMinor = parseAmountToMinor(formData.get("adminFee"), fromCurrency, { allowZero: true });
    if (adminFeeMinor === null) {
      return { status: "error", message: "Enter a valid admin fee." };
    }

    const transferMetadata = JSON.stringify({ transferAmountMinor: amountMinor, adminFeeMinor });
    const outgoingAmountMinor = amountMinor + adminFeeMinor;

    const transferGroupId = randomUUID();
    const rows: Database["public"]["Tables"]["transactions"]["Insert"][] = [
      {
        user_id: user.id,
        account_id: fromAccountId,
        type,
        transfer_direction: "out",
        transfer_group_id: transferGroupId,
        amount_minor: outgoingAmountMinor,
        currency: fromCurrency,
        occurred_at: occurredAt,
        booked_at: occurredAt,
        description,
        notes: transferMetadata,
      },
      {
        user_id: user.id,
        account_id: toAccountId,
        type,
        transfer_direction: "in",
        transfer_group_id: transferGroupId,
        amount_minor: amountMinor,
        currency: toCurrency,
        occurred_at: occurredAt,
        booked_at: occurredAt,
        description,
        notes: transferMetadata,
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
  const { data: accountRow, error: accountError } = await supabase
    .from("accounts")
    .select("id, currency")
    .eq("id", accountId)
    .eq("user_id", userId)
    .maybeSingle();

  if (accountError) {
    return { status: "error", message: accountError.message };
  }

  if (!accountRow) {
    return { status: "error", message: "Unable to resolve account." };
  }

  const accountCurrency = normalizeCurrency(accountRow.currency);
  const amountMinor = parseAmountToMinor(amountInput, accountCurrency);

  if (amountMinor === null) {
    return { status: "error", message: "Enter a positive amount." };
  }

  let categoryId: string | null = null;
  let shouldRevalidateCategories = false;

  try {
    if (type === "expense") {
      const result = await resolvePredefinedCategoryId({
        supabase,
        userId,
        categoryType: "expense",
        categorySlug: (formData.get("expenseCategorySlug") as string | null) ?? null,
        subcategorySlug: (formData.get("expenseSubcategorySlug") as string | null) ?? null,
      });
      categoryId = result.categoryId;
      shouldRevalidateCategories ||= result.created;
    } else if (type === "income") {
      const result = await resolvePredefinedCategoryId({
        supabase,
        userId,
        categoryType: "income",
        categorySlug: (formData.get("incomeCategorySlug") as string | null) ?? null,
      });
      categoryId = result.categoryId;
      shouldRevalidateCategories ||= result.created;
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to resolve category.";
    return { status: "error", message };
  }

  const { data: transactionInsert, error } = await supabase
    .from("transactions")
    .insert({
      user_id: user.id,
      account_id: accountId,
      category_id: categoryId || null,
      type,
      amount_minor: amountMinor,
      currency: accountCurrency,
      occurred_at: occurredAt,
      booked_at: occurredAt,
      description,
    })
    .select("id")
    .single();

  if (error) {
    return { status: "error", message: error.message };
  }

  const insertedId = transactionInsert?.id;

  if (insertedId && tagIds.length > 0) {
    const tagRows = tagIds.map((tagId) => ({
      transaction_id: insertedId,
      tag_id: tagId,
    }));

    const { error: tagError } = await supabase.from("transaction_tags").insert(tagRows);

    if (tagError) {
      await supabase.from("transactions").delete().eq("id", insertedId);
      return { status: "error", message: tagError.message };
    }
  }

  revalidatePath("/app/transactions");
  revalidatePath("/app/overview");
  revalidatePath("/app/budgets");
  revalidatePath("/app/accounts");
  if (shouldRevalidateCategories) {
    revalidatePath("/app/settings");
  }

  return { status: "success", message: "Transaction added." };
}

export async function updateTransactionAction(
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

  const transactionId = (formData.get("transactionId") as string | null)?.trim();

  if (!transactionId) {
    return { status: "error", message: "Missing transaction identifier." };
  }

  const description = (formData.get("description") as string | null)?.trim() ?? null;
  const timeZone = parseTimeZoneId(formData.get("timeZone"));
  const occurredAt = parseDate(formData.get("occurredAt"), { timeZone });

  if (!occurredAt) {
    return { status: "error", message: "Provide a valid date." };
  }

  const amountInput = formData.get("amount");
  const requestedAccountId = (formData.get("accountId") as string | null)?.trim() ?? null;

  const { data: existingTransaction, error: fetchError } = await supabase
    .from("transactions")
    .select("id, type, account_id, currency, category_id")
    .eq("id", transactionId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (fetchError) {
    return { status: "error", message: fetchError.message };
  }

  if (!existingTransaction) {
    return { status: "error", message: "Transaction not found." };
  }

  if (existingTransaction.type === "transfer") {
    return { status: "error", message: "Transfers cannot be edited here yet." };
  }

  const resolvedAccountId = requestedAccountId ?? existingTransaction.account_id;

  if (!resolvedAccountId) {
    return { status: "error", message: "Select a destination account." };
  }

  const { data: accountRow, error: accountError } = await supabase
    .from("accounts")
    .select("id, currency")
    .eq("id", resolvedAccountId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (accountError) {
    return { status: "error", message: accountError.message };
  }

  if (!accountRow) {
    return { status: "error", message: "Unable to resolve account." };
  }

  const normalizedCurrency = normalizeCurrency(accountRow.currency);
  const amountMinor = parseAmountToMinor(amountInput, normalizedCurrency);

  if (amountMinor === null) {
    return { status: "error", message: "Enter a positive amount." };
  }

  let categoryId: string | null = existingTransaction.category_id ?? null;
  let shouldRevalidateCategories = false;

  try {
    if (existingTransaction.type === "expense") {
      const result = await resolvePredefinedCategoryId({
        supabase,
        userId: user.id,
        categoryType: "expense",
        categorySlug: (formData.get("expenseCategorySlug") as string | null) ?? null,
        subcategorySlug: (formData.get("expenseSubcategorySlug") as string | null) ?? null,
      });
      categoryId = result.categoryId;
      shouldRevalidateCategories ||= result.created;
    } else if (existingTransaction.type === "income") {
      const result = await resolvePredefinedCategoryId({
        supabase,
        userId: user.id,
        categoryType: "income",
        categorySlug: (formData.get("incomeCategorySlug") as string | null) ?? null,
      });
      categoryId = result.categoryId;
      shouldRevalidateCategories ||= result.created;
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to resolve category.";
    return { status: "error", message };
  }

  const { error: updateError } = await supabase
    .from("transactions")
    .update({
      description,
      account_id: resolvedAccountId,
      amount_minor: amountMinor,
      currency: normalizedCurrency,
      occurred_at: occurredAt,
      booked_at: occurredAt,
      category_id: categoryId,
    })
    .eq("id", transactionId)
    .eq("user_id", user.id);

  if (updateError) {
    return { status: "error", message: updateError.message };
  }

  revalidatePath("/app/transactions");
  revalidatePath("/app/overview");
  revalidatePath("/app/accounts");
  revalidatePath("/app/budgets");
  if (shouldRevalidateCategories) {
    revalidatePath("/app/settings");
  }

  return { status: "success", message: "Transaction updated." };
}

export async function deleteTransactionAction(
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

  const transactionId = (formData.get("transactionId") as string | null)?.trim();

  if (!transactionId) {
    return { status: "error", message: "Missing transaction identifier." };
  }

  const { data: transactionRow, error: fetchError } = await supabase
    .from("transactions")
    .select("id, type, transfer_group_id")
    .eq("id", transactionId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (fetchError) {
    return { status: "error", message: fetchError.message };
  }

  if (!transactionRow) {
    return { status: "error", message: "Transaction not found." };
  }

  const idsToDelete = new Set<string>([transactionId]);

  if (transactionRow.type === "transfer" && transactionRow.transfer_group_id) {
    const { data: relatedRows, error: relatedError } = await supabase
      .from("transactions")
      .select("id")
      .eq("transfer_group_id", transactionRow.transfer_group_id)
      .eq("user_id", user.id);

    if (relatedError) {
      return { status: "error", message: relatedError.message };
    }

    (relatedRows as Array<{ id: string }> | null)?.forEach((row) => idsToDelete.add(row.id));
  }

  const { error: deleteError } = await supabase
    .from("transactions")
    .delete()
    .in("id", Array.from(idsToDelete));

  if (deleteError) {
    return { status: "error", message: deleteError.message };
  }

  revalidatePath("/app/transactions");
  revalidatePath("/app/overview");
  revalidatePath("/app/accounts");
  revalidatePath("/app/budgets");

  return { status: "success", message: "Transaction deleted." };
}
