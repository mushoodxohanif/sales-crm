import Link from "next/link";
import { CreateCampaignTypeForm } from "@/components/campaign-types/create-campaign-type-form";
import { Button } from "@/components/ui/button";

export default function NewCampaignTypePage() {
  return (
    <main className="mx-auto flex w-full max-w-4xl flex-1 flex-col gap-6 p-6 md:p-8">
      <div className="space-y-1">
        <Button variant="ghost" size="sm" className="-ml-2 w-fit" asChild>
          <Link href="/campaign-types">Back to campaign types</Link>
        </Button>
        <h1 className="text-3xl font-semibold tracking-tight">New campaign type</h1>
        <p className="text-muted-foreground text-sm">
          Create a reusable schema with custom fields for a lead source or channel.
        </p>
      </div>

      <CreateCampaignTypeForm />
    </main>
  );
}
