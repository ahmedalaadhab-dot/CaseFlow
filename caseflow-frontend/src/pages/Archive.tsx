import * as React from "react";
import { useNavigate } from "react-router-dom";
import { Search, RotateCcw } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { StatusBadge } from "@/components/status-badges";
import { useCases, useRestoreCase } from "@/hooks/useCases";
import { useToast } from "@/components/ui/toast";
import { useAuth } from "@/contexts/AuthContext";
import { formatDate } from "@/lib/utils";

export default function ArchivePage() {
  const navigate = useNavigate();
  const [search, setSearch] = React.useState("");
  const { data, isLoading } = useCases({ isArchived: true, search: search || undefined, pageSize: 50 });
  const restoreCase = useRestoreCase();
  const { toast } = useToast();
  const { hasRole } = useAuth();

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-semibold">Archive</h1>
        <p className="text-sm text-muted-foreground">Completed cases moved out of active workflows. Still searchable, read-only.</p>
      </div>

      <div className="relative max-w-sm">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input placeholder="Search archived cases…" className="pl-9" value={search} onChange={(e) => setSearch(e.target.value)} />
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Case #</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead>Service</TableHead>
                <TableHead>Archived</TableHead>
                <TableHead>Status</TableHead>
                {hasRole("MANAGER") && <TableHead />}
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                    Loading…
                  </TableCell>
                </TableRow>
              )}
              {!isLoading && data?.items.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                    No archived cases.
                  </TableCell>
                </TableRow>
              )}
              {data?.items.map((c) => (
                <TableRow key={c.id}>
                  <TableCell className="font-tag cursor-pointer" onClick={() => navigate(`/cases/${c.id}`)}>
                    {c.caseNumber}
                  </TableCell>
                  <TableCell className="cursor-pointer" onClick={() => navigate(`/cases/${c.id}`)}>
                    {c.customer?.fullName}
                  </TableCell>
                  <TableCell>{c.serviceTemplate?.name}</TableCell>
                  <TableCell>{formatDate(c.archivedAt)}</TableCell>
                  <TableCell>
                    <StatusBadge status={c.status} />
                  </TableCell>
                  {hasRole("MANAGER") && (
                    <TableCell>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={async () => {
                          await restoreCase.mutateAsync(c.id);
                          toast({ title: "Case restored", variant: "success" });
                        }}
                      >
                        <RotateCcw className="h-4 w-4" /> Restore
                      </Button>
                    </TableCell>
                  )}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
