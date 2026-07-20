import * as React from "react";
import { Check, Circle, Lock } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { useToggleChecklistItem, useAdvanceStage } from "@/hooks/useCases";
import { useToast } from "@/components/ui/toast";
import { getApiErrorMessage } from "@/lib/api-client";
import { cn } from "@/lib/utils";
import type { Case } from "@/lib/types";

export function StagePanel({ caseData }: { caseData: Case }) {
  const stages = [...(caseData.caseStages ?? [])].sort((a, b) => a.order - b.order);
  const toggleItem = useToggleChecklistItem();
  const advanceStage = useAdvanceStage();
  const { toast } = useToast();

  const currentIndex = stages.findIndex((s) => s.id === caseData.currentCaseStageId);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Workflow stages</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {stages.map((stage, i) => {
          const isCurrent = stage.id === caseData.currentCaseStageId;
          const isDone = currentIndex >= 0 && i < currentIndex;
          const isLocked = currentIndex >= 0 && i > currentIndex;
          const mandatoryTotal = stage.checklistItems.filter((c) => c.isMandatory).length;
          const mandatoryDone = stage.checklistItems.filter((c) => c.isMandatory && c.isCompleted).length;
          const progressPct = mandatoryTotal > 0 ? (mandatoryDone / mandatoryTotal) * 100 : 100;
          const canAdvance = isCurrent && mandatoryDone === mandatoryTotal && i < stages.length - 1;

          return (
            <div
              key={stage.id}
              className={cn(
                "rounded-lg border p-4 transition-colors",
                isCurrent ? "border-accent bg-accent/5" : "border-border",
                isLocked && "opacity-50"
              )}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {isDone ? (
                    <Check className="h-4 w-4 text-emerald-600" />
                  ) : isLocked ? (
                    <Lock className="h-4 w-4 text-muted-foreground" />
                  ) : (
                    <Circle className="h-4 w-4 text-accent" />
                  )}
                  <span className="text-sm font-medium" style={{ color: isCurrent ? stage.color ?? undefined : undefined }}>
                    {stage.name}
                  </span>
                </div>
                {mandatoryTotal > 0 && (
                  <span className="text-xs text-muted-foreground">
                    {mandatoryDone}/{mandatoryTotal} required
                  </span>
                )}
              </div>

              {mandatoryTotal > 0 && <Progress value={progressPct} className="mt-2" />}

              {isCurrent && stage.checklistItems.length > 0 && (
                <div className="mt-3 space-y-2 border-t border-border pt-3">
                  {stage.checklistItems.map((item) => (
                    <label key={item.id} className="flex items-center gap-2 text-sm">
                      <Checkbox
                        checked={item.isCompleted}
                        onCheckedChange={(v) =>
                          toggleItem.mutate({ caseId: caseData.id, itemId: item.id, isCompleted: !!v })
                        }
                      />
                      <span className={cn(item.isCompleted && "text-muted-foreground line-through")}>
                        {item.label} {item.isMandatory && <span className="text-destructive">*</span>}
                      </span>
                    </label>
                  ))}
                </div>
              )}

              {isCurrent && i < stages.length - 1 && (
                <Button
                  size="sm"
                  className="mt-3"
                  disabled={!canAdvance}
                  isLoading={advanceStage.isPending}
                  onClick={async () => {
                    try {
                      await advanceStage.mutateAsync({ caseId: caseData.id, targetCaseStageId: stages[i + 1].id });
                      toast({ title: `Moved to "${stages[i + 1].name}"`, variant: "success" });
                    } catch (err) {
                      toast({ title: "Can't advance yet", description: getApiErrorMessage(err), variant: "destructive" });
                    }
                  }}
                >
                  Advance to "{stages[i + 1].name}"
                </Button>
              )}
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
