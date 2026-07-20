import * as React from "react";
import { useQuery } from "@tanstack/react-query";
import Papa from "papaparse";
import * as XLSX from "xlsx";
import { Download } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { StatusBadge } from "@/components/status-badges";
import { api, unwrap } from "@/lib/api-client";
import { formatBHD, formatDate } from "@/lib/utils";

function exportCsv(filename: string, rows: Record<string, unknown>[]) {
  const csv = Papa.unparse(rows);
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${filename}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

function exportXlsx(filename: string, rows: Record<string, unknown>[]) {
  const ws = XLSX.utils.json_to_sheet(rows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Report");
  XLSX.writeFile(wb, `${filename}.xlsx`);
}

function ExportButtons({ filename, rows }: { filename: string; rows: Record<string, unknown>[] }) {
  return (
    <div className="flex gap-2">
      <Button variant="outline" size="sm" onClick={() => exportCsv(filename, rows)} disabled={rows.length === 0}>
        <Download className="h-4 w-4" /> CSV
      </Button>
      <Button variant="outline" size="sm" onClick={() => exportXlsx(filename, rows)} disabled={rows.length === 0}>
        <Download className="h-4 w-4" /> Excel
      </Button>
    </div>
  );
}

export default function ReportsPage() {
  const { data: byEmployee } = useQuery({
    queryKey: ["reports", "cases-by-employee"],
    queryFn: () => unwrap<{ employee: string; caseCount: number }[]>(api.get("/reports/cases-by-employee")),
  });
  const { data: revenue } = useQuery({
    queryKey: ["reports", "revenue"],
    queryFn: () => unwrap<{ totalRevenue: number; byMethod: { method: string; total: number }[] }>(api.get("/reports/revenue")),
  });
  const { data: popularity } = useQuery({
    queryKey: ["reports", "service-popularity"],
    queryFn: () => unwrap<{ service: string; caseCount: number }[]>(api.get("/reports/service-popularity")),
  });
  const { data: avgCompletion } = useQuery({
    queryKey: ["reports", "avg-completion"],
    queryFn: () => unwrap<{ averageDays: number; sampleSize: number }>(api.get("/reports/average-completion-time")),
  });
  const { data: overdue } = useQuery({
    queryKey: ["reports", "overdue"],
    queryFn: () => unwrap<any[]>(api.get("/reports/overdue-cases")),
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold">Reports</h1>
        <p className="text-sm text-muted-foreground">Export any table below as CSV or Excel.</p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardContent className="p-5">
            <p className="text-sm text-muted-foreground">Total revenue</p>
            <p className="mt-1 text-2xl font-semibold font-tag">{formatBHD(revenue?.totalRevenue ?? 0)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <p className="text-sm text-muted-foreground">Average completion time</p>
            <p className="mt-1 text-2xl font-semibold font-tag">{avgCompletion?.averageDays ?? 0} days</p>
            <p className="text-xs text-muted-foreground">from {avgCompletion?.sampleSize ?? 0} completed cases</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <p className="text-sm text-muted-foreground">Overdue cases</p>
            <p className="mt-1 text-2xl font-semibold font-tag">{overdue?.length ?? 0}</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex-row items-center justify-between space-y-0">
          <CardTitle>Cases by employee</CardTitle>
          <ExportButtons filename="cases-by-employee" rows={byEmployee ?? []} />
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Employee</TableHead>
                <TableHead>Cases</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {byEmployee?.map((r) => (
                <TableRow key={r.employee}>
                  <TableCell>{r.employee}</TableCell>
                  <TableCell>{r.caseCount}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex-row items-center justify-between space-y-0">
          <CardTitle>Service popularity</CardTitle>
          <ExportButtons filename="service-popularity" rows={popularity ?? []} />
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Service</TableHead>
                <TableHead>Cases</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {popularity?.map((r) => (
                <TableRow key={r.service}>
                  <TableCell>{r.service}</TableCell>
                  <TableCell>{r.caseCount}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex-row items-center justify-between space-y-0">
          <CardTitle>Overdue cases</CardTitle>
          <ExportButtons
            filename="overdue-cases"
            rows={(overdue ?? []).map((c) => ({
              caseNumber: c.caseNumber,
              customer: c.customer?.fullName,
              dueDate: c.dueDate,
              status: c.status,
            }))}
          />
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Case #</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead>Due date</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {overdue?.map((c) => (
                <TableRow key={c.id}>
                  <TableCell className="font-tag">{c.caseNumber}</TableCell>
                  <TableCell>{c.customer?.fullName}</TableCell>
                  <TableCell className="text-destructive">{formatDate(c.dueDate)}</TableCell>
                  <TableCell>
                    <StatusBadge status={c.status} />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
