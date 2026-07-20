import * as React from "react";
import { useForm, Controller } from "react-hook-form";
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
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { useCreateUser, useUpdateUser, useResetUserPassword } from "@/hooks/useUsers";
import { useToast } from "@/components/ui/toast";
import { getApiErrorMessage } from "@/lib/api-client";
import type { StaffUser, Role } from "@/lib/types";

const ROLE_OPTIONS: { value: Role; label: string }[] = [
  { value: "OWNER", label: "Owner" },
  { value: "MANAGER", label: "Manager" },
  { value: "EMPLOYEE", label: "Employee" },
  { value: "RECEPTION", label: "Reception" },
  { value: "VIEWER", label: "Viewer" },
];

function RoleSelect({
  value,
  onChange,
  canAssignOwner,
}: {
  value: Role;
  onChange: (v: Role) => void;
  canAssignOwner: boolean;
}) {
  return (
    <Select value={value} onValueChange={(v) => onChange(v as Role)}>
      <SelectTrigger>
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {ROLE_OPTIONS.filter((r) => r.value !== "OWNER" || canAssignOwner).map((r) => (
          <SelectItem key={r.value} value={r.value}>
            {r.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

const createSchema = z.object({
  email: z.string().email("Valid email required"),
  password: z.string().min(8, "At least 8 characters"),
  firstName: z.string().min(1, "Required"),
  lastName: z.string().min(1, "Required"),
  role: z.enum(["OWNER", "MANAGER", "EMPLOYEE", "RECEPTION", "VIEWER"]),
});
type CreateForm = z.infer<typeof createSchema>;

export function CreateUserDialog({
  open,
  onOpenChange,
  canAssignOwner,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  canAssignOwner: boolean;
}) {
  const { toast } = useToast();
  const createMutation = useCreateUser();

  const {
    register,
    handleSubmit,
    control,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<CreateForm>({ resolver: zodResolver(createSchema), defaultValues: { role: "EMPLOYEE" } });

  React.useEffect(() => {
    if (open) reset({ email: "", password: "", firstName: "", lastName: "", role: "EMPLOYEE" });
  }, [open, reset]);

  const onSubmit = async (values: CreateForm) => {
    try {
      await createMutation.mutateAsync(values);
      toast({ title: "User created", variant: "success" });
      onOpenChange(false);
    } catch (err) {
      toast({ title: "Couldn't create user", description: getApiErrorMessage(err), variant: "destructive" });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>New user</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="firstName">First name</Label>
              <Input id="firstName" {...register("firstName")} />
              {errors.firstName && <p className="text-xs text-destructive">{errors.firstName.message}</p>}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="lastName">Last name</Label>
              <Input id="lastName" {...register("lastName")} />
              {errors.lastName && <p className="text-xs text-destructive">{errors.lastName.message}</p>}
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" {...register("email")} />
              {errors.email && <p className="text-xs text-destructive">{errors.email.message}</p>}
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="password">Temporary password</Label>
              <Input id="password" type="text" className="font-tag" {...register("password")} />
              {errors.password && <p className="text-xs text-destructive">{errors.password.message}</p>}
              <p className="text-xs text-muted-foreground">Share this with the user — they can change it after logging in.</p>
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <Label>Role</Label>
              <Controller
                control={control}
                name="role"
                render={({ field }) => (
                  <RoleSelect value={field.value} onChange={field.onChange} canAssignOwner={canAssignOwner} />
                )}
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" isLoading={isSubmitting}>
              Create user
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

const editSchema = z.object({
  firstName: z.string().min(1, "Required"),
  lastName: z.string().min(1, "Required"),
  role: z.enum(["OWNER", "MANAGER", "EMPLOYEE", "RECEPTION", "VIEWER"]),
});
type EditForm = z.infer<typeof editSchema>;

export function EditUserDialog({
  open,
  onOpenChange,
  user,
  canAssignOwner,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user?: StaffUser;
  canAssignOwner: boolean;
}) {
  const { toast } = useToast();
  const updateMutation = useUpdateUser();

  const {
    register,
    handleSubmit,
    control,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<EditForm>({ resolver: zodResolver(editSchema) });

  React.useEffect(() => {
    if (open && user) {
      reset({ firstName: user.firstName, lastName: user.lastName, role: user.role });
    }
  }, [open, user, reset]);

  const onSubmit = async (values: EditForm) => {
    if (!user) return;
    try {
      await updateMutation.mutateAsync({ id: user.id, data: values });
      toast({ title: "User updated", variant: "success" });
      onOpenChange(false);
    } catch (err) {
      toast({ title: "Couldn't update user", description: getApiErrorMessage(err), variant: "destructive" });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Edit user</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="editFirstName">First name</Label>
              <Input id="editFirstName" {...register("firstName")} />
              {errors.firstName && <p className="text-xs text-destructive">{errors.firstName.message}</p>}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="editLastName">Last name</Label>
              <Input id="editLastName" {...register("lastName")} />
              {errors.lastName && <p className="text-xs text-destructive">{errors.lastName.message}</p>}
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <Label>Email</Label>
              <Input value={user?.email ?? ""} disabled />
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <Label>Role</Label>
              <Controller
                control={control}
                name="role"
                render={({ field }) => (
                  <RoleSelect value={field.value} onChange={field.onChange} canAssignOwner={canAssignOwner} />
                )}
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" isLoading={isSubmitting}>
              Save changes
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

const resetSchema = z.object({
  newPassword: z.string().min(8, "At least 8 characters"),
});
type ResetForm = z.infer<typeof resetSchema>;

export function ResetPasswordDialog({
  open,
  onOpenChange,
  user,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user?: StaffUser;
}) {
  const { toast } = useToast();
  const resetMutation = useResetUserPassword();
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<ResetForm>({ resolver: zodResolver(resetSchema) });

  React.useEffect(() => {
    if (open) reset({ newPassword: "" });
  }, [open, reset]);

  const onSubmit = async (values: ResetForm) => {
    if (!user) return;
    try {
      await resetMutation.mutateAsync({ id: user.id, newPassword: values.newPassword });
      toast({ title: "Password reset", description: "The user has been signed out everywhere.", variant: "success" });
      onOpenChange(false);
    } catch (err) {
      toast({ title: "Couldn't reset password", description: getApiErrorMessage(err), variant: "destructive" });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Reset password for {user?.firstName} {user?.lastName}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="newPassword">New temporary password</Label>
            <Input id="newPassword" type="text" className="font-tag" {...register("newPassword")} />
            {errors.newPassword && <p className="text-xs text-destructive">{errors.newPassword.message}</p>}
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" isLoading={isSubmitting}>
              Reset password
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
