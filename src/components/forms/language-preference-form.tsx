"use client";

import { useActionState, useEffect, useRef } from "react";

import { updateLanguageAction } from "@/actions/profile";
import { initialActionState } from "@/actions/types";
import { useToast } from "@/components/providers/toast-provider";
import { useI18n } from "@/components/providers/i18n-provider";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import type { TranslationKey } from "@/i18n/translations";

interface LanguagePreferenceFormProps {
  locale: "en" | "id";
}

const LANGUAGE_OPTIONS: Array<{ value: "en" | "id"; labelKey: TranslationKey }> = [
  { value: "en", labelKey: "language.option.en" },
  { value: "id", labelKey: "language.option.id" },
];

export function LanguagePreferenceForm({ locale }: LanguagePreferenceFormProps) {
  const [state, formAction] = useActionState(updateLanguageAction, initialActionState);
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
        title: t("language.toast.success.title"),
        description: state.message ?? t("language.toast.success.description"),
        variant: "success",
      });
    }

    if (state.status === "error") {
      toast({
        title: t("language.toast.error.title"),
        description: state.message ?? t("language.toast.error.description"),
        variant: "error",
      });
    }
  }, [state.status, state.message, toast, t]);

  return (
    <form action={formAction} className="flex flex-col gap-4 sm:flex-row sm:items-end">
      <div className="flex-1 space-y-2">
        <Label htmlFor="locale">{t("language.field.label")}</Label>
        <select
          id="locale"
          name="locale"
          defaultValue={locale}
          className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
        >
          {LANGUAGE_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {t(option.labelKey)}
            </option>
          ))}
        </select>
      </div>
      <Button type="submit" size="sm" className="sm:w-auto">
        {t("language.save")}
      </Button>
    </form>
  );
}
