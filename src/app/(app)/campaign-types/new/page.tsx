import Link from "next/link";
import { CreateCampaignTypeForm } from "@/components/campaign-types/create-campaign-type-form";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export default function NewCampaignTypePage() {
  return (
    <main className="flex min-h-0 w-full min-w-0 flex-1 flex-col gap-4 overflow-auto p-4">
      <Link
        href="/campaign-types"
        className={cn(buttonVariants({ variant: "ghost", size: "sm" }), "-ml-2 w-fit")}
      >
        Back to campaign types
      </Link>

      <CreateCampaignTypeForm />
    </main>
  );
}
