import { DashboardShell } from "@/components/dashboard-shell";
import { Card, CardContent } from "@/components/ui/card";
import { ProfileForm } from "@/components/profile-form";
import { ChangePasswordForm } from "@/components/change-password-form";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";

const ACCOUNT_NAV = [
  { href: "/account/bookings", label: "My bookings" },
  { href: "/account/profile", label: "Profile" },
];

export default async function ProfilePage() {
  const sessionUser = await requireUser("/account/profile");
  const user = await prisma.user.findUnique({ where: { id: sessionUser.id } });

  return (
    <DashboardShell title="Profile" nav={ACCOUNT_NAV} current="/account/profile">
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
          <h2 className="mb-4 text-lg font-semibold">Change password</h2>
          <ChangePasswordForm />
        </CardContent>
      </Card>
    </DashboardShell>
  );
}
