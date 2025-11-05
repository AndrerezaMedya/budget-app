"use server";

import { revalidatePath } from "next/cache";

import { createSupabaseRouteHandlerClient } from "@/lib/supabase/server";
import type { ActionState } from "@/actions/types";
import { ACCOUNT_TYPE_VALUES } from "@/config/accounts";

import type { Database } from "@/types/supabase";

const ACCOUNT_CURRENCY = "IDR";

function parseOpeningBalance(value: FormDataEntryValue | null): number | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (!trimmed) return 0;
  const numeric = Number.parseFloat(trimmed.replace(/[^0-9.-]/g, ""));
  if (Number.isNaN(numeric)) return null;
  return Math.round(numeric * 100);
}

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
  const openingBalanceMinor = parseOpeningBalance(formData.get("openingBalance"));

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
    currency: ACCOUNT_CURRENCY,
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
