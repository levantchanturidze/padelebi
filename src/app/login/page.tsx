import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Container } from "@/components/ui/container";
import { LoginForm } from "@/components/auth/login-form";
import { getCurrentUser } from "@/lib/session";
import { redirect } from "next/navigation";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ callbackUrl?: string }>;
}) {
  if (await getCurrentUser()) redirect("/");
  const { callbackUrl } = await searchParams;

  return (
    <Container className="flex justify-center py-16">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Welcome back</CardTitle>
          <p className="mt-1 text-sm text-muted">Sign in to book courts and manage your bookings.</p>
        </CardHeader>
        <CardContent>
          <LoginForm callbackUrl={callbackUrl} />
          <div className="mt-6 rounded-[var(--radius-md)] bg-background p-3 text-xs text-muted">
            <p className="font-medium text-foreground">Demo logins (password: password123)</p>
            <p>player@padelebi.ge · club@padelebi.ge · admin@padelebi.ge</p>
          </div>
        </CardContent>
      </Card>
    </Container>
  );
}
