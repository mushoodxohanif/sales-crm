"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { FieldBuilder } from "@/components/campaign-types/field-builder";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { createCampaignType } from "@/lib/actions/campaign-types";
import {
  createEmptyField,
  type FieldBuilderValue,
  fieldBuilderToInput,
} from "@/lib/campaign-types/fields";
import { slugify } from "@/lib/utils/slug";

interface CreateCampaignTypeFormProps {
  initialFields?: FieldBuilderValue[];
}

export function CreateCampaignTypeForm({ initialFields = [] }: CreateCampaignTypeFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [slugEdited, setSlugEdited] = useState(false);
  const [description, setDescription] = useState("");
  const [fields, setFields] = useState<FieldBuilderValue[]>(
    initialFields.length > 0 ? initialFields : [createEmptyField(0)],
  );

  function handleNameChange(value: string) {
    setName(value);

    if (!slugEdited) {
      setSlug(slugify(value));
    }
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    startTransition(async () => {
      const result = await createCampaignType({
        name,
        slug,
        description: description || undefined,
        fields: fields.map(fieldBuilderToInput),
      });

      if (!result.success) {
        toast.error(result.error);
        return;
      }

      toast.success("Campaign type created");
      router.push(`/campaign-types/${result.data.id}`);
      router.refresh();
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      <section className="space-y-4 rounded-xl border bg-card p-6 shadow-xs">
        <div>
          <h2 className="text-base font-medium">Campaign type details</h2>
          <p className="text-muted-foreground text-sm">
            Name the channel or source template for this lead schema.
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="name">Name</Label>
            <Input
              id="name"
              value={name}
              onChange={(event) => handleNameChange(event.target.value)}
              placeholder="LinkedIn Outreach"
              required
              disabled={isPending}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="slug">Slug</Label>
            <Input
              id="slug"
              value={slug}
              onChange={(event) => {
                setSlugEdited(true);
                setSlug(event.target.value);
              }}
              placeholder="linkedin-outreach"
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
            placeholder="Leads sourced from LinkedIn connection campaigns."
            disabled={isPending}
            rows={3}
          />
        </div>
      </section>

      <FieldBuilder fields={fields} onChange={setFields} disabled={isPending} />

      <div className="flex items-center justify-end gap-3">
        <Button type="button" variant="outline" onClick={() => router.back()} disabled={isPending}>
          Cancel
        </Button>
        <Button type="submit" disabled={isPending}>
          {isPending ? "Creating..." : "Create campaign type"}
        </Button>
      </div>
    </form>
  );
}
