import Link from "next/link";
import { notFound } from "next/navigation";
import { DeleteCampaignTypeButton } from "@/components/campaign-types/delete-campaign-type-button";
import { EditCampaignTypeForm } from "@/components/campaign-types/edit-campaign-type-form";
import { SetPageTitle } from "@/components/page-title";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { campaignTypeFieldsToBuilderValues } from "@/lib/campaign-types/serialize";
import { getCampaignTypeWithFields } from "@/lib/data/campaign-types";
import { cn } from "@/lib/utils";

interface CampaignTypeDetailPageProps {
  params: Promise<{ id: string }>;
}

export default async function CampaignTypeDetailPage({ params }: CampaignTypeDetailPageProps) {
  const { id } = await params;
  const campaignType = await getCampaignTypeWithFields(id);

  if (!campaignType) {
    notFound();
  }

  return (
    <main className="flex min-h-0 w-full min-w-0 flex-1 flex-col gap-4 overflow-auto p-4">
      <SetPageTitle title={campaignType.name} />
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-2">
          <Link
            href="/campaign-types"
            className={cn(buttonVariants({ variant: "ghost", size: "sm" }), "-ml-2 w-fit")}
          >
            Back to campaign types
          </Link>
          <Badge variant="secondary">{campaignType.slug}</Badge>
        </div>
        <DeleteCampaignTypeButton
          id={campaignType.id}
          name={campaignType.name}
          campaignCount={campaignType._count.campaigns}
        />
      </div>

      <EditCampaignTypeForm
        campaignTypeId={campaignType.id}
        initialName={campaignType.name}
        initialSlug={campaignType.slug}
        initialDescription={campaignType.description}
        initialFields={campaignTypeFieldsToBuilderValues(campaignType.fields)}
        campaignCount={campaignType._count.campaigns}
      />
    </main>
  );
}
