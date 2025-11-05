import { fetchCategories } from "@/lib/supabase/queries/categories";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { CreateCategoryForm } from "@/components/forms/create-category-form";

export default async function SettingsPage() {
  const categories = await fetchCategories();

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold">Settings</h1>
        <p className="text-sm text-muted-foreground">
          Workspace preferences, timezone, integrations, and taxonomy.
        </p>
      </header>
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Timezone</CardTitle>
            <CardDescription>
              Summaries use the user-selected timezone for month boundaries.
            </CardDescription>
          </CardHeader>
          <CardContent className="rounded-lg border border-dashed border-border p-4 text-sm text-muted-foreground">
            Settings form coming soon. Persist preferences in `profiles` table.
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Security</CardTitle>
            <CardDescription>
              Supabase Row Level Security keeps data scoped per user.
            </CardDescription>
          </CardHeader>
          <CardContent className="rounded-lg border border-dashed border-border p-4 text-sm text-muted-foreground">
            Surface device sessions, login methods, and 2FA toggles here.
          </CardContent>
        </Card>
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Categories</CardTitle>
            <CardDescription>
              {categories.length} categories loaded from Supabase.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <CreateCategoryForm categories={categories} />
            {categories.length === 0 ? (
              <div className="rounded-lg border border-dashed border-border p-4 text-sm text-muted-foreground">
                No categories yet. Use the form above to add your first one.
              </div>
            ) : (
              <div className="overflow-hidden rounded-lg border border-border">
                <table className="min-w-full divide-y divide-border text-sm">
                  <thead className="bg-muted/50 text-xs uppercase tracking-wide text-muted-foreground">
                    <tr>
                      <th className="px-4 py-3 text-left">Category</th>
                      <th className="px-4 py-3 text-left">Parent</th>
                      <th className="px-4 py-3 text-left">Created</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border bg-card">
                    {categories.map((category) => (
                      <tr key={category.id}>
                        <td className="px-4 py-3 text-muted-foreground">
                          {category.name}
                        </td>
                        <td className="px-4 py-3 text-muted-foreground">
                          {category.parentName ?? "—"}
                        </td>
                        <td className="px-4 py-3 text-muted-foreground">
                          {new Date(category.createdAt).toLocaleDateString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
