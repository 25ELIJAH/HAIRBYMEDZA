"use client";

import { useFormState, useFormStatus } from "react-dom";
import Logo from "@/components/Logo";
import { loginAction } from "@/lib/admin-actions";

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} className="btn-primary w-full !py-3">
      {pending ? "Signing in…" : "Sign in"}
    </button>
  );
}

export default function AdminLoginPage() {
  const [state, formAction] = useFormState(loginAction, null as { error?: string } | null);

  return (
    <div className="grid min-h-screen place-items-center bg-royal-gradient px-5">
      <div className="w-full max-w-sm">
        <div className="mb-6 flex justify-center">
          <Logo variant="light" href="/" />
        </div>
        <div className="card p-7">
          <h1 className="font-display text-2xl font-bold text-charcoal">Admin sign in</h1>
          <p className="mt-1 text-sm text-charcoal-muted">
            Manage bookings, services and your schedule.
          </p>

          <form action={formAction} className="mt-6 space-y-4">
            <label className="block">
              <span className="label">Email</span>
              <input
                name="email"
                type="email"
                required
                autoComplete="username"
                className="input"
                placeholder="admin@magdalenemedz.co.ke"
              />
            </label>
            <label className="block">
              <span className="label">Password</span>
              <input
                name="password"
                type="password"
                required
                autoComplete="current-password"
                className="input"
                placeholder="••••••••"
              />
            </label>

            {state?.error && (
              <p className="rounded-lg bg-red-50 px-3 py-2 text-sm font-medium text-red-600">
                {state.error}
              </p>
            )}

            <SubmitButton />
          </form>
        </div>
        <p className="mt-4 text-center text-xs text-lavender-200">
          Protected area · Magdalene Medza
        </p>
      </div>
    </div>
  );
}
