"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { deleteCampaignType } from "@/lib/actions/campaign-types";

interface DeleteCampaignTypeButtonProps {
  id: string;
  name: string;
  campaignCount: number;
}

export function DeleteCampaignTypeButton({
  id,
  name,
  campaignCount,
}: DeleteCampaignTypeButtonProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  const blocked = campaignCount > 0;

  function handleDelete() {
    startTransition(async () => {
      const result = await deleteCampaignType({ id });

      if (!result.success) {
        toast.error(result.error);
        return;
      }

      toast.success("Campaign type deleted");
      setOpen(false);
      router.push("/campaign-types");
      router.refresh();
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="destructive" size="sm" disabled={blocked}>
          Delete
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Delete campaign type</DialogTitle>
          <DialogDescription>
            {blocked
              ? `"${name}" cannot be deleted while it still has campaigns.`
              : `This will permanently delete "${name}" and its field schema.`}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => setOpen(false)}
            disabled={isPending}
          >
            Cancel
          </Button>
          <Button
            type="button"
            variant="destructive"
            onClick={handleDelete}
            disabled={isPending || blocked}
          >
            {isPending ? "Deleting..." : "Delete campaign type"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
