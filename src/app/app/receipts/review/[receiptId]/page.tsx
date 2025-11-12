import Link from "next/link";

import { Button } from "@/components/ui/button";
import { getTranslator } from "@/lib/i18n";
import { fetchAccounts } from "@/lib/supabase/queries/accounts";
import { fetchReceiptById } from "@/lib/supabase/queries/receipts";
import { ReceiptReviewForm } from "@/components/forms/receipt-review-form";

export const dynamic = "force-dynamic";
export const revalidate = 0;

function isUuid(value: string): boolean {
    return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
}

async function loadReceiptWithRetry(receiptId: string, attempts = 12, delayMs = 500) {
    for (let attempt = 0; attempt < attempts; attempt += 1) {
        const receipt = await fetchReceiptById(receiptId);
        if (receipt) {
            return receipt;
        }
        if (attempt < attempts - 1) {
            await new Promise((resolve) => setTimeout(resolve, delayMs));
        }
    }
    return null;
}

function MissingReceiptNotice({
    title,
    description,
    actionLabel,
}: {
    title: string;
    description: string;
    actionLabel: string;
}) {
    return (
        <div className="flex min-h-full flex-col items-center justify-center px-4 pb-[var(--app-mobile-content-padding)] pt-10 md:pb-12">
            <div className="w-full max-w-lg space-y-4 rounded-lg border border-border/70 bg-card/95 p-6 text-center shadow-sm">
                <h1 className="text-lg font-semibold text-foreground">{title}</h1>
                <p className="text-sm text-muted-foreground">{description}</p>
                <div className="flex justify-center">
                    <Button asChild>
                        <Link href="/app/receipts">{actionLabel}</Link>
                    </Button>
                </div>
            </div>
        </div>
    );
}

export default async function ReceiptReviewPage({
    params,
    searchParams,
}: {
    params: Promise<{ receiptId: string }>;
    searchParams?: Promise<{ accountId?: string }>;
}) {
    const translator = await getTranslator();
    const { t } = translator;
    const resolvedParams = await params;
    const resolvedSearchParams = searchParams ? await searchParams : undefined;
    const receiptId = typeof resolvedParams.receiptId === "string" ? resolvedParams.receiptId : "";
    if (!isUuid(receiptId)) {
        return (
            <MissingReceiptNotice
                title={t("receipts.review.missing.title")}
                description={t("receipts.review.missing.description")}
                actionLabel={t("receipts.review.missing.back")}
            />
        );
    }

    const [accountsResult, receipt] = await Promise.all([
        fetchAccounts(),
        loadReceiptWithRetry(receiptId),
    ]);
    const { accounts } = accountsResult;

    const availableAccounts = accounts.filter((account) => !account.archived_at);
    const accountOptions = availableAccounts.map((account) => ({
        id: account.id,
        name: account.name,
        currency: account.currency,
    }));

    if (!receipt) {
        return (
            <MissingReceiptNotice
                title={t("receipts.review.missing.title")}
                description={t("receipts.review.missing.description")}
                actionLabel={t("receipts.review.missing.back")}
            />
        );
    }

    return (
        <div className="flex min-h-full flex-col gap-6 pb-[var(--app-mobile-content-padding)] md:pb-12">
            <ReceiptReviewForm
                receipt={receipt}
                accounts={accountOptions}
                defaultAccountId={resolvedSearchParams?.accountId ?? null}
            />
        </div>
    );
}
