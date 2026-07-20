import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatDateTime } from "@/lib/utils";
import type { TimelineEvent } from "@/lib/types";
import { Activity } from "lucide-react";

export function TimelinePanel({ events }: { events: TimelineEvent[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Timeline</CardTitle>
      </CardHeader>
      <CardContent>
        {events.length === 0 && <p className="text-sm text-muted-foreground">No activity yet.</p>}
        <ol className="space-y-4">
          {events.map((event, i) => (
            <li key={event.id} className="flex gap-3">
              <div className="flex flex-col items-center">
                <span className="flex h-7 w-7 items-center justify-center rounded-full bg-secondary">
                  <Activity className="h-3.5 w-3.5 text-accent" />
                </span>
                {i < events.length - 1 && <span className="mt-1 w-px flex-1 bg-border" />}
              </div>
              <div className="pb-4">
                <p className="text-sm">{event.message}</p>
                <p className="text-xs text-muted-foreground">
                  {formatDateTime(event.createdAt)}
                  {event.actor && ` · ${event.actor.firstName} ${event.actor.lastName}`}
                </p>
              </div>
            </li>
          ))}
        </ol>
      </CardContent>
    </Card>
  );
}
