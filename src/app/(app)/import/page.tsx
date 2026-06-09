import { ImportWizard } from "@/components/import/import-wizard";

export default function ImportPage() {
  return (
    <main className="flex min-h-0 w-full min-w-0 flex-1 flex-col gap-4 overflow-auto p-4">
      <ImportWizard />
    </main>
  );
}
