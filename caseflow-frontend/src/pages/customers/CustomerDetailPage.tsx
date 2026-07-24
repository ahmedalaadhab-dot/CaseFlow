import * as React from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { ArrowLeft, Pencil, Phone, Mail, MapPin, Briefcase } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { StatusBadge } from "@/components/status-badges";
import { useCustomer } from "@/hooks/useCustomers";
import { CustomerFormDialog } from "@/components/customers/CustomerFormDialog";
import { formatDate, initials } from "@/lib/utils";

export default function CustomerDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: customer, isLoading } = useCustomer(id);
  const [editOpen, setEditOpen] = React.useState(false);

  if (isLoading || !customer) {
    return <p className="text-sm text-muted-foreground">Loading…</p>;
  }

  return (
    <div className="space-y-6">
      <Button variant="ghost" size="sm" onClick={() => navigate("/customers")}>
        <ArrowLeft className="h-4 w-4" /> Back to customers
      </Button>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-1 h-fit">
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <Avatar className="h-14 w-14">
                <AvatarFallback className="text-lg">
                  {initials(...(customer.fullName.split(" ") as [string, string]))}
                </AvatarFallback>
              </Avatar>
              <div>
                <h1 className="text-lg font-semibold">{customer.fullName}</h1>
                <p className="text-sm text-muted-foreground">{customer.nationality}</p>
              </div>
            </div>

            <div className="mt-5 space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">CPR</span>
                <span className="font-tag">{customer.cpr ?? "—"}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Passport</span>
                <span className="font-tag">{customer.passportNumber ?? "—"}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Gender</span>
                <span>{customer.gender ?? "—"}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Date of birth</span>
                <span>{customer.dateOfBirth ? formatDate(customer.dateOfBirth) : "—"}</span>
              </div>
            </div>

            <div className="mt-5 space-y-2 border-t border-border pt-4 text-sm">
              {customer.phone && (
                <div className="flex items-center gap-2">
                  <Phone className="h-4 w-4 text-muted-foreground" /> {customer.phone}
                </div>
              )}
              {customer.email && (
                <div className="flex items-center gap-2">
                  <Mail className="h-4 w-4 text-muted-foreground" /> {customer.email}
                </div>
              )}
              {customer.address && (
                <div className="flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-muted-foreground" /> {customer.address}
                </div>
              )}
              {customer.employer && (
                <div className="flex items-center gap-2">
                  <Briefcase className="h-4 w-4 text-muted-foreground" /> {customer.employer}
                </div>
              )}
            </div>

            {customer.notes && (
              <div className="mt-5 border-t border-border pt-4">
                <p className="text-xs font-medium uppercase text-muted-foreground">Notes</p>
                <p className="mt-1 text-sm">{customer.notes}</p>
              </div>
            )}

            {(customer.ekeyUsername ||
              customer.ekeyPassword ||
              customer.molUsername ||
              customer.molPassword ||
              customer.tamkeenUsername ||
              customer.tamkeenPassword ||
              customer.sioUsername ||
              customer.sioPassword) && (
              <div className="mt-5 space-y-2 border-t border-border pt-4 text-sm">
                <p className="text-xs font-medium uppercase text-muted-foreground">Government portal accounts</p>
                {(customer.ekeyUsername || customer.ekeyPassword) && (
                  <div className="grid grid-cols-2 gap-x-2 gap-y-0.5">
                    <span className="text-muted-foreground">eKey</span>
                    <span />
                    <span className="text-muted-foreground">Username</span>
                    <span className="font-tag">{customer.ekeyUsername ?? "—"}</span>
                    <span className="text-muted-foreground">Password</span>
                    <span className="font-tag">{customer.ekeyPassword ?? "—"}</span>
                  </div>
                )}
                {(customer.molUsername || customer.molPassword) && (
                  <div className="grid grid-cols-2 gap-x-2 gap-y-0.5">
                    <span className="text-muted-foreground">MoL</span>
                    <span />
                    <span className="text-muted-foreground">Username</span>
                    <span className="font-tag">{customer.molUsername ?? "—"}</span>
                    <span className="text-muted-foreground">Password</span>
                    <span className="font-tag">{customer.molPassword ?? "—"}</span>
                  </div>
                )}
                {(customer.tamkeenUsername || customer.tamkeenPassword) && (
                  <div className="grid grid-cols-2 gap-x-2 gap-y-0.5">
                    <span className="text-muted-foreground">Tamkeen</span>
                    <span />
                    <span className="text-muted-foreground">Username</span>
                    <span className="font-tag">{customer.tamkeenUsername ?? "—"}</span>
                    <span className="text-muted-foreground">Password</span>
                    <span className="font-tag">{customer.tamkeenPassword ?? "—"}</span>
                  </div>
                )}
                {(customer.sioUsername || customer.sioPassword) && (
                  <div className="grid grid-cols-2 gap-x-2 gap-y-0.5">
                    <span className="text-muted-foreground">SIO</span>
                    <span />
                    <span className="text-muted-foreground">Username</span>
                    <span className="font-tag">{customer.sioUsername ?? "—"}</span>
                    <span className="text-muted-foreground">Password</span>
                    <span className="font-tag">{customer.sioPassword ?? "—"}</span>
                  </div>
                )}
              </div>
            )}

            <Button variant="outline" className="mt-5 w-full" onClick={() => setEditOpen(true)}>
              <Pencil className="h-4 w-4" /> Edit profile
            </Button>
          </CardContent>
        </Card>

        <Card className="lg:col-span-2 h-fit">
          <CardHeader>
            <CardTitle>Case history ({customer.cases?.length ?? 0})</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {customer.cases?.length === 0 && <p className="text-sm text-muted-foreground">No cases yet.</p>}
            {customer.cases?.map((c) => (
              <Link
                key={c.id}
                to={`/cases/${c.id}`}
                className="flex items-center justify-between rounded-lg border border-border p-3 hover:bg-secondary/50"
              >
                <div>
                  <p className="font-tag text-sm font-medium">{c.caseNumber}</p>
                  <p className="text-xs text-muted-foreground">{c.serviceTemplate?.name}</p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="outline">{formatDate(c.dueDate)}</Badge>
                  <StatusBadge status={c.status} />
                </div>
              </Link>
            ))}
          </CardContent>
        </Card>
      </div>

      <CustomerFormDialog open={editOpen} onOpenChange={setEditOpen} customer={customer} />
    </div>
  );
}
