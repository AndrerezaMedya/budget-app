import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default function ImportsPage() {
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Imports & Exports</h1>
          <p className="text-sm text-muted-foreground">
            CSV import wizard, preview, dedupe rules, and export flows.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline">Download template</Button>
          <Button>Start CSV import</Button>
        </div>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Import history</CardTitle>
          <CardDescription>
            Every upload captured with status, row counts, and warnings.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-muted-foreground">
          <div className="rounded-lg border border-dashed border-border p-4">
            Awaiting first import. CSV mapping UI arrives in Milestone 6.
          </div>
          <div className="rounded-lg border border-dashed border-border p-4">
            Google Sheets sync lives here post-MVP.
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
