import * as React from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Pencil, Eye, EyeOff, Trash2, KeyRound } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { api, unwrap, getApiErrorMessage } from "@/lib/api-client";
import { formatDateTime } from "@/lib/utils";
import { useToast } from "@/components/ui/toast";
import { useAuth } from "@/contexts/AuthContext";
import { RequireRole, RoleGate } from "@/routes/RoleGate";
import { useServiceTemplates, useSetServiceTemplateActive, useDeleteServiceTemplate, useUploadOfficeLogo } from "@/hooks/useDomain";
import { useUsers, useDeactivateUser, useReactivateUser } from "@/hooks/useUsers";
import { ServiceTemplateFormDialog } from "@/components/settings/ServiceTemplateFormDialog";
import { CreateUserDialog, EditUserDialog, ResetPasswordDialog } from "@/components/settings/UserFormDialog";
import type { ServiceTemplate, StaffUser, OfficeInfo } from "@/lib/types";

interface WorkingHours {
  open: string;
  close: string;
  daysOff: string;
}

function useSetting<T>(key: string, fallback: T) {
  const qc = useQueryClient();
  const { data } = useQuery({
    queryKey: ["settings"],
    queryFn: () => unwrap<Record<string, unknown>>(api.get("/settings")),
  });
  // Callers pass fallback as an inline object literal, which is a new
  // reference on every render. Pinning it in a ref (read once, never
  // updated) keeps `value` referentially stable across renders when the
  // setting has never been saved — otherwise a `useEffect` synced to
  // `value` re-fires every render, permanently resetting any in-progress
  // edit before the user can finish typing.
  const fallbackRef = React.useRef(fallback);
  const value = (data?.[key] as T) ?? fallbackRef.current;

  const save = useMutation({
    mutationFn: (v: T) => api.put("/settings", { key, value: v }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["settings"] }),
  });

  return { value, save };
}

function OfficeInfoTab() {
  const { toast } = useToast();
  const { value, save } = useSetting<OfficeInfo>("office_info", { name: "", phone: "", address: "" });
  const [form, setForm] = React.useState(value);
  React.useEffect(() => setForm(value), [value]);

  const uploadLogo = useUploadOfficeLogo();
  const logoInputRef = React.useRef<HTMLInputElement>(null);

  async function handleLogoSelected(files: FileList | null) {
    const file = files?.[0];
    if (!file) return;
    try {
      await uploadLogo.mutateAsync(file);
      toast({ title: "Logo updated", variant: "success" });
    } catch (err) {
      toast({ title: "Couldn't upload logo", description: getApiErrorMessage(err), variant: "destructive" });
    } finally {
      if (logoInputRef.current) logoInputRef.current.value = "";
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Office information</CardTitle>
        <CardDescription>Shown on printed documents and invoices.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4 max-w-md">
        <div className="space-y-1.5">
          <Label>Logo</Label>
          <div className="flex items-center gap-4">
            <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-border bg-secondary/30">
              {form.logoUrl ? (
                <img src={form.logoUrl} alt="Office logo" className="h-full w-full object-contain" />
              ) : (
                <span className="text-xs text-muted-foreground">None</span>
              )}
            </div>
            <div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                isLoading={uploadLogo.isPending}
                onClick={() => logoInputRef.current?.click()}
              >
                {form.logoUrl ? "Replace logo" : "Upload logo"}
              </Button>
              <p className="mt-1 text-xs text-muted-foreground">PNG, JPG, WEBP or SVG</p>
              <input
                ref={logoInputRef}
                type="file"
                accept=".png,.jpg,.jpeg,.webp,.svg"
                className="hidden"
                onChange={(e) => handleLogoSelected(e.target.files)}
              />
            </div>
          </div>
        </div>
        <div className="space-y-1.5">
          <Label>Office name</Label>
          <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
        </div>
        <div className="space-y-1.5">
          <Label>Phone</Label>
          <Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
        </div>
        <div className="space-y-1.5">
          <Label>Address</Label>
          <Input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />
        </div>
        <Button
          isLoading={save.isPending}
          onClick={async () => {
            try {
              await save.mutateAsync(form);
              toast({ title: "Office information saved", variant: "success" });
            } catch (err) {
              toast({ title: "Couldn't save office information", description: getApiErrorMessage(err), variant: "destructive" });
            }
          }}
        >
          Save changes
        </Button>
      </CardContent>
    </Card>
  );
}

function WorkingHoursTab() {
  const { toast } = useToast();
  const { value, save } = useSetting<WorkingHours>("working_hours", { open: "08:00", close: "17:00", daysOff: "Friday, Saturday" });
  const [form, setForm] = React.useState(value);
  React.useEffect(() => setForm(value), [value]);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Working hours</CardTitle>
        <CardDescription>Used for due-date and deadline calculations.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4 max-w-md">
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label>Opens</Label>
            <Input type="time" value={form.open} onChange={(e) => setForm({ ...form, open: e.target.value })} />
          </div>
          <div className="space-y-1.5">
            <Label>Closes</Label>
            <Input type="time" value={form.close} onChange={(e) => setForm({ ...form, close: e.target.value })} />
          </div>
        </div>
        <div className="space-y-1.5">
          <Label>Days off</Label>
          <Input value={form.daysOff} onChange={(e) => setForm({ ...form, daysOff: e.target.value })} />
        </div>
        <Button
          isLoading={save.isPending}
          onClick={async () => {
            try {
              await save.mutateAsync(form);
              toast({ title: "Working hours saved", variant: "success" });
            } catch (err) {
              toast({ title: "Couldn't save working hours", description: getApiErrorMessage(err), variant: "destructive" });
            }
          }}
        >
          Save changes
        </Button>
      </CardContent>
    </Card>
  );
}

function ServiceTemplatesTab() {
  const { data: templates, isLoading } = useServiceTemplates(false);
  const setActive = useSetServiceTemplateActive();
  const deleteTemplate = useDeleteServiceTemplate();
  const { toast } = useToast();
  const [formOpen, setFormOpen] = React.useState(false);
  const [editing, setEditing] = React.useState<ServiceTemplate | undefined>(undefined);
  const [deleteTarget, setDeleteTarget] = React.useState<ServiceTemplate | null>(null);

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-4 space-y-0">
        <div>
          <CardTitle>Services</CardTitle>
          <CardDescription>
            Workflow templates offered to customers — stages and checklists new cases are created from.
          </CardDescription>
        </div>
        <Button
          size="sm"
          onClick={() => {
            setEditing(undefined);
            setFormOpen(true);
          }}
        >
          <Plus className="h-4 w-4" /> New service
        </Button>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Service</TableHead>
              <TableHead>Stages</TableHead>
              <TableHead>Est. days</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading && (
              <TableRow>
                <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                  Loading…
                </TableCell>
              </TableRow>
            )}
            {!isLoading && templates?.length === 0 && (
              <TableRow>
                <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                  No services yet. Create one to start assigning cases to it.
                </TableCell>
              </TableRow>
            )}
            {templates?.map((t) => (
              <TableRow key={t.id}>
                <TableCell>
                  <p className="font-medium">{t.name}</p>
                  {t.description && <p className="text-xs text-muted-foreground">{t.description}</p>}
                </TableCell>
                <TableCell>{t.templateStages.length}</TableCell>
                <TableCell>{t.estimatedDays ?? "—"}</TableCell>
                <TableCell>
                  <Badge variant={t.isActive ? "success" : "muted"}>{t.isActive ? "Active" : "Inactive"}</Badge>
                </TableCell>
                <TableCell className="text-right">
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label="Edit service"
                    onClick={() => {
                      setEditing(t);
                      setFormOpen(true);
                    }}
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label={t.isActive ? "Deactivate service" : "Activate service"}
                    onClick={async () => {
                      try {
                        await setActive.mutateAsync({ id: t.id, isActive: !t.isActive });
                        toast({ title: t.isActive ? "Service deactivated" : "Service activated", variant: "success" });
                      } catch (err) {
                        toast({ title: "Couldn't update service", description: getApiErrorMessage(err), variant: "destructive" });
                      }
                    }}
                  >
                    {t.isActive ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                  <Button variant="ghost" size="icon" aria-label="Delete service" onClick={() => setDeleteTarget(t)}>
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>

      <ServiceTemplateFormDialog open={formOpen} onOpenChange={setFormOpen} template={editing} />

      <Dialog open={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Delete "{deleteTarget?.name}"?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Existing cases keep their own copy of this workflow and won't be affected — this only removes the
            template from future use.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              isLoading={deleteTemplate.isPending}
              onClick={async () => {
                try {
                  await deleteTemplate.mutateAsync(deleteTarget!.id);
                  toast({ title: "Service deleted", variant: "success" });
                  setDeleteTarget(null);
                } catch (err) {
                  toast({ title: "Couldn't delete service", description: getApiErrorMessage(err), variant: "destructive" });
                }
              }}
            >
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}

function UsersTab() {
  const { user: currentUser } = useAuth();
  const { data: users, isLoading } = useUsers();
  const deactivateUser = useDeactivateUser();
  const reactivateUser = useReactivateUser();
  const { toast } = useToast();
  const [createOpen, setCreateOpen] = React.useState(false);
  const [editing, setEditing] = React.useState<StaffUser | undefined>(undefined);
  const [resetTarget, setResetTarget] = React.useState<StaffUser | undefined>(undefined);

  const canAssignOwner = currentUser?.role === "OWNER";

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-4 space-y-0">
        <div>
          <CardTitle>Users</CardTitle>
          <CardDescription>Staff accounts and their role — a role determines what a user can see and do.</CardDescription>
        </div>
        <Button size="sm" onClick={() => setCreateOpen(true)}>
          <Plus className="h-4 w-4" /> New user
        </Button>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>User</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Last login</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading && (
              <TableRow>
                <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                  Loading…
                </TableCell>
              </TableRow>
            )}
            {!isLoading && users?.length === 0 && (
              <TableRow>
                <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                  No users yet.
                </TableCell>
              </TableRow>
            )}
            {users?.map((u) => {
              const isSelf = u.id === currentUser?.id;
              const isProtectedOwner = u.role === "OWNER" && !canAssignOwner;
              return (
                <TableRow key={u.id}>
                  <TableCell>
                    <p className="font-medium">
                      {u.firstName} {u.lastName} {isSelf && <span className="text-xs text-muted-foreground">(you)</span>}
                    </p>
                    <p className="text-xs text-muted-foreground">{u.email}</p>
                  </TableCell>
                  <TableCell>{u.role.replace(/_/g, " ")}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{formatDateTime(u.lastLoginAt) || "Never"}</TableCell>
                  <TableCell>
                    <Badge variant={u.isActive ? "success" : "muted"}>{u.isActive ? "Active" : "Inactive"}</Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label="Edit user"
                      disabled={isProtectedOwner}
                      onClick={() => setEditing(u)}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label="Reset password"
                      disabled={isProtectedOwner}
                      onClick={() => setResetTarget(u)}
                    >
                      <KeyRound className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label={u.isActive ? "Deactivate user" : "Reactivate user"}
                      disabled={isSelf || isProtectedOwner}
                      onClick={async () => {
                        try {
                          if (u.isActive) {
                            await deactivateUser.mutateAsync(u.id);
                            toast({ title: "User deactivated", variant: "success" });
                          } else {
                            await reactivateUser.mutateAsync(u.id);
                            toast({ title: "User reactivated", variant: "success" });
                          }
                        } catch (err) {
                          toast({ title: "Couldn't update user", description: getApiErrorMessage(err), variant: "destructive" });
                        }
                      }}
                    >
                      {u.isActive ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </Button>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </CardContent>

      <CreateUserDialog open={createOpen} onOpenChange={setCreateOpen} canAssignOwner={canAssignOwner} />
      <EditUserDialog open={!!editing} onOpenChange={(o) => !o && setEditing(undefined)} user={editing} canAssignOwner={canAssignOwner} />
      <ResetPasswordDialog open={!!resetTarget} onOpenChange={(o) => !o && setResetTarget(undefined)} user={resetTarget} />
    </Card>
  );
}

function ProfileTab() {
  const { user, updateMe, changePassword } = useAuth();
  const { toast } = useToast();

  const [profileForm, setProfileForm] = React.useState({ firstName: "", lastName: "", email: "" });
  const [savingProfile, setSavingProfile] = React.useState(false);

  React.useEffect(() => {
    if (user) setProfileForm({ firstName: user.firstName, lastName: user.lastName, email: user.email });
  }, [user]);

  const [passwordForm, setPasswordForm] = React.useState({ currentPassword: "", newPassword: "", confirmPassword: "" });
  const [savingPassword, setSavingPassword] = React.useState(false);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Your profile</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 max-w-md">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="profileFirstName">First name</Label>
              <Input
                id="profileFirstName"
                value={profileForm.firstName}
                onChange={(e) => setProfileForm({ ...profileForm, firstName: e.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="profileLastName">Last name</Label>
              <Input
                id="profileLastName"
                value={profileForm.lastName}
                onChange={(e) => setProfileForm({ ...profileForm, lastName: e.target.value })}
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="profileEmail">Email</Label>
            <Input
              id="profileEmail"
              type="email"
              value={profileForm.email}
              onChange={(e) => setProfileForm({ ...profileForm, email: e.target.value })}
            />
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Role</span>
            <span>{user?.role.replace(/_/g, " ")}</span>
          </div>
          <Button
            isLoading={savingProfile}
            onClick={async () => {
              setSavingProfile(true);
              try {
                await updateMe(profileForm);
                toast({ title: "Profile updated", variant: "success" });
              } catch (err) {
                toast({ title: "Couldn't update profile", description: getApiErrorMessage(err), variant: "destructive" });
              } finally {
                setSavingProfile(false);
              }
            }}
          >
            Save changes
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Change password</CardTitle>
          <CardDescription>You'll be signed out everywhere and need to log in again.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 max-w-md">
          <div className="space-y-1.5">
            <Label htmlFor="currentPassword">Current password</Label>
            <Input
              id="currentPassword"
              type="password"
              value={passwordForm.currentPassword}
              onChange={(e) => setPasswordForm({ ...passwordForm, currentPassword: e.target.value })}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="newPassword">New password</Label>
            <Input
              id="newPassword"
              type="password"
              value={passwordForm.newPassword}
              onChange={(e) => setPasswordForm({ ...passwordForm, newPassword: e.target.value })}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="confirmPassword">Confirm new password</Label>
            <Input
              id="confirmPassword"
              type="password"
              value={passwordForm.confirmPassword}
              onChange={(e) => setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })}
            />
          </div>
          <Button
            isLoading={savingPassword}
            onClick={async () => {
              if (passwordForm.newPassword.length < 8) {
                toast({ title: "New password must be at least 8 characters", variant: "destructive" });
                return;
              }
              if (passwordForm.newPassword !== passwordForm.confirmPassword) {
                toast({ title: "New passwords don't match", variant: "destructive" });
                return;
              }
              setSavingPassword(true);
              try {
                await changePassword(passwordForm);
                toast({ title: "Password changed", description: "Signing you out…", variant: "success" });
              } catch (err) {
                toast({ title: "Couldn't change password", description: getApiErrorMessage(err), variant: "destructive" });
                setSavingPassword(false);
              }
            }}
          >
            Change password
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

export default function SettingsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold">Settings</h1>
        <p className="text-sm text-muted-foreground">Office configuration and your account.</p>
      </div>

      <Tabs defaultValue="profile">
        <TabsList>
          <TabsTrigger value="profile">Profile</TabsTrigger>
          <RoleGate roles={["MANAGER"]}>
            <TabsTrigger value="users">Users</TabsTrigger>
            <TabsTrigger value="services">Services</TabsTrigger>
            <TabsTrigger value="office">Office info</TabsTrigger>
            <TabsTrigger value="hours">Working hours</TabsTrigger>
          </RoleGate>
        </TabsList>
        <TabsContent value="profile">
          <ProfileTab />
        </TabsContent>
        <TabsContent value="users">
          <RequireRole roles={["MANAGER"]}>
            <UsersTab />
          </RequireRole>
        </TabsContent>
        <TabsContent value="services">
          <RequireRole roles={["MANAGER"]}>
            <ServiceTemplatesTab />
          </RequireRole>
        </TabsContent>
        <TabsContent value="office">
          <RequireRole roles={["MANAGER"]}>
            <OfficeInfoTab />
          </RequireRole>
        </TabsContent>
        <TabsContent value="hours">
          <RequireRole roles={["MANAGER"]}>
            <WorkingHoursTab />
          </RequireRole>
        </TabsContent>
      </Tabs>
    </div>
  );
}
