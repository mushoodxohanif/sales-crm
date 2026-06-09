import { ArrowRightIcon } from "lucide-react";
import { SignInButton } from "@/components/landing/sign-in-button";

interface LandingCtaProps {
  callbackUrl?: string;
}

export function LandingCta({ callbackUrl }: LandingCtaProps) {
  return (
    <section className="py-20 md:py-24">
      <div className="mx-auto w-full max-w-6xl px-6">
        <div className="relative overflow-hidden rounded-2xl border bg-card px-8 py-12 text-center md:px-16 md:py-16">
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_center,oklch(0.55_0_0/0.08),transparent_70%)] dark:bg-[radial-gradient(ellipse_at_center,oklch(0.85_0_0/0.06),transparent_70%)]"
          />

          <div className="relative mx-auto max-w-2xl space-y-6">
            <h2 className="text-3xl font-semibold tracking-tight text-balance">
              Ready to organize your lead funnel?
            </h2>
            <p className="text-muted-foreground text-pretty">
              Sign in with your Google Workspace account to access campaigns, imports, and your team
              dashboard.
            </p>
            <SignInButton size="lg" callbackUrl={callbackUrl}>
              Sign in with Google
              <ArrowRightIcon />
            </SignInButton>
          </div>
        </div>
      </div>
    </section>
  );
}
