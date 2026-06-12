"use client";

import { Loader2Icon, SparklesIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { createTaskFromAI } from "@/lib/actions/tasks";
import type { TaskLeadOption } from "@/lib/data/tasks";

interface AiTaskQuickAddProps {
  leads: TaskLeadOption[];
  geminiConfigured: boolean;
}

export function AiTaskQuickAdd({ leads, geminiConfigured }: AiTaskQuickAddProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [rawInput, setRawInput] = useState("");
  const [selectedLeadId, setSelectedLeadId] = useState<string>("none");

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    startTransition(async () => {
      const result = await createTaskFromAI({
        rawInput,
        leadId: selectedLeadId === "none" ? undefined : selectedLeadId,
      });

      if (!result.success) {
        toast.error(result.error);
        return;
      }

      setRawInput("");
      router.refresh();
      toast.success("Task created from activity");
    });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>AI quick-add</CardTitle>
        <CardDescription>
          Paste a raw activity note and let AI format it into a task headline and description.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {!geminiConfigured ? (
          <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-amber-900 text-sm dark:border-amber-900 dark:bg-amber-950 dark:text-amber-200">
            GEMINI_API_KEY is not configured. Add it to your environment to use AI quick-add.
          </div>
        ) : null}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="task-raw-input">Activity</Label>
            <Textarea
              id="task-raw-input"
              value={rawInput}
              onChange={(event) => setRawInput(event.target.value)}
              placeholder="e.g. follow up with Marcus on LinkedIn warmup after his post yesterday"
              rows={4}
              disabled={isPending}
              className="min-h-24 resize-y"
              required
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="ai-task-lead-picker">Lead (optional)</Label>
            <Select value={selectedLeadId} onValueChange={setSelectedLeadId} disabled={isPending}>
              <SelectTrigger id="ai-task-lead-picker" className="w-full">
                <SelectValue placeholder="Select a lead for context" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">No lead</SelectItem>
                {leads.map((lead) => (
                  <SelectItem key={lead.id} value={lead.id}>
                    {lead.title} · {lead.campaignName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-muted-foreground text-xs">
              When selected, lead context helps the AI write a more specific task.
            </p>
          </div>

          <Button
            type="submit"
            disabled={!geminiConfigured || isPending || !rawInput.trim()}
            className="gap-1.5"
          >
            {isPending ? (
              <Loader2Icon className="size-4 animate-spin" />
            ) : (
              <SparklesIcon className="size-4" />
            )}
            Create task with AI
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
