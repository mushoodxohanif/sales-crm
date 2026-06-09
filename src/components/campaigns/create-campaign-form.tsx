"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import {
  type CampaignStageDraft,
  CampaignStageSetup,
  defaultStageDrafts,
} from "@/components/campaigns/campaign-stage-setup";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { createCampaign } from "@/lib/actions/campaigns";

interface CampaignTypeOption {
  id: string;
  name: string;
  slug: string;
}

interface CreateCampaignFormProps {
  campaignTypes: CampaignTypeOption[];
}

export function CreateCampaignForm({ campaignTypes }: CreateCampaignFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [name, setName] = useState("");
  const [campaignTypeId, setCampaignTypeId] = useState(campaignTypes[0]?.id ?? "");
  const [useCustomStages, setUseCustomStages] = useState(false);
  const [stages, setStages] = useState<CampaignStageDraft[]>(defaultStageDrafts);

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    startTransition(async () => {
      const payload = {
        name,
        campaignTypeId,
        ...(useCustomStages
          ? {
              stages: stages.map((stage, index) => ({
                name: stage.name,
                slug: stage.slug,
                sortOrder: index,
                color: stage.color,
                isDefault: stage.isDefault,
              })),
            }
          : {}),
      };

      const result = await createCampaign(payload);

      if (!result.success) {
        toast.error(result.error);
        return;
      }

      toast.success(
        useCustomStages
          ? "Campaign created with custom pipeline stages"
          : "Campaign created with default pipeline stages",
      );
      router.push(`/campaigns/${result.data.id}`);
      router.refresh();
    });
  }

  if (campaignTypes.length === 0) {
    return (
      <div className="rounded-xl border border-dashed p-8 text-center">
        <h2 className="text-lg font-medium">Create a campaign type first</h2>
        <p className="text-muted-foreground mx-auto mt-2 max-w-md text-sm">
          Campaigns are built on top of a campaign type that defines the lead field schema.
        </p>
        <Button className="mt-6" onClick={() => router.push("/campaign-types/new")}>
          New campaign type
        </Button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      <section className="space-y-4 rounded-xl border bg-card p-6 shadow-xs">
        <div>
          <h2 className="text-base font-medium">Campaign details</h2>
          <p className="text-muted-foreground text-sm">
            Pick a campaign type and name this lead collection.
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="name">Name</Label>
            <Input
              id="name"
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="Q1 LinkedIn Outreach"
              required
              disabled={isPending}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="campaignType">Campaign type</Label>
            <Select
              value={campaignTypeId}
              onValueChange={(value) => setCampaignTypeId(value ?? "")}
              disabled={isPending}
            >
              <SelectTrigger id="campaignType" className="w-full">
                <SelectValue placeholder="Select a campaign type" />
              </SelectTrigger>
              <SelectContent>
                {campaignTypes.map((campaignType) => (
                  <SelectItem key={campaignType.id} value={campaignType.id}>
                    {campaignType.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </section>

      <CampaignStageSetup
        useCustomStages={useCustomStages}
        onUseCustomStagesChange={setUseCustomStages}
        stages={stages}
        onStagesChange={setStages}
        disabled={isPending}
      />

      <div className="flex items-center justify-end gap-3">
        <Button type="button" variant="outline" onClick={() => router.back()} disabled={isPending}>
          Cancel
        </Button>
        <Button type="submit" disabled={isPending || !campaignTypeId}>
          {isPending ? "Creating..." : "Create campaign"}
        </Button>
      </div>
    </form>
  );
}
