import Link from "next/link";
import { CreateCampaignForm } from "@/components/campaigns/create-campaign-form";
import { Button } from "@/components/ui/button";
import { getCampaignTypesForSelect } from "@/lib/data/campaigns";

export default async function NewCampaignPage() {
  const campaignTypes = await getCampaignTypesForSelect();

  return (
    <main className="mx-auto flex w-full max-w-4xl flex-1 flex-col gap-6 p-6 md:p-8">
      <div className="space-y-1">
        <Button variant="ghost" size="sm" className="-ml-2 w-fit" asChild>
          <Link href="/campaigns">Back to campaigns</Link>
        </Button>
        <h1 className="text-3xl font-semibold tracking-tight">New campaign</h1>
        <p className="text-muted-foreground text-sm">
          Create a lead collection under a campaign type. Default pipeline stages are seeded
          automatically.
        </p>
      </div>

      <CreateCampaignForm campaignTypes={campaignTypes} />
    </main>
  );
}
