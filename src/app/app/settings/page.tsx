import { getTranslator } from "@/lib/i18n";
import { fetchProfilePreferences } from "@/lib/supabase/queries/profile";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { LanguagePreferenceForm } from "@/components/forms/language-preference-form";

export default async function SettingsPage() {
  const { t } = await getTranslator();
  const profile = await fetchProfilePreferences();
  const currentLocale = profile?.locale ?? "en";

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold">{t("settings.title")}</h1>
        <p className="text-sm text-muted-foreground">{t("settings.subtitle")}</p>
      </header>
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>{t("settings.timezone.title")}</CardTitle>
            <CardDescription>{t("settings.timezone.description")}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 rounded-lg border border-dashed border-border p-4">
            <p className="text-sm text-muted-foreground">{t("settings.timezone.body")}</p>
            <div className="space-y-2">
              <h2 className="text-sm font-semibold">{t("language.section.title")}</h2>
              <p className="text-xs text-muted-foreground">
                {t("language.section.description")}
              </p>
              <LanguagePreferenceForm locale={currentLocale} />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>{t("settings.security.title")}</CardTitle>
            <CardDescription>{t("settings.security.description")}</CardDescription>
          </CardHeader>
          <CardContent className="rounded-lg border border-dashed border-border p-4 text-sm text-muted-foreground">
            {t("settings.security.body")}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
