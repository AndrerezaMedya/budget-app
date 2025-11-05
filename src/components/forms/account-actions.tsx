"use client";

import { useActionState, useEffect, useRef, useState } from "react";

import {
  toggleAccountArchiveAction,
  updateAccountAction,
} from "@/actions/accounts";
import { initialActionState } from "@/actions/types";
import { useToast } from "@/components/providers/toast-provider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ACCOUNT_TYPE_OPTIONS } from "@/config/accounts";
import type { AccountWithBalance } from "@/lib/supabase/queries/accounts";
import { useI18n } from "@/components/providers/i18n-provider";

interface AccountActionsProps {
  account: AccountWithBalance;
}

export function AccountActions({ account }: AccountActionsProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editState, editAction] = useActionState(updateAccountAction, initialActionState);
  const [archiveState, archiveAction] = useActionState(
    toggleAccountArchiveAction,
    initialActionState,
  );
  const { toast } = useToast();
  const editStatusRef = useRef(editState.status);
  const archiveStatusRef = useRef(archiveState.status);
  const pendingArchiveMode = useRef<"archive" | "restore">(
    account.archived_at ? "restore" : "archive",
  );
  const { t } = useI18n();

  useEffect(() => {
    if (editState.status === editStatusRef.current) {
      return;
    }
    editStatusRef.current = editState.status;

    if (editState.status === "success") {
      toast({
        title: t("accounts.toast.update.success.title"),
        description: editState.message,
        variant: "success",
      });
      const frame = requestAnimationFrame(() => setIsEditing(false));
      return () => cancelAnimationFrame(frame);
    }

    if (editState.status === "error") {
      toast({
        title: t("accounts.toast.update.error.title"),
        description: editState.message,
        variant: "error",
      });
    }
  }, [editState.status, editState.message, toast, t]);

  useEffect(() => {
    if (archiveState.status === archiveStatusRef.current) {
      return;
    }
    archiveStatusRef.current = archiveState.status;

    if (archiveState.status === "success") {
      toast({
        title:
          pendingArchiveMode.current === "archive"
            ? t("accounts.toast.archive.archived.title")
            : t("accounts.toast.archive.restored.title"),
        description: archiveState.message,
        variant: "success",
      });
    }

    if (archiveState.status === "error") {
      toast({
        title: t("accounts.toast.update.error.title"),
        description: archiveState.message,
        variant: "error",
      });
    }
  }, [archiveState.status, archiveState.message, toast, account.archived_at, t]);

  return (
    <div className="space-y-3">
      {isEditing ? (
        <form
          action={editAction}
          className="space-y-3 rounded-md border border-border/60 bg-muted/30 p-3"
        >
          <input type="hidden" name="accountId" value={account.id} />
          <div className="space-y-1">
            <Label htmlFor={`account-edit-name-${account.id}`}>
              {t("accounts.form.name")}
            </Label>
            <Input
              id={`account-edit-name-${account.id}`}
              name="name"
              defaultValue={account.name}
              required
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor={`account-edit-type-${account.id}`}>
              {t("accounts.form.type")}
            </Label>
            <select
              id={`account-edit-type-${account.id}`}
              name="type"
              defaultValue={account.type}
              className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
              required
            >
              {ACCOUNT_TYPE_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {t(option.labelKey)}
                </option>
              ))}
            </select>
          </div>
          <div className="flex items-center justify-end gap-2 pt-1">
            <Button type="button" variant="ghost" size="sm" onClick={() => setIsEditing(false)}>
              {t("accounts.toggle.close")}
            </Button>
            <Button type="submit" size="sm">
              {t("accounts.actions.saveChanges")}
            </Button>
          </div>
        </form>
      ) : (
        <div className="flex flex-wrap items-center gap-2">
          <Button type="button" variant="outline" size="sm" onClick={() => setIsEditing(true)}>
            {t("accounts.actions.edit")}
          </Button>
          <form
            action={archiveAction}
            onSubmit={() => {
              pendingArchiveMode.current = account.archived_at ? "restore" : "archive";
            }}
          >
            <input type="hidden" name="accountId" value={account.id} />
            <input
              type="hidden"
              name="mode"
              value={account.archived_at ? "restore" : "archive"}
            />
            <Button
              type="submit"
              variant={account.archived_at ? "secondary" : "ghost"}
              size="sm"
            >
              {account.archived_at
                ? t("accounts.actions.restore")
                : t("accounts.actions.archive")}
            </Button>
          </form>
        </div>
      )}
    </div>
  );
}
