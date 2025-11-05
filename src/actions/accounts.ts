"use server";

import { revalidatePath } from "next/cache";

import { createSupabaseRouteHandlerClient } from "@/lib/supabase/server";
import type { ActionState } from "@/actions/types";
import { ACCOUNT_TYPE_VALUES } from "@/config/accounts";
import { isSupportedCurrency } from "@/config/currencies";
import { normalizeCurrency, parseAmountToMinor } from "@/lib/currency";

import type { Database } from "@/types/supabase";

export async function createAccountAction(
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

  const name = (formData.get("name") as string | null)?.trim();
  const type = formData.get("type") as Database["public"]["Enums"]["account_type"] | null;
  const currencyRaw = (formData.get("currency") as string | null)?.trim();
  const currencyInput = normalizeCurrency(currencyRaw);

  if (!currencyRaw || !isSupportedCurrency(currencyInput)) {
    return { status: "error", message: "Select a valid currency." };
  }

  const openingBalanceMinor = parseAmountToMinor(formData.get("openingBalance"), currencyInput, {
    allowZero: true,
  });

  if (!name) {
    return { status: "error", message: "Account name is required." };
  }

  if (!type || !ACCOUNT_TYPE_VALUES.includes(type)) {
    return { status: "error", message: "Select a valid account type." };
  }

  if (openingBalanceMinor === null || Number.isNaN(openingBalanceMinor)) {
    return { status: "error", message: "Opening balance must be a number." };
  }

  const { error } = await supabase.from("accounts").insert({
    user_id: user.id,
    name,
    type,
    opening_balance_minor: openingBalanceMinor,
    currency: currencyInput,
  });

  if (error) {
    return { status: "error", message: error.message };
  }

  revalidatePath("/app/accounts");
  revalidatePath("/app/overview");
  revalidatePath("/app/settings");

  return { status: "success", message: "Account created." };
}

export async function updateAccountAction(
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

  const accountId = (formData.get("accountId") as string | null)?.trim();
  const name = (formData.get("name") as string | null)?.trim();
  const type = formData.get("type") as Database["public"]["Enums"]["account_type"] | null;

  if (!accountId) {
    return { status: "error", message: "Missing account identifier." };
  }

  if (!name) {
    return { status: "error", message: "Account name is required." };
  }

  if (!type || !ACCOUNT_TYPE_VALUES.includes(type)) {
    return { status: "error", message: "Select a valid account type." };
  }

  const { error } = await supabase
    .from("accounts")
    .update({ name, type })
    .eq("id", accountId)
    .eq("user_id", user.id);

  if (error) {
    return { status: "error", message: error.message };
  }

  revalidatePath("/app/accounts");
  revalidatePath("/app/overview");
  revalidatePath("/app/settings");

  return { status: "success", message: "Account updated." };
}

export async function toggleAccountArchiveAction(
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

  const accountId = (formData.get("accountId") as string | null)?.trim();
  const mode = (formData.get("mode") as string | null)?.trim();

  if (!accountId) {
    return { status: "error", message: "Missing account identifier." };
  }

  if (mode !== "archive" && mode !== "restore") {
    return { status: "error", message: "Unrecognized archive mode." };
  }

  const archivedAt = mode === "archive" ? new Date().toISOString() : null;

  const { error } = await supabase
    .from("accounts")
    .update({ archived_at: archivedAt })
    .eq("id", accountId)
    .eq("user_id", user.id);

  if (error) {
    return { status: "error", message: error.message };
  }

  revalidatePath("/app/accounts");
  revalidatePath("/app/overview");
  revalidatePath("/app/settings");

  const message = mode === "archive" ? "Account archived." : "Account restored.";
  return { status: "success", message };
}
