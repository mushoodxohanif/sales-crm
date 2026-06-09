import { ImportWizard } from "@/components/import/import-wizard";

export default function ImportPage() {
  return (
    <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-8 p-6 md:p-8">
      <div className="space-y-1">
        <h1 className="text-3xl font-semibold tracking-tight">Import leads</h1>
        <p className="text-muted-foreground text-sm">
          Upload a CSV or XLSX file to analyze columns, match existing campaign types, and bulk
          import leads into your CRM.
        </p>
      </div>

      <ImportWizard />
    </main>
  );
}
