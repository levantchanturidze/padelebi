"use client";

import { useActionState } from "react";
import Link from "next/link";
import { registerAction, type AuthState } from "@/app/actions/auth";
import { Button } from "@/components/ui/button";
import { Input, Label, Select } from "@/components/ui/input";

export function RegisterForm() {
  const [state, action, pending] = useActionState<AuthState, FormData>(
    registerAction,
    undefined,
  );

  return (
    <form action={action} className="space-y-4">
      {state?.error && (
        <p className="rounded-[var(--radius-md)] bg-red-50 px-3 py-2 text-sm text-danger">
          {state.error}
        </p>
      )}
      <div>
        <Label htmlFor="name">Full name</Label>
        <Input id="name" name="name" required autoComplete="name" />
      </div>
      <div>
        <Label htmlFor="email">Email</Label>
        <Input id="email" name="email" type="email" required autoComplete="email" />
      </div>
      <div>
        <Label htmlFor="password">Password</Label>
        <Input
          id="password"
          name="password"
          type="password"
          required
          minLength={8}
          autoComplete="new-password"
        />
      </div>
      <div>
        <Label htmlFor="role">I want to…</Label>
        <Select id="role" name="role" defaultValue="PLAYER">
          <option value="PLAYER">Book courts as a player</option>
          <option value="CLUB_ADMIN">List and manage my club</option>
        </Select>
      </div>
      <Button type="submit" className="w-full" disabled={pending}>
        {pending ? "Creating account…" : "Create account"}
      </Button>
      <p className="text-center text-sm text-muted">
        Already have an account?{" "}
        <Link href="/login" className="font-medium text-brand-600 hover:underline">
          Sign in
        </Link>
      </p>
    </form>
  );
}
