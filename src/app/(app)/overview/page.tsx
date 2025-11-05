import { ArrowUpRight, Banknote, CalendarDays } from "lucide-react";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

const KPI_CARDS = [
  {
    title: "Net cashflow",
    description: "This month vs last month",
    value: "+Rp 4.250.000",
    trend: { label: "↑ 12% vs last month", icon: ArrowUpRight },
  },
  {
    title: "Spend velocity",
    description: "Average daily expense",
    value: "Rp 310.000 / day",
    trend: { label: "Within budget", icon: CalendarDays },
  },
  {
    title: "Budget burn",
    description: "Categories over 80% allocation",
    value: "2 categories",
    trend: { label: "Review groceries & transport", icon: Banknote },
  },
];

export default function OverviewPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Overview</h1>
        <p className="text-sm text-muted-foreground">
          Materialized summaries keep dashboards live as transactions sync.
        </p>
      </div>
      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {KPI_CARDS.map((card) => (
          <Card key={card.title}>
            <CardHeader className="flex flex-row items-start justify-between">
              <div>
                <CardTitle className="text-sm font-medium">
                  {card.title}
                </CardTitle>
                <CardDescription>{card.description}</CardDescription>
              </div>
              <card.trend.icon className="size-5 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-semibold">{card.value}</div>
              <p className="mt-2 text-sm text-muted-foreground">
                {card.trend.label}
              </p>
            </CardContent>
          </Card>
        ))}
      </section>
      <section className="grid gap-4 lg:grid-cols-5">
        <Card className="lg:col-span-3">
          <CardHeader>
            <CardTitle>Expense timeline</CardTitle>
            <CardDescription>
              Coming soon: line chart fed by account_daily summaries.
            </CardDescription>
          </CardHeader>
          <CardContent className="h-64 w-full rounded-lg border border-dashed border-border bg-muted/30" />
        </Card>
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Category split</CardTitle>
            <CardDescription>
              Coming soon: donut chart driven by category_monthly docs.
            </CardDescription>
          </CardHeader>
          <CardContent className="h-64 w-full rounded-lg border border-dashed border-border bg-muted/30" />
        </Card>
      </section>
    </div>
  );
}
