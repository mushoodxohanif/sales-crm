import { ArrowRightIcon, SparklesIcon } from "lucide-react";
import { SignInButton } from "@/components/landing/sign-in-button";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";

interface LandingHeroProps {
  callbackUrl?: string;
}

export function LandingHero({ callbackUrl }: LandingHeroProps) {
  return (
    <section className="relative overflow-hidden border-b">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_-20%,oklch(0.55_0_0/0.12),transparent)] dark:bg-[radial-gradient(ellipse_80%_50%_at_50%_-20%,oklch(0.85_0_0/0.08),transparent)]"
      />

      <div className="relative mx-auto flex w-full max-w-6xl flex-col gap-10 px-6 py-20 md:py-28">
        <div className="mx-auto flex max-w-3xl flex-col items-center gap-6 text-center">
          <Badge variant="secondary" className="gap-1.5">
            <SparklesIcon className="size-3.5" />
            AI-assisted lead imports
          </Badge>

          <h1 className="text-4xl font-semibold tracking-tight text-balance sm:text-5xl md:text-6xl">
            Funnel, track, and close leads without spreadsheet chaos
          </h1>

          <p className="max-w-2xl text-lg text-muted-foreground text-pretty">
            Lead&apos;em is a sales CRM for teams that run campaigns with different data shapes.
            Define reusable schemas, move leads through pipelines, and bulk-import spreadsheets with
            intelligent column mapping.
          </p>

          <div className="flex flex-wrap items-center justify-center gap-3">
            <SignInButton size="lg" callbackUrl={callbackUrl}>
              Get started
              <ArrowRightIcon />
            </SignInButton>
            <a href="#features" className={buttonVariants({ size: "lg", variant: "outline" })}>
              See features
            </a>
          </div>
        </div>

        <div className="mx-auto grid w-full max-w-4xl gap-4 sm:grid-cols-3">
          {[
            { value: "Flexible", label: "Campaign type schemas" },
            { value: "Pipeline", label: "Stage-based lead tracking" },
            { value: "Bulk", label: "CSV & XLSX imports" },
          ].map((item) => (
            <div
              key={item.label}
              className="rounded-xl border bg-card/50 px-5 py-4 text-center backdrop-blur-sm"
            >
              <p className="text-lg font-semibold tracking-tight">{item.value}</p>
              <p className="text-muted-foreground mt-1 text-sm">{item.label}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
