"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { archiveCampaign, restoreCampaign, updateCampaign } from "@/lib/actions/campaigns";

type CampaignStatusValue = "ACTIVE" | "ARCHIVED";

interface EditCampaignFormProps {
  campaignId: string;
  initialName: string;
  status: CampaignStatusValue;
}

export function EditCampaignForm({ campaignId, initialName, status }: EditCampaignFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [name, setName] = useState(initialName);
  const isArchived = status === "ARCHIVED";

  function handleSave(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    startTransition(async () => {
      const result = await updateCampaign({ id: campaignId, name });

      if (!result.success) {
        toast.error(result.error);
        return;
      }

      toast.success("Campaign updated");
      router.refresh();
    });
  }

  function handleArchiveToggle() {
    startTransition(async () => {
      const result = isArchived
        ? await restoreCampaign({ id: campaignId })
        : await archiveCampaign({ id: campaignId });

      if (!result.success) {
        toast.error(result.error);
        return;
      }

      toast.success(isArchived ? "Campaign restored" : "Campaign archived");
      router.refresh();
    });
  }

  return (
    <section className="space-y-4 rounded-xl border bg-card p-6 shadow-xs">
      <div>
        <h2 className="text-base font-medium">Campaign settings</h2>
        <p className="text-muted-foreground text-sm">Update the campaign name or archive it.</p>
      </div>

      <form onSubmit={handleSave} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="campaign-name">Name</Label>
          <Input
            id="campaign-name"
            value={name}
            onChange={(event) => setName(event.target.value)}
            disabled={isPending || isArchived}
            required
          />
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <Button type="submit" disabled={isPending || isArchived || name === initialName}>
            {isPending ? "Saving..." : "Save changes"}
          </Button>
          <Button
            type="button"
            variant={isArchived ? "default" : "outline"}
            onClick={handleArchiveToggle}
            disabled={isPending}
          >
            {isArchived ? "Restore campaign" : "Archive campaign"}
          </Button>
        </div>
      </form>
    </section>
  );
}
