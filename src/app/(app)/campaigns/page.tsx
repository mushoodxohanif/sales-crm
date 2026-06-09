import { PlusIcon } from "lucide-react";
import Link from "next/link";
import { DeleteCampaignButton } from "@/components/campaigns/delete-campaign-button";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { CampaignStatus } from "@/generated/prisma/client";
import { getCampaigns } from "@/lib/data/campaigns";
import { cn } from "@/lib/utils";

export default async function CampaignsPage() {
  const campaigns = await getCampaigns();

  return (
    <main className="flex min-h-0 w-full min-w-0 flex-1 flex-col gap-4 overflow-auto p-4">
      <div className="flex flex-wrap justify-end">
        <Link href="/campaigns/new" className={buttonVariants()}>
          <PlusIcon />
          New campaign
        </Link>
      </div>

      {campaigns.length === 0 ? (
        <div className="rounded-xl border border-dashed p-10 text-center">
          <h2 className="text-lg font-medium">No campaigns yet</h2>
          <p className="text-muted-foreground mx-auto mt-2 max-w-md text-sm">
            Create a campaign under a campaign type to start collecting and tracking leads through a
            pipeline.
          </p>
          <Link href="/campaigns/new" className={cn(buttonVariants(), "mt-6")}>
            <PlusIcon />
            Create your first campaign
          </Link>
        </div>
      ) : (
        <div className="rounded-xl border bg-card shadow-xs">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Stages</TableHead>
                <TableHead>Leads</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {campaigns.map((campaign) => (
                <TableRow key={campaign.id}>
                  <TableCell>
                    <Link
                      href={`/campaigns/${campaign.id}`}
                      className="font-medium hover:underline"
                    >
                      {campaign.name}
                    </Link>
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary">{campaign.campaignType.name}</Badge>
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={campaign.status === CampaignStatus.ACTIVE ? "default" : "outline"}
                    >
                      {campaign.status === CampaignStatus.ACTIVE ? "Active" : "Archived"}
                    </Badge>
                  </TableCell>
                  <TableCell>{campaign._count.stages}</TableCell>
                  <TableCell>{campaign._count.leads}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Link
                        href={`/campaigns/${campaign.id}`}
                        className={buttonVariants({ variant: "outline", size: "sm" })}
                      >
                        Open
                      </Link>
                      <DeleteCampaignButton
                        id={campaign.id}
                        name={campaign.name}
                        leadCount={campaign._count.leads}
                        size="sm"
                      />
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </main>
  );
}
