import * as React from "react";
import { Plus } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { PaymentStatusBadge } from "@/components/status-badges";
import { useCreatePayment } from "@/hooks/useDomain";
import { useToast } from "@/components/ui/toast";
import { getApiErrorMessage } from "@/lib/api-client";
import { formatBHD, formatDate } from "@/lib/utils";
import type { Case } from "@/lib/types";

const METHODS = [
  { value: "cash", label: "Cash" },
  { value: "card", label: "Debit Card" },
  { value: "bank_transfer", label: "Bank Transfer" },
  { value: "benefitpay", label: "BenefitPay" },
  { value: "other", label: "Other" },
];

export function PaymentsPanel({ caseData }: { caseData: Case }) {
  const [amount, setAmount] = React.useState("");
  const [method, setMethod] = React.useState("cash");
  const [invoiceNumber, setInvoiceNumber] = React.useState("");
  const createPayment = useCreatePayment();
  const { toast } = useToast();

  const totalPaid = (caseData.payments ?? []).reduce((sum, p) => sum + Number(p.amount), 0);

  const onAdd = async () => {
    const amt = Number(amount);
    if (!amt || amt <= 0) return;
    try {
      await createPayment.mutateAsync({ caseId: caseData.id, amount: amt, method, invoiceNumber: invoiceNumber || undefined });
      toast({ title: "Payment recorded", variant: "success" });
      setAmount("");
      setInvoiceNumber("");
    } catch (err) {
      toast({ title: "Couldn't record payment", description: getApiErrorMessage(err), variant: "destructive" });
    }
  };

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between space-y-0">
        <CardTitle>Payments</CardTitle>
        <PaymentStatusBadge status={caseData.paymentStatus} />
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-3 gap-4 rounded-lg bg-secondary/60 p-3 text-sm">
          <div>
            <p className="text-muted-foreground">Cost</p>
            <p className="font-tag font-medium">{formatBHD(caseData.caseCost)}</p>
          </div>
          <div>
            <p className="text-muted-foreground">Customer price</p>
            <p className="font-tag font-medium">{formatBHD(caseData.customerPrice)}</p>
          </div>
          <div>
            <p className="text-muted-foreground">Paid</p>
            <p className="font-tag font-medium">{formatBHD(totalPaid)}</p>
          </div>
        </div>

        <div className="flex flex-col gap-2 sm:flex-row">
          <Input placeholder="Amount (BHD)" type="number" step="0.001" value={amount} onChange={(e) => setAmount(e.target.value)} />
          <Select value={method} onValueChange={setMethod}>
            <SelectTrigger className="sm:w-44">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {METHODS.map((m) => (
                <SelectItem key={m.value} value={m.value}>
                  {m.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Input placeholder="Invoice #" value={invoiceNumber} onChange={(e) => setInvoiceNumber(e.target.value)} className="sm:w-32" />
          <Button onClick={onAdd} isLoading={createPayment.isPending}>
            <Plus className="h-4 w-4" /> Record
          </Button>
        </div>

        <div className="space-y-2">
          {(caseData.payments ?? []).length === 0 && <p className="text-sm text-muted-foreground">No payments recorded.</p>}
          {caseData.payments?.map((p) => (
            <div key={p.id} className="flex items-center justify-between rounded-lg border border-border p-3 text-sm">
              <div>
                <p className="font-tag font-medium">{formatBHD(p.amount)}</p>
                <p className="text-xs text-muted-foreground">
                  {p.method.replace(/_/g, " ")} {p.invoiceNumber && `· Inv #${p.invoiceNumber}`}
                </p>
              </div>
              <span className="text-xs text-muted-foreground">{formatDate(p.paidAt ?? p.createdAt)}</span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
