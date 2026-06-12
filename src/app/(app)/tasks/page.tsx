import { auth } from "@/auth";
import { SetPageTitle } from "@/components/page-title";
import { AiTaskQuickAdd } from "@/components/tasks/ai-task-quick-add";
import { CreateTaskForm } from "@/components/tasks/create-task-form";
import { TaskList } from "@/components/tasks/task-list";
import { isGeminiConfigured } from "@/lib/ai/gemini";
import { getTaskLeadOptions, getUserTasks } from "@/lib/data/tasks";

export default async function TasksPage() {
  const session = await auth();
  const userId = session?.user?.id;

  if (!userId) {
    return null;
  }

  const [tasks, leads, geminiConfigured] = await Promise.all([
    getUserTasks(userId),
    getTaskLeadOptions(),
    Promise.resolve(isGeminiConfigured()),
  ]);

  return (
    <main className="flex min-h-0 w-full min-w-0 flex-1 flex-col gap-4 overflow-auto p-4">
      <SetPageTitle title="Tasks" />
      <div className="space-y-1">
        <h1 className="text-lg font-semibold">Tasks</h1>
        <p className="text-muted-foreground text-sm">
          Track outreach activities, create tasks manually, or use AI to turn raw notes into
          actionable items. All tasks shown are yours.
        </p>
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <CreateTaskForm leads={leads} />
        <AiTaskQuickAdd leads={leads} geminiConfigured={geminiConfigured} />
      </div>

      <TaskList tasks={tasks} leads={leads} />
    </main>
  );
}
