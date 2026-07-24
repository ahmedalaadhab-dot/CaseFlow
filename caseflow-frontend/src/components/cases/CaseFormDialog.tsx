import * as React from "react";
import { useNavigate } from "react-router-dom";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { UserPlus, Plus } from "lucide-react";
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
import { useCreateCase } from "@/hooks/useCases";
import { useCustomers } from "@/hooks/useCustomers";
import { useServiceTemplates } from "@/hooks/useDomain";
import { useToast } from "@/components/ui/toast";
import { getApiErrorMessage } from "@/lib/api-client";
import { useAuth } from "@/contexts/AuthContext";
import { CustomerFormDialog } from "@/components/customers/CustomerFormDialog";
import { ServiceTemplateFormDialog } from "@/components/settings/ServiceTemplateFormDialog";
import { RECURRENCE_PERIODS, RECURRENCE_PERIOD_LABELS, RECURRENCE_UNITS, RECURRENCE_UNIT_LABELS } from "@/lib/recurrence";
import type { Customer, ServiceTemplate } from "@/lib/types";

// Plain string comparison on "YYYY-MM-DD" avoids new Date(dueDate) vs
// new Date() timezone drift (the former parses as UTC midnight, the
// latter is local time) — lexicographic order matches chronological
// order for this format.
function todayLocalISODate(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

const schema = z
  .object({
    customerId: z.string().min(1, "Select a customer"),
    serviceTemplateId: z.string().min(1, "Select a service"),
    priority: z.enum(["LOW", "NORMAL", "HIGH", "URGENT"]).default("NORMAL"),
    dueDate: z.string().optional(),
    description: z.string().optional(),
    caseCost: z.string().optional(),
    customerPrice: z.string().optional(),
    isRecurring: z.boolean().default(false),
    recurrencePeriod: z.enum(["WEEKLY", "MONTHLY", "QUARTERLY", "BIANNUALLY", "ANNUALLY", "CUSTOM"]).optional(),
    recurrenceCustomValue: z.string().optional(),
    recurrenceCustomUnit: z.enum(["DAYS", "WEEKS", "MONTHS"]).optional(),
  })
  .refine((data) => !data.dueDate || data.dueDate >= todayLocalISODate(), {
    message: "Due date cannot be in the past",
    path: ["dueDate"],
  })
  .refine((data) => !data.caseCost || !data.customerPrice || Number(data.customerPrice) >= Number(data.caseCost), {
    message: "Customer price cannot be less than case cost",
    path: ["customerPrice"],
  })
  .refine((data) => !data.isRecurring || !!data.dueDate, {
    message: "Recurring cases need a due date",
    path: ["dueDate"],
  })
  .refine((data) => !data.isRecurring || !!data.recurrencePeriod, {
    message: "Select a recurrence period",
    path: ["recurrencePeriod"],
  })
  .refine(
    (data) => !data.isRecurring || data.recurrencePeriod !== "CUSTOM" || (!!data.recurrenceCustomValue && !!data.recurrenceCustomUnit),
    { message: "Enter an interval and unit", path: ["recurrenceCustomValue"] }
  );
type Form = z.infer<typeof schema>;

export function CaseFormDialog({
  open,
  onOpenChange,
  presetCustomerId,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  presetCustomerId?: string;
}) {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { hasRole } = useAuth();
  const createMutation = useCreateCase();
  const [customerSearch, setCustomerSearch] = React.useState("");
  const [newCustomerOpen, setNewCustomerOpen] = React.useState(false);
  const [newServiceOpen, setNewServiceOpen] = React.useState(false);
  const { data: customersData } = useCustomers({ search: customerSearch || undefined, pageSize: 20 });
  const { data: templates } = useServiceTemplates();

  const {
    register,
    handleSubmit,
    control,
    reset,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<Form>({
    resolver: zodResolver(schema),
    defaultValues: { priority: "NORMAL", customerId: presetCustomerId ?? "", isRecurring: false },
  });

  React.useEffect(() => {
    if (open) reset({ priority: "NORMAL", customerId: presetCustomerId ?? "", isRecurring: false });
  }, [open, presetCustomerId, reset]);

  const isRecurring = watch("isRecurring");
  const recurrencePeriod = watch("recurrencePeriod");

  const handleCustomerCreated = (customer: Customer) => {
    // Make sure the new customer shows up as a selectable option (Select
    // only knows about items currently rendered in its list) before
    // pointing the form at them.
    setCustomerSearch(customer.fullName);
    setValue("customerId", customer.id, { shouldValidate: true });
  };

  const handleServiceCreated = (template: ServiceTemplate) => {
    setValue("serviceTemplateId", template.id, { shouldValidate: true });
  };

  const onSubmit = async (values: Form) => {
    try {
      const created = await createMutation.mutateAsync({
        customerId: values.customerId,
        serviceTemplateId: values.serviceTemplateId,
        priority: values.priority,
        dueDate: values.dueDate || undefined,
        description: values.description || undefined,
        caseCost: values.caseCost ? Number(values.caseCost) : undefined,
        customerPrice: values.customerPrice ? Number(values.customerPrice) : undefined,
        isRecurring: values.isRecurring,
        recurrencePeriod: values.isRecurring ? values.recurrencePeriod : undefined,
        recurrenceCustomValue:
          values.isRecurring && values.recurrencePeriod === "CUSTOM" ? Number(values.recurrenceCustomValue) : undefined,
        recurrenceCustomUnit: values.isRecurring && values.recurrencePeriod === "CUSTOM" ? values.recurrenceCustomUnit : undefined,
      });
      toast({ title: "Case created", description: created.caseNumber, variant: "success" });
      onOpenChange(false);
      navigate(`/cases/${created.id}`);
    } catch (err) {
      toast({ title: "Couldn't create case", description: getApiErrorMessage(err), variant: "destructive" });
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>New case</DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label>Customer</Label>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-auto py-0.5 text-xs text-accent"
                  onClick={() => setNewCustomerOpen(true)}
                >
                  <UserPlus className="h-3.5 w-3.5" /> New customer
                </Button>
              </div>
              <Controller
                control={control}
                name="customerId"
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select customer" />
                    </SelectTrigger>
                    <SelectContent>
                      <div className="p-2">
                        <Input
                          placeholder="Search…"
                          value={customerSearch}
                          onChange={(e) => setCustomerSearch(e.target.value)}
                          onKeyDown={(e) => e.stopPropagation()}
                        />
                      </div>
                      {customersData?.items.map((c) => (
                        <SelectItem key={c.id} value={c.id}>
                          {c.fullName} {c.cpr ? `· ${c.cpr}` : ""}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
              {errors.customerId && <p className="text-xs text-destructive">{errors.customerId.message}</p>}
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label>Service</Label>
                {hasRole("MANAGER") && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-auto py-0.5 text-xs text-accent"
                    onClick={() => setNewServiceOpen(true)}
                  >
                    <Plus className="h-3.5 w-3.5" /> New service
                  </Button>
                )}
              </div>
              <Controller
                control={control}
                name="serviceTemplateId"
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select service" />
                    </SelectTrigger>
                    <SelectContent>
                      {templates?.map((t) => (
                        <SelectItem key={t.id} value={t.id}>
                          {t.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
              {errors.serviceTemplateId && <p className="text-xs text-destructive">{errors.serviceTemplateId.message}</p>}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Priority</Label>
                <Controller
                  control={control}
                  name="priority"
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
              <div className="space-y-1.5">
                <Label htmlFor="dueDate">Due date</Label>
                <Input id="dueDate" type="date" min={todayLocalISODate()} {...register("dueDate")} />
                {errors.dueDate && <p className="text-xs text-destructive">{errors.dueDate.message}</p>}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="caseCost">Case cost (BHD)</Label>
                <Input id="caseCost" type="number" step="0.001" min="0" {...register("caseCost")} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="customerPrice">Customer price (BHD)</Label>
                <Input id="customerPrice" type="number" step="0.001" min="0" {...register("customerPrice")} />
                {errors.customerPrice && <p className="text-xs text-destructive">{errors.customerPrice.message}</p>}
              </div>
            </div>

            <div className="space-y-3 rounded-lg border border-border p-3">
              <div className="flex items-center gap-2">
                <Controller
                  control={control}
                  name="isRecurring"
                  render={({ field }) => (
                    <Checkbox id="isRecurring" checked={field.value} onCheckedChange={(v) => field.onChange(!!v)} />
                  )}
                />
                <Label htmlFor="isRecurring" className="cursor-pointer font-normal">
                  Recurring case
                </Label>
              </div>

              {isRecurring && (
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label>Recurrence period</Label>
                    <Controller
                      control={control}
                      name="recurrencePeriod"
                      render={({ field }) => (
                        <Select value={field.value} onValueChange={field.onChange}>
                          <SelectTrigger>
                            <SelectValue placeholder="Select period" />
                          </SelectTrigger>
                          <SelectContent>
                            {RECURRENCE_PERIODS.map((p) => (
                              <SelectItem key={p} value={p}>
                                {RECURRENCE_PERIOD_LABELS[p]}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )}
                    />
                    {errors.recurrencePeriod && <p className="text-xs text-destructive">{errors.recurrencePeriod.message}</p>}
                  </div>

                  {recurrencePeriod === "CUSTOM" && (
                    <div className="space-y-1.5">
                      <Label htmlFor="recurrenceCustomValue">Repeat every</Label>
                      <div className="flex gap-2">
                        <Input
                          id="recurrenceCustomValue"
                          type="number"
                          min="1"
                          className="w-20"
                          {...register("recurrenceCustomValue")}
                        />
                        <Controller
                          control={control}
                          name="recurrenceCustomUnit"
                          render={({ field }) => (
                            <Select value={field.value} onValueChange={field.onChange}>
                              <SelectTrigger>
                                <SelectValue placeholder="Unit" />
                              </SelectTrigger>
                              <SelectContent>
                                {RECURRENCE_UNITS.map((u) => (
                                  <SelectItem key={u} value={u}>
                                    {RECURRENCE_UNIT_LABELS[u]}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          )}
                        />
                      </div>
                      {errors.recurrenceCustomValue && (
                        <p className="text-xs text-destructive">{errors.recurrenceCustomValue.message}</p>
                      )}
                    </div>
                  )}
                </div>
              )}

              {isRecurring && !watch("dueDate") && (
                <p className="text-xs text-muted-foreground">
                  Set a due date above — recurring cases use it to know when to generate the next one.
                </p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="description">Description</Label>
              <Textarea id="description" {...register("description")} />
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit" isLoading={isSubmitting}>
                Create case
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <CustomerFormDialog open={newCustomerOpen} onOpenChange={setNewCustomerOpen} onCreated={handleCustomerCreated} />
      {hasRole("MANAGER") && (
        <ServiceTemplateFormDialog open={newServiceOpen} onOpenChange={setNewServiceOpen} onCreated={handleServiceCreated} />
      )}
    </>
  );
}
