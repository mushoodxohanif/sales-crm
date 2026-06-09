import { MegaphoneIcon } from "lucide-react";
import { SignInButton } from "@/components/landing/sign-in-button";

interface LandingFooterProps {
  callbackUrl?: string;
}

export function LandingFooter({ callbackUrl }: LandingFooterProps) {
  return (
    <footer className="border-t py-10">
      <div className="mx-auto flex w-full max-w-6xl flex-col items-center justify-between gap-4 px-6 sm:flex-row">
        <div className="flex items-center gap-2 text-sm font-medium">
          <MegaphoneIcon className="size-4 text-muted-foreground" />
          <span>Lead&apos;em</span>
        </div>

        <p className="text-muted-foreground text-center text-sm">
          Lead funneling and management for modern sales teams.
        </p>

        <SignInButton
          variant="ghost"
          className="text-muted-foreground hover:text-foreground"
          callbackUrl={callbackUrl}
        >
          Sign in
        </SignInButton>
      </div>
    </footer>
  );
}
