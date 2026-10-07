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
    <div className="grid min-h-screen place-items-center bg-cream-soft px-5">
      <div className="w-full max-w-sm">
        <div className="mb-6 flex justify-center">
          <Logo href={null} />
        </div>
        <div className="card p-7">
          <h1 className="text-xl font-semibold text-charcoal">Sign in</h1>

          <form action={formAction} className="mt-6 space-y-4">
            <label className="block">
              <span className="label">Email</span>
              <input
                name="email"
                type="email"
                required
                autoComplete="username"
                className="input"
                
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
      </div>
    </div>
  );
}
