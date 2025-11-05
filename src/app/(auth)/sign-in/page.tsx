"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import type { AuthApiError } from "@supabase/supabase-js";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { useAuth } from "@/components/providers/auth-provider";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const emailAuthSchema = z.object({
  email: z
    .string({ required_error: "Email is required" })
    .min(1, "Email is required")
    .email("Invalid email address"),
  password: z
    .string({ required_error: "Password is required" })
    .min(6, "Use at least 6 characters"),
});

type EmailAuthForm = z.infer<typeof emailAuthSchema>;

export default function SignInPage() {
  const {
    user,
    loading,
    signInWithGoogle,
    signInWithEmail,
    signUpWithEmail,
    resetPassword,
  } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectTo = searchParams.get("redirectTo") ?? "/app/overview";

  const [mode, setMode] = useState<"sign-in" | "sign-up">("sign-in");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    getValues,
  } = useForm<EmailAuthForm>({
    resolver: zodResolver(emailAuthSchema),
    defaultValues: { email: "", password: "" },
  });

  useEffect(() => {
    if (!loading && user) {
      router.replace(redirectTo);
    }
  }, [loading, redirectTo, router, user]);

  const headline = useMemo(
    () => (mode === "sign-in" ? "Welcome back" : "Create an account"),
    [mode],
  );

  const subline = useMemo(
    () =>
      mode === "sign-in"
        ? "Sign in with Google or your email credentials."
        : "Supabase Auth will provision a workspace account for this email.",
    [mode],
  );

  const handleSupabaseError = (err: unknown) => {
    if (typeof window !== "undefined") {
      console.error(err);
    }

    if (err && typeof err === "object" && "message" in err) {
      const message = String((err as AuthApiError).message ?? "Unknown error");
      if (
        message.toLowerCase().includes("invalid login credentials") ||
        message.toLowerCase().includes("email not confirmed")
      ) {
        return "Check your email and password, then try again.";
      }
      if (message.toLowerCase().includes("already registered")) {
        return "An account with this email already exists. Try signing in instead.";
      }
      return message;
    }
    return "Something went wrong. Please try again.";
  };

  const onSubmit = async (values: EmailAuthForm) => {
    setPending(true);
    setError(null);
    setInfo(null);
    try {
      if (mode === "sign-in") {
        await signInWithEmail(values.email, values.password);
        router.replace(redirectTo);
      } else {
        await signUpWithEmail(values.email, values.password);
        setInfo(
          "Account created. Check your inbox for verification if required, then sign in.",
        );
        setMode("sign-in");
      }
    } catch (err) {
      setError(handleSupabaseError(err));
    } finally {
      setPending(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setPending(true);
    setError(null);
    setInfo(null);
    try {
      await signInWithGoogle(redirectTo);
    } catch (err) {
      setError(handleSupabaseError(err));
    } finally {
      setPending(false);
    }
  };

  const handleResetPassword = async (email: string) => {
    setPending(true);
    setError(null);
    setInfo(null);
    try {
      await resetPassword(email, redirectTo);
      setInfo("Password reset email sent. Check your inbox.");
    } catch (err) {
      setError(handleSupabaseError(err));
    } finally {
      setPending(false);
    }
  };

  const toggleMode = () => {
    setMode((prev) => (prev === "sign-in" ? "sign-up" : "sign-in"));
    setError(null);
    setInfo(null);
    reset({ email: "", password: "" });
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-muted/40 px-6 py-12">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-2 text-center">
          <CardTitle className="text-2xl">{headline}</CardTitle>
          <CardDescription>{subline}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button
            className="w-full"
            onClick={handleGoogleSignIn}
            disabled={pending}
          >
            Continue with Google
          </Button>
          <div className="relative">
            <div className="absolute inset-x-0 top-[-1.5rem] flex items-center justify-center">
              <span className="rounded-full bg-background px-2 text-xs font-medium text-muted-foreground">
                or use email
              </span>
            </div>
            <form
              className="space-y-4 rounded-lg border border-border bg-background/60 p-4"
              onSubmit={handleSubmit(onSubmit)}
            >
              <div className="space-y-2 text-left">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="you@example.com"
                  autoComplete="email"
                  disabled={pending}
                  {...register("email")}
                />
                {errors.email ? (
                  <p className="text-xs text-destructive">{errors.email.message}</p>
                ) : null}
              </div>
              <div className="space-y-2 text-left">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  autoComplete={mode === "sign-up" ? "new-password" : "current-password"}
                  disabled={pending}
                  {...register("password")}
                />
                {errors.password ? (
                  <p className="text-xs text-destructive">
                    {errors.password.message}
                  </p>
                ) : null}
              </div>
              {error ? (
                <div className="rounded-lg border border-destructive/50 bg-destructive/10 px-3 py-2 text-xs text-destructive">
                  {error}
                </div>
              ) : null}
              {info ? (
                <div className="rounded-lg border border-primary/40 bg-primary/10 px-3 py-2 text-xs text-primary">
                  {info}
                </div>
              ) : null}
              <div className="flex flex-col gap-2 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
                <button
                  type="button"
                  className="text-left text-xs font-medium text-primary hover:underline"
                  onClick={() => {
                    const emailValue = getValues("email");
                    if (emailValue) {
                      void handleResetPassword(emailValue);
                    } else {
                      setInfo(null);
                      setError("Enter your email above to reset your password.");
                    }
                  }}
                  disabled={pending}
                >
                  Forgot password?
                </button>
                <Button
                  type="submit"
                  className="w-full sm:w-auto"
                  variant="outline"
                  disabled={pending}
                >
                  {mode === "sign-in" ? "Sign in" : "Create account"}
                </Button>
              </div>
            </form>
          </div>
        </CardContent>
      </Card>
      <p className="mt-6 text-sm text-muted-foreground">
        {mode === "sign-in" ? (
          <>
            Need an account?{" "}
            <button
              type="button"
              className="font-medium text-primary hover:underline"
              onClick={toggleMode}
              disabled={pending}
            >
              Create one
            </button>
            .
          </>
        ) : (
          <>
            Already have an account?{" "}
            <button
              type="button"
              className="font-medium text-primary hover:underline"
              onClick={toggleMode}
              disabled={pending}
            >
              Sign in instead
            </button>
            .
          </>
        )}
      </p>
    </div>
  );
}
