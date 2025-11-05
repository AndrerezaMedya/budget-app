import { getTranslator } from "@/lib/i18n";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default async function ImportsPage() {
  const { t } = await getTranslator();

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">{t("imports.heading")}</h1>
          <p className="text-sm text-muted-foreground">{t("imports.subheading")}</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline">{t("imports.button.template")}</Button>
          <Button>{t("imports.button.start")}</Button>
        </div>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>{t("imports.history.title")}</CardTitle>
          <CardDescription>{t("imports.history.description")}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-muted-foreground">
          <div className="rounded-lg border border-dashed border-border p-4">
            {t("imports.history.empty.primary")}
          </div>
          <div className="rounded-lg border border-dashed border-border p-4">
            {t("imports.history.empty.secondary")}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
