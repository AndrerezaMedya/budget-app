"use client";

import { useActionState, useEffect, useRef } from "react";

import { Trash2 } from "lucide-react";

import { deleteTransactionAction } from "@/actions/transactions";
import { initialActionState } from "@/actions/types";
import { useToast } from "@/components/providers/toast-provider";
import { useI18n } from "@/components/providers/i18n-provider";
import { Button } from "@/components/ui/button";

type DeleteTransactionButtonProps = {
  transactionId: string;
  description?: string | null;
};

export function DeleteTransactionButton({
  transactionId,
  description,
}: DeleteTransactionButtonProps) {
  const formRef = useRef<HTMLFormElement>(null);
  const { toast } = useToast();
  const { t } = useI18n();
  const [state, formAction, isPending] = useActionState(deleteTransactionAction, initialActionState);
  const statusRef = useRef(state.status);

  useEffect(() => {
    if (state.status === statusRef.current) {
      return;
    }

    statusRef.current = state.status;

    if (state.status === "success") {
      toast({
        title: t("transactions.toast.delete.success.title"),
        description: t("transactions.toast.delete.success.description"),
        variant: "success",
      });
      formRef.current?.reset();
      return;
    }

    if (state.status === "error") {
      toast({
        title: t("transactions.toast.delete.error.title"),
        description: state.message,
        variant: "error",
      });
    }
  }, [state.status, state.message, toast, t]);

  return (
    <form
      ref={formRef}
      action={formAction}
      className="inline-flex"
      onSubmit={(event) => {
        if (!window.confirm(t("transactions.delete.confirm"))) {
          event.preventDefault();
        }
      }}
    >
      <input type="hidden" name="transactionId" value={transactionId} />
      <Button
        type="submit"
        variant="ghost"
        size="icon"
        aria-label={t("transactions.delete.aria")}
        title={description ?? t("transactions.delete.aria")}
        disabled={isPending}
      >
        <Trash2 className="size-4" aria-hidden="true" />
      </Button>
    </form>
  );
}
