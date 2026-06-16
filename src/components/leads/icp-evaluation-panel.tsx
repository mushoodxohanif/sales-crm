"use client";

import { Loader2Icon, SparklesIcon, Undo2Icon } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { clearLeadIcpEvaluation, evaluateLeadIcp } from "@/lib/actions/icp";
import type { LeadIcpEvaluationClient } from "@/lib/icp/serialization";
import { cn } from "@/lib/utils";
import { formatRelativeTime } from "@/lib/utils/format-relative-time";

interface IcpEvaluationPanelProps {
  leadId: string;
  initialEvaluation?: LeadIcpEvaluationClient | null;
  disabled?: boolean;
  onEvaluated?: (evaluation: LeadIcpEvaluationClient) => void;
  onCleared?: () => void;
}

function formatScore(score: number) {
  return Number.isInteger(score) ? String(score) : score.toFixed(1);
}

function getDecisionBadgeClassName(decision: LeadIcpEvaluationClient["decision"]) {
  switch (decision) {
    case "TARGET":
      return "border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950 dark:text-emerald-200";
    case "MAYBE":
      return "border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-200";
    case "REJECT":
      return "border-red-200 bg-red-50 text-red-800 dark:border-red-900 dark:bg-red-950 dark:text-red-200";
    default:
      return "";
  }
}

function getVerdictLabel(verdict: LeadIcpEvaluationClient["verdict"]) {
  switch (verdict) {
    case "STRONG":
      return "Strong ICP";
    case "MIXED":
      return "Mixed ICP";
    case "NOT_ICP":
      return "Not ICP";
    default:
      return verdict;
  }
}

function getDecisionLabel(decision: LeadIcpEvaluationClient["decision"]) {
  switch (decision) {
    case "TARGET":
      return "Target";
    case "MAYBE":
      return "Maybe";
    case "REJECT":
      return "Reject";
    default:
      return decision;
  }
}

function EvaluationResults({ evaluation }: { evaluation: LeadIcpEvaluationClient }) {
  return (
    <div className="space-y-3 rounded-lg border bg-muted/20 p-3">
      <div className="flex flex-wrap items-center gap-2">
        <Badge variant="outline" className="font-mono tabular-nums">
          {formatScore(evaluation.score)}/10
        </Badge>
        <Badge variant="secondary">{getVerdictLabel(evaluation.verdict)}</Badge>
        <Badge variant="outline" className={getDecisionBadgeClassName(evaluation.decision)}>
          {getDecisionLabel(evaluation.decision)}
        </Badge>
      </div>

      <div className="space-y-1">
        <p className="text-muted-foreground text-xs">Industry</p>
        <p className="text-sm">{evaluation.industry}</p>
      </div>

      {evaluation.reasoning.length > 0 ? (
        <div className="space-y-1">
          <p className="text-muted-foreground text-xs">Reasoning</p>
          <ul className="list-disc space-y-1 pl-4 text-sm">
            {evaluation.reasoning.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </div>
      ) : null}

      {evaluation.painPoints.length > 0 ? (
        <div className="space-y-1">
          <p className="text-muted-foreground text-xs">Pain points</p>
          <ul className="list-disc space-y-1 pl-4 text-sm">
            {evaluation.painPoints.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </div>
      ) : null}

      {evaluation.automationUseCases.length > 0 ? (
        <div className="space-y-1">
          <p className="text-muted-foreground text-xs">Automation use cases</p>
          <ul className="list-disc space-y-1 pl-4 text-sm">
            {evaluation.automationUseCases.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </div>
      ) : null}

      <p className="text-muted-foreground text-[11px]">
        Evaluated {formatRelativeTime(evaluation.createdAt)}
      </p>
    </div>
  );
}

export function IcpEvaluationPanel({
  leadId,
  initialEvaluation = null,
  disabled = false,
  onEvaluated,
  onCleared,
}: IcpEvaluationPanelProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [isClearing, startClearTransition] = useTransition();
  const [instructions, setInstructions] = useState("");
  const [evaluation, setEvaluation] = useState<LeadIcpEvaluationClient | null>(initialEvaluation);

  useEffect(() => {
    setEvaluation(initialEvaluation);
  }, [initialEvaluation]);

  function handleEvaluate() {
    startTransition(async () => {
      const result = await evaluateLeadIcp({
        leadId,
        instructions: instructions.trim() || undefined,
      });

      if (!result.success) {
        toast.error(result.error);
        return;
      }

      setEvaluation(result.data);
      onEvaluated?.(result.data);
      toast.success("ICP evaluation complete");
      router.refresh();
    });
  }

  function handleClear() {
    startClearTransition(async () => {
      const result = await clearLeadIcpEvaluation({ leadId });

      if (!result.success) {
        toast.error(result.error);
        return;
      }

      setEvaluation(null);
      onCleared?.();
      toast.success("ICP evaluation cleared");
      router.refresh();
    });
  }

  const isBusy = isPending || isClearing;

  return (
    <div className="space-y-3 border-b pb-4">
      <div className="flex items-center justify-between gap-2">
        <div>
          <h3 className="font-medium text-sm">ICP evaluation</h3>
          <p className="text-muted-foreground text-xs">
            Score fit against your{" "}
            <Link
              href="/settings/icp"
              className="text-foreground underline-offset-4 hover:underline"
            >
              workspace ICP profile
            </Link>
            .
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-1.5">
          {evaluation ? (
            <Button
              type="button"
              size="sm"
              variant="ghost"
              disabled={disabled || isBusy}
              onClick={handleClear}
              className="gap-1.5 text-muted-foreground"
            >
              {isClearing ? (
                <Loader2Icon className="size-3.5 animate-spin" />
              ) : (
                <Undo2Icon className="size-3.5" />
              )}
              Clear
            </Button>
          ) : null}
          <Button
            type="button"
            size="sm"
            variant={evaluation ? "outline" : "default"}
            disabled={disabled || isBusy}
            onClick={handleEvaluate}
            className="gap-1.5"
          >
            {isPending ? (
              <Loader2Icon className="size-3.5 animate-spin" />
            ) : (
              <SparklesIcon className="size-3.5" />
            )}
            {evaluation ? "Re-evaluate" : "Evaluate ICP"}
          </Button>
        </div>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor={`icp-instructions-${leadId}`} className="text-xs">
          Instructions (optional)
        </Label>
        <Textarea
          id={`icp-instructions-${leadId}`}
          value={instructions}
          onChange={(event) => setInstructions(event.target.value)}
          placeholder="Add evaluation notes, company research, or focus areas for this run…"
          rows={2}
          disabled={disabled || isBusy}
          className="min-h-16 resize-y text-sm"
        />
      </div>

      {evaluation ? (
        <EvaluationResults evaluation={evaluation} />
      ) : (
        <p className={cn("text-muted-foreground text-xs", disabled && "opacity-60")}>
          No evaluation yet. Run ICP evaluation to see score, verdict, and recommended decision.
        </p>
      )}
    </div>
  );
}

export function IcpDecisionBadge({
  evaluation,
  className,
}: {
  evaluation: LeadIcpEvaluationClient;
  className?: string;
}) {
  return (
    <Badge
      variant="outline"
      className={cn(
        "h-4 px-1 font-mono text-[10px] tabular-nums",
        getDecisionBadgeClassName(evaluation.decision),
        className,
      )}
    >
      {formatScore(evaluation.score)} · {getDecisionLabel(evaluation.decision)}
    </Badge>
  );
}
