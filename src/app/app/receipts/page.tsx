import { DEFAULT_CURRENCY } from "@/config/currencies";
import { formatCurrency, formatDate } from "@/lib/format";
import type { TranslationKey } from "@/i18n/translations";
import { getTranslator } from "@/lib/i18n";
import { fetchAccounts } from "@/lib/supabase/queries/accounts";
import { fetchRecentReceipts } from "@/lib/supabase/queries/receipts";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { BadgeProps } from "@/components/ui/badge";
import type { HydratedReceipt } from "@/lib/supabase/queries/receipts";

import { UploadReceiptForm } from "@/components/forms/upload-receipt-form";

type ReceiptStatus = NonNullable<HydratedReceipt["jobStatus"]>;

const RECEIPT_STATUS_LABEL_KEYS: Record<ReceiptStatus, TranslationKey> = {
  pending: "transactions.receipts.status.pending",
  processing: "transactions.receipts.status.processing",
  succeeded: "transactions.receipts.status.succeeded",
  failed: "transactions.receipts.status.failed",
};

const RECEIPT_STATUS_BADGE_VARIANT: Record<ReceiptStatus, BadgeProps["variant"]> = {
  pending: "secondary",
  processing: "secondary",
  succeeded: "default",
  failed: "destructive",
};

export default async function ReceiptsPage() {
  const { t } = await getTranslator();
  const [{ accounts }, recentReceipts] = await Promise.all([
    fetchAccounts(),
    fetchRecentReceipts(20),
  ]);

  const availableAccounts = accounts.filter((account) => !account.archived_at);
  const receiptAccountOptions = availableAccounts.map((account) => ({
    id: account.id,
    name: account.name,
    currency: (account.currency ?? DEFAULT_CURRENCY).toUpperCase(),
  }));

  const getReceiptStatusVariant = (status: HydratedReceipt["jobStatus"]): BadgeProps["variant"] => {
    if (!status) {
      return "outline";
    }
    return RECEIPT_STATUS_BADGE_VARIANT[status];
  };

  const getReceiptStatusLabel = (status: HydratedReceipt["jobStatus"]) => {
    if (!status) {
      return t("transactions.receipts.status.unknown");
    }
    return t(RECEIPT_STATUS_LABEL_KEYS[status]);
  };

  const formatReceiptConfidence = (confidence: HydratedReceipt["confidence"]) => {
    if (confidence === null) {
      return "—";
    }
    return t("transactions.receipts.confidence.value", {
      value: Math.round(confidence * 100),
    });
  };

  return (
    <div className="flex min-h-full flex-col gap-6 pb-[var(--app-mobile-content-padding)] md:pb-12">
      <header className="space-y-2">
        <h1 className="text-2xl font-semibold">{t("receipts.page.heading")}</h1>
        <p className="text-sm text-muted-foreground">{t("receipts.page.subheading")}</p>
      </header>

      <Card className="overflow-hidden">
        <CardHeader>
          <CardTitle>{t("transactions.receipts.title")}</CardTitle>
          <CardDescription>{t("transactions.receipts.description")}</CardDescription>
        </CardHeader>
        <CardContent className="pb-3 md:pb-6">
          <div className="max-h-[min(68vh,34rem)] overflow-y-auto pr-1 md:max-h-none md:overflow-visible">
            <UploadReceiptForm accounts={receiptAccountOptions} />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t("transactions.receipts.recent.title")}</CardTitle>
          <CardDescription>{t("transactions.receipts.recent.description")}</CardDescription>
        </CardHeader>
        <CardContent>
          {recentReceipts.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              {t("transactions.receipts.recent.empty")}
            </p>
          ) : (
            <div className="grid gap-4">
              <div className="overflow-hidden rounded-lg border border-border">
                <div className="max-w-full overflow-x-auto">
                  <table className="hidden min-w-full divide-y divide-border text-sm md:table md:table-fixed">
                    <thead className="bg-muted/50 text-xs uppercase tracking-wide text-muted-foreground">
                    <tr>
                      <th className="px-4 py-3 text-left">
                        {t("transactions.receipts.table.header.status")}
                      </th>
                      <th className="px-4 py-3 text-left">
                        {t("transactions.receipts.table.header.merchant")}
                      </th>
                      <th className="px-4 py-3 text-left">
                        {t("transactions.receipts.table.header.total")}
                      </th>
                      <th className="px-4 py-3 text-left">
                        {t("transactions.receipts.table.header.issued")}
                      </th>
                      <th className="px-4 py-3 text-left">
                        {t("transactions.receipts.table.header.confidence")}
                      </th>
                      <th className="px-4 py-3 text-right">
                        {t("transactions.receipts.table.header.actions")}
                      </th>
                    </tr>
                    </thead>
                    <tbody className="divide-y divide-border bg-card">
                      {recentReceipts.map((receipt) => (
                        <tr key={receipt.id}>
                          <td className="px-4 py-3">
                            <Badge variant={getReceiptStatusVariant(receipt.jobStatus)}>
                              {getReceiptStatusLabel(receipt.jobStatus)}
                            </Badge>
                          </td>
                          <td className="px-4 py-3">
                            <div className="font-medium text-foreground">{receipt.merchantName}</div>
                            {receipt.merchantAddress ? (
                              <div className="text-xs text-muted-foreground">
                                {receipt.merchantAddress}
                              </div>
                            ) : null}
                          </td>
                          <td className="px-4 py-3 font-semibold text-foreground">
                            {formatCurrency(receipt.totalMinor, receipt.currency ?? DEFAULT_CURRENCY)}
                            {receipt.warnings.length > 0 ? (
                              <Badge variant="outline" className="ml-2">
                                {t("transactions.receipts.warnings", {
                                  count: receipt.warnings.length,
                                })}
                              </Badge>
                            ) : null}
                          </td>
                          <td className="px-4 py-3 text-muted-foreground">
                            {receipt.purchaseAt
                              ? formatDate(receipt.purchaseAt)
                              : t("transactions.receipts.purchase.unknown")}
                          </td>
                          <td className="px-4 py-3 text-muted-foreground">
                            {formatReceiptConfidence(receipt.confidence)}
                          </td>
                          <td className="px-4 py-3 text-right">
                            <Button size="sm" variant="outline" disabled>
                              {t("transactions.receipts.action.add")}
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className="grid gap-4 p-4 md:hidden">
                  {recentReceipts.map((receipt) => (
                    <div key={receipt.id} className="space-y-2 rounded-lg border border-border/60 p-4 text-sm">
                      <div className="flex items-center justify-between gap-2">
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium text-foreground">{receipt.merchantName}</p>
                          {receipt.purchaseAt ? (
                            <p className="text-xs text-muted-foreground">
                              {formatDate(receipt.purchaseAt)}
                            </p>
                          ) : (
                            <p className="text-xs text-muted-foreground">
                              {t("transactions.receipts.purchase.unknown")}
                            </p>
                          )}
                        </div>
                        <Badge variant={getReceiptStatusVariant(receipt.jobStatus)}>
                          {getReceiptStatusLabel(receipt.jobStatus)}
                        </Badge>
                      </div>
                      {receipt.merchantAddress ? (
                        <p className="text-xs text-muted-foreground">{receipt.merchantAddress}</p>
                      ) : null}
                      <p className="text-base font-semibold text-foreground">
                        {formatCurrency(receipt.totalMinor, receipt.currency ?? DEFAULT_CURRENCY)}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {formatReceiptConfidence(receipt.confidence)}
                      </p>
                      {receipt.warnings.length > 0 ? (
                        <Badge variant="outline" className="w-fit">
                          {t("transactions.receipts.warnings", {
                            count: receipt.warnings.length,
                          })}
                        </Badge>
                      ) : null}
                      <div className="pt-2">
                        <Button size="sm" variant="outline" disabled className="w-full">
                          {t("transactions.receipts.action.add")}
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
