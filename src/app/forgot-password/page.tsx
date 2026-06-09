"use client";

import { useActionState } from "react";
import Link from "next/link";
import { forgotPasswordAction, type ResetState } from "@/app/actions/auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Container } from "@/components/ui/container";
import { Input, Label } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export default function ForgotPasswordPage() {
  const [state, action, pending] = useActionState<ResetState, FormData>(
    forgotPasswordAction,
    undefined,
  );

  return (
    <Container className="flex justify-center py-16">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Reset your password</CardTitle>
          <p className="mt-1 text-sm text-muted">
            Enter your email and we'll send you a reset link.
          </p>
        </CardHeader>
        <CardContent>
          {state?.success ? (
            <div className="space-y-4">
              <p className="rounded-[var(--radius-md)] bg-brand-50 px-3 py-2 text-sm text-brand-700">
                {state.success}
              </p>
              <p className="text-center text-sm text-muted">
                <Link href="/login" className="font-medium text-brand-600 hover:underline">
                  Back to sign in
                </Link>
              </p>
            </div>
          ) : (
            <form action={action} className="space-y-4">
              {state?.error && (
                <p className="rounded-[var(--radius-md)] bg-red-50 px-3 py-2 text-sm text-danger">
                  {state.error}
                </p>
              )}
              <div>
                <Label htmlFor="email">Email</Label>
                <Input id="email" name="email" type="email" required autoComplete="email" />
              </div>
              <Button type="submit" className="w-full" disabled={pending}>
                {pending ? "Sending…" : "Send reset link"}
              </Button>
              <p className="text-center text-sm text-muted">
                <Link href="/login" className="font-medium text-brand-600 hover:underline">
                  Back to sign in
                </Link>
              </p>
            </form>
          )}
        </CardContent>
      </Card>
    </Container>
  );
}
