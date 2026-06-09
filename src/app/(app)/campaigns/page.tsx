import { PlusIcon } from "lucide-react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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

export default async function CampaignsPage() {
  const campaigns = await getCampaigns();

  return (
    <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-6 p-6 md:p-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-3xl font-semibold tracking-tight">Campaigns</h1>
          <p className="text-muted-foreground text-sm">
            Lead collections with their own pipeline stages, built on a campaign type schema.
          </p>
        </div>
        <Button asChild>
          <Link href="/campaigns/new">
            <PlusIcon />
            New campaign
          </Link>
        </Button>
      </div>

      {campaigns.length === 0 ? (
        <div className="rounded-xl border border-dashed p-10 text-center">
          <h2 className="text-lg font-medium">No campaigns yet</h2>
          <p className="text-muted-foreground mx-auto mt-2 max-w-md text-sm">
            Create a campaign under a campaign type to start collecting and tracking leads through a
            pipeline.
          </p>
          <Button className="mt-6" asChild>
            <Link href="/campaigns/new">
              <PlusIcon />
              Create your first campaign
            </Link>
          </Button>
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
                    <Button variant="outline" size="sm" asChild>
                      <Link href={`/campaigns/${campaign.id}`}>Open</Link>
                    </Button>
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
