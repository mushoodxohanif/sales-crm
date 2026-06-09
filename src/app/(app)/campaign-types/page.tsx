import { PlusIcon } from "lucide-react";
import Link from "next/link";
import { DeleteCampaignTypeButton } from "@/components/campaign-types/delete-campaign-type-button";
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
import { getCampaignTypes } from "@/lib/data/campaign-types";
import { cn } from "@/lib/utils";

export default async function CampaignTypesPage() {
  const campaignTypes = await getCampaignTypes();

  return (
    <main className="flex min-h-0 w-full min-w-0 flex-1 flex-col gap-4 overflow-auto p-4">
      <div className="flex flex-wrap justify-end">
        <Link href="/campaign-types/new" className={buttonVariants()}>
          <PlusIcon />
          New campaign type
        </Link>
      </div>

      {campaignTypes.length === 0 ? (
        <div className="rounded-xl border border-dashed p-10 text-center">
          <h2 className="text-lg font-medium">No campaign types yet</h2>
          <p className="text-muted-foreground mx-auto mt-2 max-w-md text-sm">
            Create a campaign type to define the custom fields your leads will use across campaigns.
          </p>
          <Link href="/campaign-types/new" className={cn(buttonVariants(), "mt-6")}>
            <PlusIcon />
            Create your first campaign type
          </Link>
        </div>
      ) : (
        <div className="rounded-xl border bg-card shadow-xs">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Slug</TableHead>
                <TableHead>Fields</TableHead>
                <TableHead>Campaigns</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {campaignTypes.map((campaignType) => (
                <TableRow key={campaignType.id}>
                  <TableCell>
                    <div className="space-y-1">
                      <Link
                        href={`/campaign-types/${campaignType.id}`}
                        className="font-medium hover:underline"
                      >
                        {campaignType.name}
                      </Link>
                      {campaignType.description ? (
                        <p className="text-muted-foreground max-w-sm truncate text-xs">
                          {campaignType.description}
                        </p>
                      ) : null}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary">{campaignType.slug}</Badge>
                  </TableCell>
                  <TableCell>{campaignType._count.fields}</TableCell>
                  <TableCell>{campaignType._count.campaigns}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Link
                        href={`/campaign-types/${campaignType.id}`}
                        className={buttonVariants({ variant: "outline", size: "sm" })}
                      >
                        Edit
                      </Link>
                      <DeleteCampaignTypeButton
                        id={campaignType.id}
                        name={campaignType.name}
                        campaignCount={campaignType._count.campaigns}
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
