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
import { deleteLead } from "@/lib/actions/leads";

interface DeleteLeadButtonProps {
  leadId: string;
  campaignId: string;
  leadTitle: string;
  disabled?: boolean;
  size?: "default" | "sm";
  onDeleted?: () => void;
}

export function DeleteLeadButton({
  leadId,
  campaignId,
  leadTitle,
  disabled = false,
  size = "default",
  onDeleted,
}: DeleteLeadButtonProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  function handleDelete() {
    startTransition(async () => {
      const result = await deleteLead({ id: leadId });

      if (!result.success) {
        toast.error(result.error);
        return;
      }

      toast.success("Lead deleted");
      setOpen(false);

      if (onDeleted) {
        onDeleted();
        router.refresh();
        return;
      }

      router.push(`/campaigns/${campaignId}`);
      router.refresh();
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="destructive" size={size} disabled={disabled}>
          Delete
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Delete lead</DialogTitle>
          <DialogDescription>
            This will permanently delete &quot;{leadTitle}&quot;. This cannot be undone.
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
            {isPending ? "Deleting..." : "Delete lead"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
