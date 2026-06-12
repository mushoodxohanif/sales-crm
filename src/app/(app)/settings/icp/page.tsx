import { auth } from "@/auth";
import { SetPageTitle } from "@/components/page-title";
import { IcpSettingsForm } from "@/components/settings/icp-settings-form";
import { getWorkspaceIcpProfile } from "@/lib/data/icp";

export default async function IcpSettingsPage() {
  const session = await auth();
  const userId = session?.user?.id;

  if (!userId) {
    return null;
  }

  const profile = await getWorkspaceIcpProfile();

  return (
    <main className="flex min-h-0 w-full min-w-0 flex-1 flex-col gap-4 overflow-auto p-4">
      <SetPageTitle title="ICP settings" />
      <div className="space-y-1">
        <h1 className="text-lg font-semibold">ICP settings</h1>
        <p className="text-muted-foreground text-sm">
          Configure how the AI evaluates whether a lead matches your ideal customer profile.
        </p>
      </div>

      <IcpSettingsForm initialProfile={profile} />
    </main>
  );
}
