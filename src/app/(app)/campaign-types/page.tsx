import { PlusIcon } from "lucide-react";
import Link from "next/link";
import { DeleteCampaignTypeButton } from "@/components/campaign-types/delete-campaign-type-button";
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
import { getCampaignTypes } from "@/lib/data/campaign-types";

export default async function CampaignTypesPage() {
  const campaignTypes = await getCampaignTypes();

  return (
    <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-6 p-6 md:p-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-3xl font-semibold tracking-tight">Campaign types</h1>
          <p className="text-muted-foreground text-sm">
            Define reusable lead schemas for channels like LinkedIn, Facebook, or Hunter.io.
          </p>
        </div>
        <Button asChild>
          <Link href="/campaign-types/new">
            <PlusIcon />
            New campaign type
          </Link>
        </Button>
      </div>

      {campaignTypes.length === 0 ? (
        <div className="rounded-xl border border-dashed p-10 text-center">
          <h2 className="text-lg font-medium">No campaign types yet</h2>
          <p className="text-muted-foreground mx-auto mt-2 max-w-md text-sm">
            Create a campaign type to define the custom fields your leads will use across campaigns.
          </p>
          <Button className="mt-6" asChild>
            <Link href="/campaign-types/new">
              <PlusIcon />
              Create your first campaign type
            </Link>
          </Button>
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
                      <Button variant="outline" size="sm" asChild>
                        <Link href={`/campaign-types/${campaignType.id}`}>Edit</Link>
                      </Button>
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
