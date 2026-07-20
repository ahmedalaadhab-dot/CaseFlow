import { useParams, useNavigate } from "react-router-dom";
import { Printer, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useCase } from "@/hooks/useCases";
import { useOfficeInfo } from "@/hooks/useDomain";
import { formatBHD, formatDate } from "@/lib/utils";

export default function InvoicePage() {
  const { caseId, paymentId } = useParams<{ caseId: string; paymentId: string }>();
  const navigate = useNavigate();
  const { data: caseData, isLoading } = useCase(caseId);
  const { data: officeInfo } = useOfficeInfo();

  const payment = caseData?.payments?.find((p) => p.id === paymentId);

  if (isLoading || !caseData) {
    return <div className="p-8 text-sm text-muted-foreground">Loading…</div>;
  }

  if (!payment) {
    return (
      <div className="p-8">
        <p className="text-sm text-muted-foreground">Payment not found.</p>
        <Button variant="outline" className="mt-4" onClick={() => navigate(-1)}>
          <ArrowLeft className="h-4 w-4" /> Back
        </Button>
      </div>
    );
  }

  const customer = caseData.customer;

  return (
    <div className="min-h-screen bg-secondary/40 print:bg-white">
      <div className="mx-auto max-w-2xl px-4 py-8 print:max-w-none print:p-0">
        <div className="mb-4 flex items-center justify-between print:hidden">
          <Button variant="outline" size="sm" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-4 w-4" /> Back
          </Button>
          <Button size="sm" onClick={() => window.print()}>
            <Printer className="h-4 w-4" /> Print / Save as PDF
          </Button>
        </div>

        <div className="rounded-xl border border-border bg-card p-10 print:rounded-none print:border-none print:p-0">
          <div className="flex items-start justify-between border-b border-border pb-6">
            <div>
              {/* Company logo renders here once office_info.logoUrl is set — no upload UI for it yet, deliberately deferred. */}
              {officeInfo?.logoUrl && <img src={officeInfo.logoUrl} alt="" className="mb-2 h-12 w-auto object-contain" />}
              <p className="text-lg font-semibold">{officeInfo?.name || "—"}</p>
              {officeInfo?.address && <p className="text-sm text-muted-foreground">{officeInfo.address}</p>}
              {officeInfo?.phone && <p className="text-sm text-muted-foreground">{officeInfo.phone}</p>}
              {/* CR number renders here once office_info.crNumber is set — no input UI for it yet, deliberately deferred. */}
              {officeInfo?.crNumber && <p className="text-xs text-muted-foreground">CR No. {officeInfo.crNumber}</p>}
            </div>
            <div className="text-right">
              <p className="text-2xl font-semibold tracking-tight">INVOICE</p>
              <p className="mt-1 font-tag text-sm text-muted-foreground">#{payment.invoiceNumber ?? "—"}</p>
              <p className="text-sm text-muted-foreground">{formatDate(payment.paidAt ?? payment.createdAt)}</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-6 py-6">
            <div>
              <p className="text-xs font-semibold uppercase text-muted-foreground">Bill to</p>
              <p className="mt-1 font-medium">{customer?.fullName ?? "—"}</p>
              {customer?.cpr && <p className="font-tag text-sm text-muted-foreground">CPR: {customer.cpr}</p>}
              {customer?.passportNumber && (
                <p className="font-tag text-sm text-muted-foreground">Passport: {customer.passportNumber}</p>
              )}
              {customer?.phone && <p className="text-sm text-muted-foreground">{customer.phone}</p>}
              {customer?.address && <p className="text-sm text-muted-foreground">{customer.address}</p>}
            </div>
            <div className="text-right">
              <p className="text-xs font-semibold uppercase text-muted-foreground">Case</p>
              <p className="mt-1 font-tag font-medium">{caseData.caseNumber}</p>
              <p className="text-sm text-muted-foreground">{caseData.serviceTemplate?.name}</p>
            </div>
          </div>

          <table className="w-full border-t border-border text-sm">
            <thead>
              <tr className="text-left text-xs uppercase text-muted-foreground">
                <th className="py-3 font-medium">Description</th>
                <th className="py-3 text-right font-medium">Method</th>
                <th className="py-3 text-right font-medium">Amount</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-t border-border">
                <td className="py-3">
                  {caseData.serviceTemplate?.name ?? "Service"} — {caseData.caseNumber}
                </td>
                <td className="py-3 text-right capitalize">{payment.method.replace(/_/g, " ")}</td>
                <td className="py-3 text-right font-tag">{formatBHD(payment.amount)}</td>
              </tr>
            </tbody>
          </table>

          <div className="mt-4 flex justify-end border-t border-border pt-4">
            <div className="w-48 space-y-1 text-sm">
              <div className="flex justify-between font-medium">
                <span>Total paid</span>
                <span className="font-tag">{formatBHD(payment.amount)}</span>
              </div>
            </div>
          </div>

          <p className="mt-10 text-center text-xs text-muted-foreground">Thank you.</p>
        </div>
      </div>
    </div>
  );
}
