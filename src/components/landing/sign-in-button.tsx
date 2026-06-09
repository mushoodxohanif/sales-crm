import type { VariantProps } from "class-variance-authority";
import { Button, type buttonVariants } from "@/components/ui/button";
import { signInWithGoogleAction } from "@/lib/actions/auth";
import { cn } from "@/lib/utils";

interface SignInButtonProps extends VariantProps<typeof buttonVariants> {
  children: React.ReactNode;
  className?: string;
  callbackUrl?: string;
}

export function SignInButton({
  children,
  className,
  callbackUrl = "/dashboard",
  variant,
  size,
}: SignInButtonProps) {
  return (
    <form action={signInWithGoogleAction}>
      <input type="hidden" name="callbackUrl" value={callbackUrl} />
      <Button type="submit" variant={variant} size={size} className={cn(className)}>
        {children}
      </Button>
    </form>
  );
}
