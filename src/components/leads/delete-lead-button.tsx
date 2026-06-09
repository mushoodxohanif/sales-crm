"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { deleteLead } from "@/lib/actions/leads";

interface DeleteLeadButtonProps {
  leadId: string;
  campaignId: string;
  leadTitle: string;
  disabled?: boolean;
}

export function DeleteLeadButton({
  leadId,
  campaignId,
  leadTitle,
  disabled = false,
}: DeleteLeadButtonProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function handleDelete() {
    const confirmed = window.confirm(`Delete "${leadTitle}"? This cannot be undone.`);

    if (!confirmed) {
      return;
    }

    startTransition(async () => {
      const result = await deleteLead({ id: leadId });

      if (!result.success) {
        toast.error(result.error);
        return;
      }

      toast.success("Lead deleted");
      router.push(`/campaigns/${campaignId}`);
      router.refresh();
    });
  }

  return (
    <Button
      type="button"
      variant="destructive"
      onClick={handleDelete}
      disabled={disabled || isPending}
    >
      {isPending ? "Deleting..." : "Delete lead"}
    </Button>
  );
}
