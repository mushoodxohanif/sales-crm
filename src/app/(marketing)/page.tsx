import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { AuthErrorAlert } from "@/components/landing/auth-error-alert";
import { LandingCta } from "@/components/landing/landing-cta";
import { LandingFeatures } from "@/components/landing/landing-features";
import { LandingFooter } from "@/components/landing/landing-footer";
import { LandingHeader } from "@/components/landing/landing-header";
import { LandingHero } from "@/components/landing/landing-hero";
import { LandingHowItWorks } from "@/components/landing/landing-how-it-works";

interface LandingPageProps {
  searchParams: Promise<{
    error?: string;
    callbackUrl?: string;
  }>;
}

export default async function LandingPage({ searchParams }: LandingPageProps) {
  const [session, { error, callbackUrl }] = await Promise.all([auth(), searchParams]);
  const signInCallbackUrl = callbackUrl?.startsWith("/") ? callbackUrl : "/dashboard";

  if (session?.user) {
    redirect("/dashboard");
  }

  return (
    <>
      <LandingHeader callbackUrl={signInCallbackUrl} />
      <AuthErrorAlert error={error} />
      <LandingHero callbackUrl={signInCallbackUrl} />
      <LandingFeatures />
      <LandingHowItWorks />
      <LandingCta callbackUrl={signInCallbackUrl} />
      <LandingFooter callbackUrl={signInCallbackUrl} />
    </>
  );
}
