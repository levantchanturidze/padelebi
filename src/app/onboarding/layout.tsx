import type { ReactNode } from "react";
import { Container } from "@/components/ui/container";

export default function OnboardingLayout({ children }: { children: ReactNode }) {
  return (
    <Container className="py-10 sm:py-14">
      <div className="mx-auto max-w-xl">{children}</div>
    </Container>
  );
}
