"use server";

import { signIn, signOut } from "@/auth";

export async function signInWithGoogleAction(formData: FormData) {
  const callbackUrl = formData.get("callbackUrl")?.toString() ?? "/dashboard";
  await signIn("google", { redirectTo: callbackUrl });
}

export async function signOutAction() {
  await signOut({ redirectTo: "/" });
}
