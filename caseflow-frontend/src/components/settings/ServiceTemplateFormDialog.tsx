import * as React from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Plus, Trash2, ChevronUp, ChevronDown } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { useCreateServiceTemplate, useUpdateServiceTemplate } from "@/hooks/useDomain";
import { useToast } from "@/components/ui/toast";
import { getApiErrorMessage } from "@/lib/api-client";
import type { ServiceTemplate } from "@/lib/types";

const schema = z.object({
  name: z.string().min(1, "Required"),
  description: z.string().optional(),
  estimatedDays: z.string().optional(),
  defaultPriority: z.enum(["LOW", "NORMAL", "HIGH", "URGENT"]),
});
type Form = z.infer<typeof schema>;

interface ChecklistDraft {
  label: string;
  isMandatory: boolean;
}
interface StageDraft {
  name: string;
  color: string;
  checklistItems: ChecklistDraft[];
}

const STAGE_COLORS = ["#2563eb", "#7c3aed", "#db2777", "#ea580c", "#ca8a04", "#16a34a", "#0891b2", "#1e3a5f"];

function emptyStage(index: number): StageDraft {
  return { name: "", color: STAGE_COLORS[index % STAGE_COLORS.length], checklistItems: [] };
}

export function ServiceTemplateFormDialog({
  open,
  onOpenChange,
  template,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  template?: ServiceTemplate;
}) {
  const isEdit = !!template;
  const { toast } = useToast();
  const createMutation = useCreateServiceTemplate();
  const updateMutation = useUpdateServiceTemplate();
  const [stages, setStages] = React.useState<StageDraft[]>([emptyStage(0)]);
  const [stagesError, setStagesError] = React.useState<string | null>(null);

  const {
    register,
    handleSubmit,
    control,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<Form>({ resolver: zodResolver(schema), defaultValues: { defaultPriority: "NORMAL" } });

  React.useEffect(() => {
    if (!open) return;
    reset({
      name: template?.name ?? "",
      description: template?.description ?? "",
      estimatedDays: template?.estimatedDays ? String(template.estimatedDays) : "",
      defaultPriority: template?.defaultPriority ?? "NORMAL",
    });
    setStages(
      template?.templateStages.length
        ? template.templateStages
            .slice()
            .sort((a, b) => a.order - b.order)
            .map((s) => ({
              name: s.name,
              color: s.color ?? "#1e3a5f",
              checklistItems: s.checklistItems
                .slice()
                .sort((a, b) => a.order - b.order)
                .map((c) => ({ label: c.label, isMandatory: c.isMandatory })),
            }))
        : [emptyStage(0)]
    );
    setStagesError(null);
  }, [open, template, reset]);

  function updateStage(index: number, patch: Partial<StageDraft>) {
    setStages((prev) => prev.map((s, i) => (i === index ? { ...s, ...patch } : s)));
  }
  function addStage() {
    setStages((prev) => [...prev, emptyStage(prev.length)]);
  }
  function removeStage(index: number) {
    setStages((prev) => prev.filter((_, i) => i !== index));
  }
  function moveStage(index: number, dir: -1 | 1) {
    setStages((prev) => {
      const target = index + dir;
      if (target < 0 || target >= prev.length) return prev;
      const next = [...prev];
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  }
  function addChecklistItem(stageIndex: number) {
    setStages((prev) =>
      prev.map((s, i) =>
        i === stageIndex ? { ...s, checklistItems: [...s.checklistItems, { label: "", isMandatory: true }] } : s
      )
    );
  }
  function updateChecklistItem(stageIndex: number, itemIndex: number, patch: Partial<ChecklistDraft>) {
    setStages((prev) =>
      prev.map((s, i) =>
        i === stageIndex
          ? { ...s, checklistItems: s.checklistItems.map((c, j) => (j === itemIndex ? { ...c, ...patch } : c)) }
          : s
      )
    );
  }
  function removeChecklistItem(stageIndex: number, itemIndex: number) {
    setStages((prev) =>
      prev.map((s, i) =>
        i === stageIndex ? { ...s, checklistItems: s.checklistItems.filter((_, j) => j !== itemIndex) } : s
      )
    );
  }

  const onSubmit = async (values: Form) => {
    if (stages.length === 0 || stages.some((s) => !s.name.trim())) {
      setStagesError("Every stage needs a name, and at least one stage is required.");
      return;
    }
    setStagesError(null);

    const payload = {
      name: values.name,
      description: values.description || undefined,
      estimatedDays: values.estimatedDays ? Number(values.estimatedDays) : undefined,
      defaultPriority: values.defaultPriority,
      stages: stages.map((s, i) => ({
        name: s.name,
        order: i,
        color: s.color,
        checklistItems: s.checklistItems
          .filter((c) => c.label.trim())
          .map((c, j) => ({ label: c.label, isMandatory: c.isMandatory, order: j })),
      })),
    };

    try {
      if (isEdit) {
        await updateMutation.mutateAsync({ id: template!.id, data: payload });
        toast({ title: "Service updated", variant: "success" });
      } else {
        await createMutation.mutateAsync(payload);
        toast({ title: "Service created", variant: "success" });
      }
      onOpenChange(false);
    } catch (err) {
      toast({ title: "Couldn't save service", description: getApiErrorMessage(err), variant: "destructive" });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit service" : "New service"}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="name">Service name</Label>
              <Input id="name" placeholder="e.g. Residence Renewal" {...register("name")} />
              {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="description">Description</Label>
              <Textarea id="description" {...register("description")} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="estimatedDays">Estimated days</Label>
              <Input id="estimatedDays" type="number" min="1" {...register("estimatedDays")} />
            </div>
            <div className="space-y-1.5">
              <Label>Default priority</Label>
              <Controller
                control={control}
                name="defaultPriority"
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="LOW">Low</SelectItem>
                      <SelectItem value="NORMAL">Normal</SelectItem>
                      <SelectItem value="HIGH">High</SelectItem>
                      <SelectItem value="URGENT">Urgent</SelectItem>
                    </SelectContent>
                  </Select>
                )}
              />
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label>Workflow stages</Label>
              <Button type="button" variant="outline" size="sm" onClick={addStage}>
                <Plus className="h-4 w-4" /> Add stage
              </Button>
            </div>
            {stagesError && <p className="text-xs text-destructive">{stagesError}</p>}

            <div className="space-y-3">
              {stages.map((stage, si) => (
                <div key={si} className="rounded-lg border border-border p-3 space-y-3">
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={stage.color}
                      onChange={(e) => updateStage(si, { color: e.target.value })}
                      className="h-9 w-9 shrink-0 cursor-pointer rounded border border-input bg-transparent p-0.5"
                      aria-label="Stage color"
                    />
                    <Input
                      placeholder={`Stage ${si + 1} name`}
                      value={stage.name}
                      onChange={(e) => updateStage(si, { name: e.target.value })}
                    />
                    <div className="flex shrink-0 gap-1">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        disabled={si === 0}
                        onClick={() => moveStage(si, -1)}
                        aria-label="Move stage up"
                      >
                        <ChevronUp className="h-4 w-4" />
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        disabled={si === stages.length - 1}
                        onClick={() => moveStage(si, 1)}
                        aria-label="Move stage down"
                      >
                        <ChevronDown className="h-4 w-4" />
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => removeStage(si)}
                        disabled={stages.length === 1}
                        aria-label="Remove stage"
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </div>

                  <div className="space-y-1.5 pl-11">
                    {stage.checklistItems.map((item, ii) => (
                      <div key={ii} className="flex items-center gap-2">
                        <label className="flex shrink-0 items-center gap-1.5 text-xs text-muted-foreground">
                          <Checkbox
                            checked={item.isMandatory}
                            onCheckedChange={(v) => updateChecklistItem(si, ii, { isMandatory: !!v })}
                          />
                          Required
                        </label>
                        <Input
                          placeholder="Checklist item"
                          value={item.label}
                          onChange={(e) => updateChecklistItem(si, ii, { label: e.target.value })}
                          className="h-8"
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 shrink-0"
                          onClick={() => removeChecklistItem(si, ii)}
                          aria-label="Remove checklist item"
                        >
                          <Trash2 className="h-3.5 w-3.5 text-destructive" />
                        </Button>
                      </div>
                    ))}
                    <Button type="button" variant="ghost" size="sm" onClick={() => addChecklistItem(si)}>
                      <Plus className="h-3.5 w-3.5" /> Checklist item
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" isLoading={isSubmitting}>
              {isEdit ? "Save changes" : "Create service"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
