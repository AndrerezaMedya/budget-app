"use client";

import { useMemo, useTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";

export type TransactionsPresetOption = {
  id: string;
  label: string;
  description?: string;
  setParams?: Record<string, string>;
  clearParams?: string[];
  isCustom?: boolean;
};

interface TransactionsFilterPresetsProps {
  triggerLabel: string;
  activePresetId?: string;
  presets: TransactionsPresetOption[];
}

export function TransactionsFilterPresets({
  triggerLabel,
  activePresetId,
  presets,
}: TransactionsFilterPresetsProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const standardPresets = useMemo(
    () => presets.filter((preset) => !preset.isCustom),
    [presets],
  );
  const customPresets = useMemo(
    () => presets.filter((preset) => preset.isCustom),
    [presets],
  );

  const activePreset = useMemo(
    () => standardPresets.find((preset) => preset.id === activePresetId) ?? null,
    [activePresetId, standardPresets],
  );

  const handleApply = (presetId: string) => {
    const preset = presets.find((item) => item.id === presetId);
    if (!preset) {
      return;
    }

    const params = new URLSearchParams(searchParams?.toString() ?? "");
    preset.clearParams?.forEach((key) => params.delete(key));
    Object.entries(preset.setParams ?? {}).forEach(([key, value]) => {
      if (value === "") {
        params.delete(key);
      } else {
        params.set(key, value);
      }
    });

    const query = params.toString();
    startTransition(() => {
      router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
    });
  };

  const buttonLabel = activePreset ? `${triggerLabel}: ${activePreset.label}` : triggerLabel;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" type="button" disabled={isPending} className="h-auto whitespace-normal text-left">
          {buttonLabel}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-56" align="end">
        <DropdownMenuLabel>{triggerLabel}</DropdownMenuLabel>
        {standardPresets.length > 0 ? (
          <DropdownMenuRadioGroup
            value={activePresetId ?? standardPresets[0]?.id}
            onValueChange={handleApply}
          >
            {standardPresets.map((preset) => (
              <DropdownMenuRadioItem key={preset.id} value={preset.id}>
                <div className="flex flex-col">
                  <span className="text-sm font-medium text-foreground">{preset.label}</span>
                  {preset.description ? (
                    <span className="text-xs text-muted-foreground">{preset.description}</span>
                  ) : null}
                </div>
              </DropdownMenuRadioItem>
            ))}
          </DropdownMenuRadioGroup>
        ) : null}
        {customPresets.length > 0 ? (
          <>
            <DropdownMenuSeparator />
            {customPresets.map((preset) => (
              <DropdownMenuItem
                key={preset.id}
                onSelect={(event) => {
                  event.preventDefault();
                  handleApply(preset.id);
                }}
              >
                <div className="flex flex-col">
                  <span className="text-sm font-medium text-foreground">{preset.label}</span>
                  {preset.description ? (
                    <span className="text-xs text-muted-foreground">{preset.description}</span>
                  ) : null}
                </div>
              </DropdownMenuItem>
            ))}
          </>
        ) : null}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
