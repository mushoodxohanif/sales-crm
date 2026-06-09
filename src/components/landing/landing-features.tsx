import {
  FileSpreadsheetIcon,
  FolderKanbanIcon,
  LayersIcon,
  ShieldCheckIcon,
  SparklesIcon,
  UsersIcon,
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

const features = [
  {
    icon: LayersIcon,
    title: "Campaign types",
    description:
      "Define reusable lead schemas with custom fields — text, email, phone, dates, selects, and more — so every campaign captures the right data.",
  },
  {
    icon: FolderKanbanIcon,
    title: "Campaign pipelines",
    description:
      "Organize leads into campaigns with configurable stages. Track progress from first touch to close with a clear, stage-based workflow.",
  },
  {
    icon: UsersIcon,
    title: "Lead management",
    description:
      "View and update individual leads with full field history. Move prospects between stages as your sales process evolves.",
  },
  {
    icon: FileSpreadsheetIcon,
    title: "Spreadsheet imports",
    description:
      "Upload CSV or XLSX files to bulk-create leads. Review parsed columns, adjust mappings, and commit thousands of rows in one flow.",
  },
  {
    icon: SparklesIcon,
    title: "AI column analysis",
    description:
      "Gemini-powered import analysis suggests field mappings and matches uploaded data to existing campaign types automatically.",
  },
  {
    icon: ShieldCheckIcon,
    title: "Google Workspace access",
    description:
      "Sign in with your company Google account. Restrict access to approved Workspace domains so only your team can use the CRM.",
  },
];

export function LandingFeatures() {
  return (
    <section id="features" className="border-b py-20 md:py-24">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-12 px-6">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-3xl font-semibold tracking-tight text-balance">
            Everything your sales team needs in one place
          </h2>
          <p className="text-muted-foreground mt-3 text-pretty">
            From schema design to bulk imports, Lead&apos;em keeps lead data structured and
            actionable instead of scattered across files and inboxes.
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((feature) => {
            const Icon = feature.icon;

            return (
              <Card key={feature.title} className="bg-card/50">
                <CardHeader>
                  <div className="mb-2 flex size-9 items-center justify-center rounded-lg border bg-muted/50">
                    <Icon className="size-4" />
                  </div>
                  <CardTitle className="text-base">{feature.title}</CardTitle>
                  <CardDescription>{feature.description}</CardDescription>
                </CardHeader>
                <CardContent />
              </Card>
            );
          })}
        </div>
      </div>
    </section>
  );
}
