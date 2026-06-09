import { getTranslations } from "next-intl/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Container } from "@/components/ui/container";
import { RegisterForm } from "@/components/auth/register-form";
import { getCurrentUser } from "@/lib/session";
import { redirect } from "next/navigation";

export default async function RegisterPage() {
  if (await getCurrentUser()) redirect("/");
  const t = await getTranslations("auth");

  return (
    <Container className="flex justify-center py-16">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>{t("createAccount")}</CardTitle>
          <p className="mt-1 text-sm text-muted">{t("registerDesc")}</p>
        </CardHeader>
        <CardContent>
          <RegisterForm />
        </CardContent>
      </Card>
    </Container>
  );
}
