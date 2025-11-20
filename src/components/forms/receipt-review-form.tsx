"use client";

import {
    useActionState,
    useCallback,
    useEffect,
    useMemo,
    useState,
    useTransition,
} from "react";
import { useRouter, useSearchParams } from "next/navigation";

import { ACCOUNT_CURRENCY_OPTIONS, DEFAULT_CURRENCY, getCurrencyDecimals } from "@/config/currencies";
import { listPredefinedCategoriesByType } from "@/config/category-definitions";
import { formatCurrency } from "@/lib/format";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { useI18n } from "@/components/providers/i18n-provider";
import { useToast } from "@/components/providers/toast-provider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    finalizeReceiptTransactionsAction,
    discardReceiptAction,
} from "@/actions/receipts";
import { initialActionState } from "@/actions/types";
import type { ReceiptDetail } from "@/lib/supabase/queries/receipts";

function formatMinorForInput(minor: number | null | undefined, currency: string): string {
    if (minor === null || minor === undefined) {
        return "";
    }
    if (!Number.isFinite(minor)) {
        return "";
    }
    const decimals = getCurrencyDecimals(currency);
    const factor = 10 ** decimals;
    const normalized = minor / factor;
    return normalized.toFixed(decimals);
}

function resolveCurrencyStep(currency: string): string {
    const decimals = getCurrencyDecimals(currency);
    if (decimals <= 0) {
        return "1";
    }
    return `0.${"0".repeat(Math.max(0, decimals - 1))}1`;
}

function toMinorFromInput(value: string, currency: string): number | null {
    const trimmed = value.trim();
    if (!trimmed) {
        return null;
    }
    const normalized = Number.parseFloat(trimmed.replace(/,/g, "."));
    if (!Number.isFinite(normalized)) {
        return null;
    }
    const decimals = getCurrencyDecimals(currency);
    const factor = 10 ** decimals;
    return Math.round(normalized * factor);
}

function splitCategory(value: string | null) {
    if (!value) {
        return { parent: "", child: "" };
    }
    const [parent, child] = value.split("/");
    return {
        parent: parent ?? "",
        child: child ?? "",
    };
}

type ReceiptReviewFormProps = {
    receipt: ReceiptDetail;
    accounts: Array<{ id: string; name: string; currency: string | null }>;
    defaultAccountId?: string | null;
};

type ReceiptDraftLineItem = {
    id: string | null;
    description: string;
    quantity: string;
    unitPrice: string;
    lineTotal: string;
    categoryParent: string;
    categoryChild: string;
};

type ReceiptDraft = {
    merchantName: string;
    purchaseDate: string;
    purchaseTime: string;
    paymentMethod: string;
    currency: string;
    total: string;
    subtotal: string;
    tax: string;
    discount: string;
    notes: string;
    lineItems: ReceiptDraftLineItem[];
};

function buildDraft(receipt: ReceiptDetail): ReceiptDraft {
    const purchaseAt = receipt.purchaseAt ?? "";
    const purchaseDate = purchaseAt ? purchaseAt.slice(0, 10) : "";
    const timeSlice = purchaseAt.length >= 16 ? purchaseAt.slice(11, 16) : "";
    const purchaseTime = /\d{2}:\d{2}/.test(timeSlice) ? timeSlice : "";

    return {
        merchantName: receipt.merchantName ?? "",
        purchaseDate,
        purchaseTime,
        paymentMethod: receipt.paymentMethod ?? "",
        currency: receipt.currency ?? DEFAULT_CURRENCY,
        total: formatMinorForInput(receipt.totalMinor, receipt.currency ?? DEFAULT_CURRENCY),
        subtotal: formatMinorForInput(receipt.subtotalMinor, receipt.currency ?? DEFAULT_CURRENCY),
        tax: formatMinorForInput(receipt.taxMinor, receipt.currency ?? DEFAULT_CURRENCY),
        discount: formatMinorForInput(receipt.discountMinor, receipt.currency ?? DEFAULT_CURRENCY),
        notes: receipt.warnings.length > 0 ? receipt.warnings.join("; ") : receipt.notes ?? "",
        lineItems:
            receipt.lineItems.length > 0
                ? receipt.lineItems.map((item) => {
                    const category = splitCategory(item.category);
                    return {
                        id: item.id,
                        description: item.description ?? "",
                        quantity: item.quantity ?? "1",
                        unitPrice: formatMinorForInput(item.unitPriceMinor, receipt.currency ?? DEFAULT_CURRENCY),
                        lineTotal: formatMinorForInput(item.lineTotalMinor, receipt.currency ?? DEFAULT_CURRENCY),
                        categoryParent: category.parent,
                        categoryChild: category.child,
                    } satisfies ReceiptDraftLineItem;
                })
                : [
                    {
                        id: null,
                        description: "",
                        quantity: "1",
                        unitPrice: "",
                        lineTotal: "",
                        categoryParent: "",
                        categoryChild: "",
                    },
                ],
    } satisfies ReceiptDraft;
}

export function ReceiptReviewForm({ receipt, accounts, defaultAccountId }: ReceiptReviewFormProps) {
    const router = useRouter();
    const searchParams = useSearchParams();
    const { toast } = useToast();
    const { locale: activeLocale, t } = useI18n();
    const isIndonesian = useMemo(() => activeLocale.startsWith("id"), [activeLocale]);
    const [isSavingReceipt, setIsSavingReceipt] = useState(false);
    const [isDiscarding, startDiscardTransition] = useTransition();
    const [storagePreviewUrl, setStoragePreviewUrl] = useState<string | null>(null);
    const draftFromProps = useMemo(() => buildDraft(receipt), [receipt]);
    const [receiptDraft, setReceiptDraft] = useState<ReceiptDraft>(draftFromProps);

    useEffect(() => {
        setReceiptDraft(draftFromProps);
    }, [draftFromProps]);

    const decoratedAccounts = useMemo(
        () =>
            accounts.map((account) => {
                const currency = (account.currency ?? DEFAULT_CURRENCY).toUpperCase();
                return {
                    ...account,
                    currency,
                    label: `${account.name} (${currency})`,
                };
            }),
        [accounts],
    );

    const accountMap = useMemo(
        () => new Map(decoratedAccounts.map((account) => [account.id, account])),
        [decoratedAccounts],
    );

    const [accountId, setAccountId] = useState<string>(() => {
        const fromQuery = searchParams?.get("accountId") ?? undefined;
        return fromQuery && accountMap.has(fromQuery)
            ? fromQuery
            : defaultAccountId && accountMap.has(defaultAccountId)
                ? defaultAccountId
                : decoratedAccounts[0]?.id ?? "";
    });

    useEffect(() => {
        if (!accountMap.size) {
            setAccountId("");
            return;
        }
        setAccountId((previous) => {
            if (previous && accountMap.has(previous)) {
                return previous;
            }
            if (defaultAccountId && accountMap.has(defaultAccountId)) {
                return defaultAccountId;
            }
            return decoratedAccounts[0]?.id ?? "";
        });
    }, [accountMap, decoratedAccounts, defaultAccountId]);

    useEffect(() => {
        let cancelled = false;
        const supabase = getSupabaseBrowserClient();

        async function createSignedUrl() {
            try {
                const { data, error } = await supabase.storage
                    .from("receipts")
                    .createSignedUrl(receipt.storagePath, 60 * 60);
                if (!cancelled) {
                    setStoragePreviewUrl(error ? null : data?.signedUrl ?? null);
                }
            } catch {
                if (!cancelled) {
                    setStoragePreviewUrl(null);
                }
            }
        }

        createSignedUrl();

        return () => {
            cancelled = true;
        };
    }, [receipt.storagePath]);

    const receiptCurrencyStep = resolveCurrencyStep(receiptDraft.currency);

    const handleDraftChange = useCallback((key: keyof ReceiptDraft, value: string) => {
        setReceiptDraft((prev) => ({ ...prev, [key]: value }));
    }, []);

    const handleLineItemFieldChange = useCallback(
        (index: number, key: keyof ReceiptDraftLineItem, value: string) => {
            setReceiptDraft((prev) => {
                const nextItems = prev.lineItems.map((item, itemIndex) =>
                    itemIndex === index ? { ...item, [key]: value } : item,
                );
                return { ...prev, lineItems: nextItems };
            });
        },
        [],
    );

    const handleAddLineItem = useCallback(() => {
        setReceiptDraft((prev) => ({
            ...prev,
            lineItems: [
                ...prev.lineItems,
                {
                    id: null,
                    description: "",
                    quantity: "1",
                    unitPrice: "",
                    lineTotal: "",
                    categoryParent: "",
                    categoryChild: "",
                },
            ],
        }));
    }, []);

    const handleRemoveLineItem = useCallback((index: number) => {
        setReceiptDraft((prev) => ({
            ...prev,
            lineItems: prev.lineItems.filter((_, itemIndex) => itemIndex !== index),
        }));
    }, []);

    const lineItemsTotalMinor = useMemo(() => {
        return receiptDraft.lineItems.reduce((sum, item) => {
            if (!item.lineTotal) {
                return sum;
            }
            const minor = toMinorFromInput(item.lineTotal, receiptDraft.currency);
            if (minor === null) {
                return sum;
            }
            return sum + minor;
        }, 0);
    }, [receiptDraft.lineItems, receiptDraft.currency]);

    const previewTotalMinor = useMemo(
        () => toMinorFromInput(receiptDraft.total, receiptDraft.currency),
        [receiptDraft.currency, receiptDraft.total],
    );

    const lineItemsDeltaMinor = useMemo(() => {
        if (previewTotalMinor === null || lineItemsTotalMinor === null) {
            return null;
        }
        return lineItemsTotalMinor - previewTotalMinor;
    }, [lineItemsTotalMinor, previewTotalMinor]);

    const formattedLineItemsTotal = useMemo(() => {
        if (receiptDraft.currency && lineItemsTotalMinor !== null) {
            return formatCurrency(lineItemsTotalMinor, receiptDraft.currency);
        }
        return null;
    }, [lineItemsTotalMinor, receiptDraft.currency]);

    const formattedTotal = useMemo(() => {
        if (receiptDraft.currency && previewTotalMinor !== null) {
            return formatCurrency(previewTotalMinor, receiptDraft.currency);
        }
        return null;
    }, [previewTotalMinor, receiptDraft.currency]);

    const lineItemsDeltaLabel = useMemo(() => {
        if (!receiptDraft.currency || lineItemsDeltaMinor === null || lineItemsDeltaMinor === 0) {
            return null;
        }
        return formatCurrency(Math.abs(lineItemsDeltaMinor), receiptDraft.currency);
    }, [lineItemsDeltaMinor, receiptDraft.currency]);

    const lineItemsDeltaIsPositive = lineItemsDeltaMinor !== null && lineItemsDeltaMinor > 0;

    const hasValidLineItems = receiptDraft.lineItems.some(
        (item) => item.description.trim().length > 0 && item.lineTotal.trim().length > 0,
    );

    const canSaveReceipt =
        Boolean(accountId) &&
        receiptDraft.total.trim().length > 0 &&
        hasValidLineItems;

    const serializedLineItems = useMemo(() => {
        const payload = receiptDraft.lineItems.map((item) => ({
            id: item.id,
            description: item.description,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            lineTotal: item.lineTotal,
            category:
                item.categoryParent && item.categoryChild
                    ? `${item.categoryParent}/${item.categoryChild}`
                    : item.categoryParent,
        }));
        return JSON.stringify(payload);
    }, [receiptDraft.lineItems]);

    const receiptConfidenceLabel = useMemo(() => {
        if (typeof receipt.confidence === "number" && Number.isFinite(receipt.confidence)) {
            return `${Math.round(receipt.confidence * 100)}%`;
        }
        return null;
    }, [receipt.confidence]);

    const warnings = receipt.warnings;

    const [saveState, finalizeReceiptAction] = useActionState(
        finalizeReceiptTransactionsAction,
        initialActionState,
    );

    useEffect(() => {
        if (saveState.status === "success") {
            toast({
                title: isIndonesian ? "Transaksi disimpan" : "Transactions saved",
                description:
                    saveState.message
                    ?? (isIndonesian
                        ? "Detail struk berhasil disimpan sebagai transaksi."
                        : "Receipt items were saved as transactions."),
                variant: "success",
            });
            setIsSavingReceipt(false);
            router.push("/app/transactions");
        }

        if (saveState.status === "error") {
            toast({
                title: isIndonesian ? "Gagal menyimpan transaksi" : "Unable to save transactions",
                description:
                    saveState.message
                    ?? (isIndonesian
                        ? "Periksa kembali detail struk sebelum menyimpan."
                        : "Double-check the receipt details and try again."),
                variant: "error",
            });
            setIsSavingReceipt(false);
        }
    }, [isIndonesian, router, saveState.message, saveState.status, toast]);

    const [discardState, discardAction] = useActionState(discardReceiptAction, initialActionState);

    useEffect(() => {
        if (discardState.status === "success") {
            toast({
                title: isIndonesian ? "Struk dibatalkan" : "Receipt discarded",
                description:
                    discardState.message
                    ?? (isIndonesian
                        ? "Silakan unggah ulang struk."
                        : "You can upload the receipt again."),
                variant: "success",
            });
            router.push("/app/receipts");
        }

        if (discardState.status === "error") {
            toast({
                title: isIndonesian ? "Tidak dapat membatalkan" : "Unable to discard",
                description:
                    discardState.message
                    ?? (isIndonesian
                        ? "Coba lagi beberapa saat."
                        : "Please try again shortly."),
                variant: "error",
            });
        }
    }, [discardState.message, discardState.status, isIndonesian, router, toast]);

    const expenseCategoryStructure = useMemo(() => {
        const translateKey = (key: string | null, fallback: string) => {
            if (!key) {
                return fallback;
            }
            return t(key as Parameters<typeof t>[0]) ?? fallback;
        };

        const catalog = listPredefinedCategoriesByType("expense").map((category) => ({
            slug: category.slug,
            label: translateKey(category.nameKey, category.name),
            children: (category.subcategories ?? []).map((subcategory) => ({
                slug: subcategory.slug,
                label: translateKey(subcategory.nameKey, subcategory.name),
            })),
        }));

        const children = new Map<string, Array<{ slug: string; label: string }>>();
        catalog.forEach((category) => {
            children.set(category.slug, category.children);
        });

        return {
            parents: catalog.map(({ slug, label }) => ({ slug, label })),
            children,
        };
    }, [t]);

    const handleDiscard = useCallback(() => {
        startDiscardTransition(() => {
            const formData = new FormData();
            formData.append("receiptId", receipt.id);
            discardAction(formData);
        });
    }, [discardAction, receipt.id]);

    const currentAccount = accountId ? accountMap.get(accountId) ?? null : null;

    return (
        <div className="space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                    <h1 className="text-xl font-semibold text-foreground">
                        {isIndonesian ? "Tinjau hasil scan" : "Review scanned receipt"}
                    </h1>
                    <p className="text-sm text-muted-foreground">
                        {isIndonesian
                            ? "Perbarui detail struk dan simpan transaksi ketika sudah benar."
                            : "Make any adjustments before saving transactions."}
                    </p>
                </div>
                <Button
                    type="button"
                    variant="outline"
                    onClick={handleDiscard}
                    disabled={isDiscarding}
                >
                    {isIndonesian ? "Ulang scan" : "Rescan"}
                </Button>
            </div>

            <div className="grid gap-6 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)]">
                <div className="space-y-4">
                    <div className="overflow-hidden rounded-lg border border-border/60 bg-muted/20">
                        {storagePreviewUrl ? (
                            <>
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img
                                    src={storagePreviewUrl}
                                    alt={isIndonesian ? "Foto struk" : "Receipt image"}
                                    className="w-full max-h-[420px] object-cover"
                                />
                            </>
                        ) : (
                            <div className="flex h-64 items-center justify-center text-sm text-muted-foreground">
                                {isIndonesian
                                    ? "Preview tidak tersedia."
                                    : "Preview unavailable."}
                            </div>
                        )}
                    </div>
                    {warnings.length > 0 ? (
                        <div className="rounded-md border border-amber-500/60 bg-amber-500/10 p-4 text-xs text-amber-700 dark:text-amber-200">
                            <p className="text-sm font-medium">
                                {isIndonesian ? "Catatan sistem" : "System notes"}
                            </p>
                            <ul className="mt-2 list-disc space-y-1 pl-4">
                                {warnings.map((warning) => (
                                    <li key={warning}>{warning}</li>
                                ))}
                            </ul>
                        </div>
                    ) : null}
                </div>

                <div className="space-y-5">
                    <form
                        action={finalizeReceiptAction}
                        className="space-y-4"
                        onSubmit={(event) => {
                            if (isSavingReceipt || !canSaveReceipt) {
                                event.preventDefault();
                                return;
                            }
                            setIsSavingReceipt(true);
                        }}
                    >
                        <input type="hidden" name="receiptId" value={receipt.id} />
                        <input type="hidden" name="lineItems" value={serializedLineItems} />

                        <div className="space-y-2">
                            <Label htmlFor="receipt-review-account">
                                {isIndonesian ? "Akun pembayaran" : "Payment account"}
                            </Label>
                            <select
                                id="receipt-review-account"
                                name="accountId"
                                className="h-9 w-full rounded-md border border-input bg-background px-3 text-base md:text-sm"
                                value={accountId}
                                onChange={(event) => setAccountId(event.target.value)}
                                required
                            >
                                <option value="" disabled>
                                    {isIndonesian ? "Pilih akun pembayaran" : "Select a payment account"}
                                </option>
                                {decoratedAccounts.map((account) => (
                                    <option key={account.id} value={account.id}>
                                        {account.label}
                                    </option>
                                ))}
                            </select>
                            {currentAccount ? (
                                <p className="text-xs text-muted-foreground">
                                    {isIndonesian
                                        ? `Transaksi akan dicatat ke ${currentAccount.name}.`
                                        : `Transactions will post to ${currentAccount.name}.`}
                                </p>
                            ) : null}
                        </div>

                        <div className="grid gap-4 md:grid-cols-2">
                            <div className="space-y-2">
                                <Label htmlFor="receipt-merchant">
                                    {isIndonesian ? "Nama toko" : "Merchant"}
                                </Label>
                                <Input
                                    id="receipt-merchant"
                                    name="merchantName"
                                    value={receiptDraft.merchantName}
                                    onChange={(event) => handleDraftChange("merchantName", event.target.value)}
                                    placeholder={isIndonesian ? "Nama merchant" : "Merchant name"}
                                    required
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="receipt-payment">
                                    {isIndonesian ? "Metode bayar" : "Payment method"}
                                </Label>
                                <Input
                                    id="receipt-payment"
                                    name="paymentMethod"
                                    value={receiptDraft.paymentMethod}
                                    onChange={(event) => handleDraftChange("paymentMethod", event.target.value)}
                                    placeholder={isIndonesian ? "Contoh: Tunai / Kartu" : "e.g. Cash / Card"}
                                />
                            </div>
                        </div>

                        <div className="grid gap-4 md:grid-cols-2">
                            <div className="space-y-2">
                                <Label htmlFor="receipt-date">{isIndonesian ? "Tanggal" : "Date"}</Label>
                                <Input
                                    id="receipt-date"
                                    name="purchaseDate"
                                    type="date"
                                    value={receiptDraft.purchaseDate}
                                    onChange={(event) => handleDraftChange("purchaseDate", event.target.value)}
                                    max={new Date().toISOString().slice(0, 10)}
                                    required
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="receipt-time">{isIndonesian ? "Waktu" : "Time"}</Label>
                                <Input
                                    id="receipt-time"
                                    name="purchaseTime"
                                    type="time"
                                    value={receiptDraft.purchaseTime}
                                    onChange={(event) => handleDraftChange("purchaseTime", event.target.value)}
                                />
                            </div>
                        </div>

                        <div className="grid gap-4 md:grid-cols-2">
                            <div className="space-y-2">
                                <Label htmlFor="receipt-currency">{isIndonesian ? "Mata uang" : "Currency"}</Label>
                                <select
                                    id="receipt-currency"
                                    name="currency"
                                    className="h-9 w-full rounded-md border border-input bg-background px-3 text-base md:text-sm"
                                    value={receiptDraft.currency}
                                    onChange={(event) => handleDraftChange("currency", event.target.value)}
                                >
                                    {ACCOUNT_CURRENCY_OPTIONS.map((option) => (
                                        <option key={option.value} value={option.value}>
                                            {option.label}
                                        </option>
                                    ))}
                                </select>
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="receipt-total">{isIndonesian ? "Total" : "Total"}</Label>
                                <Input
                                    id="receipt-total"
                                    name="total"
                                    inputMode="decimal"
                                    step={receiptCurrencyStep}
                                    value={receiptDraft.total}
                                    onChange={(event) => handleDraftChange("total", event.target.value)}
                                    required
                                />
                                {formattedTotal ? (
                                    <p className="text-xs text-muted-foreground">≈ {formattedTotal}</p>
                                ) : null}
                            </div>
                        </div>

                        <div className="grid gap-4 md:grid-cols-2">
                            <div className="space-y-2">
                                <Label htmlFor="receipt-subtotal">{isIndonesian ? "Subtotal" : "Subtotal"}</Label>
                                <Input
                                    id="receipt-subtotal"
                                    name="subtotal"
                                    inputMode="decimal"
                                    step={receiptCurrencyStep}
                                    value={receiptDraft.subtotal}
                                    onChange={(event) => handleDraftChange("subtotal", event.target.value)}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="receipt-tax">{isIndonesian ? "Pajak" : "Tax"}</Label>
                                <Input
                                    id="receipt-tax"
                                    name="tax"
                                    inputMode="decimal"
                                    step={receiptCurrencyStep}
                                    value={receiptDraft.tax}
                                    onChange={(event) => handleDraftChange("tax", event.target.value)}
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="receipt-discount">{isIndonesian ? "Diskon" : "Discount"}</Label>
                            <Input
                                id="receipt-discount"
                                name="discount"
                                inputMode="decimal"
                                step={receiptCurrencyStep}
                                value={receiptDraft.discount}
                                onChange={(event) => handleDraftChange("discount", event.target.value)}
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="receipt-notes">{isIndonesian ? "Catatan" : "Notes"}</Label>
                            <textarea
                                id="receipt-notes"
                                name="notes"
                                className="min-h-[6rem] w-full rounded-md border border-input bg-background px-3 py-2 text-base focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 md:text-sm"
                                value={receiptDraft.notes}
                                onChange={(event) => handleDraftChange("notes", event.target.value)}
                                placeholder={isIndonesian ? "Catatan tambahan (opsional)" : "Additional notes (optional)"}
                            />
                        </div>

                        <div className="space-y-3">
                            <div className="flex items-center justify-between">
                                <h2 className="text-sm font-semibold text-foreground">
                                    {isIndonesian ? "Item struk" : "Receipt items"}
                                </h2>
                                <Button type="button" variant="outline" size="sm" onClick={handleAddLineItem}>
                                    {isIndonesian ? "Tambah item" : "Add item"}
                                </Button>
                            </div>

                            <div className="space-y-3">
                                {receiptDraft.lineItems.map((item, index) => {
                                    const children = expenseCategoryStructure.children.get(item.categoryParent) ?? [];
                                    return (
                                        <div key={item.id ?? `draft-item-${index}`} className="space-y-3 rounded-md border border-border/60 bg-background/80 p-4">
                                            <div className="flex items-start justify-between gap-3">
                                                <div className="text-sm font-medium text-foreground">
                                                    {isIndonesian ? `Item ${index + 1}` : `Item ${index + 1}`}
                                                </div>
                                                <Button
                                                    type="button"
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={() => handleRemoveLineItem(index)}
                                                >
                                                    {isIndonesian ? "Hapus" : "Remove"}
                                                </Button>
                                            </div>

                                            <div className="space-y-3">
                                                <div className="space-y-2">
                                                    <Label htmlFor={`receipt-line-description-${index}`}>
                                                        {isIndonesian ? "Deskripsi" : "Description"}
                                                    </Label>
                                                    <Input
                                                        id={`receipt-line-description-${index}`}
                                                        value={item.description}
                                                        onChange={(event) => handleLineItemFieldChange(index, "description", event.target.value)}
                                                        placeholder={isIndonesian ? "Contoh: Ayam goreng" : "e.g. Fried chicken"}
                                                        required
                                                    />
                                                </div>

                                                <div className="grid gap-3 md:grid-cols-2">
                                                    <div className="space-y-2">
                                                        <Label htmlFor={`receipt-line-quantity-${index}`}>
                                                            {isIndonesian ? "Jumlah" : "Quantity"}
                                                        </Label>
                                                        <Input
                                                            id={`receipt-line-quantity-${index}`}
                                                            value={item.quantity}
                                                            inputMode="decimal"
                                                            step="0.001"
                                                            onChange={(event) => handleLineItemFieldChange(index, "quantity", event.target.value)}
                                                        />
                                                    </div>
                                                    <div className="space-y-2">
                                                        <Label htmlFor={`receipt-line-unit-${index}`}>
                                                            {isIndonesian ? "Harga satuan" : "Unit price"}
                                                        </Label>
                                                        <Input
                                                            id={`receipt-line-unit-${index}`}
                                                            value={item.unitPrice}
                                                            inputMode="decimal"
                                                            step={receiptCurrencyStep}
                                                            onChange={(event) => handleLineItemFieldChange(index, "unitPrice", event.target.value)}
                                                        />
                                                    </div>
                                                </div>

                                                <div className="grid gap-3 md:grid-cols-2">
                                                    <div className="space-y-2">
                                                        <Label htmlFor={`receipt-line-total-${index}`}>
                                                            {isIndonesian ? "Total baris" : "Line total"}
                                                        </Label>
                                                        <Input
                                                            id={`receipt-line-total-${index}`}
                                                            value={item.lineTotal}
                                                            inputMode="decimal"
                                                            step={receiptCurrencyStep}
                                                            onChange={(event) => handleLineItemFieldChange(index, "lineTotal", event.target.value)}
                                                            required
                                                        />
                                                    </div>
                                                    <div className="space-y-2">
                                                        <Label htmlFor={`receipt-line-category-parent-${index}`}>
                                                            {isIndonesian ? "Kategori" : "Category"}
                                                        </Label>
                                                        <select
                                                            id={`receipt-line-category-parent-${index}`}
                                                            className="h-9 w-full rounded-md border border-input bg-background px-3 text-base md:text-sm"
                                                            value={item.categoryParent}
                                                            onChange={(event) => {
                                                                handleLineItemFieldChange(index, "categoryParent", event.target.value);
                                                                handleLineItemFieldChange(index, "categoryChild", "");
                                                            }}
                                                        >
                                                            <option value="">
                                                                {isIndonesian ? "Pilih kategori" : "Select category"}
                                                            </option>
                                                            {expenseCategoryStructure.parents.map((parent) => (
                                                                <option key={parent.slug} value={parent.slug}>
                                                                    {parent.label}
                                                                </option>
                                                            ))}
                                                        </select>
                                                        <select
                                                            id={`receipt-line-category-child-${index}`}
                                                            className="mt-2 h-9 w-full rounded-md border border-input bg-background px-3 text-base md:text-sm"
                                                            value={item.categoryChild}
                                                            onChange={(event) => handleLineItemFieldChange(index, "categoryChild", event.target.value)}
                                                            disabled={!item.categoryParent || children.length === 0}
                                                        >
                                                            <option value="">
                                                                {isIndonesian ? "Tanpa subkategori" : "No subcategory"}
                                                            </option>
                                                            {children.map((child) => (
                                                                <option key={child.slug} value={child.slug}>
                                                                    {child.label}
                                                                </option>
                                                            ))}
                                                        </select>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>

                            {receiptDraft.currency && formattedLineItemsTotal ? (
                                <div className="space-y-1 rounded-md border border-border/60 bg-muted/30 p-3 text-xs text-muted-foreground">
                                    <div className="flex items-center justify-between">
                                        <span>{isIndonesian ? "Jumlah item" : "Items total"}</span>
                                        <span className="font-medium text-foreground">{formattedLineItemsTotal}</span>
                                    </div>
                                    {formattedTotal ? (
                                        <div className="flex items-center justify-between">
                                            <span>{isIndonesian ? "Total struk" : "Receipt total"}</span>
                                            <span className="font-medium text-foreground">{formattedTotal}</span>
                                        </div>
                                    ) : null}
                                    {lineItemsDeltaLabel ? (
                                        <p
                                            className={`pt-1 ${lineItemsDeltaIsPositive ? "text-amber-600 dark:text-amber-400" : "text-emerald-600 dark:text-emerald-300"}`}
                                        >
                                            {isIndonesian
                                                ? lineItemsDeltaIsPositive
                                                    ? `Total item lebih ${lineItemsDeltaLabel} dari total struk.`
                                                    : `Total item kurang ${lineItemsDeltaLabel} dari total struk.`
                                                : lineItemsDeltaIsPositive
                                                    ? `Items exceed the receipt total by ${lineItemsDeltaLabel}.`
                                                    : `Items fall short of the receipt total by ${lineItemsDeltaLabel}.`}
                                        </p>
                                    ) : null}
                                </div>
                            ) : null}
                        </div>

                        <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
                            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                {receiptConfidenceLabel ? (
                                    <span className="rounded-full border border-border/70 px-3 py-1">
                                        {isIndonesian ? "Akurasi OCR:" : "OCR confidence:"} {receiptConfidenceLabel}
                                    </span>
                                ) : null}
                            </div>
                            <div className="flex items-center gap-2">
                                <Button
                                    type="button"
                                    variant="outline"
                                    onClick={() => router.push("/app/receipts")}
                                >
                                    {isIndonesian ? "Kembali" : "Back"}
                                </Button>
                                <Button type="submit" disabled={!canSaveReceipt || isSavingReceipt}>
                                    {isSavingReceipt
                                        ? isIndonesian
                                            ? "Menyimpan..."
                                            : "Saving..."
                                        : isIndonesian
                                            ? "Simpan transaksi"
                                            : "Save transactions"}
                                </Button>
                            </div>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
}
