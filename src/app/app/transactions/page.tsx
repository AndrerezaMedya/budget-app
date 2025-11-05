import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

const HEADERS = ["Date", "Account", "Category", "Payee", "Amount", "Tags"];

export default function TransactionsPage() {
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Transactions</h1>
          <p className="text-sm text-muted-foreground">
            Offline-ready ledger with paired transfers and undo history.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline">Import CSV</Button>
          <Button>Add transaction</Button>
        </div>
      </div>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <div>
            <CardTitle>Recent activity</CardTitle>
            <CardDescription>
              Firestore `transactions` feed with optimistic updates.
            </CardDescription>
          </div>
          <Button variant="ghost" size="sm">
            Filters
          </Button>
        </CardHeader>
        <CardContent>
          <div className="overflow-hidden rounded-lg border border-dashed border-border">
            <table className="hidden min-w-full divide-y divide-border text-sm md:table">
              <thead className="bg-muted/50 text-xs uppercase tracking-wide text-muted-foreground">
                <tr>
                  {HEADERS.map((header) => (
                    <th key={header} className="px-4 py-3 text-left">
                      {header}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border bg-card">
                {Array.from({ length: 6 }).map((_, index) => (
                  <tr key={index}>
                    {HEADERS.map((header) => (
                      <td key={header} className="px-4 py-4 text-muted-foreground">
                        Placeholder {header}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="flex flex-col gap-2 p-6 text-center text-sm text-muted-foreground md:hidden">
              Mobile friendly list view coming soon.
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
