import { Clock, Layers3, Wallet } from "lucide-react";

import { formatCurrency, formatDate } from "@/lib/format";
import { getTranslator } from "@/lib/i18n";
import { fetchAccounts } from "@/lib/supabase/queries/accounts";
import { ACCOUNT_TYPE_LABEL_MAP } from "@/config/accounts";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AccountActions } from "@/components/forms/account-actions";
import { CreateAccountForm } from "@/components/forms/create-account-form";

export default async function AccountsPage() {
  const { t } = await getTranslator();
  const { accounts } = await fetchAccounts();
  const activeAccounts = accounts.filter((account) => !account.archived_at);
  const archivedAccounts = accounts.filter((account) => account.archived_at);

  const totalCurrentBalance = activeAccounts.reduce(
    (sum, account) => sum + account.current_balance_minor,
    0,
  );

  const subheading = t("accounts.subheading");
  const activeDescription = t("accounts.stats.active.description");
  const activeCaption = t("accounts.stats.active.caption");
  const balanceDescription = t("accounts.stats.balance.description");
  const balanceCaption = t("accounts.stats.balance.caption");
  const archivedDescription = t("accounts.stats.archived.description");
  const archivedCaption = t("accounts.stats.archived.caption");

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">{t("accounts.heading")}</h1>
          {subheading ? (
            <p className="text-sm text-muted-foreground">{subheading}</p>
          ) : null}
        </div>
        <CreateAccountForm />
      </header>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <Card>
          <CardHeader className="flex items-start justify-between">
            <div>
              <CardTitle className="text-sm font-medium">
                {t("accounts.stats.active.title")}
              </CardTitle>
              {activeDescription ? (
                <CardDescription>{activeDescription}</CardDescription>
              ) : null}
            </div>
            <Wallet className="size-5 text-muted-foreground" aria-hidden="true" />
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-semibold">{activeAccounts.length}</p>
            {activeCaption ? (
              <p className="mt-2 text-xs text-muted-foreground">{activeCaption}</p>
            ) : null}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex items-start justify-between">
            <div>
              <CardTitle className="text-sm font-medium">
                {t("accounts.stats.balance.title")}
              </CardTitle>
              {balanceDescription ? (
                <CardDescription>{balanceDescription}</CardDescription>
              ) : null}
            </div>
            <Layers3 className="size-5 text-muted-foreground" aria-hidden="true" />
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-semibold">
              {formatCurrency(totalCurrentBalance)}
            </p>
            {balanceCaption ? (
              <p className="mt-2 text-xs text-muted-foreground">{balanceCaption}</p>
            ) : null}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex items-start justify-between">
            <div>
              <CardTitle className="text-sm font-medium">
                {t("accounts.stats.archived.title")}
              </CardTitle>
              {archivedDescription ? (
                <CardDescription>{archivedDescription}</CardDescription>
              ) : null}
            </div>
            <Clock className="size-5 text-muted-foreground" aria-hidden="true" />
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-semibold">{archivedAccounts.length}</p>
            {archivedCaption ? (
              <p className="mt-2 text-xs text-muted-foreground">{archivedCaption}</p>
            ) : null}
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {accounts.length === 0 ? (
          <Card className="md:col-span-2 xl:col-span-3">
            <CardHeader>
              <CardTitle>{t("accounts.empty.title")}</CardTitle>
              <CardDescription>{t("accounts.empty.description")}</CardDescription>
            </CardHeader>
          </Card>
        ) : (
          accounts.map((account) => {
            const typeLabel = t(
              ACCOUNT_TYPE_LABEL_MAP[account.type] ?? "accounts.card.typeFallback",
            );
            const currentBalance = formatCurrency(account.current_balance_minor);
            const openingBalance = formatCurrency(account.opening_balance_minor);
            const createdAt = formatDate(account.created_at);

            return (
              <Card key={account.id} className="flex flex-col justify-between">
                <CardHeader className="space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <CardTitle className="text-lg font-semibold">
                      {account.name}
                    </CardTitle>
                    {account.archived_at ? (
                      <Badge variant="secondary">{t("accounts.card.badge.archived")}</Badge>
                    ) : null}
                  </div>
                  <CardDescription>{typeLabel}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3 text-sm text-muted-foreground">
                  <div>
                    <p className="text-xs uppercase tracking-wide text-muted-foreground/80">
                      {t("accounts.card.field.currentBalance")}
                    </p>
                    <p className="text-lg font-semibold text-foreground">
                      {currentBalance}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs uppercase tracking-wide text-muted-foreground/80">
                      {t("accounts.card.field.openingBalance")}
                    </p>
                    <p>{openingBalance}</p>
                  </div>
                  <div>
                    <p className="text-xs uppercase tracking-wide text-muted-foreground/80">
                      {t("accounts.card.field.currency")}
                    </p>
                    <p>{account.currency}</p>
                  </div>
                  <div>
                    <p className="text-xs uppercase tracking-wide text-muted-foreground/80">
                      {t("accounts.card.field.created")}
                    </p>
                    <p>{createdAt}</p>
                  </div>
                  <div className="border-t border-border/60 pt-3">
                    <AccountActions account={account} />
                  </div>
                </CardContent>
              </Card>
            );
          })
        )}
      </section>
    </div>
  );
}
