"use client";

import { useActionState, useEffect, useRef, useState } from "react";

import { createAccountAction } from "@/actions/accounts";
import { initialActionState } from "@/actions/types";
import { ACCOUNT_TYPE_OPTIONS } from "@/config/accounts";
import { ACCOUNT_CURRENCY_OPTIONS, DEFAULT_CURRENCY } from "@/config/currencies";
import { useToast } from "@/components/providers/toast-provider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useI18n } from "@/components/providers/i18n-provider";

export function CreateAccountForm() {
  const formRef = useRef<HTMLFormElement>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [state, formAction] = useActionState(createAccountAction, initialActionState);
  const { toast } = useToast();
  const statusRef = useRef(state.status);
  const { t } = useI18n();

  useEffect(() => {
    if (state.status === statusRef.current) {
      return;
    }

    statusRef.current = state.status;

    if (state.status === "success") {
      toast({
        title: t("accounts.toast.create.success.title"),
        description: state.message,
        variant: "success",
      });

      const frame = requestAnimationFrame(() => {
        formRef.current?.reset();
        setIsOpen(false);
      });
      return () => cancelAnimationFrame(frame);
    }

    if (state.status === "error") {
      toast({
        title: t("accounts.toast.create.error.title"),
        description: state.message,
        variant: "error",
      });
    }
  }, [state.status, state.message, toast, t]);

  const toggle = () => {
    setIsOpen((prev) => {
      if (prev) {
        formRef.current?.reset();
      }
      return !prev;
    });
  };

  return (
    <div className="flex w-full flex-col items-stretch gap-3 sm:w-auto sm:items-end">
      <Button
        type="button"
        onClick={toggle}
        className="inline-flex items-center gap-2 sm:w-auto"
        variant={isOpen ? "secondary" : "default"}
        size="sm"
        data-testid="create-account-toggle"
        {...(isOpen ? { "aria-expanded": true } : {})}
      >
        {isOpen ? t("accounts.toggle.close") : t("accounts.toggle.open")}
      </Button>

      {isOpen ? (
        <form
          ref={formRef}
          action={formAction}
          className="w-full max-w-full space-y-4 rounded-lg border border-border bg-card p-4 shadow-sm sm:min-w-[20rem]"
        >
          <div className="space-y-2">
            <Label htmlFor="account-type">{t("accounts.form.type")}</Label>
            <select
              id="account-type"
              name="type"
              className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
              required
              defaultValue=""
            >
              <option value="" disabled>
                {t("accounts.form.type.placeholder")}
              </option>
              {ACCOUNT_TYPE_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {t(option.labelKey)}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="account-name">{t("accounts.form.name")}</Label>
            <Input
              id="account-name"
              name="name"
              placeholder={t("accounts.form.name.placeholder")}
              required
              autoFocus
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="account-currency">{t("accounts.form.currency")}</Label>
            <select
              id="account-currency"
              name="currency"
              className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
              defaultValue={DEFAULT_CURRENCY}
              required
            >
              <option value="" disabled>
                {t("accounts.form.currency.placeholder")}
              </option>
              {ACCOUNT_CURRENCY_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="opening-balance">{t("accounts.form.openingBalance")}</Label>
            <Input
              id="opening-balance"
              name="openingBalance"
              type="number"
              inputMode="decimal"
              step="0.01"
              min={0}
              placeholder="0.00"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-2">
            <Button type="submit">{t("accounts.save")}</Button>
          </div>
        </form>
      ) : null}
    </div>
  );
}
