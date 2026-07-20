import {
  Briefcase,
  UserCheck,
  Landmark,
  Wallet,
  PackageCheck,
  CheckCircle2,
  CalendarCheck,
  AlertTriangle,
  Flame,
  Clock,
} from "lucide-react";
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  LineChart,
  Line,
  CartesianGrid,
} from "recharts";
import { StatCard } from "@/components/dashboard/StatCard";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { useDashboardSummary, useDashboardCharts } from "@/hooks/useDomain";

const STATUS_COLORS: Record<string, string> = {
  NEW: "#64748b",
  IN_PROGRESS: "#2563eb",
  WAITING_FOR_CLIENT: "#d97706",
  WAITING_FOR_GOVERNMENT: "#7c3aed",
  WAITING_FOR_PAYMENT: "#ea580c",
  COMPLETED: "#16a34a",
  CANCELLED: "#dc2626",
  ARCHIVED: "#94a3b8",
};

export default function DashboardPage() {
  const { data: summary, isLoading: summaryLoading } = useDashboardSummary();
  const { data: charts } = useDashboardCharts();

  const s = summary ?? ({} as NonNullable<typeof summary>);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold">Dashboard</h1>
        <p className="text-sm text-muted-foreground">Office activity at a glance.</p>
      </div>

      <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-5">
        <StatCard label="Active Cases" value={s.activeCases ?? 0} icon={Briefcase} accent="text-blue-600" isLoading={summaryLoading} />
        <StatCard label="Waiting for Client" value={s.waitingForClient ?? 0} icon={UserCheck} accent="text-amber-600" isLoading={summaryLoading} />
        <StatCard label="Waiting for Government" value={s.waitingForGovernment ?? 0} icon={Landmark} accent="text-violet-600" isLoading={summaryLoading} />
        <StatCard label="Waiting for Payment" value={s.waitingForPayment ?? 0} icon={Wallet} accent="text-orange-600" isLoading={summaryLoading} />
        <StatCard label="Ready to Deliver" value={s.readyToDeliver ?? 0} icon={PackageCheck} accent="text-cyan-600" isLoading={summaryLoading} />
        <StatCard label="Completed Today" value={s.completedToday ?? 0} icon={CheckCircle2} accent="text-emerald-600" isLoading={summaryLoading} />
        <StatCard label="Completed This Month" value={s.completedThisMonth ?? 0} icon={CalendarCheck} accent="text-emerald-600" isLoading={summaryLoading} />
        <StatCard label="Overdue Cases" value={s.overdueCases ?? 0} icon={AlertTriangle} accent="text-red-600" isLoading={summaryLoading} />
        <StatCard label="Urgent Cases" value={s.urgentCases ?? 0} icon={Flame} accent="text-red-600" isLoading={summaryLoading} />
        <StatCard label="Upcoming Deadlines" value={s.upcomingDeadlines ?? 0} icon={Clock} accent="text-slate-600" isLoading={summaryLoading} />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Cases by Status</CardTitle>
          </CardHeader>
          <CardContent className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={charts?.casesByStatus ?? []}
                  dataKey="count"
                  nameKey="status"
                  innerRadius={55}
                  outerRadius={90}
                  paddingAngle={2}
                >
                  {(charts?.casesByStatus ?? []).map((entry) => (
                    <Cell key={entry.status} fill={STATUS_COLORS[entry.status] ?? "#64748b"} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend wrapperStyle={{ fontSize: 12 }} />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Cases by Service</CardTitle>
          </CardHeader>
          <CardContent className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={charts?.casesByService ?? []} layout="vertical" margin={{ left: 24 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                <XAxis type="number" allowDecimals={false} />
                <YAxis type="category" dataKey="service" width={120} tick={{ fontSize: 12 }} />
                <Tooltip />
                <Bar dataKey="count" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Monthly Completed Cases</CardTitle>
          </CardHeader>
          <CardContent className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={charts?.monthlyCompletedCases ?? []}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
                <Tooltip />
                <Line type="monotone" dataKey="count" stroke="hsl(var(--accent))" strokeWidth={2} dot={{ r: 3 }} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Monthly Revenue (BHD)</CardTitle>
          </CardHeader>
          <CardContent className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={charts?.monthlyRevenue ?? []}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip formatter={(v: number) => `${v.toFixed(3)} BHD`} />
                <Bar dataKey="revenue" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
