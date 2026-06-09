"use client";

import {
  AlertCircleIcon,
  CheckCircle2Icon,
  FileSpreadsheetIcon,
  Loader2Icon,
  SparklesIcon,
  UploadIcon,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useState, useTransition } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  analyzeImport,
  commitLeadImportAction,
  getDefaultImportMapping,
  uploadAndParseFile,
} from "@/lib/actions/import";
import { FIELD_TYPE_OPTIONS } from "@/lib/campaign-types/fields";
import type { ImportAnalysis, ImportMatchResult, MatchScore, TypeMatch } from "@/lib/import/types";
import { slugify } from "@/lib/utils/slug";
import type { ImportMappingInput } from "@/lib/validators/import";

type WizardStep = "upload" | "analyze" | "review" | "committing";

const MATCH_BADGE: Record<
  MatchScore,
  { label: string; variant: "default" | "secondary" | "outline" }
> = {
  full: { label: "Exact match", variant: "default" },
  partial: { label: "Partial match", variant: "secondary" },
  none: { label: "No match", variant: "outline" },
};

function MatchBadge({ score }: { score: MatchScore }) {
  const config = MATCH_BADGE[score];
  return <Badge variant={config.variant}>{config.label}</Badge>;
}

function TypeMatchCard({
  match,
  selected,
  onSelect,
}: {
  match: TypeMatch;
  selected: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={`w-full rounded-xl border p-4 text-left transition-colors ${
        selected ? "border-primary bg-primary/5" : "hover:bg-muted/50"
      }`}
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="space-y-1">
          <p className="font-medium">{match.campaignTypeName}</p>
          <p className="text-muted-foreground text-sm">
            {match.mappedFields} of {match.totalFields} fields mapped
            {match.missingRequired.length > 0
              ? ` · missing ${match.missingRequired.join(", ")}`
              : ""}
          </p>
        </div>
        <MatchBadge score={match.score} />
      </div>
      {match.campaigns.length > 0 && (
        <p className="text-muted-foreground mt-2 text-xs">
          Active campaigns: {match.campaigns.map((campaign) => campaign.name).join(", ")}
        </p>
      )}
    </button>
  );
}

export function ImportWizard() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [step, setStep] = useState<WizardStep>("upload");
  const [importId, setImportId] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [rowCount, setRowCount] = useState(0);
  const [analysis, setAnalysis] = useState<ImportAnalysis | null>(null);
  const [matchResult, setMatchResult] = useState<ImportMatchResult | null>(null);
  const [mapping, setMapping] = useState<ImportMappingInput | null>(null);
  const [selectedMatchId, setSelectedMatchId] = useState<string | null>(null);
  const [destinationMode, setDestinationMode] = useState<
    "existing_campaign" | "new_campaign" | "new_type"
  >("new_type");

  const applyMatchSelection = useCallback(
    (match: TypeMatch, mode: "existing_campaign" | "new_campaign") => {
      if (!analysis) {
        return;
      }

      setSelectedMatchId(match.campaignTypeId);
      setDestinationMode(mode);

      if (mode === "existing_campaign" && match.campaigns[0]) {
        setMapping({
          destination: {
            mode: "existing_campaign",
            campaignTypeId: match.campaignTypeId,
            campaignId: match.campaigns[0].id,
          },
          fields: analysis.fields,
          columnMappings: analysis.fields.map((field) => ({
            sourceColumn: field.sourceColumn,
            fieldKey: match.columnMappings[field.sourceColumn] ?? field.key,
          })),
        });
        return;
      }

      setMapping({
        destination: {
          mode: "new_campaign",
          campaignTypeId: match.campaignTypeId,
          campaignName: `${analysis.suggestedTypeName} Import`,
        },
        fields: analysis.fields,
        columnMappings: analysis.fields.map((field) => ({
          sourceColumn: field.sourceColumn,
          fieldKey: match.columnMappings[field.sourceColumn] ?? field.key,
        })),
      });
    },
    [analysis],
  );

  function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    const formData = new FormData();
    formData.append("file", file);

    startTransition(async () => {
      setStep("analyze");

      const uploadResult = await uploadAndParseFile(formData);

      if (!uploadResult.success) {
        toast.error(uploadResult.error);
        setStep("upload");
        return;
      }

      setImportId(uploadResult.data.importId);
      setFileName(uploadResult.data.fileName);
      setRowCount(uploadResult.data.rowCount);

      const analyzeResult = await analyzeImport({ importId: uploadResult.data.importId });

      if (!analyzeResult.success) {
        toast.error(analyzeResult.error);
        setStep("upload");
        return;
      }

      setAnalysis(analyzeResult.data.analysis);
      setMatchResult(analyzeResult.data.matchResult);

      const defaultMappingResult = await getDefaultImportMapping(uploadResult.data.importId);

      if (defaultMappingResult.success) {
        setMapping(defaultMappingResult.data);
        setDestinationMode(defaultMappingResult.data.destination.mode);

        if (analyzeResult.data.matchResult.bestMatch) {
          setSelectedMatchId(analyzeResult.data.matchResult.bestMatch.campaignTypeId);
        }
      }

      setStep("review");
      toast.success("File analyzed successfully");
    });
  }

  function updateField(index: number, patch: Partial<ImportMappingInput["fields"][number]>) {
    if (!mapping) {
      return;
    }

    const fields = [...mapping.fields];
    fields[index] = { ...fields[index], ...patch };
    setMapping({ ...mapping, fields });
  }

  function handleDestinationModeChange(mode: "existing_campaign" | "new_campaign" | "new_type") {
    if (!analysis || !mapping) {
      return;
    }

    setDestinationMode(mode);

    if (mode === "new_type") {
      setSelectedMatchId(null);
      setMapping({
        destination: {
          mode: "new_type",
          typeName: analysis.suggestedTypeName,
          typeSlug: slugify(analysis.suggestedTypeName),
          campaignName: `${analysis.suggestedTypeName} Import`,
        },
        fields: mapping.fields,
        columnMappings: mapping.columnMappings,
      });
      return;
    }

    const match =
      matchResult?.typeMatches.find((item) => item.campaignTypeId === selectedMatchId) ??
      matchResult?.bestMatch;

    if (match && match.score !== "none") {
      applyMatchSelection(match, mode);
    }
  }

  function handleCommit() {
    if (!importId || !mapping) {
      return;
    }

    startTransition(async () => {
      setStep("committing");

      const result = await commitLeadImportAction({
        importId,
        mapping,
      });

      if (!result.success) {
        toast.error(result.error);
        setStep("review");
        return;
      }

      toast.success(`Imported ${rowCount.toLocaleString()} leads`);
      router.push(`/campaigns/${result.data.campaignId}`);
      router.refresh();
    });
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-2 text-sm">
        {(["upload", "analyze", "review"] as const).map((wizardStep, index) => {
          const labels = { upload: "Upload", analyze: "Analyze", review: "Review & import" };
          const active =
            step === wizardStep ||
            (step === "committing" && wizardStep === "review") ||
            (step === "review" && wizardStep !== "upload") ||
            (step === "analyze" && wizardStep === "upload");

          return (
            <div key={wizardStep} className="flex items-center gap-2">
              {index > 0 && <span className="text-muted-foreground">→</span>}
              <span className={active ? "font-medium text-foreground" : "text-muted-foreground"}>
                {labels[wizardStep]}
              </span>
            </div>
          );
        })}
      </div>

      {step === "upload" && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <UploadIcon className="size-5" />
              Upload leads file
            </CardTitle>
            <CardDescription>
              Import up to 5,000 leads from a CSV or XLSX spreadsheet. Column headers are analyzed
              automatically with heuristics and Gemini AI when needed.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <label
              htmlFor="import-file"
              className="flex cursor-pointer flex-col items-center justify-center gap-3 rounded-xl border border-dashed p-10 transition-colors hover:bg-muted/40"
            >
              <FileSpreadsheetIcon className="text-muted-foreground size-10" />
              <div className="text-center">
                <p className="font-medium">Choose a .csv or .xlsx file</p>
                <p className="text-muted-foreground text-sm">Maximum 10 MB</p>
              </div>
              <Input
                id="import-file"
                type="file"
                accept=".csv,.xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,text/csv"
                className="max-w-xs file:bg-background p-0 file:h-[32px] file:px-2 file:mr-4 file:border-r file:border-input"
                disabled={isPending}
                onChange={handleFileChange}
              />
            </label>
          </CardContent>
        </Card>
      )}

      {(step === "analyze" || step === "committing") && (
        <Card>
          <CardContent className="flex items-center gap-3 py-10">
            <Loader2Icon className="size-5 animate-spin" />
            <div>
              <p className="font-medium">
                {step === "analyze" ? "Parsing and analyzing file..." : "Importing leads..."}
              </p>
              <p className="text-muted-foreground text-sm">
                {fileName ? `${fileName} · ${rowCount.toLocaleString()} rows` : "Please wait"}
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {step === "review" && analysis && mapping && (
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CheckCircle2Icon className="size-5 text-green-600" />
                Analysis complete
              </CardTitle>
              <CardDescription className="flex flex-wrap items-center gap-2">
                <span>
                  {fileName} · {rowCount.toLocaleString()} rows · {analysis.fields.length} fields
                  detected
                </span>
                {analysis.usedAI && (
                  <Badge variant="secondary" className="gap-1">
                    <SparklesIcon className="size-3" />
                    Gemini assisted
                  </Badge>
                )}
              </CardDescription>
            </CardHeader>
          </Card>

          {matchResult?.typeMatches.some((match) => match.score !== "none") && (
            <Card>
              <CardHeader>
                <CardTitle>Match existing campaign types</CardTitle>
                <CardDescription>
                  Pick a matched type to add leads to an existing campaign, or create a new one.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {matchResult.typeMatches
                  .filter((match) => match.score !== "none")
                  .map((match) => (
                    <TypeMatchCard
                      key={match.campaignTypeId}
                      match={match}
                      selected={selectedMatchId === match.campaignTypeId}
                      onSelect={() => {
                        if (match.campaigns.length > 0) {
                          applyMatchSelection(match, "existing_campaign");
                          setDestinationMode("existing_campaign");
                        } else {
                          applyMatchSelection(match, "new_campaign");
                          setDestinationMode("new_campaign");
                        }
                      }}
                    />
                  ))}
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader>
              <CardTitle>Destination</CardTitle>
              <CardDescription>Choose where these leads should land.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-wrap gap-2">
                {(
                  [
                    ["existing_campaign", "Add to existing campaign"],
                    ["new_campaign", "Create new campaign"],
                    ["new_type", "Create new type + campaign"],
                  ] as const
                ).map(([mode, label]) => (
                  <Button
                    key={mode}
                    type="button"
                    size="sm"
                    variant={destinationMode === mode ? "default" : "outline"}
                    onClick={() => handleDestinationModeChange(mode)}
                    disabled={
                      mode !== "new_type" &&
                      !matchResult?.typeMatches.some((match) => match.score !== "none")
                    }
                  >
                    {label}
                  </Button>
                ))}
              </div>

              {mapping.destination.mode === "existing_campaign" && (
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Campaign</Label>
                    <Select
                      value={mapping.destination.campaignId}
                      onValueChange={(value) => {
                        if (!value || mapping.destination.mode !== "existing_campaign") return;
                        setMapping({
                          ...mapping,
                          destination: {
                            mode: "existing_campaign",
                            campaignTypeId: mapping.destination.campaignTypeId,
                            campaignId: value,
                          },
                        });
                      }}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Select campaign" />
                      </SelectTrigger>
                      <SelectContent>
                        {matchResult?.typeMatches
                          .find(
                            (match) =>
                              mapping.destination.mode === "existing_campaign" &&
                              match.campaignTypeId === mapping.destination.campaignTypeId,
                          )
                          ?.campaigns.map((campaign) => (
                            <SelectItem key={campaign.id} value={campaign.id}>
                              {campaign.name}
                            </SelectItem>
                          ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              )}

              {mapping.destination.mode === "new_campaign" && (
                <div className="space-y-2">
                  <Label htmlFor="campaignName">New campaign name</Label>
                  <Input
                    id="campaignName"
                    value={mapping.destination.campaignName}
                    onChange={(event) => {
                      if (mapping.destination.mode !== "new_campaign") return;
                      setMapping({
                        ...mapping,
                        destination: {
                          mode: "new_campaign",
                          campaignTypeId: mapping.destination.campaignTypeId,
                          campaignName: event.target.value,
                        },
                      });
                    }}
                  />
                </div>
              )}

              {mapping.destination.mode === "new_type" && (
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="typeName">Campaign type name</Label>
                    <Input
                      id="typeName"
                      value={mapping.destination.typeName}
                      onChange={(event) => {
                        if (mapping.destination.mode !== "new_type") return;
                        setMapping({
                          ...mapping,
                          destination: {
                            mode: "new_type",
                            typeName: event.target.value,
                            typeSlug: slugify(event.target.value),
                            campaignName: mapping.destination.campaignName,
                          },
                        });
                      }}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="newCampaignName">Campaign name</Label>
                    <Input
                      id="newCampaignName"
                      value={mapping.destination.campaignName}
                      onChange={(event) => {
                        if (mapping.destination.mode !== "new_type") return;
                        setMapping({
                          ...mapping,
                          destination: {
                            mode: "new_type",
                            typeName: mapping.destination.typeName,
                            typeSlug: mapping.destination.typeSlug,
                            campaignName: event.target.value,
                          },
                        });
                      }}
                    />
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Field mapping</CardTitle>
              <CardDescription>
                Review inferred fields and map file columns before importing.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>File column</TableHead>
                    <TableHead>Field key</TableHead>
                    <TableHead>Label</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Required</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {mapping.fields.map((field, index) => (
                    <TableRow key={field.sourceColumn}>
                      <TableCell className="font-medium">{field.sourceColumn}</TableCell>
                      <TableCell>
                        <Input
                          value={field.key}
                          onChange={(event) => updateField(index, { key: event.target.value })}
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          value={field.label}
                          onChange={(event) => updateField(index, { label: event.target.value })}
                        />
                      </TableCell>
                      <TableCell>
                        <Select
                          value={field.fieldType}
                          onValueChange={(value) => {
                            if (!value) return;
                            updateField(index, {
                              fieldType: value as ImportMappingInput["fields"][number]["fieldType"],
                            });
                          }}
                        >
                          <SelectTrigger className="w-full min-w-36">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {FIELD_TYPE_OPTIONS.map((option) => (
                              <SelectItem key={option.value} value={option.value}>
                                {option.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell>
                        <Checkbox
                          checked={field.required}
                          onCheckedChange={(checked) =>
                            updateField(index, { required: checked === true })
                          }
                        />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              <div className="rounded-lg border p-4">
                <p className="mb-3 text-sm font-medium">Preview (first rows)</p>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        {analysis.parsed.headers.map((header) => (
                          <TableHead key={header}>{header}</TableHead>
                        ))}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {analysis.parsed.previewRows.map((row) => {
                        const rowKey = analysis.parsed.headers
                          .map((header) => row[header] ?? "")
                          .join("|");

                        return (
                          <TableRow key={rowKey}>
                            {analysis.parsed.headers.map((header) => (
                              <TableCell key={header} className="max-w-48 truncate">
                                {row[header] || "—"}
                              </TableCell>
                            ))}
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="flex items-center justify-between gap-3 rounded-xl border bg-muted/30 p-4">
            <div className="flex items-start gap-2 text-sm">
              <AlertCircleIcon className="text-muted-foreground mt-0.5 size-4 shrink-0" />
              <p className="text-muted-foreground">
                {rowCount.toLocaleString()} leads will be created in the{" "}
                {mapping.destination.mode === "existing_campaign"
                  ? "selected campaign"
                  : mapping.destination.mode === "new_campaign"
                    ? "new campaign"
                    : "new campaign type and campaign"}
                . All leads start in the default pipeline stage.
              </p>
            </div>
            <div className="flex gap-2">
              <Button type="button" variant="outline" onClick={() => setStep("upload")}>
                Upload another file
              </Button>
              <Button type="button" onClick={handleCommit} disabled={isPending}>
                {isPending ? "Importing..." : `Import ${rowCount.toLocaleString()} leads`}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
