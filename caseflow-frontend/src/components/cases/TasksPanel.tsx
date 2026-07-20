import * as React from "react";
import { Plus } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PriorityBadge } from "@/components/status-badges";
import { useCreateTask, useUpdateTask } from "@/hooks/useDomain";
import { formatDate, cn } from "@/lib/utils";
import type { Task } from "@/lib/types";

export function TasksPanel({ caseId, tasks }: { caseId: string; tasks: Task[] }) {
  const [title, setTitle] = React.useState("");
  const [deadline, setDeadline] = React.useState("");
  const createTask = useCreateTask();
  const updateTask = useUpdateTask();

  const onAdd = async () => {
    if (!title.trim()) return;
    await createTask.mutateAsync({ caseId, title: title.trim(), deadline: deadline || undefined });
    setTitle("");
    setDeadline("");
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Tasks</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex flex-col gap-2 sm:flex-row">
          <Input placeholder="New task…" value={title} onChange={(e) => setTitle(e.target.value)} className="flex-1" />
          <Input type="date" value={deadline} onChange={(e) => setDeadline(e.target.value)} className="sm:w-40" />
          <Button onClick={onAdd} isLoading={createTask.isPending}>
            <Plus className="h-4 w-4" /> Add
          </Button>
        </div>

        <div className="space-y-2">
          {tasks.length === 0 && <p className="text-sm text-muted-foreground">No tasks yet.</p>}
          {tasks.map((task) => (
            <div key={task.id} className="flex items-center justify-between rounded-lg border border-border p-3">
              <label className="flex items-center gap-3">
                <Checkbox
                  checked={task.isCompleted}
                  onCheckedChange={(v) => updateTask.mutate({ id: task.id, caseId, data: { isCompleted: !!v } })}
                />
                <div>
                  <p className={cn("text-sm font-medium", task.isCompleted && "text-muted-foreground line-through")}>
                    {task.title}
                  </p>
                  {task.deadline && <p className="text-xs text-muted-foreground">Due {formatDate(task.deadline)}</p>}
                </div>
              </label>
              <PriorityBadge priority={task.priority} />
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
