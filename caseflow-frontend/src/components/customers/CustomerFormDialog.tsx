import * as React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
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
import { useCreateCustomer, useUpdateCustomer } from "@/hooks/useCustomers";
import { useToast } from "@/components/ui/toast";
import { getApiErrorMessage } from "@/lib/api-client";
import type { Customer } from "@/lib/types";

const schema = z.object({
  fullName: z.string().min(1, "Required"),
  nationality: z.string().optional(),
  cpr: z.string().optional(),
  passportNumber: z.string().optional(),
  gender: z.string().optional(),
  phone: z.string().optional(),
  whatsapp: z.string().optional(),
  email: z.string().email().optional().or(z.literal("")),
  address: z.string().optional(),
  employer: z.string().optional(),
  notes: z.string().optional(),
  ekeyUsername: z.string().optional(),
  ekeyPassword: z.string().optional(),
  molUsername: z.string().optional(),
  molPassword: z.string().optional(),
  tamkeenUsername: z.string().optional(),
  tamkeenPassword: z.string().optional(),
  sioUsername: z.string().optional(),
  sioPassword: z.string().optional(),
});
type Form = z.infer<typeof schema>;

export function CustomerFormDialog({
  open,
  onOpenChange,
  customer,
  onCreated,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  customer?: Customer;
  /** Fires after a successful create (not edit) with the new customer — lets callers like CaseFormDialog auto-select it. */
  onCreated?: (customer: Customer) => void;
}) {
  const isEdit = !!customer;
  const { toast } = useToast();
  const createMutation = useCreateCustomer();
  const updateMutation = useUpdateCustomer();

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<Form>({ resolver: zodResolver(schema) });

  React.useEffect(() => {
    if (open) {
      reset({
        fullName: customer?.fullName ?? "",
        nationality: customer?.nationality ?? "",
        cpr: customer?.cpr ?? "",
        passportNumber: customer?.passportNumber ?? "",
        gender: customer?.gender ?? "",
        phone: customer?.phone ?? "",
        whatsapp: customer?.whatsapp ?? "",
        email: customer?.email ?? "",
        address: customer?.address ?? "",
        employer: customer?.employer ?? "",
        notes: customer?.notes ?? "",
        ekeyUsername: customer?.ekeyUsername ?? "",
        ekeyPassword: customer?.ekeyPassword ?? "",
        molUsername: customer?.molUsername ?? "",
        molPassword: customer?.molPassword ?? "",
        tamkeenUsername: customer?.tamkeenUsername ?? "",
        tamkeenPassword: customer?.tamkeenPassword ?? "",
        sioUsername: customer?.sioUsername ?? "",
        sioPassword: customer?.sioPassword ?? "",
      });
    }
  }, [open, customer, reset]);

  const onSubmit = async (values: Form) => {
    try {
      if (isEdit) {
        await updateMutation.mutateAsync({ id: customer!.id, data: values });
        toast({ title: "Customer updated", variant: "success" });
      } else {
        const created = await createMutation.mutateAsync(values);
        toast({ title: "Customer created", variant: "success" });
        onCreated?.(created);
      }
      onOpenChange(false);
    } catch (err) {
      toast({ title: "Couldn't save customer", description: getApiErrorMessage(err), variant: "destructive" });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit customer" : "New customer"}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="fullName">Full name</Label>
              <Input id="fullName" {...register("fullName")} />
              {errors.fullName && <p className="text-xs text-destructive">{errors.fullName.message}</p>}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="nationality">Nationality</Label>
              <Input id="nationality" {...register("nationality")} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="gender">Gender</Label>
              <Input id="gender" {...register("gender")} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="cpr">CPR / National ID</Label>
              <Input id="cpr" className="font-tag" {...register("cpr")} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="passportNumber">Passport number</Label>
              <Input id="passportNumber" className="font-tag" {...register("passportNumber")} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="phone">Phone</Label>
              <Input id="phone" {...register("phone")} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="whatsapp">WhatsApp number</Label>
              <Input id="whatsapp" {...register("whatsapp")} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" {...register("email")} />
              {errors.email && <p className="text-xs text-destructive">{errors.email.message}</p>}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="employer">Employer</Label>
              <Input id="employer" {...register("employer")} />
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="address">Address</Label>
              <Input id="address" {...register("address")} />
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="notes">Notes</Label>
              <Textarea id="notes" {...register("notes")} />
            </div>
          </div>

          <div className="space-y-3 border-t border-border pt-4">
            <p className="text-sm font-medium">Government portal accounts</p>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="ekeyUsername">eKey username</Label>
                <Input id="ekeyUsername" {...register("ekeyUsername")} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="ekeyPassword">eKey password</Label>
                <Input id="ekeyPassword" {...register("ekeyPassword")} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="molUsername">MoL account username</Label>
                <Input id="molUsername" {...register("molUsername")} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="molPassword">MoL account password</Label>
                <Input id="molPassword" {...register("molPassword")} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="tamkeenUsername">Tamkeen account username</Label>
                <Input id="tamkeenUsername" {...register("tamkeenUsername")} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="tamkeenPassword">Tamkeen account password</Label>
                <Input id="tamkeenPassword" {...register("tamkeenPassword")} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="sioUsername">SIO account username</Label>
                <Input id="sioUsername" {...register("sioUsername")} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="sioPassword">SIO account password</Label>
                <Input id="sioPassword" {...register("sioPassword")} />
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" isLoading={isSubmitting}>
              {isEdit ? "Save changes" : "Create customer"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
