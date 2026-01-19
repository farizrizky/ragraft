"use client";

import { signIn } from "next-auth/react";
import { useState } from "react";
import Notification from "@/components/Notification";

export default function RegisterPage() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [status, setStatus] = useState<{
    message: string;
    tone: "success" | "error" | "warning" | "info";
  } | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSubmitting(true);
    setStatus(null);

    const response = await fetch("/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, email, password }),
    });

    if (!response.ok) {
      const payload = (await response.json()) as { error?: string };
      setStatus({
        tone: "error",
        message: payload?.error || "Failed to register.",
      });
      setIsSubmitting(false);
      return;
    }

    const signInResult = await signIn("credentials", {
      email,
      password,
      callbackUrl: "/dashboard",
    });
    if (signInResult?.error) {
      setStatus({
        tone: "error",
        message: "Account created, but login failed. Please sign in.",
      });
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-landing px-6 text-[color:var(--foreground)]">
      <main className="w-full max-w-md rounded-3xl border border-[color:var(--panel-border)] bg-[color:var(--panel)]/90 p-10 shadow-sm backdrop-blur">
        <div className="text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[color:var(--muted)]">
            Ragnara
          </p>
          <h1 className="mt-3 text-2xl font-semibold">Create sovereign</h1>
          <p className="mt-2 text-sm text-[color:var(--muted)]">
            Set up the sovereign account for this app.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="mt-8 space-y-4">
          <label className="flex flex-col gap-2 text-sm font-medium">
            Name
            <input
              type="text"
              value={name}
              onChange={(event) => setName(event.target.value)}
              className="rounded-xl border border-[color:var(--panel-border)] bg-transparent px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[color:var(--ring)]"
            />
          </label>
          <label className="flex flex-col gap-2 text-sm font-medium">
            Email
            <input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
              className="rounded-xl border border-[color:var(--panel-border)] bg-transparent px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[color:var(--ring)]"
            />
          </label>
          <label className="flex flex-col gap-2 text-sm font-medium">
            Password
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              required
              className="rounded-xl border border-[color:var(--panel-border)] bg-transparent px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[color:var(--ring)]"
            />
          </label>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full rounded-full bg-[color:var(--accent-1)] px-6 py-2 text-xs font-semibold uppercase tracking-wide text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isSubmitting ? "Creating..." : "Create account"}
          </button>
        </form>

        <p className="mt-6 text-center text-xs text-[color:var(--muted)]">
          Already have an account?{" "}
          <a
            href="/sovereign"
            className="font-semibold text-[color:var(--accent-1)]"
          >
            Sign in
          </a>
        </p>
      </main>

      {status ? (
        <Notification
          floating
          message={status.message}
          tone={status.tone}
          onDismiss={() => setStatus(null)}
        />
      ) : null}
    </div>
  );
}
