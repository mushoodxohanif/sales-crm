"use client";

import { CheckIcon, CopyIcon, Loader2Icon, SaveIcon, SparklesIcon } from "lucide-react";
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
import { generateWarmupComment, saveCommentToLead } from "@/lib/actions/linkedin";
import type { LinkedInLeadOption } from "@/lib/data/linkedin";

interface LinkedInCommentFormProps {
  leads: LinkedInLeadOption[];
  geminiConfigured: boolean;
}

export function LinkedInCommentForm({ leads, geminiConfigured }: LinkedInCommentFormProps) {
  const [isGenerating, startGenerateTransition] = useTransition();
  const [isSaving, startSaveTransition] = useTransition();
  const [postText, setPostText] = useState("");
  const [selectedLeadId, setSelectedLeadId] = useState<string>("none");
  const [comment, setComment] = useState("");
  const [copied, setCopied] = useState(false);

  const selectedLead =
    selectedLeadId === "none" ? null : (leads.find((lead) => lead.id === selectedLeadId) ?? null);

  const canSaveToLead = Boolean(selectedLead?.hasConnectionNoteField && comment.trim().length > 0);

  function handleGenerate() {
    startGenerateTransition(async () => {
      const result = await generateWarmupComment({
        postText,
        leadId: selectedLeadId === "none" ? undefined : selectedLeadId,
      });

      if (!result.success) {
        toast.error(result.error);
        return;
      }

      setComment(result.data.comment);
      setCopied(false);
      toast.success("Comment generated");
    });
  }

  async function handleCopy() {
    if (!comment.trim()) {
      return;
    }

    try {
      await navigator.clipboard.writeText(comment);
      setCopied(true);
      toast.success("Copied to clipboard");
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Failed to copy to clipboard");
    }
  }

  function handleSaveToLead() {
    if (!selectedLead || !canSaveToLead) {
      return;
    }

    startSaveTransition(async () => {
      const result = await saveCommentToLead({
        leadId: selectedLead.id,
        comment,
      });

      if (!result.success) {
        toast.error(result.error);
        return;
      }

      toast.success(`Saved to ${selectedLead.title}'s connection note`);
    });
  }

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-4">
      {!geminiConfigured ? (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-amber-900 text-sm dark:border-amber-900 dark:bg-amber-950 dark:text-amber-200">
          GEMINI_API_KEY is not configured. Add it to your environment to generate comments.
        </div>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle>Post</CardTitle>
          <CardDescription>
            Paste the LinkedIn post you want to engage with. The AI will draft a short warmup
            comment in an executive, peer-to-peer tone.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="linkedin-post-text">Post text</Label>
            <Textarea
              id="linkedin-post-text"
              value={postText}
              onChange={(event) => setPostText(event.target.value)}
              placeholder="Paste the LinkedIn post here…"
              rows={6}
              disabled={isGenerating || isSaving}
              className="min-h-32 resize-y"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="linkedin-lead-picker">Lead context (optional)</Label>
            <Select
              value={selectedLeadId}
              onValueChange={setSelectedLeadId}
              disabled={isGenerating || isSaving}
            >
              <SelectTrigger id="linkedin-lead-picker" className="w-full">
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
              When selected, industry and role context from the lead helps tailor the comment
              without naming the person directly.
            </p>
            {selectedLead && !selectedLead.hasConnectionNoteField ? (
              <p className="text-muted-foreground text-xs">
                This campaign type has no Connection Note field, so save-to-lead is unavailable.
              </p>
            ) : null}
          </div>

          <Button
            type="button"
            onClick={handleGenerate}
            disabled={!geminiConfigured || !postText.trim() || isGenerating || isSaving}
            className="gap-1.5"
          >
            {isGenerating ? (
              <Loader2Icon className="size-4 animate-spin" />
            ) : (
              <SparklesIcon className="size-4" />
            )}
            Generate comment
          </Button>
        </CardContent>
      </Card>

      {comment ? (
        <Card>
          <CardHeader>
            <CardTitle>Generated comment</CardTitle>
            <CardDescription>Review, copy, or save to the selected lead.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-lg border bg-muted/20 p-4 text-sm leading-relaxed whitespace-pre-wrap">
              {comment}
            </div>

            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={handleCopy}
                disabled={isGenerating || isSaving}
                className="gap-1.5"
              >
                {copied ? <CheckIcon className="size-4" /> : <CopyIcon className="size-4" />}
                {copied ? "Copied" : "Copy"}
              </Button>

              {canSaveToLead ? (
                <Button
                  type="button"
                  variant="secondary"
                  onClick={handleSaveToLead}
                  disabled={isGenerating || isSaving}
                  className="gap-1.5"
                >
                  {isSaving ? (
                    <Loader2Icon className="size-4 animate-spin" />
                  ) : (
                    <SaveIcon className="size-4" />
                  )}
                  Save to lead
                </Button>
              ) : null}
            </div>
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
