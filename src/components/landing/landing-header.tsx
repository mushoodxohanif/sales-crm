import { MegaphoneIcon } from "lucide-react";
import Link from "next/link";
import { SignInButton } from "@/components/landing/sign-in-button";
import { ModeToggle } from "@/components/mode-toggle";

interface LandingHeaderProps {
  callbackUrl?: string;
}

export function LandingHeader({ callbackUrl }: LandingHeaderProps) {
  return (
    <header className="sticky top-0 z-50 border-b border-border/60 bg-background/80 backdrop-blur-md">
      <div className="mx-auto flex h-14 w-full max-w-6xl items-center justify-between gap-4 px-6">
        <Link href="/" className="flex items-center gap-2 font-semibold tracking-tight">
          <span className="flex size-8 items-center justify-center rounded-lg border bg-muted/50">
            <MegaphoneIcon className="size-4" />
          </span>
          <span>Lead&apos;em</span>
        </Link>

        <nav className="hidden items-center gap-6 text-sm text-muted-foreground md:flex">
          <a href="#features" className="transition-colors hover:text-foreground">
            Features
          </a>
          <a href="#how-it-works" className="transition-colors hover:text-foreground">
            How it works
          </a>
        </nav>

        <div className="flex items-center gap-2">
          <ModeToggle />
          <SignInButton callbackUrl={callbackUrl}>Sign in</SignInButton>
        </div>
      </div>
    </header>
  );
}
