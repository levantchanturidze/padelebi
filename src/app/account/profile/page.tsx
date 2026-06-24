import { getTranslations } from "next-intl/server";
import { DashboardShell } from "@/components/dashboard-shell";
import { Card, CardContent } from "@/components/ui/card";
import { ProfileForm } from "@/components/profile-form";
import { ChangePasswordForm } from "@/components/change-password-form";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import { userAreaNav } from "@/lib/user-nav";

export default async function ProfilePage() {
  const sessionUser = await requireUser("/account/profile");
  const [user, t, tNav] = await Promise.all([
    prisma.user.findUnique({ where: { id: sessionUser.id } }),
    getTranslations("profile"),
    getTranslations("nav"),
  ]);

  const ACCOUNT_NAV = userAreaNav(tNav, sessionUser.role);

  return (
    <DashboardShell title={t("title")} nav={ACCOUNT_NAV} current="/account/profile">
      <Card>
        <CardContent>
          <ProfileForm
            defaults={{
              name: user?.name ?? "",
              phone: user?.phone ?? "",
              skillLevel: user?.skillLevel ?? "",
            }}
          />
        </CardContent>
      </Card>
      <Card className="mt-6">
        <CardContent>
          <h2 className="mb-4 text-lg font-semibold">{t("changePassword")}</h2>
          <ChangePasswordForm />
        </CardContent>
      </Card>
    </DashboardShell>
  );
}
