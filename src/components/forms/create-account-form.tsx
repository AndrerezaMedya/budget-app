"use client";

import { useEffect, useRef, useState } from "react";
import { useFormState } from "react-dom";

import { createAccountAction } from "@/actions/accounts";
import { initialActionState } from "@/actions/types";
import { ACCOUNT_TYPE_OPTIONS } from "@/config/accounts";
import { useToast } from "@/components/providers/toast-provider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function CreateAccountForm() {
  const formRef = useRef<HTMLFormElement>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [state, formAction] = useFormState(createAccountAction, initialActionState);
  const { toast } = useToast();
  const statusRef = useRef(state.status);

  useEffect(() => {
    if (state.status === statusRef.current) {
      return;
    }

    statusRef.current = state.status;

    if (state.status === "success") {
      toast({
        title: "Account created",
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
        title: "Unable to create account",
        description: state.message,
        variant: "error",
      });
    }
  }, [state.status, state.message, toast]);

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
        {isOpen ? "Cancel" : "Add account"}
      </Button>

      {isOpen ? (
        <form
          ref={formRef}
          action={formAction}
          className="w-full max-w-full space-y-4 rounded-lg border border-border bg-card p-4 shadow-sm sm:min-w-[20rem]"
        >
          <div className="space-y-2">
            <Label htmlFor="account-name">Name</Label>
            <Input
              id="account-name"
              name="name"
              placeholder="e.g. Travel fund"
              required
              autoFocus
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="account-type">Type</Label>
            <select
              id="account-type"
              name="type"
              className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
              required
              defaultValue=""
            >
              <option value="" disabled>
                Select account type
              </option>
              {ACCOUNT_TYPE_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="opening-balance">Opening balance</Label>
            <Input
              id="opening-balance"
              name="openingBalance"
              type="number"
              inputMode="decimal"
              step="0.01"
              min={0}
              placeholder="0.00"
            />
            <p className="text-xs text-muted-foreground">
              Stored in minor units (multiply by 100) on submit.
            </p>
          </div>

          <div className="flex items-center justify-end gap-2 pt-2">
            <Button type="submit">Save account</Button>
          </div>
        </form>
      ) : null}
    </div>
  );
}
