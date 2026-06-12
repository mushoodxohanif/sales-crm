"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { updateIcpProfile } from "@/lib/actions/icp";
import type { WorkspaceIcpProfileData } from "@/lib/data/icp";

interface IcpSettingsFormProps {
  initialProfile: WorkspaceIcpProfileData;
}

type IcpFormState = {
  productDescription: string;
  targetIndustriesText: string;
  idealEmployeeMin: string;
  idealEmployeeMax: string;
  scoringGuidelines: string;
  exclusionGuidelines: string;
  scoreThresholds: {
    gold: string;
    strong: string;
    mixed: string;
  };
};

function industriesToText(industries: string[]) {
  return industries.join("\n");
}

function textToIndustries(text: string) {
  return text
    .split(/[\n,]+/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function toFormState(profile: WorkspaceIcpProfileData): IcpFormState {
  return {
    productDescription: profile.productDescription,
    targetIndustriesText: industriesToText(profile.targetIndustries),
    idealEmployeeMin: String(profile.idealEmployeeMin),
    idealEmployeeMax: String(profile.idealEmployeeMax),
    scoringGuidelines: profile.scoringGuidelines,
    exclusionGuidelines: profile.exclusionGuidelines,
    scoreThresholds: {
      gold: String(profile.scoreThresholds.gold),
      strong: String(profile.scoreThresholds.strong),
      mixed: String(profile.scoreThresholds.mixed),
    },
  };
}

function formStateSignature(state: IcpFormState) {
  return JSON.stringify(state);
}

export function IcpSettingsForm({ initialProfile }: IcpSettingsFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const initialState = useMemo(() => toFormState(initialProfile), [initialProfile]);
  const [form, setForm] = useState<IcpFormState>(initialState);

  useEffect(() => {
    setForm(toFormState(initialProfile));
  }, [initialProfile]);

  const hasChanges = useMemo(
    () => formStateSignature(form) !== formStateSignature(initialState),
    [form, initialState],
  );

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const idealEmployeeMin = Number.parseInt(form.idealEmployeeMin, 10);
    const idealEmployeeMax = Number.parseInt(form.idealEmployeeMax, 10);
    const gold = Number.parseFloat(form.scoreThresholds.gold);
    const strong = Number.parseFloat(form.scoreThresholds.strong);
    const mixed = Number.parseFloat(form.scoreThresholds.mixed);

    startTransition(async () => {
      const result = await updateIcpProfile({
        productDescription: form.productDescription,
        targetIndustries: textToIndustries(form.targetIndustriesText),
        idealEmployeeMin,
        idealEmployeeMax,
        scoringGuidelines: form.scoringGuidelines,
        exclusionGuidelines: form.exclusionGuidelines,
        scoreThresholds: { gold, strong, mixed },
      });

      if (!result.success) {
        toast.error(result.error);
        return;
      }

      toast.success("ICP profile saved");
      router.refresh();
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <section className="space-y-4 rounded-xl border bg-card p-6 shadow-xs">
        <div>
          <h2 className="text-base font-medium">Product context</h2>
          <p className="text-muted-foreground text-sm">
            Describe what you sell so the ICP engine knows what kind of company to prioritize.
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="product-description">Product description</Label>
          <Textarea
            id="product-description"
            value={form.productDescription}
            onChange={(event) =>
              setForm((current) => ({ ...current, productDescription: event.target.value }))
            }
            disabled={isPending}
            rows={4}
            required
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="target-industries">Target industries</Label>
          <Textarea
            id="target-industries"
            value={form.targetIndustriesText}
            onChange={(event) =>
              setForm((current) => ({ ...current, targetIndustriesText: event.target.value }))
            }
            disabled={isPending}
            rows={5}
            placeholder={"logistics\nfreight brokerage\n3PL"}
            required
          />
          <p className="text-muted-foreground text-xs">
            One industry per line, or comma-separated.
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="ideal-employee-min">Ideal employee minimum</Label>
            <Input
              id="ideal-employee-min"
              type="number"
              min={1}
              value={form.idealEmployeeMin}
              onChange={(event) =>
                setForm((current) => ({ ...current, idealEmployeeMin: event.target.value }))
              }
              disabled={isPending}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="ideal-employee-max">Ideal employee maximum</Label>
            <Input
              id="ideal-employee-max"
              type="number"
              min={1}
              value={form.idealEmployeeMax}
              onChange={(event) =>
                setForm((current) => ({ ...current, idealEmployeeMax: event.target.value }))
              }
              disabled={isPending}
              required
            />
          </div>
        </div>
      </section>

      <section className="space-y-4 rounded-xl border bg-card p-6 shadow-xs">
        <div>
          <h2 className="text-base font-medium">Evaluation rules</h2>
          <p className="text-muted-foreground text-sm">
            These guidelines are injected into the AI prompt when evaluating leads.
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="scoring-guidelines">Scoring guidelines</Label>
          <Textarea
            id="scoring-guidelines"
            value={form.scoringGuidelines}
            onChange={(event) =>
              setForm((current) => ({ ...current, scoringGuidelines: event.target.value }))
            }
            disabled={isPending}
            rows={12}
            required
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="exclusion-guidelines">Exclusion guidelines</Label>
          <Textarea
            id="exclusion-guidelines"
            value={form.exclusionGuidelines}
            onChange={(event) =>
              setForm((current) => ({ ...current, exclusionGuidelines: event.target.value }))
            }
            disabled={isPending}
            rows={8}
            required
          />
        </div>
      </section>

      <section className="space-y-4 rounded-xl border bg-card p-6 shadow-xs">
        <div>
          <h2 className="text-base font-medium">Score thresholds</h2>
          <p className="text-muted-foreground text-sm">
            Minimum scores for gold, strong, and mixed ICP tiers (0–10 scale).
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          <div className="space-y-2">
            <Label htmlFor="threshold-gold">Gold</Label>
            <Input
              id="threshold-gold"
              type="number"
              min={0}
              max={10}
              step={0.1}
              value={form.scoreThresholds.gold}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  scoreThresholds: { ...current.scoreThresholds, gold: event.target.value },
                }))
              }
              disabled={isPending}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="threshold-strong">Strong</Label>
            <Input
              id="threshold-strong"
              type="number"
              min={0}
              max={10}
              step={0.1}
              value={form.scoreThresholds.strong}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  scoreThresholds: { ...current.scoreThresholds, strong: event.target.value },
                }))
              }
              disabled={isPending}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="threshold-mixed">Mixed</Label>
            <Input
              id="threshold-mixed"
              type="number"
              min={0}
              max={10}
              step={0.1}
              value={form.scoreThresholds.mixed}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  scoreThresholds: { ...current.scoreThresholds, mixed: event.target.value },
                }))
              }
              disabled={isPending}
              required
            />
          </div>
        </div>
      </section>

      <div className="flex justify-end">
        <Button type="submit" disabled={isPending || !hasChanges}>
          {isPending ? "Saving..." : "Save ICP profile"}
        </Button>
      </div>
    </form>
  );
}
