import Link from "next/link";
import { CreateCampaignForm } from "@/components/campaigns/create-campaign-form";
import { buttonVariants } from "@/components/ui/button";
import { getCampaignTypesForSelect } from "@/lib/data/campaigns";
import { cn } from "@/lib/utils";

export default async function NewCampaignPage() {
  const campaignTypes = await getCampaignTypesForSelect();

  return (
    <main className="flex min-h-0 w-full min-w-0 flex-1 flex-col gap-4 overflow-auto p-4">
      <Link
        href="/campaigns"
        className={cn(buttonVariants({ variant: "ghost", size: "sm" }), "-ml-2 w-fit")}
      >
        Back to campaigns
      </Link>

      <CreateCampaignForm campaignTypes={campaignTypes} />
    </main>
  );
}
