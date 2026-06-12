"use client";

import { Loader2Icon, MoreHorizontalIcon, PencilIcon, Trash2Icon } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
import type { TaskStatus } from "@/generated/prisma/client";
import { deleteTask, updateTask, updateTaskStatus } from "@/lib/actions/tasks";
import type { TaskLeadOption, TaskListItem } from "@/lib/data/tasks";

const STATUS_COLUMNS: Array<{ status: TaskStatus; label: string }> = [
  { status: "TODO", label: "To do" },
  { status: "IN_PROGRESS", label: "In progress" },
  { status: "DONE", label: "Done" },
];

interface TaskListProps {
  tasks: TaskListItem[];
  leads: TaskLeadOption[];
}

export function TaskList({ tasks, leads }: TaskListProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [editingTask, setEditingTask] = useState<TaskListItem | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editLeadId, setEditLeadId] = useState<string>("none");

  const tasksByStatus = useMemo(() => {
    const grouped: Record<TaskStatus, TaskListItem[]> = {
      TODO: [],
      IN_PROGRESS: [],
      DONE: [],
    };

    for (const task of tasks) {
      grouped[task.status].push(task);
    }

    return grouped;
  }, [tasks]);

  function openEditDialog(task: TaskListItem) {
    setEditingTask(task);
    setEditTitle(task.title);
    setEditDescription(task.description);
    setEditLeadId(task.leadId ?? "none");
  }

  function closeEditDialog() {
    setEditingTask(null);
    setEditTitle("");
    setEditDescription("");
    setEditLeadId("none");
  }

  function handleStatusChange(taskId: string, status: TaskStatus) {
    startTransition(async () => {
      const result = await updateTaskStatus({ id: taskId, status });

      if (!result.success) {
        toast.error(result.error);
        return;
      }

      router.refresh();
    });
  }

  function handleDelete(taskId: string) {
    startTransition(async () => {
      const result = await deleteTask({ id: taskId });

      if (!result.success) {
        toast.error(result.error);
        return;
      }

      router.refresh();
      toast.success("Task deleted");
    });
  }

  function handleEditSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!editingTask) {
      return;
    }

    startTransition(async () => {
      const result = await updateTask({
        id: editingTask.id,
        title: editTitle,
        description: editDescription,
        leadId: editLeadId === "none" ? null : editLeadId,
      });

      if (!result.success) {
        toast.error(result.error);
        return;
      }

      closeEditDialog();
      router.refresh();
      toast.success("Task updated");
    });
  }

  return (
    <>
      <div className="grid gap-4 lg:grid-cols-3">
        {STATUS_COLUMNS.map((column) => {
          const columnTasks = tasksByStatus[column.status];

          return (
            <Card key={column.status} className="min-h-64">
              <CardHeader className="pb-3">
                <CardTitle className="text-base">{column.label}</CardTitle>
                <CardDescription>
                  {columnTasks.length} {columnTasks.length === 1 ? "task" : "tasks"}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {columnTasks.length === 0 ? (
                  <p className="text-muted-foreground text-sm">No tasks yet.</p>
                ) : (
                  columnTasks.map((task) => (
                    <div key={task.id} className="space-y-3 rounded-lg border bg-muted/20 p-3">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0 space-y-1">
                          <p className="font-medium text-sm leading-snug">{task.title}</p>
                          <p className="text-muted-foreground text-sm leading-relaxed whitespace-pre-wrap">
                            {task.description}
                          </p>
                        </div>

                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="size-8 shrink-0"
                              disabled={isPending}
                            >
                              <MoreHorizontalIcon className="size-4" />
                              <span className="sr-only">Task actions</span>
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => openEditDialog(task)}>
                              <PencilIcon className="size-4" />
                              Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              variant="destructive"
                              onClick={() => handleDelete(task.id)}
                            >
                              <Trash2Icon className="size-4" />
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>

                      <div className="flex flex-wrap items-center gap-2">
                        {task.source === "AI_GENERATED" ? (
                          <Badge variant="secondary">AI</Badge>
                        ) : null}

                        {task.leadId && task.leadTitle && task.campaignId ? (
                          <Badge variant="outline" asChild>
                            <Link href={`/campaigns/${task.campaignId}/leads/${task.leadId}`}>
                              {task.leadTitle}
                            </Link>
                          </Badge>
                        ) : null}
                      </div>

                      <div className="space-y-1.5">
                        <Label htmlFor={`task-status-${task.id}`} className="text-xs">
                          Status
                        </Label>
                        <Select
                          value={task.status}
                          onValueChange={(value) =>
                            handleStatusChange(task.id, value as TaskStatus)
                          }
                          disabled={isPending}
                        >
                          <SelectTrigger id={`task-status-${task.id}`} className="w-full">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {STATUS_COLUMNS.map((option) => (
                              <SelectItem key={option.status} value={option.status}>
                                {option.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Dialog open={Boolean(editingTask)} onOpenChange={(open) => !open && closeEditDialog()}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit task</DialogTitle>
            <DialogDescription>Update the task details or linked lead.</DialogDescription>
          </DialogHeader>

          <form onSubmit={handleEditSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="edit-task-title">Title</Label>
              <Input
                id="edit-task-title"
                value={editTitle}
                onChange={(event) => setEditTitle(event.target.value)}
                disabled={isPending}
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="edit-task-description">Description</Label>
              <Textarea
                id="edit-task-description"
                value={editDescription}
                onChange={(event) => setEditDescription(event.target.value)}
                rows={4}
                disabled={isPending}
                className="min-h-24 resize-y"
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="edit-task-lead">Lead (optional)</Label>
              <Select value={editLeadId} onValueChange={setEditLeadId} disabled={isPending}>
                <SelectTrigger id="edit-task-lead" className="w-full">
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

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={closeEditDialog}
                disabled={isPending}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isPending || !editTitle.trim() || !editDescription.trim()}
                className="gap-1.5"
              >
                {isPending ? <Loader2Icon className="size-4 animate-spin" /> : null}
                Save changes
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
