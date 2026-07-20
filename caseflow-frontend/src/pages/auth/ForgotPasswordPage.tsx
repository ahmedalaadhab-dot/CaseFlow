import * as React from "react";
import { Link } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { api } from "@/lib/api-client";
import { CheckCircle2 } from "lucide-react";

const schema = z.object({ email: z.string().email() });
type Form = z.infer<typeof schema>;

export default function ForgotPasswordPage() {
  const [sent, setSent] = React.useState(false);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<Form>({ resolver: zodResolver(schema) });

  const onSubmit = async (values: Form) => {
    await api.post("/auth/forgot-password", values);
    setSent(true);
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-primary px-4">
      <div className="w-full max-w-sm rounded-xl border border-white/10 bg-card p-6 shadow-lg">
        <h1 className="mb-1 text-lg font-semibold">Reset your password</h1>
        <p className="mb-5 text-sm text-muted-foreground">
          Enter your email and we'll send you a link to reset your password.
        </p>

        {sent ? (
          <div className="flex items-start gap-2 rounded-md bg-emerald-50 p-3 text-sm text-emerald-800">
            <CheckCircle2 className="h-4 w-4 mt-0.5 shrink-0" />
            If that email exists, a reset link has been sent.
          </div>
        ) : (
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" {...register("email")} />
              {errors.email && <p className="text-xs text-destructive">{errors.email.message}</p>}
            </div>
            <Button type="submit" className="w-full" isLoading={isSubmitting}>
              Send reset link
            </Button>
          </form>
        )}

        <Link to="/login" className="mt-4 block text-center text-sm text-accent hover:underline">
          Back to login
        </Link>
      </div>
    </div>
  );
}
