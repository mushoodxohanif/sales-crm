import { auth } from "@/auth";
import { SetPageTitle } from "@/components/page-title";
import { LosonoIntegrationsPanel } from "@/components/settings/losono-integrations-panel";
import { listLosonoIntegrationGrants } from "@/lib/data/integrations";

export default async function LosonoIntegrationsPage() {
  const session = await auth();
  const userId = session?.user?.id;

  if (!userId) {
    return null;
  }

  const grants = await listLosonoIntegrationGrants();

  return (
    <main className="flex min-h-0 w-full min-w-0 flex-1 flex-col gap-4 overflow-auto p-4">
      <SetPageTitle title="Losono integration" />
      <div className="space-y-1">
        <h1 className="text-lg font-semibold">Losono integration</h1>
        <p className="text-muted-foreground text-sm">
          Manage Losono connections that export pre-chat form leads into your campaigns.
        </p>
      </div>

      <LosonoIntegrationsPanel grants={grants} />
    </main>
  );
}
