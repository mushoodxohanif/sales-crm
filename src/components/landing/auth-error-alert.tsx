import { AlertCircleIcon } from "lucide-react";

const errorMessages: Record<string, string> = {
  AccessDenied:
    "Access denied. Sign in with a verified Google Workspace account on your organization's domain.",
  Configuration: "Authentication is not configured correctly. Contact your administrator.",
  Default: "Unable to sign in. Please try again.",
};

interface AuthErrorAlertProps {
  error?: string;
}

export function AuthErrorAlert({ error }: AuthErrorAlertProps) {
  if (!error) {
    return null;
  }

  const message = errorMessages[error] ?? errorMessages.Default;

  return (
    <div className="border-b bg-destructive/5 px-6 py-3">
      <div className="mx-auto flex w-full max-w-6xl gap-3 text-sm text-destructive">
        <AlertCircleIcon className="mt-0.5 size-4 shrink-0" />
        <p>{message}</p>
      </div>
    </div>
  );
}
