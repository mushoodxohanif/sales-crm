import { auth } from "@/auth";
import { SetPageTitle } from "@/components/page-title";
import { LinkedInCommentForm } from "@/components/tools/linkedin-comment-form";
import { isGeminiConfigured } from "@/lib/ai/gemini";
import { getLinkedInToolLeadOptions } from "@/lib/data/linkedin";

export default async function LinkedInCommentPage() {
  const session = await auth();
  const userId = session?.user?.id;

  if (!userId) {
    return null;
  }

  const [leads, geminiConfigured] = await Promise.all([
    getLinkedInToolLeadOptions(),
    Promise.resolve(isGeminiConfigured()),
  ]);

  return (
    <main className="flex min-h-0 w-full min-w-0 flex-1 flex-col gap-4 overflow-auto p-4">
      <SetPageTitle title="LinkedIn comment" />
      <div className="space-y-1">
        <h1 className="text-lg font-semibold">LinkedIn warmup comment</h1>
        <p className="text-muted-foreground text-sm">
          Generate short, executive-style LinkedIn comments for post engagement. Optionally link a
          lead for industry context or save the result to their connection note.
        </p>
      </div>

      <LinkedInCommentForm leads={leads} geminiConfigured={geminiConfigured} />
    </main>
  );
}
