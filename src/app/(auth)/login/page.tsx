import { AlertCircleIcon } from "lucide-react";
import { auth, signIn } from "@/auth";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

const errorMessages: Record<string, string> = {
  AccessDenied:
    "Access denied. Sign in with a verified Google Workspace account on your organization's domain.",
  Configuration: "Authentication is not configured correctly. Contact your administrator.",
  Default: "Unable to sign in. Please try again.",
};

interface LoginPageProps {
  searchParams: Promise<{
    error?: string;
    callbackUrl?: string;
  }>;
}

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const session = await auth();
  const { error, callbackUrl } = await searchParams;

  if (session?.user) {
    return null;
  }

  const message = error ? (errorMessages[error] ?? errorMessages.Default) : null;

  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center gap-6 p-8">
      <div className="space-y-2 text-center">
        <Badge variant="secondary">Google Workspace</Badge>
        <h1 className="text-3xl font-semibold tracking-tight">Sign in to Sales CRM</h1>
        <p className="text-muted-foreground text-sm">
          Use your company Google account to access lead funneling and campaign management.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Sign in</CardTitle>
          <CardDescription>Only approved Workspace domains can access this app.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {message ? (
            <div className="flex gap-3 rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
              <AlertCircleIcon className="mt-0.5 size-4 shrink-0" />
              <p>{message}</p>
            </div>
          ) : null}

          <form
            action={async () => {
              "use server";
              await signIn("google", { redirectTo: callbackUrl ?? "/" });
            }}
          >
            <Button type="submit" className="w-full">
              Sign in with Google
            </Button>
          </form>
        </CardContent>
      </Card>
    </main>
  );
}
