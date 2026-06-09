import Link from "next/link";
import { notFound } from "next/navigation";
import { DeleteCampaignTypeButton } from "@/components/campaign-types/delete-campaign-type-button";
import { EditCampaignTypeForm } from "@/components/campaign-types/edit-campaign-type-form";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { campaignTypeFieldsToBuilderValues } from "@/lib/campaign-types/serialize";
import { getCampaignTypeWithFields } from "@/lib/data/campaign-types";

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
    <main className="mx-auto flex w-full max-w-4xl flex-1 flex-col gap-6 p-6 md:p-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="space-y-3">
          <Button variant="ghost" size="sm" className="-ml-2 w-fit" asChild>
            <Link href="/campaign-types">Back to campaign types</Link>
          </Button>
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-3xl font-semibold tracking-tight">{campaignType.name}</h1>
              <Badge variant="secondary">{campaignType.slug}</Badge>
            </div>
            {campaignType.description ? (
              <p className="text-muted-foreground text-sm">{campaignType.description}</p>
            ) : null}
          </div>
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
