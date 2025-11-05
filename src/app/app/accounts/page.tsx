import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

const ACCOUNTS = [
  {
    name: "Primary Checking",
    balance: "Rp 12.450.000",
    type: "Bank",
    status: "Synced",
  },
  {
    name: "Cash Wallet",
    balance: "Rp 1.250.000",
    type: "Cash",
    status: "Manual",
  },
  {
    name: "Investments",
    balance: "Rp 30.000.000",
    type: "Brokerage",
    status: "Read-only",
  },
];

export default function AccountsPage() {
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Accounts</h1>
          <p className="text-sm text-muted-foreground">
            Opening balances feed delta accounting in Cloud Functions.
          </p>
        </div>
        <Button>Add account</Button>
      </div>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {ACCOUNTS.map((account) => (
          <Card key={account.name}>
            <CardHeader>
              <CardTitle>{account.name}</CardTitle>
              <CardDescription>{account.type}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              <p className="text-sm text-muted-foreground">
                Current balance
              </p>
              <p className="text-2xl font-semibold">{account.balance}</p>
              <p className="text-xs text-muted-foreground">
                Status: {account.status} · Daily materialized net change.
              </p>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
