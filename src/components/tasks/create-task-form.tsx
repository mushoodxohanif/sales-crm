"use client";

import { Loader2Icon, PlusIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { createTask } from "@/lib/actions/tasks";
import type { TaskLeadOption } from "@/lib/data/tasks";

interface CreateTaskFormProps {
  leads: TaskLeadOption[];
}

export function CreateTaskForm({ leads }: CreateTaskFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [selectedLeadId, setSelectedLeadId] = useState<string>("none");

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    startTransition(async () => {
      const result = await createTask({
        title,
        description,
        leadId: selectedLeadId === "none" ? undefined : selectedLeadId,
      });

      if (!result.success) {
        toast.error(result.error);
        return;
      }

      setTitle("");
      setDescription("");
      setSelectedLeadId("none");
      router.refresh();
      toast.success("Task created");
    });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Add task</CardTitle>
        <CardDescription>Create a task manually with an optional lead link.</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="task-title">Title</Label>
            <Input
              id="task-title"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder="Follow up on LinkedIn warmup"
              disabled={isPending}
              required
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="task-description">Description</Label>
            <Textarea
              id="task-description"
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              placeholder="Brief details about what needs to be done…"
              rows={3}
              disabled={isPending}
              className="min-h-20 resize-y"
              required
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="task-lead-picker">Lead (optional)</Label>
            <Select value={selectedLeadId} onValueChange={setSelectedLeadId} disabled={isPending}>
              <SelectTrigger id="task-lead-picker" className="w-full">
                <SelectValue placeholder="Select a lead" />
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
          </div>

          <Button
            type="submit"
            disabled={isPending || !title.trim() || !description.trim()}
            className="gap-1.5"
          >
            {isPending ? (
              <Loader2Icon className="size-4 animate-spin" />
            ) : (
              <PlusIcon className="size-4" />
            )}
            Add task
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
