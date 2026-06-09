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
import { deleteCampaign } from "@/lib/actions/campaigns";

interface DeleteCampaignButtonProps {
  id: string;
  name: string;
  leadCount: number;
  size?: "default" | "sm";
}

export function DeleteCampaignButton({
  id,
  name,
  leadCount,
  size = "default",
}: DeleteCampaignButtonProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  function handleDelete() {
    startTransition(async () => {
      const result = await deleteCampaign({ id });

      if (!result.success) {
        toast.error(result.error);
        return;
      }

      toast.success("Campaign deleted");
      setOpen(false);
      router.push("/campaigns");
      router.refresh();
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="destructive" size={size}>
          Delete
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Delete campaign</DialogTitle>
          <DialogDescription>
            This will permanently delete &quot;{name}&quot;
            {leadCount > 0 ? ` and all ${leadCount} lead${leadCount === 1 ? "" : "s"} in it` : ""}.
            This cannot be undone.
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
          <Button type="button" variant="destructive" onClick={handleDelete} disabled={isPending}>
            {isPending ? "Deleting..." : "Delete campaign"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
