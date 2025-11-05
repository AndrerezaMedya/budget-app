import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default function SettingsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Settings</h1>
        <p className="text-sm text-muted-foreground">
          Workspace preferences, timezone, and integrations.
        </p>
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Timezone</CardTitle>
            <CardDescription>
              Summaries use the user-selected timezone for month boundaries.
            </CardDescription>
          </CardHeader>
          <CardContent className="rounded-lg border border-dashed border-border p-4 text-sm text-muted-foreground">
            Settings form coming soon. Persist preferences in `users` doc.
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Security</CardTitle>
            <CardDescription>
              Firestore rules ensure data isolation per user.
            </CardDescription>
          </CardHeader>
          <CardContent className="rounded-lg border border-dashed border-border p-4 text-sm text-muted-foreground">
            Surface device sessions, login methods, and 2FA toggles here.
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
