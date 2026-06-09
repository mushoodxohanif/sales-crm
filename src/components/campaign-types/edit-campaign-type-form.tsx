"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { FieldBuilder } from "@/components/campaign-types/field-builder";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { updateCampaignType, upsertCampaignTypeFields } from "@/lib/actions/campaign-types";
import { type FieldBuilderValue, fieldBuilderToInput } from "@/lib/campaign-types/fields";

interface EditCampaignTypeFormProps {
  campaignTypeId: string;
  initialName: string;
  initialSlug: string;
  initialDescription: string | null;
  initialFields: FieldBuilderValue[];
  campaignCount: number;
}

export function EditCampaignTypeForm({
  campaignTypeId,
  initialName,
  initialSlug,
  initialDescription,
  initialFields,
  campaignCount,
}: EditCampaignTypeFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [name, setName] = useState(initialName);
  const [slug, setSlug] = useState(initialSlug);
  const [description, setDescription] = useState(initialDescription ?? "");
  const [fields, setFields] = useState<FieldBuilderValue[]>(initialFields);

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    startTransition(async () => {
      const metadataResult = await updateCampaignType({
        id: campaignTypeId,
        name,
        slug,
        description: description || undefined,
      });

      if (!metadataResult.success) {
        toast.error(metadataResult.error);
        return;
      }

      const fieldsResult = await upsertCampaignTypeFields({
        campaignTypeId,
        fields: fields.map(fieldBuilderToInput),
      });

      if (!fieldsResult.success) {
        toast.error(fieldsResult.error);
        return;
      }

      toast.success("Campaign type saved");
      router.refresh();
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      <section className="space-y-4 rounded-xl border bg-card p-6 shadow-xs">
        <div>
          <h2 className="text-base font-medium">Campaign type details</h2>
          <p className="text-muted-foreground text-sm">
            {campaignCount > 0
              ? `Used by ${campaignCount} campaign${campaignCount === 1 ? "" : "s"}. Schema changes apply to all of them.`
              : "Update the name and description for this campaign type."}
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="name">Name</Label>
            <Input
              id="name"
              value={name}
              onChange={(event) => setName(event.target.value)}
              required
              disabled={isPending}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="slug">Slug</Label>
            <Input
              id="slug"
              value={slug}
              onChange={(event) => setSlug(event.target.value)}
              required
              disabled={isPending}
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="description">Description</Label>
          <Textarea
            id="description"
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            disabled={isPending}
            rows={3}
          />
        </div>
      </section>

      <FieldBuilder fields={fields} onChange={setFields} disabled={isPending} />

      <div className="flex items-center justify-end gap-3">
        <Button
          type="button"
          variant="outline"
          onClick={() => router.push("/campaign-types")}
          disabled={isPending}
        >
          Back to list
        </Button>
        <Button type="submit" disabled={isPending}>
          {isPending ? "Saving..." : "Save changes"}
        </Button>
      </div>
    </form>
  );
}
